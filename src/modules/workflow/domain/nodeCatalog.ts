import type { WorkflowNode, WorkflowNodeKind } from './types'

// ノード種別カタログ（docs/functional-design.md §2.1 が workflow ドメインの所有物と定める）。
// 表示名・推奨 config キー・追加時の初期値を一箇所に集約し、canvas / inspector / review が共有する。
// 用語は英語表記を正とする（docs/glossary.md §4）。

const NODE_KIND_LABELS: Record<WorkflowNodeKind, string> = {
  trigger: 'Trigger',
  dataSource: 'Data Source',
  action: 'Action',
  condition: 'Condition',
  wait: 'Wait',
  humanTask: 'Human Task',
  notification: 'Notification',
  ai: 'AI',
  integration: 'Integration',
  end: 'End',
  note: 'Note',
}

export function nodeKindLabel(kind: WorkflowNodeKind): string {
  return NODE_KIND_LABELS[kind]
}

/**
 * 種別ごとの推奨 config キー（docs/functional-design.md §3.3）。
 * Inspector のフォーム項目と Flow Review の欠落判定がこの一覧を正とする。
 * config 自体は Record<string, unknown> であり、ここに無いキーを持つファイルも読める（後方互換）。
 */
export const NODE_CONFIG_KEYS: Record<WorkflowNodeKind, readonly string[]> = {
  trigger: ['system', 'event'],
  dataSource: ['provider'],
  action: ['operation'],
  condition: ['branches'],
  wait: ['duration', 'unit', 'until'],
  humanTask: ['role', 'action', 'expectedResult'],
  notification: ['provider', 'recipient', 'message', 'purpose'],
  ai: ['task', 'input', 'expectedOutput', 'constraints'],
  integration: ['system'],
  end: ['outcome'],
  note: [],
}

/** Condition の初期分岐（docs/functional-design.md §3.3）。 */
export const DEFAULT_CONDITION_BRANCHES = ['Yes', 'No'] as const

// 初期 config には「構造的な既定値があるものだけ」を置く。推奨キーを空文字で埋めると
// 「未設定」と区別できなくなり Flow Review の欠落判定（RV-W02〜W05）が破綻するため。
const INITIAL_CONFIGS: Partial<
  Record<WorkflowNodeKind, () => Record<string, unknown>>
> = {
  condition: () => ({ branches: [...DEFAULT_CONDITION_BRANCHES] }),
  wait: () => ({ unit: 'minutes' }),
}

/** Node 追加時の data（既定 title + 初期 config。FR-001 / functional-design §5.1）。 */
export function createDefaultNodeData(
  kind: WorkflowNodeKind,
): WorkflowNode['data'] {
  return {
    title: nodeKindLabel(kind),
    config: INITIAL_CONFIGS[kind]?.() ?? {},
  }
}

/**
 * Condition の分岐名を安全に読む。config は外部ファイル由来で任意の形を取り得るため、
 * 文字列以外・空配列は既定値へフォールバックする（Source Handle が 0 個になると
 * Condition から一切接続できなくなるため）。Condition 以外は空配列を返す。
 */
export function conditionBranches(node: WorkflowNode): string[] {
  if (node.type !== 'condition') return []

  const raw = node.data.config.branches
  if (!Array.isArray(raw)) return [...DEFAULT_CONDITION_BRANCHES]

  const branches = raw.filter(
    (branch): branch is string =>
      typeof branch === 'string' && branch.trim().length > 0,
  )
  return branches.length > 0 ? branches : [...DEFAULT_CONDITION_BRANCHES]
}
