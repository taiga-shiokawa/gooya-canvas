import { useStore } from 'zustand'
import { useWorkflowStore } from './workflowStore'

// Undo / Redo（FR-005 / docs/functional-design.md §11 / AD-07）。
//
// 履歴は zundo の temporal store が持ち、`useWorkflowStore.temporal` からしか触れない。
// 各モジュールが temporal を直接叩くと「何が履歴対象か」の知識が散るため、
// 操作はこのファイルの関数に集約し、shared の公開 API として出す。
//
// zundo の undo / redo は middleware がラップしていない素の set を使う。
// そのため巻き戻し自体は新たな履歴を積まず、store の購読（Canvas の mergeReactFlow*）は
// 通常の変更と同じ経路で走る。

/** 巻き戻し / やり直しの結果、内容が最後の保存と食い違うので dirty を立てる（§2.4）。 */
function markDirtyAfterHistoryMove(): void {
  // nodes / edges は変わらないので、この更新自体は履歴に積まれない（store の equality）
  useWorkflowStore.setState({ isDirty: true })
}

/** Ctrl+Z。nodes / edges だけが 1 段戻る。Viewport と選択状態は戻らない。 */
export function undoWorkflow(): void {
  const temporal = useWorkflowStore.temporal.getState()
  if (temporal.pastStates.length === 0) return

  temporal.undo()
  markDirtyAfterHistoryMove()
}

/** Ctrl+Shift+Z。 */
export function redoWorkflow(): void {
  const temporal = useWorkflowStore.temporal.getState()
  if (temporal.futureStates.length === 0) return

  temporal.redo()
  markDirtyAfterHistoryMove()
}

export type WorkflowHistoryAvailability = {
  canUndo: boolean
  canRedo: boolean
}

/** Edit メニューの活性判定（docs/functional-design.md §4.2）。 */
export function useWorkflowHistory(): WorkflowHistoryAvailability {
  const canUndo = useStore(
    useWorkflowStore.temporal,
    (state) => state.pastStates.length > 0,
  )
  const canRedo = useStore(
    useWorkflowStore.temporal,
    (state) => state.futureStates.length > 0,
  )

  return { canUndo, canRedo }
}
