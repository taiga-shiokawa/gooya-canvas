import { useWorkflowStore } from '@/modules/shared'
import { isWorkflowNodeKind, type WorkflowViewport } from '@/modules/workflow'
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowState,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import {
  addNode,
  connectNodes,
  isConnectionAllowed,
  moveNode,
  removeEdges,
  removeNodes,
  selectElements,
  updateViewport,
} from '../application/canvasUseCases'
import { NODE_KIND_DND_MIME } from './canvasDnd'
import { workflowNodeTypes } from './nodes/workflowNodeTypes'
import {
  fromReactFlowConnection,
  fromReactFlowIds,
  fromReactFlowPosition,
  fromReactFlowViewport,
  mergeReactFlowEdges,
  mergeReactFlowNodes,
  sameViewport,
  toReactFlow,
  toReactFlowViewport,
} from './reactFlowMapper'

/**
 * 全ノードの実寸が確定したか。
 *
 * `useNodesInitialized` は使えない。あれは handleBounds も条件に含むため、
 * Handle を 1 つも持たない Note（functional-design §5.2）があると永久に false になる。
 * 測定そのものは React Flow の内部ストアが持っているので、そこを直接見る。
 */
function selectAllNodesMeasured(state: ReactFlowState): boolean {
  if (state.nodeLookup.size === 0) return false
  for (const node of state.nodeLookup.values()) {
    if (!node.measured?.width) return false
  }
  return true
}

// controlled flow: Domain Model（store）を唯一の Source of Truth とする（NFR-010）。
// React Flow へ渡す配列はローカル state として保持し、Domain の変更をマージして
// 反映する。毎回作り直すと React Flow の描画用フィールド（measured / selected）が
// 失われるため（MiniMap が描画されない等）、既存要素の参照を維持する。
// 選択状態は Domain Model ではないので、この配列側だけに存在する。
function WorkflowCanvasInner() {
  const { screenToFlowPosition, setViewport, getViewport, fitView } =
    useReactFlow()

  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>(
    () => toReactFlow(useWorkflowStore.getState()).nodes,
  )
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>(
    () => toReactFlow(useWorkflowStore.getState()).edges,
  )

  // Canvas 自身が publish した viewport を覚えておき、購読側で自分の Pan / Zoom を
  // 折り返し適用しないようにする。ここと一致しない変更＝Open / New による復元。
  //
  // 初期値は null ではなく**マウント時の store の値**にする。null にすると、
  // マウント後の最初の store 変更（種類を問わない）が「復元すべき変更」と誤判定される。
  const publishedViewport = useRef<WorkflowViewport>(
    useWorkflowStore.getState().viewport,
  )

  // 起動時の自動 fit を 1 度だけ行うためのフラグ。マウント時に内容が無ければ
  // 何も合わせない（最初のノードを置いた瞬間に画面が跳ねるのを避ける）。
  const shouldFitOnMount = useRef(reactFlowNodes.length > 0)

  // Domain store を外部システムとして購読し、変更をコールバックでマージする
  useEffect(
    () =>
      useWorkflowStore.subscribe((state) => {
        const graph = toReactFlow(state)
        setReactFlowNodes((previous) =>
          mergeReactFlowNodes(previous, graph.nodes),
        )
        setReactFlowEdges((previous) =>
          mergeReactFlowEdges(previous, graph.edges),
        )

        // プロジェクト読込後の画面復元（docs/functional-design.md §7.3）。
        // @xyflow/react は canvas モジュール専用なので project 側から fitView は呼べない。
        // 代わりに store の viewport を購読し、保存時の見え方をそのまま復元する。
        if (!sameViewport(publishedViewport.current, state.viewport)) {
          publishedViewport.current = state.viewport
          // 以降は store の viewport が正。起動時の自動 fit は打ち切る
          shouldFitOnMount.current = false
          setViewport(toReactFlowViewport(state.viewport))
        }
      }),
    [setViewport],
  )

  // `fitView` prop だけでは足りない。あれはノードの測定が終わる前に一度走るため、
  // 実測 0 の矩形へ合わせて最大倍率までズームインした状態で止まる
  // （サンプルを読み込んだ状態で起動する初回に顕在化する）。
  // かといって prop を外すと React Flow の初期化シーケンスごと止まり、
  // マウント時点のノードが visibility: hidden のまま表示されない。
  // そこで prop は残したまま、測定が揃った時点で 1 度だけ合わせ直す。
  const allNodesMeasured = useStore(selectAllNodesMeasured)

  useEffect(() => {
    if (!shouldFitOnMount.current || !allNodesMeasured) return
    shouldFitOnMount.current = false

    void fitView().then(() => {
      // 合わせた結果を store にも反映し、保存内容と画面を一致させる
      const next = fromReactFlowViewport(getViewport())
      publishedViewport.current = next
      updateViewport(next)
    })
  }, [allNodesMeasured, fitView, getViewport])

  const handleMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    // Pan / Zoom の途中経過ではなく確定値だけを store へ送る。
    // onViewportChange だとフレームごとに store が更新され購読が回り続ける。
    const next = fromReactFlowViewport(viewport)
    publishedViewport.current = next
    updateViewport(next)
  }, [])

  const handleNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    // 選択・測定（dimensions）・削除の反映は React Flow の標準ヘルパに任せる。
    // dimensions を取りこぼすとノードに measured が付かず MiniMap が描画されない。
    setReactFlowNodes((previous) => applyNodeChanges(changes, previous))

    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        moveNode(change.id, fromReactFlowPosition(change.position))
      }
      // 'remove' は onNodesDelete で store へ反映する
    }
  }, [])

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setReactFlowEdges((previous) => applyEdgeChanges(changes, previous))
  }, [])

  const handleConnect = useCallback((connection: Connection) => {
    connectNodes(fromReactFlowConnection(connection))
  }, [])

  // ドラッグ中に不許可の接続先をハイライトさせない（FR-007）。
  // 実際の作成可否は connectNodes 側の canConnect が最終判定する。
  const handleIsValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target } = fromReactFlowConnection(connection)
      return isConnectionAllowed(source, target)
    },
    [],
  )

  // 選択状態は Inspector が参照するため store へ publish する（Phase 3 / §2.4）。
  // React Flow が保持する配列上の selected はそのまま描画用に残し、store には ID だけを送る。
  const handleSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      selectElements({
        nodeIds: fromReactFlowIds(nodes),
        edgeIds: fromReactFlowIds(edges),
      })
    },
    [],
  )

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    removeNodes(fromReactFlowIds(deleted))
  }, [])

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    removeEdges(fromReactFlowIds(deleted))
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const kind = event.dataTransfer.getData(NODE_KIND_DND_MIME)
      if (!isWorkflowNodeKind(kind)) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode({ kind, position: fromReactFlowPosition(position) })
    },
    [screenToFlowPosition],
  )

  return (
    <div
      className="h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={workflowNodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        onMoveEnd={handleMoveEnd}
        isValidConnection={handleIsValidConnection}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export function WorkflowCanvas() {
  // Provider を canvas モジュール内に閉じ、app 側が React Flow を意識しないようにする
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  )
}
