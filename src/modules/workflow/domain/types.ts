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

/** Prompt が想定する実装先 7 種（docs/glossary.md §5.1。リテラルは kebab-case）。 */
export const PROMPT_TARGETS = [
  'generic',
  'google-apps-script',
  'power-automate',
  'cloudflare',
  'azure',
  'web-application',
  'other',
] as const

export type PromptTarget = (typeof PROMPT_TARGETS)[number]

export function isPromptTarget(value: string): value is PromptTarget {
  return (PROMPT_TARGETS as readonly string[]).includes(value)
}

export type PromptLanguage = 'ja' | 'en'

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

export type WorkflowMetadata = {
  id: string
  name: string
  description?: string
  /** ISO 8601 */
  createdAt: string
  /** ISO 8601 */
  updatedAt: string
}

export type WorkflowViewport = {
  x: number
  y: number
  zoom: number
}

export type WorkflowPromptSettings = {
  target?: PromptTarget
  language?: PromptLanguage
  additionalInstructions?: string
}

/** プロジェクト 1 件のルート構造。本システムの外部契約（docs/functional-design.md §12）。 */
export type WorkflowProject = {
  schemaVersion: string
  metadata: WorkflowMetadata
  viewport: WorkflowViewport
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  promptSettings?: WorkflowPromptSettings
}
