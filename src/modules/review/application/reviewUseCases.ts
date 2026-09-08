import { useWorkflowStore, type ReviewFinding } from '@/modules/shared'
import { reviewWorkflow } from '../domain/reviewWorkflow'

// Flow Review の実行と結果保持（FR-023 / FR-024 / docs/functional-design.md §10）。
// 解析そのものは domain の純関数。ここは store からの入力取り出しと結果の保持だけを行う。
//
// 結果は Domain Model ではないため保存対象にせず、dirty も立てない（§2.4）。
// ステータスバー（app）も同じ結果を読むので、置き場は shared の store とする
// （feature モジュール間の直接 import は禁止 — repository-structure §5.1 #4）。

export type ReviewUseCases = {
  /** 現在の store の Workflow を解析し、結果を store へ保持する。 */
  run: () => readonly ReviewFinding[]
  clear: () => void
  /** 問題クリック時に該当 Node を Canvas 中央へ寄せるよう要求する（FR-024）。 */
  focusNode: (nodeId: string) => void
}

export function createReviewUseCases(): ReviewUseCases {
  return {
    run: () => {
      const state = useWorkflowStore.getState()
      const findings = reviewWorkflow({
        nodes: state.nodes,
        edges: state.edges,
      })
      state.setReviewFindings(findings)
      return findings
    },

    clear: () => useWorkflowStore.getState().clearReviewFindings(),

    focusNode: (nodeId) => useWorkflowStore.getState().requestNodeFocus(nodeId),
  }
}
