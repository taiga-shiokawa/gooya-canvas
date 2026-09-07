// Workflow Domain Model。定義の正は docs/functional-design.md §3.2。
// 純 TypeScript のみ（React / @xyflow/react / ブラウザ API を持ち込まない）。

/** Node 種別 11 種。union と実行時の列挙を一致させるため配列から導出する。 */
export const WORKFLOW_NODE_KINDS = [
  'trigger',
  'dataSource',
  'action',
  'condition',
  'wait',
  'humanTask',
  'notification',
  'ai',
  'integration',
  'end',
  'note',
] as const

export type WorkflowNodeKind = (typeof WORKFLOW_NODE_KINDS)[number]

export function isWorkflowNodeKind(value: string): value is WorkflowNodeKind {
  return (WORKFLOW_NODE_KINDS as readonly string[]).includes(value)
}

export type WorkflowPosition = {
  x: number
  y: number
}

export type WorkflowNode = {
  id: string
  type: WorkflowNodeKind
  position: WorkflowPosition
  data: {
    title: string
    description?: string
    /** 種別ごとの設定（docs/functional-design.md §3.3）。秘密情報は保存しない（NFR-002）。 */
    config: Record<string, unknown>
    notes?: string
  }
}

export type WorkflowEdge = {
  id: string
  source: string
  target: string
  /** Condition の分岐識別に使用 */
  sourceHandle?: string
  targetHandle?: string
  /** Yes / No / Completed / Pending 等 */
  label?: string
  data?: {
    description?: string
  }
}
