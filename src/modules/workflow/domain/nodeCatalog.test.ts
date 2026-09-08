import { describe, expect, it } from 'vitest'
import {
  conditionBranches,
  createDefaultNodeData,
  DEFAULT_CONDITION_BRANCHES,
  NODE_CONFIG_KEYS,
  nodeKindLabel,
} from './nodeCatalog'
import { WORKFLOW_NODE_KINDS, type WorkflowNode } from './types'

function conditionNode(config: Record<string, unknown>): WorkflowNode {
  return {
    id: 'c',
    type: 'condition',
    position: { x: 0, y: 0 },
    data: { title: 'Condition', config },
  }
}

describe('nodeKindLabel', () => {
  it('11 種すべてに空でない表示名がある', () => {
    for (const kind of WORKFLOW_NODE_KINDS) {
      expect(nodeKindLabel(kind)).not.toBe('')
    }
  })

  it('camelCase の種別を英語表記の表示名へ変換する', () => {
    expect(nodeKindLabel('dataSource')).toBe('Data Source')
    expect(nodeKindLabel('humanTask')).toBe('Human Task')
  })
})

describe('NODE_CONFIG_KEYS', () => {
  it('11 種すべてにエントリがある', () => {
    for (const kind of WORKFLOW_NODE_KINDS) {
      expect(NODE_CONFIG_KEYS[kind]).toBeDefined()
    }
  })
})

describe('createDefaultNodeData', () => {
  it('既定 title に種別の表示名を使う', () => {
    expect(createDefaultNodeData('notification').title).toBe('Notification')
  })

  it('Condition は branches の初期値を持つ', () => {
    expect(createDefaultNodeData('condition').config).toEqual({
      branches: ['Yes', 'No'],
    })
  })

  it('Condition の初期 branches は呼び出しごとに独立した配列を返す', () => {
    const first = createDefaultNodeData('condition').config.branches
    const second = createDefaultNodeData('condition').config.branches

    expect(first).not.toBe(second)
    // 共有していると 1 ノードの分岐編集が全 Condition ノードへ波及する
    expect(first).not.toBe(DEFAULT_CONDITION_BRANCHES)
  })

  it('Wait は unit の初期値を持つ', () => {
    expect(createDefaultNodeData('wait').config).toEqual({ unit: 'minutes' })
  })

  it('構造的な既定値が無い種別は空の config を返す', () => {
    // 推奨キーを空文字で埋めない（「未設定」と区別できなくなるため）
    expect(createDefaultNodeData('action').config).toEqual({})
    expect(createDefaultNodeData('note').config).toEqual({})
  })
})

describe('conditionBranches', () => {
  it('config.branches をそのまま返す', () => {
    expect(
      conditionBranches(conditionNode({ branches: ['A', 'B', 'C'] })),
    ).toEqual(['A', 'B', 'C'])
  })

  it('Condition 以外は空配列を返す', () => {
    const action: WorkflowNode = {
      id: 'a',
      type: 'action',
      position: { x: 0, y: 0 },
      data: { title: 'Action', config: { branches: ['A'] } },
    }

    expect(conditionBranches(action)).toEqual([])
  })

  it.each([
    ['branches が無い', {}],
    ['branches が配列でない', { branches: 'Yes,No' }],
    ['branches が空配列', { branches: [] }],
    ['要素が文字列でない', { branches: [1, null] }],
    ['要素が空白のみ', { branches: ['  ', ''] }],
  ])('%s ときは既定値へフォールバックする', (_label, config) => {
    // Source Handle が 0 個になると Condition から一切接続できなくなる
    expect(conditionBranches(conditionNode(config))).toEqual(['Yes', 'No'])
  })

  it('不正な要素だけを取り除く', () => {
    expect(
      conditionBranches(conditionNode({ branches: ['Yes', 42, 'No'] })),
    ).toEqual(['Yes', 'No'])
  })
})
