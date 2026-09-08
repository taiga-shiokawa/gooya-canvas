import { conditionBranches } from './nodeCatalog'
import type { WorkflowEdge, WorkflowNode } from './types'

// Condition の分岐編集（FR-010 / docs/functional-design.md §5.3）。
// 分岐名は Edge の sourceHandle と 1 対 1 で対応するため、分岐を書き換えるときは
// ノードと Edge を必ず同時に整合させる。inspector は domain 層を持たない
// （docs/repository-structure.md §2.1）ので、この整合処理は workflow の domain に純関数として置く。
//
// 3 関数はいずれも「変更が無ければ入力の配列参照をそのまま返す」。呼び出し側（ユースケース）が
// 参照比較で no-op を判定し、無意味な dirty を立てずに済むようにするため。

export type WorkflowGraph = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/** 分岐は最低 2 つ必要（FR-010 / docs/functional-design.md §3.3）。 */
export const MIN_CONDITION_BRANCHES = 2

type ConditionBranchTarget = {
  nodeId: string
  index: number
}

function findConditionNode(
  nodes: readonly WorkflowNode[],
  nodeId: string,
): WorkflowNode | undefined {
  const node = nodes.find((candidate) => candidate.id === nodeId)
  return node?.type === 'condition' ? node : undefined
}

/** 変換の結果が 1 件も変わらなければ元の配列を返す（参照維持）。 */
function mapChanged<T>(items: T[], transform: (item: T) => T): T[] {
  let changed = false
  const next = items.map((item) => {
    const updated = transform(item)
    if (updated !== item) changed = true
    return updated
  })
  return changed ? next : items
}

function withBranches(
  nodes: WorkflowNode[],
  target: WorkflowNode,
  branches: string[],
): WorkflowNode[] {
  return mapChanged(nodes, (node) =>
    node.id === target.id
      ? {
          ...node,
          data: {
            ...node.data,
            // branches 以外の config キーは触らない（未知キーを持つファイルの後方互換）
            config: { ...node.data.config, branches },
          },
        }
      : node,
  )
}

/** 既存と重複しない既定名を決める（純関数。ID 採番のような非決定的要素を持ち込まない）。 */
function nextBranchName(branches: readonly string[]): string {
  let index = branches.length + 1
  while (branches.includes(`Branch ${index}`)) index += 1
  return `Branch ${index}`
}

/** 分岐を 1 つ追加する。Edge は増えない（新しい Source Handle は未接続で始まる）。 */
export function addConditionBranch(
  graph: WorkflowGraph,
  input: { nodeId: string },
): WorkflowGraph {
  const node = findConditionNode(graph.nodes, input.nodeId)
  if (!node) return graph

  const branches = conditionBranches(node)
  return {
    nodes: withBranches(graph.nodes, node, [
      ...branches,
      nextBranchName(branches),
    ]),
    edges: graph.edges,
  }
}

/**
 * 分岐名を変更し、その分岐から出ている Edge を追随させる（docs/functional-design.md §5.3）。
 * sourceHandle は必ず新名へ、label は旧分岐名のままだった場合のみ新名へ更新する
 * （ユーザーが独自に付け替えた label を勝手に書き戻さないため）。
 * 空白のみ・他の分岐との重複・変更なしは no-op とする（孤立 sourceHandle を作らないため）。
 */
export function renameConditionBranch(
  graph: WorkflowGraph,
  input: ConditionBranchTarget & { name: string },
): WorkflowGraph {
  const node = findConditionNode(graph.nodes, input.nodeId)
  if (!node) return graph

  const branches = conditionBranches(node)
  const previous = branches[input.index]
  if (previous === undefined) return graph

  const name = input.name.trim()
  if (name === '' || name === previous) return graph
  if (
    branches.some((branch, index) => index !== input.index && branch === name)
  )
    return graph

  return {
    nodes: withBranches(
      graph.nodes,
      node,
      branches.map((branch, index) => (index === input.index ? name : branch)),
    ),
    edges: mapChanged(graph.edges, (edge) =>
      edge.source === node.id && edge.sourceHandle === previous
        ? {
            ...edge,
            sourceHandle: name,
            label: edge.label === previous ? name : edge.label,
          }
        : edge,
    ),
  }
}

/**
 * 分岐を削除し、その分岐に紐づく Edge も削除する。
 * 孤立した sourceHandle を持つ Edge を残すと Canvas 上で描画されないまま Domain Model に
 * 残り続け、Prompt / Review / 保存 JSON へ紛れ込むため、Node 削除（canvas の removeNodes）と
 * 同じく接続ごと削除する。分岐が MIN_CONDITION_BRANCHES を下回る削除は no-op とする。
 */
export function removeConditionBranch(
  graph: WorkflowGraph,
  input: ConditionBranchTarget,
): WorkflowGraph {
  const node = findConditionNode(graph.nodes, input.nodeId)
  if (!node) return graph

  const branches = conditionBranches(node)
  if (branches.length <= MIN_CONDITION_BRANCHES) return graph

  const removed = branches[input.index]
  if (removed === undefined) return graph

  const edges = graph.edges.filter(
    (edge) => !(edge.source === node.id && edge.sourceHandle === removed),
  )

  return {
    nodes: withBranches(
      graph.nodes,
      node,
      branches.filter((_branch, index) => index !== input.index),
    ),
    edges: edges.length === graph.edges.length ? graph.edges : edges,
  }
}
