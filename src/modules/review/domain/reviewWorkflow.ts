import type { ReviewFinding } from '@/modules/shared'
import {
  conditionBranches,
  nodeKindLabel,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowNodeKind,
} from '@/modules/workflow'

// Flow Review の Rule-based 解析（FR-023 / docs/functional-design.md §10）。
//
// **決定論的純関数**として書く（development-guidelines §2.2）。入力は Domain Model のみで、
// React Flow の状態も `Date.now()` / `Math.random()` も読まない。同じ Workflow からは
// 常に同じ順序・同じ内容の結果が返る（Unit テストの前提。architecture §6.1）。
//
// 判定に必要な Domain の知識（Condition の分岐の読み方・種別ごとの推奨 config キー）は
// workflow の domain（`conditionBranches` / `NODE_CONFIG_KEYS`）を正とし、ここへ複製しない。
//
// 結果の並びはルール ID 昇順（= ERROR → WARNING → INFO）、同一ルール内はノードの配列順。

/** ルール ID（docs/functional-design.md §10.2 の 13 ルール）。 */
export const REVIEW_RULE_IDS = [
  'RV-E01',
  'RV-E02',
  'RV-E03',
  'RV-W01',
  'RV-W02',
  'RV-W03',
  'RV-W04',
  'RV-W05',
  'RV-W06',
  'RV-W07',
  'RV-I01',
  'RV-I02',
  'RV-I03',
] as const

export type ReviewRuleId = (typeof REVIEW_RULE_IDS)[number]

// --- Domain Model の読み取り補助 ---------------------------------------------

/**
 * config の値を表示・判定用の文字列として読む。空文字・空白のみは「未設定」として扱う。
 * 初期 config は推奨キーを空文字で埋めない方針（workflow の nodeCatalog）なので、
 * 「キーが無い」と「空文字が入っている」は同じ未設定として判定してよい。
 */
