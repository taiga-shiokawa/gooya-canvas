import {
  conditionBranches,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowPosition,
  type WorkflowViewport,
} from '@/modules/workflow'
import type {
  Connection,
  Edge,
  Node,
  Viewport,
  XYPosition,
} from '@xyflow/react'
import type { WorkflowNodeCardData } from './nodes/workflowNodeCardData'

// Domain Model と React Flow 型の相互変換（docs/repository-structure.md §4.3）。
// React Flow 型が canvas モジュール外へ漏れないよう、変換はここに閉じる（NFR-010）。
// 6 関数の構成とシグネチャは docs/functional-design.md §2.4 が所有する。変えない。

type WorkflowGraph = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

type ReactFlowGraph = {
  nodes: Node[]
  edges: Edge[]
}

/** Condition 以外は分岐を持たない。毎回 [] を作ると merge が常に変化ありと誤判定するため共有する。 */
const NO_BRANCHES: readonly string[] = []

export function toReactFlow(graph: WorkflowGraph): ReactFlowGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      // Domain の種別をそのまま React Flow の type にし、nodeTypes の登録と対応づける。
      type: node.type,
      position: node.position,
      data: {
        kind: node.type,
        title: node.data.title,
        description: node.data.description,
        branches:
          node.type === 'condition' ? conditionBranches(node) : NO_BRANCHES,
      } satisfies WorkflowNodeCardData,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      data: edge.data,
    })),
  }
}

// React Flow は measured / selected などの描画用フィールドを渡したノード・エッジ
// オブジェクト自身に保持する。Domain Model から毎回作り直すとそれらが失われ、
// MiniMap が描画されないなどの不整合が起きるため、既存要素は再生成せず、
// Domain 由来の値だけを差し替える。変化が無い場合は同一参照を返す。

/** 分岐名は配列の中身で比較する。参照比較だと Condition ノードが毎回作り直される。 */
function sameBranches(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  return a.length === b.length && a.every((value, index) => value === b[index])
}

// 比較漏れは「Inspector で編集しても Canvas に反映されない」という形で表面化する
// （AC-011）。data のフィールドを増やしたらここも必ず増やすこと。
function sameNodeData(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  return (
    previous.kind === next.kind &&
    previous.title === next.title &&
    previous.description === next.description &&
    sameBranches(previous.branches, next.branches)
  )
}

function sameEdgeData(previous: Edge, next: Edge): boolean {
  return (
    previous.source === next.source &&
    previous.target === next.target &&
    previous.sourceHandle === next.sourceHandle &&
    previous.targetHandle === next.targetHandle &&
    previous.label === next.label &&
    previous.data?.description === next.data?.description
  )
}

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
      !sameNodeData(existing.data, node.data)
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
    if (!sameEdgeData(existing, edge)) {
      changed = true
      return { ...existing, ...edge }
    }
    if (previous[index] !== existing) changed = true
    return existing
  })

  return changed ? merged : (previous as Edge[])
}

// onConnect は Connection を、isValidConnection は Edge | Connection を渡してくる。
// handle の null / undefined 差もここで吸収し、Domain 側へ持ち込まない。
export function fromReactFlowConnection(connection: Connection | Edge): {
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

// Viewport はプロジェクトファイルへ保存される Domain の値でもある（functional-design §3.2）。
// 構造は同形だが、React Flow の型を canvas の外へ出さないため往復とも mapper を通す。

export function fromReactFlowViewport(viewport: Viewport): WorkflowViewport {
  return { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
}

export function toReactFlowViewport(viewport: WorkflowViewport): Viewport {
  return { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
}

export function sameViewport(
  a: WorkflowViewport,
  b: WorkflowViewport,
): boolean {
  return a.x === b.x && a.y === b.y && a.zoom === b.zoom
}
