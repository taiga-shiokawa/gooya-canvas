import type { WorkflowEdge, WorkflowNode } from '@/modules/workflow'
import type { Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import {
  fromReactFlowConnection,
  mergeReactFlowNodes,
  toReactFlow,
} from './reactFlowMapper'

function domainNode(id: string, x = 0, y = 0, title = id): WorkflowNode {
  return {
    id,
    type: 'action',
    position: { x, y },
    data: { title, config: {} },
  }
}

describe('toReactFlow', () => {
  it('Domain Model を React Flow の nodes / edges へ写像する', () => {
    const nodes = [domainNode('a', 10, 20, 'Trigger')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b', sourceHandle: 'Yes', label: 'Yes' },
    ]

    const graph = toReactFlow({ nodes, edges })

    expect(graph.nodes[0]).toEqual({
      id: 'a',
      position: { x: 10, y: 20 },
      data: { label: 'Trigger' },
    })
    expect(graph.edges[0]).toMatchObject({
      id: 'e1',
      source: 'a',
      target: 'b',
      sourceHandle: 'Yes',
      label: 'Yes',
    })
  })

  it('Phase 1 は type を指定せずデフォルトノードで描画する', () => {
    const graph = toReactFlow({ nodes: [domainNode('a')], edges: [] })

    expect(graph.nodes[0].type).toBeUndefined()
  })
})

describe('mergeReactFlowNodes', () => {
  // React Flow は measured を渡したノードオブジェクト自身に保持する。
  // マージで参照を作り直すと measured が失われ MiniMap が描画されなくなる。
  const measured = (node: Node): Node => ({
    ...node,
    measured: { width: 150, height: 39 },
  })

  it('変化が無いときは同一参照を返す', () => {
    const previous = [
      measured(toReactFlow({ nodes: [domainNode('a')], edges: [] }).nodes[0]),
    ]
    const next = toReactFlow({ nodes: [domainNode('a')], edges: [] }).nodes

    expect(mergeReactFlowNodes(previous, next)).toBe(previous)
  })

  it('位置が変わったノードは measured を保ったまま位置だけ差し替える', () => {
    const previous = [
      measured(toReactFlow({ nodes: [domainNode('a')], edges: [] }).nodes[0]),
    ]
    const next = toReactFlow({
      nodes: [domainNode('a', 100, 200)],
      edges: [],
    }).nodes

    const merged = mergeReactFlowNodes(previous, next)

    expect(merged).not.toBe(previous)
    expect(merged[0].position).toEqual({ x: 100, y: 200 })
    expect(merged[0].measured).toEqual({ width: 150, height: 39 })
  })

  it('既存ノードの参照を維持したまま新規ノードを追加する', () => {
    const previous = [
      measured(toReactFlow({ nodes: [domainNode('a')], edges: [] }).nodes[0]),
    ]
    const next = toReactFlow({
      nodes: [domainNode('a'), domainNode('b', 50, 50)],
      edges: [],
    }).nodes

    const merged = mergeReactFlowNodes(previous, next)

    expect(merged[0]).toBe(previous[0])
    expect(merged[1].id).toBe('b')
    expect(merged[1].measured).toBeUndefined()
  })

  it('削除されたノードはマージ結果から除かれる', () => {
    const previous = toReactFlow({
      nodes: [domainNode('a'), domainNode('b')],
      edges: [],
    }).nodes.map(measured)
    const next = toReactFlow({ nodes: [domainNode('b')], edges: [] }).nodes

    expect(mergeReactFlowNodes(previous, next).map((n) => n.id)).toEqual(['b'])
  })
})

describe('fromReactFlowConnection', () => {
  it('null の handle を undefined に正規化する', () => {
    const result = fromReactFlowConnection({
      source: 'a',
      target: 'b',
      sourceHandle: null,
      targetHandle: null,
    })

    expect(result).toEqual({
      source: 'a',
      target: 'b',
      sourceHandle: undefined,
      targetHandle: undefined,
    })
  })
})
