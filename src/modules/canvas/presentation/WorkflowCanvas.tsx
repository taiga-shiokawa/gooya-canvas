import { useWorkflowStore } from '@/modules/shared'
import { isWorkflowNodeKind } from '@/modules/workflow'
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useState, type DragEvent } from 'react'
import {
  addNode,
  connectNodes,
  moveNode,
  removeEdges,
  removeNodes,
} from '../application/canvasUseCases'
import { NODE_KIND_DND_MIME } from './canvasDnd'
import { nodeKindLabel } from './nodeKindLabels'
import {
  fromReactFlowConnection,
  fromReactFlowIds,
  fromReactFlowPosition,
  mergeReactFlowEdges,
  mergeReactFlowNodes,
  toReactFlow,
} from './reactFlowMapper'

// controlled flow: Domain Model（store）を唯一の Source of Truth とする（NFR-010）。
// React Flow へ渡す配列はローカル state として保持し、Domain の変更をマージして
// 反映する。毎回作り直すと React Flow の描画用フィールド（measured / selected）が
// 失われるため（MiniMap が描画されない等）、既存要素の参照を維持する。
// 選択状態は Domain Model ではないので、この配列側だけに存在する。
function WorkflowCanvasInner() {
  const { screenToFlowPosition } = useReactFlow()

  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>(
    () => toReactFlow(useWorkflowStore.getState()).nodes,
  )
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>(
    () => toReactFlow(useWorkflowStore.getState()).edges,
  )

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
      }),
    [],
  )

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
      addNode({
        kind,
        position: fromReactFlowPosition(position),
        title: nodeKindLabel(kind),
      })
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
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
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
