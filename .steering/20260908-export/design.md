# Phase 7 — Export 設計

## 1. 中心的な設計課題: canvas と export をどう繋ぐか

§8.1 が要求する「全 Node / Edge の Bounding Box」「Export 用表示への切替」「画像化対象の DOM 要素」は、いずれも @xyflow/react と Canvas の DOM を触らないと得られない。しかし

- `@xyflow/react` は canvas モジュール内にしか置けない（repository-structure §5.1 #5）
- export ↔ canvas の相互 import は禁止（同 #4）

そこで **canvas 側に「Export 用の窓口」を置き、composition root が export のポートとして注入する**構成にした。

```text
canvas/presentation/canvasExportSource.ts      export/application/ports/CanvasSourcePort.ts
  canvasExportSource（モジュールレベルの                { getContentBounds, beginExportView }
  レジストリ。WorkflowCanvas が自身を登録）                          ▲
            │                                                      │ 構造的型付けで適合
            └───────────► src/app/ports.ts（composition root）──────┘
```

- 型は共有せず**構造的型付け**で合わせる。両モジュールは互いの型も import しない。形がずれれば composition root で型エラーになる
- `getCaptureTarget`（DOM 要素）は application のポートには載せず、composition root から
  `createHtmlToImageCanvasImagePort({ resolveTarget })` へ直接渡す。
  これで export の application 層は DOM 型を一切持たず、React Flow の DOM 構造（`.react-flow__viewport`）を知るのも canvas と infrastructure の間だけになる
- レジストリは「登録されていなければ既定値を返す」ため、Canvas 未マウントでも安全に呼べる

## 2. ポート

| ポート | シグネチャ | 具象 |
|---|---|---|
| `CanvasImagePort` | `capture(bounds, options): Promise<Blob \| null>` | html-to-image |
| `PdfComposerPort` | `compose(image, meta): Promise<Blob \| null>` | jsPDF |
| `CanvasSourcePort`（**追加**） | `getContentBounds(): Bounds \| null` / `beginExportView(): Promise<() => void>` | canvas モジュール |
| `ExportFilePort`（**追加**） | `download(name, blob): void` | Blob + `<a download>` |

- functional-design §2.3 の表は `Promise<Blob>` だが、**失敗を `null` で返す**規約に揃えた（`ProjectFilePort.pickAndRead` と同じ。infrastructure が例外を外へ漏らさないための必然）
- `ExportFilePort` を足したのは、`ProjectFilePort` が JSON 文字列専用であり、かつ feature モジュール間 import が禁止されているため
- ページレイアウトの計算は application の純関数が行い、結果を `meta.layout` として渡す。infrastructure は application を import できない（#2）ので、計算を infrastructure に置くとテストできなくなる

## 3. Export 用表示（§8.3 / AC-018）

| 要素 | 手段 |
|---|---|
| MiniMap / Controls / Grid(Background) | `exportMode` の間そもそも描画しない。加えてこの 3 つは `.react-flow__viewport` の**外側**にあるため画像には元から入らない |
| Inspector / Toolbar / Node Palette | 画像化対象が `.react-flow__viewport` なので構造的に含まれない |
| Handles | `CanvasExportModeContext` を Custom Node が購読し `invisible`（visibility: hidden）にする。**アンマウントしない**のは、Handle の DOM が消えると React Flow の handleBounds の前提が崩れて Edge の描画位置が変わりうるため |
| Selection Border（Node） | 同じ context で `ring-2` を外す。あわせて `transition-shadow` も外す（付けたままだと 150ms かけて消えるので、その途中で画像化されて枠が写る） |
| Selection の Edge 色 | Export 中だけ CSS 変数 `--xy-edge-stroke-selected` を通常色へ上書きする（Tailwind の任意プロパティ。個別 CSS ファイルを作らない — development-guidelines §4.1） |

context を使うのは、ノードの `data` に持たせると React Flow へ渡す配列を作り直すことになり、`measured` / `selected` が失われるため（functional-design §2.4 の controlled flow の要点）。

## 4. html-to-image の 2 つの落とし穴

1. **viewport を動かさずに全体を撮る**
   `toBlob(target, { width, height, style: { transform } })` の `style` は**クローン側**へ適用される（`applyStyle(clonedNode, options)`）。画面の viewport は動かないので、Pan / Zoom も `onMoveEnd` 経由の store 更新も発生しない = 未保存状態を汚さない。
2. **`<svg>` 配下へ算出スタイルが写らない**
   html-to-image は `<svg>` に出会うと deep clone するだけで子要素へ算出スタイルを写さない（`clone-node.js`: `if (isSVGElement(clonedNode)) return`）。一方 React Flow の Edge は CSS クラスだけで stroke / fill を決めており、画像化はページの CSS が効かない環境（foreignObject）で行われる。
   → **Edge の線が消え、ラベル背景が黒く塗り潰される**。
   対策として `canvas/presentation/exportSvgStyles.ts` を追加し、Export 用表示にしてから live DOM の SVG 子要素へ算出済みの表現プロパティをインライン化し、終わったら元に戻す。React Flow の CSS を export 側へ複製せずに済む。

## 5. 解像度・余白・PDF レイアウト

| 値 | 決め方 |
|---|---|
| 解像度 2 倍 | 「高解像度」（FR-016）。等倍では文字が潰れる。Retina 相当 |
| 余白 40（Flow 座標） | Node の影と Edge の膨らみが切れないようにする（AC-019） |
| 1 辺の上限 8192px | ブラウザの canvas 上限に触れると画像化が無言で失敗する。超える場合は縦横比を保ったまま倍率を下げる |
| 用紙 A4 固定 | 複数ページ分割がスコープ外なので用紙を選ばせない |
| 向き | 画像が横長なら landscape、それ以外は portrait |
| 余白 12mm / タイトル帯 11mm / 日付帯 8mm | 画像はこの帯を除いた領域へ縦横比を保って最大化し中央へ置く |

## 6. テスト方針

Vitest は `environment: 'node'` なので、副作用から切り離せる純関数だけを対象にする。

- `exportImagePlan.ts` — 余白の加算・倍率・上限クランプ・不正な Bounding Box の拒否
- `pdfPageLayout.ts` — 用紙の向き・1 ページ Fit・中央寄せ・極端なアスペクト比・0 / 非有限の入力
- `exportFileName.ts` — プロジェクト名のサニタイズ
- `exportDateFormat.ts` — 整形（現在時刻は引数で受け取る純関数）

DOM を触る部分（html-to-image / jsPDF / Export 用表示）は動作検証で担保する。
