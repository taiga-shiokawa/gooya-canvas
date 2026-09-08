import { describe, expect, it } from 'vitest'
import {
  addConditionBranch,
  MIN_CONDITION_BRANCHES,
  removeConditionBranch,
  renameConditionBranch,
  type WorkflowGraph,
} from './conditionBranchEditing'
import type { WorkflowEdge, WorkflowNode } from './types'

function conditionNode(
  id: string,
  branches: unknown = ['Yes', 'No'],
): WorkflowNode {
  return {
    id,
    type: 'condition',
    position: { x: 0, y: 0 },
    data: { title: 'Condition', config: { branches, note: 'keep me' } },
  }
}

function actionNode(id: string): WorkflowNode {
  return {
    id,
    type: 'action',
    position: { x: 0, y: 0 },
    data: { title: id, config: {} },
  }
}

function branchEdge(
  id: string,
  source: string,
  sourceHandle: string,
  label?: string,
): WorkflowEdge {
  return { id, source, target: 'end', sourceHandle, label }
}

function graph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[] = [],
): WorkflowGraph {
  return { nodes, edges }
}

function branchesOf(result: WorkflowGraph, nodeId: string): unknown {
  return result.nodes.find((node) => node.id === nodeId)?.data.config.branches
}

describe('renameConditionBranch', () => {
  it('分岐名と、その分岐から出ている Edge の sourceHandle / label を追随させる', () => {
    const before = graph(
      [conditionNode('c')],
      [branchEdge('e1', 'c', 'No', 'No')],
    )

    const after = renameConditionBranch(before, {
      nodeId: 'c',
      index: 1,
      name: 'Rejected',
    })

    expect(branchesOf(after, 'c')).toEqual(['Yes', 'Rejected'])
    expect(after.edges[0]).toMatchObject({
      sourceHandle: 'Rejected',
      label: 'Rejected',
    })
  })

  it('ユーザーが付け替えた label は書き換えない（sourceHandle だけ追随する）', () => {
    const before = graph(
      [conditionNode('c')],
      [branchEdge('e1', 'c', 'Yes', '評価済み')],
    )

    const after = renameConditionBranch(before, {
      nodeId: 'c',
      index: 0,
      name: 'Approved',
    })

    expect(after.edges[0]).toMatchObject({
      sourceHandle: 'Approved',
      label: '評価済み',
    })
  })

  it('同じ分岐名を持つ複数の Edge をすべて更新する', () => {
    const before = graph(
      [conditionNode('c')],
      [
        branchEdge('e1', 'c', 'Yes', 'Yes'),
        branchEdge('e2', 'c', 'Yes', 'Yes'),
      ],
    )

    const after = renameConditionBranch(before, {
      nodeId: 'c',
      index: 0,
      name: 'OK',
    })

    expect(after.edges.map((edge) => edge.sourceHandle)).toEqual(['OK', 'OK'])
  })

  it('他ノードの同名 sourceHandle は書き換えない', () => {
    const before = graph(
      [conditionNode('c'), conditionNode('other')],
      [branchEdge('e1', 'other', 'Yes', 'Yes')],
    )

    const after = renameConditionBranch(before, {
      nodeId: 'c',
      index: 0,
      name: 'OK',
    })

    expect(after.edges[0].sourceHandle).toBe('Yes')
    expect(branchesOf(after, 'other')).toEqual(['Yes', 'No'])
  })

  it('branches 以外の config キーを保持する', () => {
    const after = renameConditionBranch(graph([conditionNode('c')]), {
      nodeId: 'c',
      index: 0,
      name: 'OK',
    })

    expect(after.nodes[0].data.config.note).toBe('keep me')
  })

  it('前後の空白を落とした名前で保存する', () => {
    const after = renameConditionBranch(graph([conditionNode('c')]), {
      nodeId: 'c',
      index: 0,
      name: '  Approved  ',
    })

    expect(branchesOf(after, 'c')).toEqual(['Approved', 'No'])
  })

  it('壊れた config.branches は既定値へ正規化してから書き換える', () => {
    const after = renameConditionBranch(graph([conditionNode('c', 'Yes,No')]), {
      nodeId: 'c',
      index: 0,
      name: 'OK',
    })

    expect(branchesOf(after, 'c')).toEqual(['OK', 'No'])
  })

  it.each([
    ['空文字', ''],
    ['空白のみ', '   '],
    ['他の分岐と重複', 'No'],
    ['変更なし', 'Yes'],
  ])('%s の場合は何も変更しない', (_label, name) => {
    const before = graph([conditionNode('c')], [branchEdge('e1', 'c', 'Yes')])

    const after = renameConditionBranch(before, { nodeId: 'c', index: 0, name })

    // 参照ごと維持する（呼び出し側が no-op を参照比較で判定するため）
    expect(after.nodes).toBe(before.nodes)
    expect(after.edges).toBe(before.edges)
  })

  it.each([
    ['範囲外の index', { nodeId: 'c', index: 5 }],
    ['存在しないノード', { nodeId: 'ghost', index: 0 }],
    ['Condition 以外のノード', { nodeId: 'a', index: 0 }],
  ])('%s は何も変更しない', (_label, target) => {
    const before = graph([conditionNode('c'), actionNode('a')])

    const after = renameConditionBranch(before, { ...target, name: 'X' })

    expect(after.nodes).toBe(before.nodes)
  })

  it('接続の無い分岐のリネームでは edges の参照を維持する', () => {
    const before = graph([conditionNode('c')], [branchEdge('e1', 'c', 'Yes')])

    const after = renameConditionBranch(before, {
      nodeId: 'c',
      index: 1,
      name: 'Rejected',
    })

    expect(after.edges).toBe(before.edges)
  })
})

