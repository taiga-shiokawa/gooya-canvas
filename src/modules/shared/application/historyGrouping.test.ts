import { describe, expect, it } from 'vitest'
import {
  createHistoryGroupGate,
  currentHistoryGroup,
  withHistoryGroup,
} from './historyGrouping'

describe('createHistoryGroupGate', () => {
  it('キーの無い変更は常に 1 件として積む', () => {
    const gate = createHistoryGroupGate(500)

    expect(gate.shouldRecord(null, 0)).toBe(true)
    expect(gate.shouldRecord(null, 1)).toBe(true)
    expect(gate.shouldRecord(null, 2)).toBe(true)
  })

  it('同じキーへの連続した変更は時間窓の中でまとめる', () => {
    const gate = createHistoryGroupGate(500)

    expect(gate.shouldRecord('node:a:title', 0)).toBe(true)
    expect(gate.shouldRecord('node:a:title', 100)).toBe(false)
    expect(gate.shouldRecord('node:a:title', 400)).toBe(false)
  })

  it('時間窓を越えたら新しい履歴にする', () => {
    const gate = createHistoryGroupGate(500)

    expect(gate.shouldRecord('node:a:title', 0)).toBe(true)
    expect(gate.shouldRecord('node:a:title', 601)).toBe(true)
  })

  it('編集対象が変わったら新しい履歴にする', () => {
    const gate = createHistoryGroupGate(500)

    expect(gate.shouldRecord('node:a:title', 0)).toBe(true)
    expect(gate.shouldRecord('node:a:description', 10)).toBe(true)
    expect(gate.shouldRecord('node:a:title', 20)).toBe(true)
  })

  it('キーの無い変更を挟むとグループが切れる', () => {
    const gate = createHistoryGroupGate(500)

    gate.shouldRecord('node:a:title', 0)
    expect(gate.shouldRecord(null, 10)).toBe(true)
    expect(gate.shouldRecord('node:a:title', 20)).toBe(true)
  })

  it('reset するとグループ判定が初期化される', () => {
    const gate = createHistoryGroupGate(500)

    gate.shouldRecord('node:a:title', 0)
    gate.reset()
    expect(gate.shouldRecord('node:a:title', 10)).toBe(true)
  })
})

describe('withHistoryGroup', () => {
  it('実行中だけ編集対象を公開する', () => {
    expect(currentHistoryGroup()).toBeNull()

    withHistoryGroup('node:a:title', () => {
      expect(currentHistoryGroup()).toBe('node:a:title')
    })

    expect(currentHistoryGroup()).toBeNull()
  })

  it('例外が出ても後始末する', () => {
    expect(() =>
      withHistoryGroup('node:a:title', () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(currentHistoryGroup()).toBeNull()
  })
})
