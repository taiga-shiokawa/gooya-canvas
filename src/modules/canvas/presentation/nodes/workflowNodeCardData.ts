import type { WorkflowNodeKind } from '@/modules/workflow'

/**
 * Custom Node の描画に必要な値だけを持つ React Flow 側の `node.data`。
 * canvas モジュール内に閉じた表現であり、外部契約ではない（NFR-010）。
 * 生成は reactFlowMapper の `toReactFlow` が行う。
 */
export type WorkflowNodeCardData = {
  kind: WorkflowNodeKind
  title: string
  description?: string
  /** Condition の分岐名（Source Handle の生成に使う）。それ以外の種別は空配列。 */
  branches: readonly string[]
}
