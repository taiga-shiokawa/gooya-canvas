import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowPosition,
} from '@/modules/workflow'
import type { Connection, Edge, Node, XYPosition } from '@xyflow/react'

// Domain Model と React Flow 型の相互変換（docs/repository-structure.md §4.3）。
// React Flow 型が canvas モジュール外へ漏れないよう、変換はここに閉じる（NFR-010）。

type WorkflowGraph = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

type ReactFlowGraph = {
  nodes: Node[]
  edges: Edge[]
}

export function toReactFlow(graph: WorkflowGraph): ReactFlowGraph {
  return {
    // Phase 1 は React Flow デフォルトノードを使う（`type` 未指定）。
    // 種別別 Custom Node は Phase 2 で nodeTypes を登録し、この写像だけを差し替える。
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: { label: node.data.title },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
    })),
  }
}

// React Flow は measured / selected などの描画用フィールドを渡したノード・エッジ
// オブジェクト自身に保持する。Domain Model から毎回作り直すとそれらが失われ、
// MiniMap が描画されないなどの不整合が起きるため、既存要素は再生成せず、
// Domain 由来の値だけを差し替える。変化が無い場合は同一参照を返す。
export function mergeReactFlowNodes(
  previous: readonly Node[],
  next: readonly Node[],
): Node[] {
  const previousById = new Map(previous.map((node) => [node.id, node]))
  let changed = previous.length !== next.length

  const merged = next.map((node, index) => {
    const existing = previousById.get(node.id)
    if (!existing) {
      changed = true
      return node
    }
    if (
      existing.position.x !== node.position.x ||
      existing.position.y !== node.position.y ||
      existing.data.label !== node.data.label
    ) {
      changed = true
      return { ...existing, position: node.position, data: node.data }
    }
    if (previous[index] !== existing) changed = true
    return existing
  })

  return changed ? merged : (previous as Node[])
}

export function mergeReactFlowEdges(
  previous: readonly Edge[],
  next: readonly Edge[],
): Edge[] {
  const previousById = new Map(previous.map((edge) => [edge.id, edge]))
  let changed = previous.length !== next.length

  const merged = next.map((edge, index) => {
    const existing = previousById.get(edge.id)
    if (!existing) {
      changed = true
      return edge
    }
    if (
      existing.source !== edge.source ||
      existing.target !== edge.target ||
      existing.sourceHandle !== edge.sourceHandle ||
      existing.targetHandle !== edge.targetHandle ||
      existing.label !== edge.label
    ) {
      changed = true
      return { ...existing, ...edge }
    }
    if (previous[index] !== existing) changed = true
    return existing
  })

  return changed ? merged : (previous as Edge[])
}

export function fromReactFlowConnection(connection: Connection): {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
} {
  return {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
  }
}

export function fromReactFlowPosition(position: XYPosition): WorkflowPosition {
  return { x: position.x, y: position.y }
}

export function fromReactFlowIds(items: readonly { id: string }[]): string[] {
  return items.map((item) => item.id)
}
