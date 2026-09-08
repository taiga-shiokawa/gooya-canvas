import { describe, expect, it } from 'vitest'
import { canConnect } from './connectionRules'
import type { WorkflowNode, WorkflowNodeKind } from './types'

function node(id: string, type: WorkflowNodeKind): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data: { title: id, config: {} } }
}

describe('canConnect', () => {
  it('通常のノード間の接続を許可する', () => {
    const result = canConnect({
      source: node('a', 'action'),
      target: node('b', 'notification'),
    })

    expect(result.allowed).toBe(true)
  })

  it('自分自身への接続を拒否する', () => {
    const self = node('a', 'action')

    expect(canConnect({ source: self, target: self }).allowed).toBe(false)
  })

  it('Trigger への incoming を拒否する', () => {
    const result = canConnect({
      source: node('a', 'action'),
      target: node('b', 'trigger'),
    })

    expect(result.allowed).toBe(false)
  })

  it('Trigger からの outgoing は許可する', () => {
    const result = canConnect({
      source: node('a', 'trigger'),
      target: node('b', 'action'),
    })

    expect(result.allowed).toBe(true)
  })

  it('End からの outgoing を拒否する', () => {
    const result = canConnect({
      source: node('a', 'end'),
      target: node('b', 'action'),
    })

    expect(result.allowed).toBe(false)
  })

  it('End への incoming は許可する', () => {
    const result = canConnect({
      source: node('a', 'action'),
      target: node('b', 'end'),
    })

    expect(result.allowed).toBe(true)
  })

  it.each(['source', 'target'] as const)(
    'Note を %s に含む接続を拒否する',
    (endpoint) => {
      const note = node('n', 'note')
      const other = node('a', 'action')
      const result =
        endpoint === 'source'
          ? canConnect({ source: note, target: other })
          : canConnect({ source: other, target: note })

      expect(result.allowed).toBe(false)
    },
  )

  it('端点のノードが見つからない場合は拒否する', () => {
    expect(
      canConnect({ source: undefined, target: node('b', 'action') }).allowed,
    ).toBe(false)
    expect(
      canConnect({ source: node('a', 'action'), target: undefined }).allowed,
    ).toBe(false)
  })

  it('Cycle は禁止しない（Retry 等の Loop が業務上あり得るため）', () => {
    // a → b が既にある状態で b → a を引くのが Cycle。接続時には判定せず、
    // 到達不能・終了経路の欠如は Flow Review（Phase 6）が指摘する。
    const result = canConnect({
      source: node('b', 'condition'),
      target: node('a', 'action'),
    })

    expect(result.allowed).toBe(true)
  })

  it('拒否時は理由を返す', () => {
    const result = canConnect({
      source: node('a', 'action'),
      target: node('b', 'trigger'),
    })

    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).not.toBe('')
  })
})
