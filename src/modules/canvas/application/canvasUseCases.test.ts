import { useWorkflowStore } from '@/modules/shared'
import type { WorkflowEdge, WorkflowNode } from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addNode,
  connectNodes,
  moveNode,
  removeEdges,
  removeNodes,
} from './canvasUseCases'

function seed(nodes: WorkflowNode[], edges: WorkflowEdge[] = []) {
  useWorkflowStore.setState({ nodes, edges })
}

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

beforeEach(() => {
  seed([], [])
})

describe('addNode', () => {
  it('ドロップ位置と種別・タイトルを保持したノードを追加する', () => {
    addNode({ kind: 'trigger', position: { x: 120, y: 40 }, title: 'Trigger' })

    const { nodes } = useWorkflowStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      type: 'trigger',
      position: { x: 120, y: 40 },
      data: { title: 'Trigger', config: {} },
    })
    expect(nodes[0].id).not.toBe('')
  })

  it('追加ごとに一意な ID を採番する', () => {
    addNode({ kind: 'wait', position: { x: 0, y: 0 }, title: 'Wait' })
    addNode({ kind: 'wait', position: { x: 0, y: 0 }, title: 'Wait' })

    const { nodes } = useWorkflowStore.getState()
    expect(new Set(nodes.map((n) => n.id)).size).toBe(2)
  })
})

describe('moveNode', () => {
  it('対象ノードの位置だけを更新する', () => {
    seed([node('a', 0, 0), node('b', 50, 50)])

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

    connectNodes({ source: 'a', target: 'b', sourceHandle: 'Yes' })

    const { edges } = useWorkflowStore.getState()
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: 'a',
      target: 'b',
      sourceHandle: 'Yes',
    })
  })

  it('自分自身への接続は追加しない', () => {
    seed([node('a')])

    connectNodes({ source: 'a', target: 'a' })

    expect(useWorkflowStore.getState().edges).toHaveLength(0)
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
