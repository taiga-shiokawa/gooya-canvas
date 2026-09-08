import {
  createEmptyProject,
  type WorkflowEdge,
  type WorkflowNode,
} from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'
import { withHistoryGroup } from './historyGrouping'
import { redoWorkflow, undoWorkflow } from './workflowHistory'
import { clearWorkflowHistory, useWorkflowStore } from './workflowStore'

// Undo / Redo（FR-005 / docs/functional-design.md §11）。
// 追跡対象は nodes / edges のみで、Viewport・選択状態・isDirty は履歴で戻らない。

function node(id: string, x = 0, y = 0): WorkflowNode {
  return {
    id,
    type: 'action',
    position: { x, y },
    data: { title: id, config: {} },
  }
}

function edge(id: string, source: string, target: string): WorkflowEdge {
  return { id, source, target }
}

function seed(nodes: WorkflowNode[] = [], edges: WorkflowEdge[] = []) {
  useWorkflowStore.setState({
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    isDirty: false,
    selectedNodeIds: [],
    selectedEdgeId: null,
  })
  clearWorkflowHistory()
}

const temporal = () => useWorkflowStore.temporal.getState()

beforeEach(() => {
  seed()
})

describe('undoWorkflow / redoWorkflow', () => {
  it('Node の追加を戻して、やり直せる', () => {
    const { setNodes } = useWorkflowStore.getState()
    setNodes([node('a')])

    undoWorkflow()
    expect(useWorkflowStore.getState().nodes).toEqual([])

    redoWorkflow()
    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('Edge の追加を戻して、やり直せる', () => {
    seed([node('a'), node('b')])
    useWorkflowStore.getState().setEdges([edge('a-b', 'a', 'b')])

    undoWorkflow()
    expect(useWorkflowStore.getState().edges).toEqual([])

    redoWorkflow()
    expect(useWorkflowStore.getState().edges.map((e) => e.id)).toEqual(['a-b'])
  })

  it('Node の移動を戻す', () => {
    seed([node('a', 0, 0)])
    useWorkflowStore.getState().setNodes([node('a', 200, 300)])

    undoWorkflow()

    expect(useWorkflowStore.getState().nodes[0].position).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('nodes と edges の同時変更（setGraph）は 1 件の履歴になる', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b')])
    useWorkflowStore.getState().setGraph({ nodes: [node('a')], edges: [] })

    undoWorkflow()

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(edges.map((e) => e.id)).toEqual(['a-b'])
  })

  it('履歴が無いときは何もしない', () => {
    seed([node('a')])

    undoWorkflow()
    redoWorkflow()

    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toEqual(['a'])
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })

  it('巻き戻すと未保存扱いになる', () => {
    useWorkflowStore.getState().setNodes([node('a')])
    useWorkflowStore.getState().markSaved()

    undoWorkflow()

    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })
})

describe('履歴の対象外（§11）', () => {
  it('Viewport の変更は履歴に積まれず、Undo でも戻らない', () => {
    useWorkflowStore.getState().setNodes([node('a')])
    useWorkflowStore.getState().setViewport({ x: 500, y: 600, zoom: 2 })

    expect(temporal().pastStates).toHaveLength(1)

    undoWorkflow()

    expect(useWorkflowStore.getState().nodes).toEqual([])
    expect(useWorkflowStore.getState().viewport).toEqual({
      x: 500,
      y: 600,
      zoom: 2,
    })
  })

  it('選択状態の変更は履歴に積まれず、Undo でも戻らない', () => {
    seed([node('a'), node('b')])
    useWorkflowStore.getState().setNodes([node('a'), node('b'), node('c')])
    useWorkflowStore.getState().setSelection({ nodeIds: ['a'], edgeId: null })

    expect(temporal().pastStates).toHaveLength(1)

    undoWorkflow()

    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toEqual([
      'a',
      'b',
    ])
    expect(useWorkflowStore.getState().selectedNodeIds).toEqual(['a'])
  })

  it('metadata / promptSettings / Review 結果の変更は履歴に積まれない', () => {
    const state = useWorkflowStore.getState()
    state.setMetadata({ ...state.metadata, name: 'Renamed' })
    state.setPromptSettings({ target: 'azure' })
    state.setReviewFindings([])
    state.requestNodeFocus('a')
    state.requestInspectorFocus()

    expect(temporal().pastStates).toHaveLength(0)
  })
})

describe('replaceProject', () => {
  it('プロジェクトを差し替えると履歴が空になる', () => {
    useWorkflowStore.getState().setNodes([node('a')])
    expect(temporal().pastStates).toHaveLength(1)

    useWorkflowStore
      .getState()
      .replaceProject(
        createEmptyProject({ id: 'p1', now: '2026-01-01T00:00:00.000Z' }),
      )

    expect(temporal().pastStates).toHaveLength(0)
    expect(temporal().futureStates).toHaveLength(0)

    // 前のプロジェクトの操作は Undo できない
    undoWorkflow()
    expect(useWorkflowStore.getState().nodes).toEqual([])
  })
})

describe('編集単位のまとめ（§6 / §11）', () => {
  it('同じフィールドへの連続入力は 1 件の履歴にまとめる', () => {
    seed([node('a')])

    for (const title of ['面', '面接', '面接終', '面接終了']) {
      withHistoryGroup('node:a:title', () => {
        useWorkflowStore
          .getState()
          .setNodes([{ ...node('a'), data: { title, config: {} } }])
      })
    }

    expect(temporal().pastStates).toHaveLength(1)

    undoWorkflow()
    expect(useWorkflowStore.getState().nodes[0].data.title).toBe('a')
  })

  it('別のフィールドへ移ると新しい履歴になる', () => {
    seed([node('a')])

    withHistoryGroup('node:a:title', () => {
      useWorkflowStore.getState().setNodes([node('a', 0, 0)])
    })
    withHistoryGroup('node:a:description', () => {
      useWorkflowStore.getState().setNodes([node('a', 1, 1)])
    })

    expect(temporal().pastStates).toHaveLength(2)
  })

  it('まとめ対象でない操作（ノード追加など）は毎回 1 件になる', () => {
    useWorkflowStore.getState().setNodes([node('a')])
    useWorkflowStore.getState().setNodes([node('a'), node('b')])
    useWorkflowStore.getState().setNodes([node('a'), node('b'), node('c')])

    expect(temporal().pastStates).toHaveLength(3)
  })
})
