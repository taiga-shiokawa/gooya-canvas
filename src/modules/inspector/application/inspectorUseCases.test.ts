import { useWorkflowStore } from '@/modules/shared'
import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeKind,
} from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addConditionBranch,
  removeConditionBranch,
  renameConditionBranch,
  updateEdgeDescription,
  updateEdgeLabel,
  updateNodeConfigNumber,
  updateNodeConfigText,
  updateNodeText,
} from './inspectorUseCases'

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

function nodeById(id: string): WorkflowNode {
  const found = useWorkflowStore.getState().nodes.find((n) => n.id === id)
  if (!found) throw new Error(`node ${id} not found`)
  return found
}

function edgeById(id: string): WorkflowEdge {
  const found = useWorkflowStore.getState().edges.find((e) => e.id === id)
  if (!found) throw new Error(`edge ${id} not found`)
  return found
}

beforeEach(() => {
  seed([], [])
})

describe('updateNodeText', () => {
  it('Name を更新して dirty を立てる', () => {
    seed([node('a')])

    updateNodeText('a', 'title', '面接終了を検知')

    expect(nodeById('a').data.title).toBe('面接終了を検知')
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('Description / Notes を更新する', () => {
    seed([node('a')])

    updateNodeText('a', 'description', '評価入力の有無を見る')
    updateNodeText('a', 'notes', '面接官の負荷に注意')

    expect(nodeById('a').data).toMatchObject({
      description: '評価入力の有無を見る',
      notes: '面接官の負荷に注意',
    })
  })

  it('空文字にすると未設定へ戻す（空文字を保存しない）', () => {
    seed([node('a')])
    updateNodeText('a', 'description', 'あとで消す')

    updateNodeText('a', 'description', '   ')

    expect(nodeById('a').data.description).toBeUndefined()
  })

  it('Name は空でも保持する（必須項目のため）', () => {
    seed([node('a')])

    updateNodeText('a', 'title', '')

    expect(nodeById('a').data.title).toBe('')
  })

  it('他のノードは変更しない', () => {
    seed([node('a'), node('b')])
    const before = nodeById('b')

    updateNodeText('a', 'title', 'changed')

    expect(nodeById('b')).toBe(before)
  })

  it('存在しないノードの更新では dirty を立てない', () => {
    seed([node('a')])

    updateNodeText('ghost', 'title', 'x')

    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})

describe('updateNodeConfigText', () => {
  it('config の値を更新して dirty を立てる', () => {
    seed([node('t', 'trigger')])

    updateNodeConfigText('t', 'system', 'Calendar Event')

    expect(nodeById('t').data.config).toEqual({ system: 'Calendar Event' })
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('空文字はキーごと削除する（Flow Review の欠落判定のため）', () => {
    seed([node('n', 'notification', { recipient: '人事', provider: 'Slack' })])

    updateNodeConfigText('n', 'recipient', '')

    expect(nodeById('n').data.config).toEqual({ provider: 'Slack' })
  })
})

describe('updateNodeConfigNumber', () => {
  it('数値として保存する', () => {
    seed([node('w', 'wait', { unit: 'minutes' })])

    updateNodeConfigNumber('w', 'duration', '60')

    expect(nodeById('w').data.config).toEqual({ unit: 'minutes', duration: 60 })
  })

  it('空文字はキーごと削除する', () => {
    seed([node('w', 'wait', { duration: 60 })])

    updateNodeConfigNumber('w', 'duration', '')

    expect(nodeById('w').data.config).toEqual({})
  })

  it('数値として読めない入力は無視する', () => {
    seed([node('w', 'wait', { duration: 60 })])

    updateNodeConfigNumber('w', 'duration', 'すぐ')

    expect(nodeById('w').data.config).toEqual({ duration: 60 })
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})

describe('Condition の分岐編集', () => {
  function seedCondition(branches: string[] = ['Yes', 'No']) {
    seed(
      [node('c', 'condition', { branches }), node('e', 'end')],
      [
        {
          id: 'yes',
          source: 'c',
          target: 'e',
          sourceHandle: 'Yes',
          label: 'Yes',
        },
        { id: 'no', source: 'c', target: 'e', sourceHandle: 'No', label: 'No' },
      ],
    )
  }

  it('リネームで該当 Edge の sourceHandle / label が追随し dirty が立つ', () => {
    seedCondition()

    renameConditionBranch('c', 1, 'Rejected')

    expect(nodeById('c').data.config.branches).toEqual(['Yes', 'Rejected'])
    expect(edgeById('no')).toMatchObject({
      sourceHandle: 'Rejected',
      label: 'Rejected',
    })
    expect(edgeById('yes')).toMatchObject({ sourceHandle: 'Yes', label: 'Yes' })
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('空文字・重複するリネームは無視し dirty も立てない', () => {
    seedCondition()

    renameConditionBranch('c', 0, '  ')
    renameConditionBranch('c', 0, 'No')

    expect(nodeById('c').data.config.branches).toEqual(['Yes', 'No'])
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })

  it('分岐を追加できる（Edge は増えない）', () => {
    seedCondition()

    addConditionBranch('c')

    expect(nodeById('c').data.config.branches).toEqual([
      'Yes',
      'No',
      'Branch 3',
    ])
    expect(useWorkflowStore.getState().edges).toHaveLength(2)
  })

  it('分岐を削除すると、その分岐に紐づく Edge も削除される', () => {
    seedCondition(['Yes', 'No', 'Pending'])
    useWorkflowStore.setState({
      edges: [
        ...useWorkflowStore.getState().edges,
        {
          id: 'pending',
          source: 'c',
          target: 'e',
          sourceHandle: 'Pending',
          label: 'Pending',
        },
      ],
      isDirty: false,
    })

    removeConditionBranch('c', 2)

    expect(nodeById('c').data.config.branches).toEqual(['Yes', 'No'])
    // 孤立した sourceHandle を持つ Edge を残さない
    expect(useWorkflowStore.getState().edges.map((e) => e.id)).toEqual([
      'yes',
      'no',
    ])
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('分岐が 2 つ未満になる削除は無視する', () => {
    seedCondition()

    removeConditionBranch('c', 0)
    removeConditionBranch('c', 1)

    expect(nodeById('c').data.config.branches).toEqual(['Yes', 'No'])
    expect(useWorkflowStore.getState().edges).toHaveLength(2)
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })

  it('Condition 以外のノードでは何もしない', () => {
    seed([node('a')])

    addConditionBranch('a')
    renameConditionBranch('a', 0, 'X')
    removeConditionBranch('a', 0)

    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})

describe('Edge の編集', () => {
  function seedEdge(edge: Partial<WorkflowEdge> = {}) {
    seed(
      [node('a'), node('b')],
      [{ id: 'e1', source: 'a', target: 'b', ...edge }],
    )
  }

  it('Label を更新して dirty を立てる', () => {
    seedEdge()

    updateEdgeLabel('e1', 'Completed')

    expect(edgeById('e1').label).toBe('Completed')
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('空文字の Label は未設定へ戻す', () => {
    seedEdge({ label: 'Completed' })

    updateEdgeLabel('e1', '')

    expect(edgeById('e1').label).toBeUndefined()
  })

  it('Description を data へ保存する', () => {
    seedEdge()

    updateEdgeDescription('e1', '承認された場合のみ')

    expect(edgeById('e1').data).toEqual({ description: '承認された場合のみ' })
  })

  it('空文字の Description は data ごと落とす', () => {
    seedEdge({ data: { description: '消す' } })

    updateEdgeDescription('e1', '')

    expect(edgeById('e1').data).toBeUndefined()
  })

  it('存在しない Edge の更新では dirty を立てない', () => {
    seedEdge()

    updateEdgeLabel('ghost', 'x')

    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })
})
