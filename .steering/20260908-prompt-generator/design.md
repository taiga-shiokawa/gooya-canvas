# Phase 5 — Prompt Generator 設計

要求は `requirements.md`。永続文書の所有は `docs/functional-design.md`（振る舞い）/ `docs/repository-structure.md`（配置）。

## 1. 実装アプローチ

### 1.1 `prompt` モジュールの構成

repository-structure §2.1 の表どおり **domain + application（+ ports）+ infrastructure + presentation**。

| ファイル | 役割 |
|---|---|
| `domain/generatePrompt.ts` | `WorkflowProject` → Markdown の決定論的純関数 |
| `domain/promptLabels.ts` | 定型文の ja / en 対応表 |
| `domain/promptTargets.ts` | Implementation Target の表示名 |
| `application/ports/ClipboardPort.ts` | `copy(text): Promise<boolean>` |
| `application/promptUseCases.ts` | 生成の実行、promptSettings の更新、コピー |
| `infrastructure/browserClipboardPort.ts` | Clipboard API |
| `presentation/PromptPanel.tsx` | Panel（Target / Language / 追加指示 / Copy / プレビュー） |

### 1.2 決定論性の担保（R-1）

- 入力は `WorkflowProject` だけ。store から組み立てるのは application 層の責務とし、domain は引数のみを見る
- **`updatedAt` を更新しない**。保存（`projectUseCases`）と違い、Prompt を開くたびに内容が変わると決定論性が崩れ、スナップショットテストも成立しない
- ノード・エッジの走査順は**配列順**に固定する。Map の反復順や `sort` に依存しない
- `ClipboardPort.copy` が `Promise<boolean>` を返すのは、コピー可否がブラウザ権限・セキュアコンテキストに依存するため。ライブラリ固有の例外をポートの外へ漏らさない（development-guidelines §2.3）

### 1.3 `## Workflow` の走査規則（R-2）

Trigger を起点に Edge を辿る。Condition では分岐ごとに手順を分ける。

**既出ノードへ再到達したら展開せず「既出の手順に合流」と書いて打ち切る。** 接続時に Cycle を禁止していない（§5.2）ため、この打ち切りが無いと Retry ループで無限に展開される。合流（複数経路が同じ後続に入る）も同じ扱いにする — 同じ手順を二度書くほうが読み手を混乱させるため。

直列（outgoing が 1 本）はネストを深くせず同じ階層に続ける。深い入れ子は読みにくい。

### 1.4 config の表示（R-3）

種別ごとの整形関数を書かず、`workflow` domain の `NODE_CONFIG_KEYS` の**並びを順序の正として** config 値を ` / ` で連結する。種別が増えても Prompt 側を直す必要がない。

例外は Wait のみ（`duration` と `unit` を「60 minutes」と繋ぐ必要があるため）。

`config` は外部ファイル由来で任意の形を取り得るので、文字列・有限数だけを採用し、それ以外は「未設定」として落とす。

### 1.5 Language（§9.3）

切り替わるのは**定型文だけ**。ユーザーが入力した title / description / config は翻訳しない。対応表を `promptLabels.ts` に集約し、生成本体は表を引くだけにする。

### 1.6 Panel（R-4 / R-5）

- ネイティブ `<dialog>` + `showModal()`。Phase 4 の `ProjectDialog` と同じ方針（Radix 未導入のため、フォーカストラップ・Esc を自前で書くよりブラウザに委ねる）
- Markdown は `<pre>` にプレーンテキストで出す。`dangerouslySetInnerHTML` は禁止であり、実装依頼文書はそのままコピーできることが重要
- 生成は**レンダー中に純関数を呼ぶ**。`useMemo` を使わないのは、真の入力（store）が引数に現れず依存配列に書けないため。Panel は生成の入力になる slice を購読しており、変わったときだけ再レンダーされる
- コピー完了表示は boolean ではなく**コピーした本文**を保持し、現在の生成結果と一致するときだけ出す。boolean だと再生成後も表示が残り、古い内容をコピーしたと誤認させる

### 1.7 読込後の画面復元（R-9 / Phase 4 の積み残し）

`project` から `fitView` は呼べない（依存方向 #5）。代わりに **canvas が store の `viewport` を購読**し、自分が publish した値と異なる変更＝外部（Open / New）による復元とみなして適用する。

- Canvas 側の Pan / Zoom は `onMoveEnd`（確定時のみ）で store へ publish する。`onViewportChange` はフレームごとに発火し、購読が回り続けるため使わない
- 自分が publish した値を ref に覚えておき、折り返し適用を防ぐ
- ref の初期値は **マウント時の store の値**にする。`null` にすると、マウント後の最初の store 変更（種類を問わない）が「復元すべき変更」と誤判定される

### 1.8 起動時の全体表示（実装中に判明した不具合）

初回起動はサンプルを読み込んだ状態で始まる（§7.6）。このとき React Flow の `fitView` prop は**ノードの実測が終わる前に一度走り、実測 0 の矩形へ合わせて最大倍率までズームインした状態で止まる**（実測: zoom 1.97）。

- `fitView` prop を外すと直るかと思ったが、外すと React Flow の初期化シーケンスごと止まり、マウント時点のノードが `visibility: hidden` のまま表示されない
- 測定完了の判定に `useNodesInitialized` は使えない。handleBounds も条件に含むため、**Handle を 1 つも持たない Note があると永久に false** になる（サンプルに Note がある）
- controlled な `nodes` 配列にも `measured` は流れてこない

→ **prop は残したまま、React Flow の内部ストア（`useStore`）で全ノードの実測が揃ったことを検知し、その時点で 1 度だけ合わせ直す。** 合わせた結果は store へも publish し、保存内容と画面を一致させる。

## 2. 影響範囲の分析 / `docs/` の更新方針

Phase 3・Phase 4 で持ち越した更新もここでまとめて反映する。

| 文書 | 内容 |
|---|---|
| `docs/functional-design.md` | §2.3 `pickAndRead` のシグネチャ / §2.4 選択状態の移管済み化・controlled flow の要点 2 項追加 / §5.3 分岐編集の規則 / §6 Inspector の規則 / §7.3 viewport 復元とキャンセル / §7.4 検証順序の限界 / §7.6 初期表示 / §9.2 Workflow 生成規則と Acceptance Criteria の確定 / §9.3 Language とプレーンテキスト表示 |
| `docs/repository-structure.md` | §1 `e2e/` 実在化 / §2 実在モジュール / §5.4 infrastructure ファクトリ公開の例外 / §6.1 テスト実績 |
| `docs/development-roadmap.md` | 現在地、Phase 3〜5 の完了、Phase 4 の Crash Recovery 非包含 |
| `docs/development-guidelines.md` | §4.2 Windows（`core.autocrlf=true`）での `format:check` の注意 |

## 3. 後続フェーズへの申し送り

- **Phase 6（Flow Review）**: Review の結果は Prompt の `## Open Questions` へ転記する（§9.2）。現在このセクションは「該当データなし」で省略されているだけなので、Review 実装時に生成側へ渡す経路を足す
- **Phase 7（Export）**: `export` モジュールも infrastructure ファクトリを composition root へ公開する形になる（repository-structure §5.4 の例外）
- **Phase 8**: `promptSettings` の変更は dirty を立てるが Undo 履歴の対象外（§11）。zundo 導入時に `nodes` / `edges` のみを追跡すること
- **Crash Recovery（NFR-006）** は未着手のまま
