import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeKind,
} from '@/modules/workflow'
import type { Edge, Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import {
  fromReactFlowConnection,
  mergeReactFlowEdges,
  mergeReactFlowNodes,
  toReactFlow,
} from './reactFlowMapper'

type DomainNodeOverrides = {
  type?: WorkflowNodeKind
  x?: number
  y?: number
  title?: string
  description?: string
  config?: Record<string, unknown>
}

function domainNode(
  id: string,
  overrides: DomainNodeOverrides = {},
): WorkflowNode {
  return {
    id,
    type: overrides.type ?? 'action',
    position: { x: overrides.x ?? 0, y: overrides.y ?? 0 },
    data: {
      title: overrides.title ?? id,
      description: overrides.description,
      config: overrides.config ?? {},
    },
  }
}

function rfNodes(nodes: WorkflowNode[]): Node[] {
  return toReactFlow({ nodes, edges: [] }).nodes
}

function rfEdges(edges: WorkflowEdge[]): Edge[] {
  return toReactFlow({ nodes: [], edges }).edges
}

describe('toReactFlow', () => {
  it('Domain の種別を React Flow の type へ写して Custom Node と対応づける', () => {
    const graph = toReactFlow({
      nodes: [domainNode('a', { type: 'humanTask' })],
      edges: [],
    })

    expect(graph.nodes[0].type).toBe('humanTask')
  })

  it('カード表示に必要な値だけを data へ載せる', () => {
    const graph = toReactFlow({
      nodes: [
        domainNode('a', {
          type: 'notification',
          x: 10,
          y: 20,
          title: 'Teams 通知',
          description: '評価未入力の面接官へ',
          // config は Inspector が扱う。カードには載せない
          config: { recipient: 'interviewer' },
        }),
      ],
      edges: [],
    })

    expect(graph.nodes[0]).toEqual({
      id: 'a',
      type: 'notification',
      position: { x: 10, y: 20 },
      data: {
        kind: 'notification',
        title: 'Teams 通知',
        description: '評価未入力の面接官へ',
        branches: [],
      },
    })
  })

  it('Condition は分岐名を data.branches へ載せる（Source Handle の生成に使う）', () => {
    const graph = toReactFlow({
      nodes: [
        domainNode('c', {
          type: 'condition',
          config: { branches: ['評価済み', '未評価'] },
        }),
      ],
      edges: [],
    })

    expect(graph.nodes[0].data.branches).toEqual(['評価済み', '未評価'])
  })

  it('Edge の label と description を写像する', () => {
    const graph = toReactFlow({
      nodes: [],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'b',
          sourceHandle: 'Yes',
          label: 'Yes',
          data: { description: '評価済みの場合' },
        },
      ],
    })

    expect(graph.edges[0]).toMatchObject({
      id: 'e1',
      source: 'a',
      target: 'b',
      sourceHandle: 'Yes',
      label: 'Yes',
      data: { description: '評価済みの場合' },
    })
  })
})

describe('mergeReactFlowNodes', () => {
  // React Flow は measured を渡したノードオブジェクト自身に保持する。
  // マージで参照を作り直すと measured が失われ MiniMap が描画されなくなる。
  const measured = (node: Node): Node => ({
    ...node,
    measured: { width: 224, height: 62 },
  })

  it('変化が無いときは同一参照を返す', () => {
    const previous = rfNodes([domainNode('a')]).map(measured)
    const next = rfNodes([domainNode('a')])

    expect(mergeReactFlowNodes(previous, next)).toBe(previous)
  })

  it('Condition の分岐が同じ内容なら（配列の参照が違っても）同一参照を返す', () => {
    const condition = {
      type: 'condition' as const,
      config: { branches: ['Yes', 'No'] },
    }
    const previous = rfNodes([domainNode('c', condition)]).map(measured)
    const next = rfNodes([domainNode('c', condition)])

    expect(mergeReactFlowNodes(previous, next)).toBe(previous)
  })

  it('位置が変わったノードは measured を保ったまま位置だけ差し替える', () => {
    const previous = rfNodes([domainNode('a')]).map(measured)
    const next = rfNodes([domainNode('a', { x: 100, y: 200 })])

    const merged = mergeReactFlowNodes(previous, next)

    expect(merged).not.toBe(previous)
    expect(merged[0].position).toEqual({ x: 100, y: 200 })
    expect(merged[0].measured).toEqual({ width: 224, height: 62 })
  })

  // data の比較漏れは「Inspector で編集しても Canvas に反映されない」形で表面化する（AC-011）
  it.each<[string, DomainNodeOverrides]>([
    ['title', { title: '面接終了トリガー' }],
    ['description', { description: 'Google Calendar 由来' }],
    [
      'branches',
      { type: 'condition', config: { branches: ['Yes', 'No', 'Skip'] } },
    ],
  ])('%s の変更を検出して差し替える', (_label, overrides) => {
    const base: DomainNodeOverrides =
      overrides.type === 'condition'
        ? { type: 'condition', config: { branches: ['Yes', 'No'] } }
        : {}
    const previous = rfNodes([domainNode('a', base)]).map(measured)
    const next = rfNodes([domainNode('a', { ...base, ...overrides })])

    const merged = mergeReactFlowNodes(previous, next)

    expect(merged).not.toBe(previous)
    expect(merged[0].data).toEqual(next[0].data)
    expect(merged[0].measured).toEqual({ width: 224, height: 62 })
  })

  it('既存ノードの参照を維持したまま新規ノードを追加する', () => {
    const previous = rfNodes([domainNode('a')]).map(measured)
    const next = rfNodes([domainNode('a'), domainNode('b', { x: 50, y: 50 })])

    const merged = mergeReactFlowNodes(previous, next)

    expect(merged[0]).toBe(previous[0])
    expect(merged[1].id).toBe('b')
    expect(merged[1].measured).toBeUndefined()
  })

  it('削除されたノードはマージ結果から除かれる', () => {
    const previous = rfNodes([domainNode('a'), domainNode('b')]).map(measured)
    const next = rfNodes([domainNode('b')])

    expect(mergeReactFlowNodes(previous, next).map((n) => n.id)).toEqual(['b'])
  })
})

describe('mergeReactFlowEdges', () => {
  const selected = (edge: Edge): Edge => ({ ...edge, selected: true })

  it('変化が無いときは同一参照を返す', () => {
    const edges: WorkflowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const previous = rfEdges(edges).map(selected)

    expect(mergeReactFlowEdges(previous, rfEdges(edges))).toBe(previous)
  })

  it('label の変更を検出して差し替える', () => {
    const previous = rfEdges([
      { id: 'e1', source: 'a', target: 'b', label: 'Yes' },
    ]).map(selected)
    const next = rfEdges([
      { id: 'e1', source: 'a', target: 'b', label: '評価済み' },
    ])

    const merged = mergeReactFlowEdges(previous, next)

    expect(merged).not.toBe(previous)
    expect(merged[0].label).toBe('評価済み')
    expect(merged[0].selected).toBe(true)
  })

  it('description の変更を検出して差し替える', () => {
    const previous = rfEdges([{ id: 'e1', source: 'a', target: 'b' }]).map(
      selected,
    )
    const next = rfEdges([
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        data: { description: '再通知の経路' },
      },
    ])

    const merged = mergeReactFlowEdges(previous, next)

    expect(merged).not.toBe(previous)
    expect(merged[0].data).toEqual({ description: '再通知の経路' })
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
