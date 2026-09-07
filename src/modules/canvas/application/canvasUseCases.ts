import { useWorkflowStore } from '@/modules/shared'
import type {
  WorkflowEdge,
  WorkflowNodeKind,
  WorkflowPosition,
} from '@/modules/workflow'

// store 更新の唯一の入口。presentation は store の setter を直接呼ばない。
// ID 採番は crypto.randomUUID()（AD-08）。

type AddNodeInput = {
  kind: WorkflowNodeKind
  position: WorkflowPosition
  title: string
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
      // 種別ごとの初期 config の投入は Phase 2〜3 のスコープ
      data: { title: input.title, config: {} },
    },
  ])
}

export function moveNode(id: string, position: WorkflowPosition): void {
  const { nodes, setNodes } = useWorkflowStore.getState()
  setNodes(nodes.map((node) => (node.id === id ? { ...node, position } : node)))
}

export function connectNodes(input: ConnectNodesInput): void {
  // 自分自身への接続は禁止（docs/functional-design.md §5.2）。
  // 種別ごとの接続ルールは Phase 2 で実装する。
  if (input.source === input.target) return

  const { edges, setEdges } = useWorkflowStore.getState()
  const edge: WorkflowEdge = {
    id: crypto.randomUUID(),
    source: input.source,
    target: input.target,
    sourceHandle: input.sourceHandle,
    targetHandle: input.targetHandle,
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
