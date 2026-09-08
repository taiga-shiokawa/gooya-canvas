# Phase 8 — UX Polish 設計

要求は `requirements.md`。永続文書の所有は `docs/functional-design.md`（振る舞い）/ `docs/repository-structure.md`（配置）。

## 1. Undo / Redo（R-1）

zundo の `temporal` を `shared` の store へ適用する。

- `partialize` で **`nodes` / `edges` のみ**を追跡する
- さらに `equality`（参照比較）で、viewport / 選択状態 / `isDirty` / `metadata` / `promptSettings` / `reviewFindings` / `nodeFocusRequest` / `inspectorFocusRequest` の更新を履歴から除外する。Undo / Redo 後に `isDirty: true` が立っても履歴を汚さない
- **履歴上限は 100 件**（§11 の「（要確認）」を確定）。1 件が持つのは配列 2 本だけで、非破壊更新により要素は構造共有されるためメモリ影響は小さい
- `replaceProject`（New / Open / サンプル読込 / 復旧）で履歴をクリアする

### 1.1 ドラッグを履歴 1 件にまとめる方法

zundo の debounce ではなく **ドラッグ中は store を触らない**方式を採る。

- `onNodesChange` は `change.dragging === true` の位置変更を store へ送らない（React Flow のローカル配列だけが動く）
- `onNodeDragStop` / `onSelectionDragStop` で確定位置を `moveNodes` へ 1 回だけ渡す
- 位置が 1 つも変わっていなければ何もしない（クリックだけのドラッグでは履歴も dirty も発生しない）

時間に依存しないため、どれだけ長いドラッグでも必ず 1 件になる。debounce だと長いドラッグが複数件に割れる。

### 1.2 Inspector の連続入力をまとめる方法

即時反映（AC-011）は維持したまま、zundo の `handleSet` に **「編集対象キー + 500ms の時間窓」** のゲートを挟む。
キーは `withHistoryGroup('node:<id>:title', …)` の形で inspector の各ユースケースが渡す。

時間だけでまとめないのは、続けざまの別操作（2 回連続のドラッグなど）まで 1 件になるのを避けるため。キーの無い変更は常に独立した 1 件とする。

### 1.3 `setGraph` の追加

nodes と edges を同時に変える操作（削除・分岐削除・複製・Paste）は、`setNodes` と `setEdges` を別々に呼ぶと履歴が 2 件になり、Undo に Ctrl+Z が 2 回必要になる。1 回の `set` にまとめる `setGraph` を store へ追加する。

## 2. ショートカット（R-2）

判定は `shared/domain/keyboardShortcut.ts` の純関数（DOM 型に依存しない記述子を受ける）に置き、配線は composition root（`src/app/useAppShortcuts.ts`）が行う。canvas と project を繋げるのは composition root だけの役割のため（依存方向 #4）。

- **Mac の Cmd に対応する**（`ctrlKey || metaKey` を主修飾キーとして扱う）。`altKey` が押されている組み合わせは除外する（Windows の AltGr = Ctrl+Alt を誤認しないため）
- **Input / Textarea フォーカス中は Canvas ショートカットを無効化する**（§5.5）。ただし **Ctrl+S / Ctrl+O だけは通す** — 止めるとブラウザ既定のページ保存 / ファイルを開くが走ってしまう
- **モーダル表示中（`dialog[open]`）は全ショートカットを止める**。非モーダルの Review Panel は対象外
- **Delete は React Flow の `deleteKeyCode` に任せず統一ハンドラで扱う**（`deleteKeyCode={null}`）。React Flow 任せだと Node と Edge が別 handler で消えて履歴が 2 件になり、入力欄フォーカス判定も二重管理になる。Backspace も削除に割り当てる

## 3. Context Menu（R-3）

自前実装（Esc クローズ・外側クリック・`role="menu"` / `menuitem`）。`AppHeader.tsx` の File メニューが先例。

- 右クリックした要素を**単一選択にしてから開く**（Inspector の表示対象と操作対象を一致させる）
- **Edge では Duplicate を無効表示**にする。Edge 単体の複製は両端ノードを伴わず定義できないため。項目自体は §5.4 どおり 3 つ出す
- **Edit（Inspector へフォーカス）**: canvas から inspector を import できない（#4）ので、store に `inspectorFocusRequest`（token のみ）を置き、inspector が購読して最初の編集可能入力へ `focus()` + `select()` する。Phase 6 の `nodeFocusRequest` と同じパターン

## 4. 複製 / Copy / Paste（R-4 / R-5）

部分グラフの抽出と複製は `workflow/domain/graphDuplication.ts` の純関数に置く（`extractSubgraph` / `duplicateSubgraph`）。ID 採番は引数で受け取る。

- 選択集合内で**閉じている Edge だけ**を複製する（外へ出る Edge は複製しない）
- クリップボードは canvas application のモジュール変数（アプリ内メモリ）。選択が空の Copy は前の内容を残す
- オフセットは **(40, 40)**（Snap の 2 マス）。連続 Paste は回数ぶん重ねる

## 5. Snap to Grid（R-6）

グリッド幅 **20px**。`<Background />` の既定 gap に合わせ、見えている格子とスナップ位置を揃える。ドロップ位置はスナップしない（§5.1 は「移動時」と定めている）。

## 6. 影響範囲の分析 / `docs/` の更新方針

| 文書 | 内容 |
|---|---|
| `docs/functional-design.md` | §11: 履歴上限 100 件（「（要確認）」を確定）・ドラッグと Inspector 編集のまとめ方・履歴対象外に UI 状態 3 つを明記 / §5.1: OS クリップボード連携をスコープ外に確定・Snap 20px・オフセット (40,40) / §5.4: Edge の Duplicate は無効 / §5.5: Ctrl+S・Ctrl+O は入力欄でも有効・モーダル中は全無効・Cmd 対応・Backspace / §2.4: `inspectorFocusRequest` と `setGraph` |
| `docs/repository-structure.md` | §2.1 / §6.1 の実績更新（`shared/domain/` の追加、テストファイル数、canvas presentation のレジストリ方式） |
| `docs/development-roadmap.md` | Phase 8 完了 |
| `docs/development-guidelines.md` | §2.4 のショートカット実装構成（判定は shared domain の純関数、配線は composition root） |

## 7. 残課題

- §5.4 が Edge の Duplicate を定義していない。今回は無効表示にしたが仕様側で確定させたい
- クリップボードは New / Open をまたいで残る（ID は新規採番なので破綻はしない）。仕様上の期待が未定義
- `selectedEdgeId` が単数のため、Edge のみを複数選択しての Delete は効かない。広げるなら Inspector の単一選択規約（§6）との整合も要検討
- Ctrl+Y（Windows 慣用の Redo）は §5.5 の表に無いため未実装
- 矢印キーでのノード移動（React Flow 標準）は 1 押下 = 履歴 1 件。§11 に記述がない
- Inspector のフォーカス移動・Context Menu の開閉・ショートカットの実配線は、Vitest が `environment: 'node'` のため単体テストではなくブラウザ検証で担保している
