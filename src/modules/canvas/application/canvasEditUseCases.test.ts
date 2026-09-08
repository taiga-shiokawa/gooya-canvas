import { clearWorkflowHistory, useWorkflowStore } from '@/modules/shared'
import type { WorkflowEdge, WorkflowNode } from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCanvasClipboard,
  copySelection,
  deleteSelection,
  duplicateSelection,
  pasteClipboard,
} from './canvasEditUseCases'

function node(id: string, x = 0, y = 0): WorkflowNode {
  return {
    id,
    type: 'action',
    position: { x, y },
    data: { title: id, config: { operation: `op-${id}` } },
  }
}

function edge(id: string, source: string, target: string): WorkflowEdge {
  return { id, source, target }
}

function seed(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  selectedNodeIds: string[] = [],
  selectedEdgeId: string | null = null,
) {
  useWorkflowStore.setState({
    nodes,
    edges,
    isDirty: false,
    selectedNodeIds,
    selectedEdgeId,
  })
  clearWorkflowHistory()
}

beforeEach(() => {
  seed([], [])
  clearCanvasClipboard()
})

describe('duplicateSelection', () => {
  it('新しい ID を採番し、設定値を引き継いで少しずらした位置に置く（AC-006）', () => {
    seed([node('a', 100, 200)], [], ['a'])

    const created = duplicateSelection()

    const { nodes } = useWorkflowStore.getState()
    expect(nodes).toHaveLength(2)
    expect(created).toHaveLength(1)
    expect(created[0]).not.toBe('a')

    const copy = nodes[1]
    expect(copy.id).toBe(created[0])
    expect(copy.data).toEqual(nodes[0].data)
    expect(copy.position).not.toEqual(nodes[0].position)
    expect(copy.position.x).toBeGreaterThan(100)
    expect(copy.position.y).toBeGreaterThan(200)
  })

  it('選択集合内で閉じている Edge も複製する', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b')], ['a', 'b'])

    duplicateSelection()

    const { edges } = useWorkflowStore.getState()
    expect(edges).toHaveLength(2)
    expect(edges[1].id).not.toBe('a-b')
    expect(edges[1].source).not.toBe('a')
    expect(edges[1].target).not.toBe('b')
  })

  it('選択の外へ出る Edge は複製しない', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b')], ['a'])

    duplicateSelection()

    expect(useWorkflowStore.getState().edges).toHaveLength(1)
  })

  it('複製したノードを選択状態にする', () => {
    seed([node('a')], [], ['a'])

    const created = duplicateSelection()

    expect(useWorkflowStore.getState().selectedNodeIds).toEqual(created)
  })

  it('Undo 1 回で複製前へ戻せる（履歴 1 件）', () => {
    seed([node('a')], [], ['a'])

    duplicateSelection()
    useWorkflowStore.temporal.getState().undo()

    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('選択が空なら何もしない', () => {
    seed([node('a')], [])

    expect(duplicateSelection()).toEqual([])
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})

describe('copySelection / pasteClipboard', () => {
  it('選択集合内で閉じている Edge だけを貼り付ける', () => {
    seed(
      [node('a'), node('b'), node('c')],
      [edge('a-b', 'a', 'b'), edge('b-c', 'b', 'c')],
      ['a', 'b'],
    )

    copySelection()
    pasteClipboard()

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes).toHaveLength(5)
    // b → c は集合の外へ出るので複製されない
    expect(edges).toHaveLength(3)
    expect(edges.map((e) => e.id)).toContain('a-b')
    expect(edges.map((e) => e.id)).toContain('b-c')
  })

  it('貼り付けた Node / Edge の ID はすべて新規になる', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b')], ['a', 'b'])

    copySelection()
    const created = pasteClipboard()

    const { nodes, edges } = useWorkflowStore.getState()
    expect(new Set(nodes.map((n) => n.id)).size).toBe(4)
    expect(new Set(edges.map((e) => e.id)).size).toBe(2)
    expect(created).not.toContain('a')
    expect(created).not.toContain('b')

    // 貼り付けた Edge は貼り付けた Node 同士を結ぶ（元のノードを指さない）
    const pasted = edges.find((e) => e.id !== 'a-b')
    expect(created).toContain(pasted?.source)
    expect(created).toContain(pasted?.target)
  })

  it('続けて貼り付けると重ならないようずれていく', () => {
    seed([node('a', 0, 0)], [], ['a'])

    copySelection()
    pasteClipboard()
    pasteClipboard()

    const positions = useWorkflowStore.getState().nodes.map((n) => n.position.x)
    expect(new Set(positions).size).toBe(3)
  })

  it('Copy 後に元を消しても貼り付けられる', () => {
    seed([node('a')], [], ['a'])

    copySelection()
    deleteSelection()
    const created = pasteClipboard()

    expect(created).toHaveLength(1)
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
  })

  it('選択が空の Copy はクリップボードを書き換えない', () => {
    seed([node('a')], [], ['a'])
    copySelection()

    seed([node('a')], [])
    expect(copySelection()).toBe(false)
    expect(pasteClipboard()).toHaveLength(1)
  })

  it('クリップボードが空なら貼り付けても何も起きない', () => {
    seed([node('a')], [])

    expect(pasteClipboard()).toEqual([])
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})

describe('deleteSelection', () => {
  it('選択中の Node と、それに接続された Edge を削除する', () => {
    seed(
      [node('a'), node('b'), node('c')],
      [edge('a-b', 'a', 'b'), edge('b-c', 'b', 'c')],
      ['b'],
    )

    deleteSelection()

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes.map((n) => n.id)).toEqual(['a', 'c'])
    expect(edges).toHaveLength(0)
  })

  it('選択中の Edge だけを削除する', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b')], [], 'a-b')

    deleteSelection()

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(0)
  })

  it('Node と Edge をまとめて削除しても Undo 1 回で戻せる（履歴 1 件）', () => {
    seed([node('a'), node('b')], [edge('a-b', 'a', 'b')], ['a'], 'a-b')

    deleteSelection()
    useWorkflowStore.temporal.getState().undo()

    const { nodes, edges } = useWorkflowStore.getState()
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(edges.map((e) => e.id)).toEqual(['a-b'])
  })

  it('選択が空なら何もしない', () => {
    seed([node('a')], [])

    deleteSelection()

    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})