describe('addConditionBranch', () => {
  it('重複しない既定名で分岐を追加する', () => {
    const after = addConditionBranch(graph([conditionNode('c')]), {
      nodeId: 'c',
    })

    expect(branchesOf(after, 'c')).toEqual(['Yes', 'No', 'Branch 3'])
  })

  it('既定名が既に使われていれば別名を選ぶ', () => {
    const after = addConditionBranch(
      graph([conditionNode('c', ['Yes', 'Branch 3'])]),
      { nodeId: 'c' },
    )

    expect(branchesOf(after, 'c')).toEqual(['Yes', 'Branch 3', 'Branch 4'])
  })

  it('Edge は増やさない', () => {
    const before = graph([conditionNode('c')], [branchEdge('e1', 'c', 'Yes')])

    expect(addConditionBranch(before, { nodeId: 'c' }).edges).toBe(before.edges)
  })

  it('Condition 以外のノードでは何も変更しない', () => {
    const before = graph([actionNode('a')])

    expect(addConditionBranch(before, { nodeId: 'a' }).nodes).toBe(before.nodes)
  })
})

describe('removeConditionBranch', () => {
  it('分岐と、その分岐に紐づく Edge を削除する', () => {
    const before = graph(
      [conditionNode('c', ['Yes', 'No', 'Pending'])],
      [
        branchEdge('e1', 'c', 'Yes'),
        branchEdge('e2', 'c', 'Pending'),
        branchEdge('e3', 'c', 'Pending'),
      ],
    )

    const after = removeConditionBranch(before, { nodeId: 'c', index: 2 })

    expect(branchesOf(after, 'c')).toEqual(['Yes', 'No'])
    // 孤立 sourceHandle を残さない
    expect(after.edges.map((edge) => edge.id)).toEqual(['e1'])
  })

  it('分岐が最低数のときは削除しない', () => {
    const before = graph([conditionNode('c')], [branchEdge('e1', 'c', 'Yes')])

    const after = removeConditionBranch(before, { nodeId: 'c', index: 0 })

    expect(branchesOf(after, 'c')).toEqual(['Yes', 'No'])
    expect(after.nodes).toBe(before.nodes)
    expect(after.edges).toBe(before.edges)
  })

  it('最低数は 2 である', () => {
    expect(MIN_CONDITION_BRANCHES).toBe(2)
  })

  it('範囲外の index では何も変更しない', () => {
    const before = graph([conditionNode('c', ['Yes', 'No', 'Pending'])])

    expect(removeConditionBranch(before, { nodeId: 'c', index: 9 }).nodes).toBe(
      before.nodes,
    )
  })

  it('接続の無い分岐の削除では edges の参照を維持する', () => {
    const before = graph(
      [conditionNode('c', ['Yes', 'No', 'Pending'])],
      [branchEdge('e1', 'c', 'Yes')],
    )

    expect(removeConditionBranch(before, { nodeId: 'c', index: 1 }).edges).toBe(
      before.edges,
    )
  })
})
