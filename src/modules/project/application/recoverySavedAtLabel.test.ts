import { describe, expect, it } from 'vitest'
import { formatRecoverySavedAt } from './recoverySavedAtLabel'

// 復旧ダイアログの日時表示（docs/functional-design.md §7.5）。
// savedAt は localStorage 由来の外部入力なので、日時として読めない値が来ても
// 表示を壊さないこと（null を返し、呼び出し側が日時抜きの文言へ倒す）。

describe('formatRecoverySavedAt', () => {
  it('ISO 8601 をローカル時刻の固定書式へ整形する', () => {
    // 環境のタイムゾーンに依存しないよう、ローカル時刻を組み立てて往復させる
    const date = new Date(2026, 8, 8, 14, 5)

    expect(formatRecoverySavedAt(date.toISOString())).toBe('2026-09-08 14:05')
  })

  it('1 桁の月日時分を 0 埋めする', () => {
    const date = new Date(2026, 0, 2, 3, 4)

    expect(formatRecoverySavedAt(date.toISOString())).toBe('2026-01-02 03:04')
  })

  it('日時として読めない文字列には null を返す', () => {
    expect(formatRecoverySavedAt('')).toBeNull()
    expect(formatRecoverySavedAt('yesterday')).toBeNull()
    expect(formatRecoverySavedAt('2026-13-45T99:99:99Z')).toBeNull()
  })
})
