import { describe, expect, it } from 'vitest'
import { formatGeneratedDate } from './exportDateFormat'

// Generated Date の整形（docs/functional-design.md §8.2）。
// 現在時刻は引数で受け取る純関数なので、Date をローカル時刻の各成分から作れば
// 実行環境のタイムゾーンに依存せず検証できる（development-guidelines §2.2）。

describe('formatGeneratedDate', () => {
  it('YYYY-MM-DD HH:mm で整形する', () => {
    expect(formatGeneratedDate(new Date(2026, 8, 8, 14, 5))).toBe(
      '2026-09-08 14:05',
    )
  })

  it('月・日・時・分を 2 桁へ 0 埋めする', () => {
    expect(formatGeneratedDate(new Date(2026, 0, 1, 0, 0))).toBe(
      '2026-01-01 00:00',
    )
    expect(formatGeneratedDate(new Date(2026, 11, 31, 23, 59))).toBe(
      '2026-12-31 23:59',
    )
  })

  it('秒は出力しない', () => {
    expect(formatGeneratedDate(new Date(2026, 8, 8, 14, 5, 42))).toBe(
      '2026-09-08 14:05',
    )
  })

  it('無効な Date には空文字を返す', () => {
    expect(formatGeneratedDate(new Date(Number.NaN))).toBe('')
  })
})
