import { useWorkflowStore } from '@/modules/shared'
import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeKind,
} from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addNode,
  connectNodes,
  isConnectionAllowed,
  moveNode,
  removeEdges,
  removeNodes,
} from './canvasUseCases'

function seed(nodes: WorkflowNode[], edges: WorkflowEdge[] = []) {
  useWorkflowStore.setState({ nodes, edges, isDirty: false })
}

function node(
  id: string,
  type: WorkflowNodeKind = 'action',
  config: Record<string, unknown> = {},
): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data: { title: id, config } }
}

function edge(id: string, source: string, target: string): WorkflowEdge {
  return { id, source, target }
}

beforeEach(() => {
  seed([], [])
})

describe('addNode', () => {
  it('ドロップ位置と種別を保持したノードを追加する', () => {
    addNode({ kind: 'trigger', position: { x: 120, y: 40 } })

    const { nodes } = useWorkflowStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      type: 'trigger',
      position: { x: 120, y: 40 },
      data: { title: 'Trigger' },
    })
    expect(nodes[0].id).not.toBe('')
  })

  it('種別ごとの初期 config を投入する', () => {
    addNode({ kind: 'condition', position: { x: 0, y: 0 } })

    expect(useWorkflowStore.getState().nodes[0].data.config).toEqual({
      branches: ['Yes', 'No'],
    })
  })

  it('追加ごとに一意な ID を採番する', () => {
    addNode({ kind: 'wait', position: { x: 0, y: 0 } })
    addNode({ kind: 'wait', position: { x: 0, y: 0 } })

    const { nodes } = useWorkflowStore.getState()
    expect(new Set(nodes.map((n) => n.id)).size).toBe(2)
  })

  it('dirty を立てる', () => {
    addNode({ kind: 'action', position: { x: 0, y: 0 } })

    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })
})

describe('moveNode', () => {
  it('対象ノードの位置だけを更新する', () => {
    seed([node('a'), node('b')])
    moveNode('b', { x: 50, y: 50 })
    moveNode('a', { x: 200, y: 300 })

    const { nodes } = useWorkflowStore.getState()
    expect(nodes.find((n) => n.id === 'a')?.position).toEqual({
      x: 200,
      y: 300,
    })
    expect(nodes.find((n) => n.id === 'b')?.position).toEqual({ x: 50, y: 50 })
  })
})

describe('connectNodes', () => {
  it('source / target と handle を保持した Edge を追加する', () => {
    seed([node('a'), node('b')])

    connectNodes({ source: 'a', target: 'b', targetHandle: 'in' })

    const { edges } = useWorkflowStore.getState()
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: 'a',
      target: 'b',
      targetHandle: 'in',
    })
  })

  it('Condition から出る Edge は分岐名を label の初期値にする', () => {
    seed([node('c', 'condition', { branches: ['Yes', 'No'] }), node('b')])

    connectNodes({ source: 'c', target: 'b', sourceHandle: 'No' })

    expect(useWorkflowStore.getState().edges[0]).toMatchObject({
      sourceHandle: 'No',
      label: 'No',
    })
  })

  it('Condition 以外は sourceHandle があっても label を付けない', () => {
    seed([node('a'), node('b')])

    connectNodes({ source: 'a', target: 'b', sourceHandle: 'out' })

    expect(useWorkflowStore.getState().edges[0].label).toBeUndefined()
  })

  it.each<[string, WorkflowNodeKind, WorkflowNodeKind]>([
    ['Trigger への incoming', 'action', 'trigger'],
    ['End からの outgoing', 'end', 'action'],
    ['Note を source に持つ接続', 'note', 'action'],
    ['Note を target に持つ接続', 'action', 'note'],
  ])('%s は追加しない', (_label, sourceKind, targetKind) => {
    seed([node('a', sourceKind), node('b', targetKind)])

    connectNodes({ source: 'a', target: 'b' })

    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })

  it('自分自身への接続は追加しない', () => {
    seed([node('a')])

    connectNodes({ source: 'a', target: 'a' })

    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })

  it('存在しないノードへの接続は追加しない', () => {
    seed([node('a')])

    connectNodes({ source: 'a', target: 'ghost' })

    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })
})

describe('isConnectionAllowed', () => {
  it('接続ルールの判定だけを返し store を変更しない', () => {
    seed([node('a'), node('t', 'trigger')])

    expect(isConnectionAllowed('a', 't')).toBe(false)
    expect(isConnectionAllowed('t', 'a')).toBe(true)
    expect(useWorkflowStore.getState().edges).toHaveLength(0)
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})

describe('removeNodes', () => {
  it('ノードと、それに接続された Edge を同時に削除する', () => {
    seed(
      [node('a'), node('b'), node('c')],
      [edge('a-b', 'a', 'b'), edge('b-c', 'b', 'c'), edge('a-c', 'a', 'c')],
    )

    removeNodes(['b'])

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes.map((n) => n.id)).toEqual(['a', 'c'])
    // b を source / target に持つ Edge が両方消え、孤立 Edge が残らない
    expect(edges.map((e) => e.id)).toEqual(['a-c'])
  })

  it('複数ノードをまとめて削除できる', () => {
    seed([node('a'), node('b'), node('c')], [edge('a-b', 'a', 'b')])

    removeNodes(['a', 'c'])

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes.map((n) => n.id)).toEqual(['b'])
    expect(edges).toHaveLength(0)
  })
})

describe('removeEdges', () => {
  it('指定した Edge だけを削除し、ノードは残す', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b'), edge('b-a', 'b', 'a')])

    removeEdges(['a-b'])

    const { nodes, edges } = useWorkflowStore.getState()
    expect(edges.map((e) => e.id)).toEqual(['b-a'])
    expect(nodes).toHaveLength(2)
  })
})
