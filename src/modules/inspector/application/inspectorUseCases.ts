import { useWorkflowStore, withHistoryGroup } from '@/modules/shared'
import {
  addConditionBranch as addConditionBranchToGraph,
  removeConditionBranch as removeConditionBranchFromGraph,
  renameConditionBranch as renameConditionBranchInGraph,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
} from '@/modules/workflow'

// Inspector からの store 更新の唯一の入口。presentation は store の setter を直接呼ばない。
// 編集は Domain Model を直接書き換えるため、Canvas へは store 購読経由で即座に反映される（AC-011）。
//
// Undo 履歴の確定単位（docs/functional-design.md §6 / §11）: 1 文字ごとに履歴が積まれると
// Ctrl+Z が打鍵数ぶん必要になるため、`withHistoryGroup` で「同じフィールドへの連続入力」を
// 1 件にまとめる。即時反映（AC-011）はそのまま維持し、まとめるのは履歴だけである。
// Condition の分岐名だけは確定操作（blur / Enter）で反映されるためグループ化しない。

type NodeTextField = 'title' | 'description' | 'notes'

/**
 * 空文字（空白のみを含む）は「未設定」として値を持たせない。
 * 空文字を保存すると Flow Review の欠落判定（RV-W02〜W05）が「設定済み」と誤認するため。
 */
function optionalText(value: string): string | undefined {
  return value.trim() === '' ? undefined : value
}

function updateNode(
  id: string,
  transform: (node: WorkflowNode) => WorkflowNode,
): void {
  const { nodes, setNodes } = useWorkflowStore.getState()
  if (!nodes.some((node) => node.id === id)) return

  setNodes(nodes.map((node) => (node.id === id ? transform(node) : node)))
}

function updateEdge(
  id: string,
  transform: (edge: WorkflowEdge) => WorkflowEdge,
): void {
  const { edges, setEdges } = useWorkflowStore.getState()
  if (!edges.some((edge) => edge.id === id)) return

  setEdges(edges.map((edge) => (edge.id === id ? transform(edge) : edge)))
}

/**
 * 分岐編集の結果を store へ書き戻す。変化が無い配列は書き戻さない（無意味な dirty を避ける）。
 * nodes / edges は setGraph で 1 回にまとめる（Undo 1 回で戻せるようにするため。§11）。
 */
function applyGraph(next: WorkflowGraph): void {
  const { nodes, edges, setGraph } = useWorkflowStore.getState()
  if (next.nodes === nodes && next.edges === edges) return

  setGraph({ nodes: next.nodes, edges: next.edges })
}

/** 共通項目（Name / Description / Notes）の更新（docs/functional-design.md §6）。 */
export function updateNodeText(
  id: string,
  field: NodeTextField,
  value: string,
): void {
  withHistoryGroup(`node:${id}:${field}`, () => {
    updateNode(id, (node) => {
      switch (field) {
        case 'title':
          // Name は必須項目なので空でもキーを残す（型が string を要求する）
          return { ...node, data: { ...node.data, title: value } }
        case 'description':
          return {
            ...node,
            data: { ...node.data, description: optionalText(value) },
          }
        case 'notes':
          return { ...node, data: { ...node.data, notes: optionalText(value) } }
      }
    })
  })
}

function withConfigValue(
  config: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const next = { ...config }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

/** 種別別フォームの文字列項目（docs/functional-design.md §3.3 の推奨キー）。 */
export function updateNodeConfigText(
  id: string,
  key: string,
  value: string,
): void {
  withHistoryGroup(`node:${id}:config:${key}`, () => {
    updateNode(id, (node) => ({
      ...node,
      data: {
        ...node.data,
        config: withConfigValue(node.data.config, key, optionalText(value)),
      },
    }))
  })
}

/** 数値項目（Wait の duration）。数値として読めない入力は無視し、config を壊さない。 */
export function updateNodeConfigNumber(
  id: string,
  key: string,
  value: string,
): void {
  const trimmed = value.trim()
  if (trimmed === '') {
    updateNodeConfigText(id, key, '')
    return
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return

  withHistoryGroup(`node:${id}:config:${key}`, () => {
    updateNode(id, (node) => ({
      ...node,
      data: {
        ...node.data,
        config: withConfigValue(node.data.config, key, parsed),
      },
    }))
  })
}

/** Condition の分岐を 1 つ追加する（FR-010）。 */
export function addConditionBranch(nodeId: string): void {
  const { nodes, edges } = useWorkflowStore.getState()
  applyGraph(addConditionBranchToGraph({ nodes, edges }, { nodeId }))
}

/** 分岐名を変更し、該当 Edge の sourceHandle / label を追随させる（docs/functional-design.md §5.3）。 */
export function renameConditionBranch(
  nodeId: string,
  index: number,
  name: string,
): void {
  const { nodes, edges } = useWorkflowStore.getState()
  applyGraph(
    renameConditionBranchInGraph({ nodes, edges }, { nodeId, index, name }),
  )
}

/** 分岐を削除する。その分岐に紐づく Edge も削除される。分岐が 2 つ未満になる操作は無視される。 */
export function removeConditionBranch(nodeId: string, index: number): void {
  const { nodes, edges } = useWorkflowStore.getState()
  applyGraph(
    removeConditionBranchFromGraph({ nodes, edges }, { nodeId, index }),
  )
}

/** Edge の Label（docs/functional-design.md §5.3 / §6）。 */
export function updateEdgeLabel(id: string, value: string): void {
  withHistoryGroup(`edge:${id}:label`, () => {
    updateEdge(id, (edge) => ({ ...edge, label: optionalText(value) }))
  })
}

/** Edge の Description。data は description のみを持つため、未設定なら data ごと落とす。 */
export function updateEdgeDescription(id: string, value: string): void {
  withHistoryGroup(`edge:${id}:description`, () => {
    updateEdge(id, (edge) => {
      const description = optionalText(value)
      return {
        ...edge,
        data: description === undefined ? undefined : { description },
      }
    })
  })
}
