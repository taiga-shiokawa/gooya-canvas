import {
  conditionBranches,
  NODE_CONFIG_KEYS,
  nodeKindLabel,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeKind,
  type WorkflowProject,
} from '@/modules/workflow'
import { DEFAULT_PROMPT_LANGUAGE, promptLabels } from './promptLabels'
import { DEFAULT_PROMPT_TARGET, promptTargetLabel } from './promptTargets'

// Domain Model → Markdown の決定論的生成（FR-019〜FR-022 / docs/functional-design.md §9）。
//
// 生成される Markdown の**セクション構成は第 2 の外部契約**（§12）であり、
// 変更には functional-design §9.2 の更新を伴う。
//
// 純関数として書く。入力は WorkflowProject のみで、React Flow の状態も
// Date.now() / Math.random() も読まない。同じ Workflow からは常に同じ Prompt が出る。

/** 引用符やパイプを含む値で Markdown が壊れないよう、インライン強調に使う記号だけを退避する。 */
function escapeInline(value: string): string {
  return value.replace(/([*_`[\]])/g, '\\$1')
}

function bold(value: string): string {
  return `**${escapeInline(value)}**`
}

/** config の値を表示用の文字列にする。空文字は「未設定」として扱い、無い扱いにする。 */
function configText(node: WorkflowNode, key: string): string | undefined {
  const value = node.data.config[key]
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function trimmed(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const result = value.trim()
  return result.length > 0 ? result : undefined
}

/**
 * ノードの config を 1 行に畳む。推奨キーの並び（NODE_CONFIG_KEYS）を順序の正とするため、
 * 種別が増えてもここを直す必要がない。branches は Workflow 手順側で分岐として表現するので除く。
 */
function nodeSummary(node: WorkflowNode): string | undefined {
  if (node.type === 'wait') {
    const duration = configText(node, 'duration')
    const unit = configText(node, 'unit')
    const parts = [
      duration ? [duration, unit].filter(Boolean).join(' ') : unit,
      configText(node, 'until'),
    ].filter((part): part is string => part !== undefined)
    return parts.length > 0 ? parts.join(' / ') : undefined
  }

  const parts = NODE_CONFIG_KEYS[node.type]
    .filter((key) => key !== 'branches')
    .map((key) => configText(node, key))
    .filter((value): value is string => value !== undefined)

  return parts.length > 0 ? parts.join(' / ') : undefined
}

/** `**title**（Kind）— summary` の形。手順・一覧の両方で使う共通表記。 */
function nodeHeadline(node: WorkflowNode): string {
  const summary = nodeSummary(node)
  const base = `${bold(node.data.title)}（${nodeKindLabel(node.type)}）`
  return summary ? `${base} — ${escapeInline(summary)}` : base
}

type WorkflowIndex = {
  nodeById: Map<string, WorkflowNode>
  outgoingBySource: Map<string, WorkflowEdge[]>
}

function buildIndex(project: WorkflowProject): WorkflowIndex {
  const nodeById = new Map(project.nodes.map((node) => [node.id, node]))
  const outgoingBySource = new Map<string, WorkflowEdge[]>()

  // edges の配列順を保つ。同じ Workflow から常に同じ並びの Prompt が出る必要がある。
  for (const edge of project.edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue
    const list = outgoingBySource.get(edge.source)
    if (list) list.push(edge)
    else outgoingBySource.set(edge.source, [edge])
  }

  return { nodeById, outgoingBySource }
}

function nodesOfKind(
  project: WorkflowProject,
  kind: WorkflowNodeKind,
): WorkflowNode[] {
  return project.nodes.filter((node) => node.type === kind)
}

function outgoingOf(index: WorkflowIndex, nodeId: string): WorkflowEdge[] {
  return index.outgoingBySource.get(nodeId) ?? []
}

/** Condition の分岐に対応する Edge。sourceHandle で対応づける（functional-design §5.3）。 */
function edgesForBranch(
  index: WorkflowIndex,
  nodeId: string,
  branch: string,
): WorkflowEdge[] {
  return outgoingOf(index, nodeId).filter(
    (edge) => edge.sourceHandle === branch,
  )
}

// --- ## Workflow -------------------------------------------------------------

type WalkContext = {
  index: WorkflowIndex
  labels: ReturnType<typeof promptLabels>
  /** この Trigger 起点の走査で既に手順として書き出したノード。合流と Cycle の両方をここで止める。 */
  described: Set<string>
  lines: string[]
}

const INDENT = '  '

function walkFrom(context: WalkContext, nodeId: string, depth: number): void {
  const node = context.index.nodeById.get(nodeId)
  if (!node) return

  const pad = INDENT.repeat(depth)

  // Cycle（Retry 等）と合流を同じ扱いで止める。接続時に Cycle を禁止していない以上
  // （functional-design §5.2）、ここで止めないと無限に展開される。
  if (context.described.has(nodeId)) {
    context.lines.push(
      `${pad}1. ${context.labels.mergesInto(bold(node.data.title))}`,
    )
    return
  }
  context.described.add(nodeId)

  context.lines.push(`${pad}1. ${nodeHeadline(node)}`)

  if (node.type === 'condition') {
    for (const branch of conditionBranches(node)) {
      const edges = edgesForBranch(context.index, node.id, branch)
      context.lines.push(`${pad}${INDENT}- ${bold(branch)}:`)
      if (edges.length === 0) {
        context.lines.push(
          `${pad}${INDENT}${INDENT}- ${context.labels.terminates}`,
        )
        continue
      }
      for (const edge of edges) {
        walkFrom(context, edge.target, depth + 2)
      }
    }
    return
  }

  const outgoing = outgoingOf(context.index, node.id)
  if (outgoing.length === 1) {
    // 直列はネストを深くせず同じ階層に続ける。深い入れ子は読みにくいため。
    walkFrom(context, outgoing[0].target, depth)
    return
  }
  for (const edge of outgoing) {
    walkFrom(context, edge.target, depth + 1)
  }
}

function workflowSection(
  project: WorkflowProject,
  index: WorkflowIndex,
  labels: ReturnType<typeof promptLabels>,
): string[] {
  const triggers = nodesOfKind(project, 'trigger')
  if (triggers.length === 0) return [labels.noTrigger]

  const lines: string[] = []
  // Trigger が複数ある場合は各 Trigger 起点で列挙する（§9.1）
  for (const trigger of triggers) {
    if (lines.length > 0) lines.push('')
    lines.push(`### ${labels.entryPoint(escapeInline(trigger.data.title))}`)
    lines.push('')
    walkFrom({ index, labels, described: new Set(), lines }, trigger.id, 0)
  }
  return lines
}

// --- 一覧系のセクション -------------------------------------------------------

function bulletList(nodes: WorkflowNode[]): string[] {
  return nodes.map((node) => `- ${nodeHeadline(node)}`)
}

function conditionsSection(
  project: WorkflowProject,
  index: WorkflowIndex,
  labels: ReturnType<typeof promptLabels>,
): string[] {
  const lines: string[] = []

  for (const node of nodesOfKind(project, 'condition')) {
    lines.push(`- ${nodeHeadline(node)}`)
    for (const branch of conditionBranches(node)) {
      const targets = edgesForBranch(index, node.id, branch)
        .map((edge) => index.nodeById.get(edge.target))
        .filter((target): target is WorkflowNode => target !== undefined)

      lines.push(
        targets.length === 0
          ? `${INDENT}- ${labels.branchUnconnected(bold(branch))}`
          : `${INDENT}- ${labels.branchLeadsTo(
              bold(branch),
              targets.map((target) => bold(target.data.title)).join(' / '),
            )}`,
      )
    }
  }

  return lines
}

function constraintsSection(
  project: WorkflowProject,
  labels: ReturnType<typeof promptLabels>,
): string[] {
  const lines: string[] = []

  for (const node of nodesOfKind(project, 'ai')) {
    const constraints = configText(node, 'constraints')
    if (constraints) {
      lines.push(`- ${bold(node.data.title)}: ${escapeInline(constraints)}`)
    }
  }

  const additional = trimmed(project.promptSettings?.additionalInstructions)
  if (additional) {
    lines.push(
      `- ${labels.additionalInstructions}: ${escapeInline(additional)}`,
    )
  }

  return lines
}

function notesSection(project: WorkflowProject): string[] {
  // Note は処理に参加しないため手順には現れない。コメントとしてここへ出す（FR-022）。
  return nodesOfKind(project, 'note').map((node) => {
    const body = trimmed(node.data.notes) ?? trimmed(node.data.description)
    return body
      ? `- ${bold(node.data.title)}: ${escapeInline(body)}`
      : `- ${bold(node.data.title)}`
  })
}

function acceptanceCriteriaSection(
  project: WorkflowProject,
  index: WorkflowIndex,
  labels: ReturnType<typeof promptLabels>,
): string[] {
  // MVP では Workflow の分岐から機械的に導出できる範囲に留める（§9.2 の暫定方針）。
  const lines: string[] = []

  for (const node of nodesOfKind(project, 'condition')) {
    for (const branch of conditionBranches(node)) {
      for (const edge of edgesForBranch(index, node.id, branch)) {
        const target = index.nodeById.get(edge.target)
        if (!target) continue
        lines.push(
          `- ${labels.criterion(
            bold(node.data.title),
            bold(branch),
            bold(target.data.title),
          )}`,
        )
      }
    }
  }

  for (const node of nodesOfKind(project, 'end')) {
    const outcome = configText(node, 'outcome')
    if (outcome) {
      lines.push(
        `- ${labels.criterionEnd(bold(node.data.title), escapeInline(outcome))}`,
      )
    }
  }

  return lines
}

// --- 組み立て ----------------------------------------------------------------

function section(heading: string, body: string[]): string[] {
  // 該当データがないセクションは省略する（§9.2 冒頭）
  if (body.length === 0) return []
  return [`## ${heading}`, '', ...body, '']
}

/**
 * WorkflowProject から実装依頼の Markdown を生成する。
 *
 * `## Open Questions`（§9.2）は Flow Review の結果を転記するセクションだが、
 * Flow Review は Phase 6 のため現時点では生成しない。「該当データがないセクションは
 * 省略する」に従って出力から落ちる。
 */
export function generatePrompt(project: WorkflowProject): string {
  const labels = promptLabels(
    project.promptSettings?.language ?? DEFAULT_PROMPT_LANGUAGE,
  )
  const target = project.promptSettings?.target ?? DEFAULT_PROMPT_TARGET
  const index = buildIndex(project)

  const lines: string[] = [
    `# ${labels.documentTitle}`,
    '',
    labels.intro(escapeInline(project.metadata.name)),
    '',
    `${labels.implementationTarget}: ${promptTargetLabel(target)}`,
    '',
  ]

  const description = trimmed(project.metadata.description)
  if (description) {
    lines.push(...section(labels.purpose, [escapeInline(description)]))
  }

  lines.push(
    ...section(labels.workflow, workflowSection(project, index, labels)),
    ...section(labels.trigger, bulletList(nodesOfKind(project, 'trigger'))),
    ...section(labels.conditions, conditionsSection(project, index, labels)),
    ...section(
      labels.humanTasks,
      bulletList(nodesOfKind(project, 'humanTask')),
    ),
    ...section(
      labels.notifications,
      bulletList(nodesOfKind(project, 'notification')),
    ),
    ...section(labels.constraints, constraintsSection(project, labels)),
    ...section(labels.notes, notesSection(project)),
    ...section(
      labels.acceptanceCriteria,
      acceptanceCriteriaSection(project, index, labels),
    ),
  )

  // 末尾の空行を 1 本の改行に畳む
  return `${lines.join('\n').trimEnd()}\n`
}
