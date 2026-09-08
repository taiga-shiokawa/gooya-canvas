import { useWorkflowStore, type WorkflowGraphState } from '@/modules/shared'
import { duplicateSubgraph, extractSubgraph } from '@/modules/workflow'

// 選択中の要素に対する編集操作（FR-004 / AC-006 / docs/functional-design.md §5.1 / §5.4 / §5.5）。
// Edit メニュー・Context Menu・キーボードショートカットのいずれもここを呼ぶ。
//
// グラフ変換そのものは workflow の domain（graphDuplication）が持つ純関数であり、
// ここは「選択集合を読む → 変換する → store へ 1 回で書き戻す → 新しい要素を選択する」
// という手順だけを担う。nodes / edges の同時更新は setGraph で 1 件の履歴にまとめる（§11）。

/**
 * 複製 / Paste の配置オフセット。Snap のグリッド（20px）2 マスぶん。
 * 元の位置と重ならず、かつ Snap を有効にしても格子から外れない値にしている。
 */
const DUPLICATE_OFFSET = { x: 40, y: 40 }

/**
 * アプリ内メモリのクリップボード（§5.1）。OS クリップボード連携はスコープ外。
 * ブラウザのクリップボードには載せないので、他タブ・他アプリとは共有されない。
 */
let clipboard: WorkflowGraphState | null = null

/** 同じ内容を続けて貼ったときに重ならないよう、貼り付け回数ぶんオフセットを重ねる。 */
let pasteCount = 0

const newId = () => crypto.randomUUID()

/** 複製したノードだけを選択状態にする（続けて Ctrl+D しても増やし続けられるように）。 */
function selectNodes(nodeIds: readonly string[]): void {
  useWorkflowStore.getState().setSelection({ nodeIds, edgeId: null })
}

function addToGraph(addition: WorkflowGraphState): string[] {
  if (addition.nodes.length === 0) return []

  const { nodes, edges, setGraph } = useWorkflowStore.getState()
  setGraph({
    nodes: [...nodes, ...addition.nodes],
    edges: [...edges, ...addition.edges],
  })

  const createdIds = addition.nodes.map((node) => node.id)
  selectNodes(createdIds)
  return createdIds
}

/**
 * 選択中の Node / Edge を削除する（Delete / Edit メニュー / Context Menu。§5.1）。
 * Node 削除では接続されている Edge も併せて消す。
 */
export function deleteSelection(): void {
  const { nodes, edges, selectedNodeIds, selectedEdgeId, setGraph } =
    useWorkflowStore.getState()
  if (selectedNodeIds.length === 0 && selectedEdgeId === null) return

  const removedNodes = new Set(selectedNodeIds)
  const nextNodes = nodes.filter((node) => !removedNodes.has(node.id))
  const nextEdges = edges.filter(
    (edge) =>
      edge.id !== selectedEdgeId &&
      !removedNodes.has(edge.source) &&
      !removedNodes.has(edge.target),
  )

  setGraph({ nodes: nextNodes, edges: nextEdges })
  selectNodes([])
}

/**
 * 選択中の Node（と選択集合内で閉じている Edge）を複製する（FR-004 / AC-006 / Ctrl+D）。
 * 戻り値は複製されたノードの新しい ID（Canvas が React Flow 側の選択へ反映する）。
 */
export function duplicateSelection(): string[] {
  const { nodes, edges, selectedNodeIds } = useWorkflowStore.getState()
  if (selectedNodeIds.length === 0) return []

  const subgraph = extractSubgraph({ nodes, edges }, selectedNodeIds)
  return addToGraph(
    duplicateSubgraph(subgraph, { offset: DUPLICATE_OFFSET, newId }),
  )
}

/**
 * 選択中の Node と、選択集合内で閉じている Edge をクリップボードへ取る（Ctrl+C）。
 * 選択が空のときはクリップボードを空にせず、直前の内容を残す（OS の挙動に合わせる）。
 */
export function copySelection(): boolean {
  const { nodes, edges, selectedNodeIds } = useWorkflowStore.getState()
  if (selectedNodeIds.length === 0) return false

  clipboard = extractSubgraph({ nodes, edges }, selectedNodeIds)
  pasteCount = 0
  return clipboard.nodes.length > 0
}

/**
 * クリップボードの内容を貼り付ける（Ctrl+V）。ID はすべて新規に採番する。
 * 戻り値は貼り付けられたノードの ID。
 */
export function pasteClipboard(): string[] {
  if (clipboard === null || clipboard.nodes.length === 0) return []

  pasteCount += 1
  return addToGraph(
    duplicateSubgraph(clipboard, {
      offset: {
        x: DUPLICATE_OFFSET.x * pasteCount,
        y: DUPLICATE_OFFSET.y * pasteCount,
      },
      newId,
    }),
  )
}

/** クリップボードを空にする（テストと、貼り付け対象を明示的に捨てたいとき）。 */
export function clearCanvasClipboard(): void {
  clipboard = null
  pasteCount = 0
}

/**
 * Context Menu の Edit（§5.4）。選択済みの要素について Inspector の最初の入力へ
 * フォーカスを移すよう要求する。canvas は inspector を import できないので store 経由。
 */
export function requestInspectorFocus(): void {
  useWorkflowStore.getState().requestInspectorFocus()
}
