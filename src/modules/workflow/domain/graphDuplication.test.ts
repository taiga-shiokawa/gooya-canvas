import { describe, expect, it } from 'vitest'
import { duplicateSubgraph, extractSubgraph } from './graphDuplication'
import type { WorkflowEdge, WorkflowNode } from './types'

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

/** 決定論的な ID 採番（純関数の外から注入する。development-guidelines §2.2）。 */
function sequentialIds(prefix = 'new'): () => string {
  let count = 0
  return () => `${prefix}-${(count += 1)}`
}

const OFFSET = { x: 40, y: 40 }

describe('extractSubgraph', () => {
  it('選択集合の中で閉じている Edge だけを取り出す', () => {
    const graph = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('a-b', 'a', 'b'), edge('b-c', 'b', 'c')],
    }

    const subgraph = extractSubgraph(graph, ['a', 'b'])

    expect(subgraph.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    // b → c は集合の外へ出るので含めない
    expect(subgraph.edges.map((e) => e.id)).toEqual(['a-b'])
  })

  it('選択が空なら空のサブグラフを返す', () => {
    const graph = { nodes: [node('a')], edges: [] }

    expect(extractSubgraph(graph, [])).toEqual({ nodes: [], edges: [] })
  })

  it('元のグラフの並び順を保つ', () => {
    const graph = { nodes: [node('a'), node('b'), node('c')], edges: [] }

    expect(extractSubgraph(graph, ['c', 'a']).nodes.map((n) => n.id)).toEqual([
      'a',
      'c',
    ])
  })
})

describe('duplicateSubgraph', () => {
  it('新しい ID を採番し、元の ID を残さない', () => {
    const subgraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a-b', 'a', 'b')],
    }

    const copy = duplicateSubgraph(subgraph, {
      offset: OFFSET,
      newId: sequentialIds(),
    })

    expect(copy.nodes.map((n) => n.id)).toEqual(['new-1', 'new-2'])
    expect(copy.edges[0].id).toBe('new-3')
    expect(copy.edges[0].id).not.toBe('a-b')
  })

  it('Edge の source / target を複製後の ID へ張り替える', () => {
    const subgraph = {
      nodes: [node('a'), node('b')],
      edges: [{ ...edge('a-b', 'a', 'b'), sourceHandle: 'Yes', label: 'Yes' }],
    }

    const copy = duplicateSubgraph(subgraph, {
      offset: OFFSET,
      newId: sequentialIds(),
    })

    expect(copy.edges[0]).toMatchObject({
      source: copy.nodes[0].id,
      target: copy.nodes[1].id,
      sourceHandle: 'Yes',
      label: 'Yes',
    })
  })

  it('設定値（data）を引き継ぐ', () => {
    const original = node('a')
    original.data.description = '説明'
    original.data.notes = 'メモ'

    const copy = duplicateSubgraph(
      { nodes: [original], edges: [] },
      { offset: OFFSET, newId: sequentialIds() },
    )

    expect(copy.nodes[0].data).toEqual(original.data)
    expect(copy.nodes[0].type).toBe(original.type)
  })

  it('config は複製元と共有しない', () => {
    const original = node('a')

    const copy = duplicateSubgraph(
      { nodes: [original], edges: [] },
      { offset: OFFSET, newId: sequentialIds() },
    )

    expect(copy.nodes[0].data.config).not.toBe(original.data.config)
    expect(copy.nodes[0].data.config).toEqual(original.data.config)
  })

  it('位置をオフセットする', () => {
    const copy = duplicateSubgraph(
      { nodes: [node('a', 100, 200)], edges: [] },
      { offset: OFFSET, newId: sequentialIds() },
    )

    expect(copy.nodes[0].position).toEqual({ x: 140, y: 240 })
  })

  it('元のグラフを書き換えない', () => {
    const original = node('a', 10, 20)
    const subgraph = { nodes: [original], edges: [] }

    duplicateSubgraph(subgraph, { offset: OFFSET, newId: sequentialIds() })

    expect(original.id).toBe('a')
    expect(original.position).toEqual({ x: 10, y: 20 })
  })

  it('片端が複製対象外の Edge は複製しない', () => {
    const subgraph = {
      nodes: [node('a')],
      edges: [edge('a-b', 'a', 'b')],
    }

    const copy = duplicateSubgraph(subgraph, {
      offset: OFFSET,
      newId: sequentialIds(),
    })

    expect(copy.edges).toEqual([])
  })
})