function configText(node: WorkflowNode, key: string): string | undefined {
  const value = node.data.config[key]
  if (typeof value === 'string') {
    const text = value.trim()
    return text.length > 0 ? text : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function nodesOfKind(
  graph: WorkflowGraph,
  kind: WorkflowNodeKind,
): WorkflowNode[] {
  return graph.nodes.filter((node) => node.type === kind)
}

function nodeName(node: WorkflowNode): string {
  return `「${node.data.title}」（${nodeKindLabel(node.type)}）`
}

type WorkflowIndex = {
  nodeById: Map<string, WorkflowNode>
  outgoingBySource: Map<string, WorkflowEdge[]>
  /** 少なくとも 1 本の Edge に接続されているノードの ID。 */
  connectedNodeIds: Set<string>
}

/**
 * 両端のノードが実在する Edge だけを索引に入れる。参照先を失った Edge は Canvas に
 * 描画されず、接続としても成立していないため、到達可能性・未接続判定の材料にしない。
 */
function buildIndex(graph: WorkflowGraph): WorkflowIndex {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const outgoingBySource = new Map<string, WorkflowEdge[]>()
  const connectedNodeIds = new Set<string>()

  for (const edge of graph.edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue

    const list = outgoingBySource.get(edge.source)
    if (list) list.push(edge)
    else outgoingBySource.set(edge.source, [edge])

    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  }

  return { nodeById, outgoingBySource, connectedNodeIds }
}

/**
 * start から辿って End ノードへ到達できるか。
 *
 * Cycle は禁止されていない（docs/functional-design.md §5.2）ので、訪問済み集合で
 * 必ず打ち切る。打ち切りが無いと Retry の Loop を含む Workflow で停止しない。
 */
function canReachEnd(index: WorkflowIndex, start: string): boolean {
  const visited = new Set<string>()
  const stack: string[] = [start]

  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    if (visited.has(id)) continue
    visited.add(id)

    if (index.nodeById.get(id)?.type === 'end') return true
    for (const edge of index.outgoingBySource.get(id) ?? []) {
      stack.push(edge.target)
    }
  }

  return false
}

// --- ERROR --------------------------------------------------------------------

/** RV-E01: Trigger ノードが存在しない（AC-025）。 */
function missingTrigger(graph: WorkflowGraph): ReviewFinding[] {
  if (nodesOfKind(graph, 'trigger').length > 0) return []
  return [
    {
      ruleId: 'RV-E01',
      level: 'error',
      message: 'Trigger ノードがありません。フローの起点を追加してください。',
    },
  ]
}

/** RV-E02: End ノードが存在しない（AC-026）。 */
function missingEnd(graph: WorkflowGraph): ReviewFinding[] {
  if (nodesOfKind(graph, 'end').length > 0) return []
  return [
    {
      ruleId: 'RV-E02',
      level: 'error',
      message: 'End ノードがありません。フローの終端を追加してください。',
    },
  ]
}

/**
 * RV-E03: どの Edge にも接続されていない Node がある（AC-024）。
 *
 * **note は対象外**。Note は Handle を持たず接続できない（docs/functional-design.md §5.2）
 * ため常に孤立しており、対象に含めると設計上正しい Note が必ず ERROR になる。
 */
function isolatedNodes(
  graph: WorkflowGraph,
  index: WorkflowIndex,
): ReviewFinding[] {
  return graph.nodes
    .filter(
      (node) => node.type !== 'note' && !index.connectedNodeIds.has(node.id),
    )
    .map((node) => ({
      ruleId: 'RV-E03',
      level: 'error',
      message: `${nodeName(node)} はどの Edge にも接続されていません。`,
      nodeId: node.id,
    }))
}

// --- WARNING ------------------------------------------------------------------

/** RV-W01: Condition の分岐（Source Handle）に未接続のものがある（AC-027）。 */
function unconnectedBranches(
  graph: WorkflowGraph,
  index: WorkflowIndex,
): ReviewFinding[] {
  const findings: ReviewFinding[] = []

  for (const node of nodesOfKind(graph, 'condition')) {
    const outgoing = index.outgoingBySource.get(node.id) ?? []
    for (const branch of conditionBranches(node)) {
      if (outgoing.some((edge) => edge.sourceHandle === branch)) continue
      findings.push({
        ruleId: 'RV-W01',
        level: 'warning',
        message: `${nodeName(node)} の分岐「${branch}」が未接続です。`,
        nodeId: node.id,
      })
    }
  }

  return findings
}

type RequiredConfigRule = {
  ruleId: ReviewRuleId
  kind: WorkflowNodeKind
  /** workflow の NODE_CONFIG_KEYS に含まれる推奨キーであること（テストで担保）。 */
  key: string
  label: string
}

/**
 * RV-W02〜W05: 必須 Node 設定の欠落（AC-028）。
 * 対象キーは種別ごとの推奨キー（docs/functional-design.md §3.3 = workflow の NODE_CONFIG_KEYS）
 * の部分集合であり、その整合はテストで機械的に確認する。
 */
export const REQUIRED_CONFIG_RULES: readonly RequiredConfigRule[] = [
  {
    ruleId: 'RV-W02',
    kind: 'notification',
    key: 'recipient',
    label: 'Recipient',
  },
  { ruleId: 'RV-W03', kind: 'wait', key: 'duration', label: 'Duration' },
  { ruleId: 'RV-W04', kind: 'humanTask', key: 'role', label: 'Role' },
  {
    ruleId: 'RV-W05',
    kind: 'trigger',
    key: 'system',
    label: '対象システム（system）',
  },
]

function missingRequiredConfig(graph: WorkflowGraph): ReviewFinding[] {
  const findings: ReviewFinding[] = []

  for (const rule of REQUIRED_CONFIG_RULES) {
    for (const node of nodesOfKind(graph, rule.kind)) {
      if (configText(node, rule.key) !== undefined) continue
      findings.push({
        ruleId: rule.ruleId,
        level: 'warning',
        message: `${nodeName(node)} の ${rule.label} が未設定です。`,
        nodeId: node.id,
      })
    }
  }

  return findings
}

/**
 * RV-W06: Trigger から辿って End へ到達しない（終了経路が存在しない可能性）。
 * 「その Trigger を起点にどの End にも到達できない」を判定条件とする。
 */
function triggerWithoutEnd(
  graph: WorkflowGraph,
  index: WorkflowIndex,
): ReviewFinding[] {
  return nodesOfKind(graph, 'trigger')
    .filter((node) => !canReachEnd(index, node.id))
    .map((node) => ({
      ruleId: 'RV-W06',
      level: 'warning',
      message: `${nodeName(node)} から End へ到達する経路がありません。`,
      nodeId: node.id,
    }))
}

/** RV-W07: Notification の後に終了条件（End への経路）が不明。 */
function notificationWithoutEnd(
  graph: WorkflowGraph,
  index: WorkflowIndex,
): ReviewFinding[] {
  return nodesOfKind(graph, 'notification')
    .filter((node) => !canReachEnd(index, node.id))
    .map((node) => ({
      ruleId: 'RV-W07',
      level: 'warning',
      message: `${nodeName(node)} の後に End への経路がありません。終了条件が不明です。`,
      nodeId: node.id,
    }))
}

// --- INFO（SUGGESTION）--------------------------------------------------------

/**
 * RV-I01〜I03 の判定条件は docs/functional-design.md §10.2 で「（要確認）」であり、
 * 同節の暫定方針「integration / action ノードや notes に該当記述がない場合に一律で表示する
 * 簡易判定」に従って次のとおり確定した:
 *
 * - **適用条件**: integration または action ノードが 1 つ以上あること。外部呼び出しも処理も
 *   持たない Workflow（Trigger → 通知 → End 等）に非機能の指摘を常時 3 件出すとノイズになる。
 * - **検索対象**: integration / action / note ノードの title・description・notes・config の
 *   文字列値をすべて連結したテキスト。
 * - **判定**: そのテキストにルールごとのキーワードが 1 つも現れなければ 1 件表示する。
 *   ASCII のキーワードは単語境界で照合する（`log` が `logic` に誤ヒットしないようにするため
 *   活用形は明示列挙する）。日本語のキーワードは部分一致で照合する。
 */
const SUGGESTION_SCOPE_KINDS: readonly WorkflowNodeKind[] = [
  'integration',
  'action',
  'note',
]

type SuggestionRule = {
  ruleId: ReviewRuleId
  message: string
  keywords: readonly string[]
}

const SUGGESTION_RULES: readonly SuggestionRule[] = [
  {
    ruleId: 'RV-I01',
    message:
      'API 失敗時の処理（リトライ・エラー通知など）が記載されていません。',
    keywords: [
      'error',
      'errors',
      'fail',
      'fails',
      'failed',
      'failure',
      'failures',
      'retry',
      'retries',
      'exception',
      'exceptions',
      'fallback',
      'timeout',
      '失敗',
      'エラー',
      'リトライ',
      '再試行',
      '例外',
      'タイムアウト',
    ],
  },
  {
    ruleId: 'RV-I02',
    message: '重複実行対策（冪等性の担保など）が記載されていません。',
    keywords: [
      'idempotent',
      'idempotency',
      'duplicate',
      'duplicates',
      'duplicated',
      'deduplication',
      'dedupe',
      '重複',
      '二重',
      '冪等',
      'べき等',
    ],
  },
  {
    ruleId: 'RV-I03',
    message: 'Logging（実行ログ・監査ログ）について記載がありません。',
    keywords: [
      'log',
      'logs',
      'logging',
      'logged',
      'audit',
      'auditing',
      'trace',
      'tracing',
      'monitoring',
      'ログ',
      '監査',
      '記録',
    ],
  },
]

const ASCII_WORD = /^[a-z]+$/

/** text は小文字化済み。ASCII キーワードだけ単語境界で照合する。 */
function mentions(text: string, keyword: string): boolean {
  if (!ASCII_WORD.test(keyword)) return text.includes(keyword)
  return new RegExp(`\\b${keyword}\\b`).test(text)
}

function suggestionScopeText(graph: WorkflowGraph): string {
  const parts: string[] = []

  for (const node of graph.nodes) {
    if (!SUGGESTION_SCOPE_KINDS.includes(node.type)) continue

    parts.push(node.data.title)
    if (node.data.description) parts.push(node.data.description)
    if (node.data.notes) parts.push(node.data.notes)
    for (const value of Object.values(node.data.config)) {
      if (typeof value === 'string') parts.push(value)
    }
  }

  return parts.join('\n').toLowerCase()
}

function missingSuggestions(graph: WorkflowGraph): ReviewFinding[] {
  const applies = graph.nodes.some(
    (node) => node.type === 'integration' || node.type === 'action',
  )
  if (!applies) return []

  const text = suggestionScopeText(graph)

  return SUGGESTION_RULES.filter(
    (rule) => !rule.keywords.some((keyword) => mentions(text, keyword)),
  ).map((rule) => ({
    ruleId: rule.ruleId,
    level: 'info',
    message: rule.message,
  }))
}

// --- 実行 ----------------------------------------------------------------------

/** Workflow を 13 ルールで解析する（docs/functional-design.md §10.2）。 */
export function reviewWorkflow(graph: WorkflowGraph): ReviewFinding[] {
  const index = buildIndex(graph)

  return [
    ...missingTrigger(graph),
    ...missingEnd(graph),
    ...isolatedNodes(graph, index),
    ...unconnectedBranches(graph, index),
    ...missingRequiredConfig(graph),
    ...triggerWithoutEnd(graph, index),
    ...notificationWithoutEnd(graph, index),
    ...missingSuggestions(graph),
  ]
}
