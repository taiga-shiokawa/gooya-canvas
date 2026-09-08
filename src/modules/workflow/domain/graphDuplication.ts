import type { WorkflowGraph } from './conditionBranchEditing'
import type { WorkflowEdge, WorkflowNode, WorkflowPosition } from './types'

// 複製 / Copy / Paste の純関数（FR-004 / AC-006 / docs/functional-design.md §5.1）。
//
// canvas の Context Menu・Ctrl+D・Ctrl+C / Ctrl+V はいずれも
// 「選択集合をサブグラフとして取り出し、新 ID で複製して元のグラフへ足す」操作であり、
// その中身は Domain Model だけで完結する。canvas の application に置くと
// React 抜きでテストできる範囲が狭くなるため、workflow の domain に純関数として置く。
//
// ID 採番（AD-08）は非決定的なので関数内では呼ばず、`newId` として受け取る
// （docs/development-guidelines.md §2.2）。

export type DuplicateSubgraphOptions = {
  /** 複製したノードを元の位置からずらす量。重なって見分けが付かなくなるのを避ける。 */
  offset: WorkflowPosition
  /** 新しい ID の採番。呼び出し側が `crypto.randomUUID` を渡す。 */
  newId: () => string
}

/**
 * 指定ノードと、**その集合の中で閉じている Edge だけ**を取り出す（§5.1 Copy / Paste）。
 *
 * 集合の外へ出る（片端が選択されていない）Edge を含めないのは、複製した Edge が
 * 元のノードを指してしまい、コピー元とコピー先が繋がった別物のグラフになるため。
 * ノードの並び順は元のグラフの順序を保つ（複製結果の並びを安定させるため）。
 */
export function extractSubgraph(
  graph: WorkflowGraph,
  nodeIds: readonly string[],
): WorkflowGraph {
  const selected = new Set(nodeIds)

  return {
    nodes: graph.nodes.filter((node) => selected.has(node.id)),
    edges: graph.edges.filter(
      (edge) => selected.has(edge.source) && selected.has(edge.target),
    ),
  }
}

/**
 * サブグラフを新しい ID で複製する。Node の設定値（`data`）は引き継ぎ、位置だけずらす。
 *
 * `data` と `config` は浅くコピーする。ドメインの更新はすべて非破壊（スプレッド）で
 * 行う規約なので参照共有でも壊れないが、複製元と複製先が同じ `config` オブジェクトを
 * 共有している状態は事故のもとなので、1 段だけ切っておく。
 */
export function duplicateSubgraph(
  subgraph: WorkflowGraph,
  options: DuplicateSubgraphOptions,
): WorkflowGraph {
  const idByOriginal = new Map<string, string>()
  for (const node of subgraph.nodes) idByOriginal.set(node.id, options.newId())

  const nodes: WorkflowNode[] = subgraph.nodes.map((node) => ({
    ...node,
    id: idByOriginal.get(node.id) ?? options.newId(),
    position: {
      x: node.position.x + options.offset.x,
      y: node.position.y + options.offset.y,
    },
    data: { ...node.data, config: { ...node.data.config } },
  }))

  const edges: WorkflowEdge[] = []
  for (const edge of subgraph.edges) {
    const source = idByOriginal.get(edge.source)
    const target = idByOriginal.get(edge.target)
    // 片端が複製対象外の Edge は複製しない（extractSubgraph で除いてあるが、
    // 任意のサブグラフを渡されても不整合を作らないようにここでも守る）
    if (source === undefined || target === undefined) continue

    edges.push({ ...edge, id: options.newId(), source, target })
  }

  return { nodes, edges }
}
