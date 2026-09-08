import { useWorkflowStore } from '@/modules/shared'
import {
  canConnect,
  createDefaultNodeData,
  type WorkflowEdge,
  type WorkflowNodeKind,
  type WorkflowPosition,
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

export function moveNode(id: string, position: WorkflowPosition): void {
  const { nodes, setNodes } = useWorkflowStore.getState()
  setNodes(nodes.map((node) => (node.id === id ? { ...node, position } : node)))
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

/** Node を削除する。接続されている Edge も必ず同時に削除し、孤立 Edge を残さない。 */
export function removeNodes(ids: readonly string[]): void {
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore.getState()
  const removed = new Set(ids)

  setNodes(nodes.filter((node) => !removed.has(node.id)))
  setEdges(
    edges.filter(
      (edge) => !removed.has(edge.source) && !removed.has(edge.target),
    ),
  )
}

export function removeEdges(ids: readonly string[]): void {
  const { edges, setEdges } = useWorkflowStore.getState()
  const removed = new Set(ids)

  setEdges(edges.filter((edge) => !removed.has(edge.id)))
}
