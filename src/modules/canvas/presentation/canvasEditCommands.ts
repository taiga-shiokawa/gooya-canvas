// Edit メニュー・キーボードショートカットから Canvas を操作するための受け渡し口
// （FR-004 / FR-006 / docs/functional-design.md §4.2 / §5.5）。
//
// 削除・複製・Copy / Paste・Select All は store の更新だけでは完結しない。
// React Flow へ渡している配列は `selected` などの描画用フィールドを自分自身に持つため
// （§2.4 の controlled flow）、新しく作った要素の選択や全選択は
// **マウント中の WorkflowCanvas がその配列に対して**行う必要がある。
//
// composition root（src/app/）は @xyflow/react を import できない
// （repository-structure §5.1 #5）ので、canvasExportSource と同じ形のレジストリを置き、
// マウント中の Canvas が実装を登録する。Canvas 未マウントの間も安全に呼べる。

export type CanvasEditCommands = {
  /** 選択中の Node / Edge を削除する。 */
  deleteSelection: () => void
  /** 選択中の Node を複製し、複製側を選択する（AC-006）。 */
  duplicateSelection: () => void
  /** 選択中の Node と、その集合内で閉じている Edge をクリップボードへ取る。 */
  copySelection: () => void
  /** クリップボードの内容を貼り付け、貼り付けた側を選択する。 */
  paste: () => void
  /** すべての Node / Edge を選択する。 */
  selectAll: () => void
  /** Inspector の最初の入力へフォーカスを移す（Context Menu の Edit と同じ動作）。 */
  editSelection: () => void
}

const noop = () => {}

let registered: CanvasEditCommands | null = null

/**
 * マウント中の Canvas を登録する。戻り値は登録解除関数（useEffect の後始末に使う）。
 * StrictMode の二重実行で後から登録された実装を消さないよう、同一実装のときだけ解除する。
 */
export function registerCanvasEditCommands(
  commands: CanvasEditCommands,
): () => void {
  registered = commands
  return () => {
    if (registered === commands) registered = null
  }
}

/** composition root が使う窓口。参照はアプリの生存期間で不変。 */
export const canvasEditCommands: CanvasEditCommands = {
  deleteSelection: () => (registered?.deleteSelection ?? noop)(),
  duplicateSelection: () => (registered?.duplicateSelection ?? noop)(),
  copySelection: () => (registered?.copySelection ?? noop)(),
  paste: () => (registered?.paste ?? noop)(),
  selectAll: () => (registered?.selectAll ?? noop)(),
  editSelection: () => (registered?.editSelection ?? noop)(),
}
