import { useWorkflowStore } from '@/modules/shared'
import {
  canConnect,
  createDefaultNodeData,
  type WorkflowEdge,
  type WorkflowNodeKind,
  type WorkflowPosition,
  type WorkflowViewport,
} from '@/modules/workflow'

// store 更新の唯一の入口。presentation は store の setter を直接呼ばない。
// ID 採番は crypto.randomUUID()（AD-08）。

type AddNodeInput = {
  kind: WorkflowNodeKind
  position: WorkflowPosition
}

type ConnectNodesInput = {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

type SelectElementsInput = {
  nodeIds: readonly string[]
  edgeIds: readonly string[]
}

/**
 * 選択状態を store へ publish する（docs/functional-design.md §2.4。Phase 3 で canvas から移管）。
 * React Flow 型は持ち込まず ID のみを渡す（NFR-010）。選択では dirty を立てない（store 側で担保）。
 * store は Edge を単数（selectedEdgeId）で持つため、複数 Edge の選択は「単一選択ではない」
 * として null を publish する（Inspector は単一選択のときだけ編集させる）。
 */
export function selectElements(input: SelectElementsInput): void {
  const { setSelection } = useWorkflowStore.getState()
  setSelection({
    nodeIds: input.nodeIds,
    edgeId: input.edgeIds.length === 1 ? input.edgeIds[0] : null,
  })
}

/**
 * Review Panel からの Node フォーカス要求を購読する（FR-024 / docs/functional-design.md §10.3）。
 *
 * review モジュールは @xyflow/react を import できない（repository-structure §5.1 #5）ため
 * Canvas を直接動かせない。代わりに shared の store へ要求を置き、canvas がそれを購読して
 * 実行する。要求は単調増加の token を持つので、同じノードを続けてクリックしても毎回通知される。
 *
 * 選択状態の所有者は store（§2.4）であり、Canvas がその ID を React Flow の `selected` へ
 * 反映する構成なので、選択の publish はここ（canvas 側）で行い review には持たせない。
 */
export function subscribeNodeFocusRequests(
  onFocus: (nodeId: string) => void,
): () => void {
  let handledToken = useWorkflowStore.getState().nodeFocusRequest?.token ?? 0

  return useWorkflowStore.subscribe((state) => {
    const request = state.nodeFocusRequest
    if (!request || request.token === handledToken) return
    handledToken = request.token

    selectElements({ nodeIds: [request.nodeId], edgeIds: [] })
    onFocus(request.nodeId)
  })
}

export function addNode(input: AddNodeInput): void {
  const { nodes, setNodes } = useWorkflowStore.getState()
  setNodes([
    ...nodes,
    {
      id: crypto.randomUUID(),
      type: input.kind,
      position: input.position,
      data: createDefaultNodeData(input.kind),
    },
  ])
}

export type NodeMove = {
  id: string
  position: WorkflowPosition
}

/**
 * ノードの位置を反映する。**1 回の呼び出しが Undo 履歴 1 件**になる（§11）。
 *
 * ドラッグ中は Canvas 側がここを呼ばず、ドラッグ終了時にまとめて 1 回だけ呼ぶ。
 * 位置が 1 つも変わっていない場合は何もしない（クリックしただけのドラッグで
 * 履歴が積まれたり dirty が立ったりしないようにするため）。
 */
export function moveNodes(moves: readonly NodeMove[]): void {
  const { nodes, setNodes } = useWorkflowStore.getState()
  const positionById = new Map(moves.map((move) => [move.id, move.position]))

  let changed = false
  const next = nodes.map((node) => {
    const position = positionById.get(node.id)
    if (
      position === undefined ||
      (position.x === node.position.x && position.y === node.position.y)
    )
      return node

    changed = true
    return { ...node, position }
  })

  if (changed) setNodes(next)
}

/** 接続の許否だけを問う（React Flow の isValidConnection 用）。store を変更しない。 */
export function isConnectionAllowed(source: string, target: string): boolean {
  const { nodes } = useWorkflowStore.getState()
  return canConnect({
    source: nodes.find((node) => node.id === source),
    target: nodes.find((node) => node.id === target),
  }).allowed
}

export function connectNodes(input: ConnectNodesInput): void {
  const { nodes, edges, setEdges } = useWorkflowStore.getState()

  const source = nodes.find((node) => node.id === input.source)
  const target = nodes.find((node) => node.id === input.target)

  // 種別ごとの接続ルール（FR-007 / docs/functional-design.md §5.2）。
  // 不許可の接続は無言で作成しない。理由の UI 提示は Phase 3 以降で扱う。
  if (!canConnect({ source, target }).allowed) return

  const edge: WorkflowEdge = {
    id: crypto.randomUUID(),
    source: input.source,
    target: input.target,
    sourceHandle: input.sourceHandle,
    targetHandle: input.targetHandle,
    // Condition から出る Edge は分岐名を label の初期値にする（docs/functional-design.md §5.3）。
    label:
      source?.type === 'condition'
        ? (input.sourceHandle ?? undefined)
        : undefined,
  }
  setEdges([...edges, edge])
}

/**
 * Node を削除する。接続されている Edge も必ず同時に削除し、孤立 Edge を残さない。
 * nodes / edges は setGraph で 1 回にまとめる（Undo 1 回で戻せるようにするため。§11）。
 */
export function removeNodes(ids: readonly string[]): void {
  const { nodes, edges, setGraph } = useWorkflowStore.getState()
  const removed = new Set(ids)

  setGraph({
    nodes: nodes.filter((node) => !removed.has(node.id)),
    edges: edges.filter(
      (edge) => !removed.has(edge.source) && !removed.has(edge.target),
    ),
  })
}

export function removeEdges(ids: readonly string[]): void {
  const { edges, setEdges } = useWorkflowStore.getState()
  const removed = new Set(ids)

  setEdges(edges.filter((edge) => !removed.has(edge.id)))
}

/**
 * Pan / Zoom の結果を store へ反映する。viewport はプロジェクトファイルへ保存される
 * Domain の値だが、dirty は立てない（docs/functional-design.md §2.4）。
 */
export function updateViewport(viewport: WorkflowViewport): void {
  useWorkflowStore.getState().setViewport(viewport)
}
