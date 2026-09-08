import { describe, expect, it } from 'vitest'
import {
  formatReviewSummary,
  reviewLevelLabel,
  summarizeReviewFindings,
  type ReviewFinding,
} from './reviewFinding'

function finding(level: ReviewFinding['level'], ruleId: string): ReviewFinding {
  return { ruleId, level, message: `${ruleId} message` }
}

describe('summarizeReviewFindings', () => {
  it('レベルごとに件数を数える', () => {
    const summary = summarizeReviewFindings([
      finding('error', 'RV-E01'),
      finding('error', 'RV-E03'),
      finding('warning', 'RV-W01'),
      finding('warning', 'RV-W02'),
      finding('warning', 'RV-W03'),
      finding('warning', 'RV-W05'),
      finding('info', 'RV-I01'),
      finding('info', 'RV-I02'),
      finding('info', 'RV-I03'),
    ])

    expect(summary).toEqual({
      errors: 2,
      warnings: 4,
      suggestions: 3,
      total: 9,
    })
  })

  it('空の結果は 0 件になる', () => {
    expect(summarizeReviewFindings([])).toEqual({
      errors: 0,
      warnings: 0,
      suggestions: 0,
      total: 0,
    })
  })
})

describe('formatReviewSummary', () => {
  it('docs/functional-design.md §4.3 の表記になる', () => {
    expect(
      formatReviewSummary({
        errors: 2,
        warnings: 4,
        suggestions: 3,
        total: 9,
      }),
    ).toBe('2 Errors / 4 Warnings / 3 Suggestions')
  })

  it('1 件のときは単数形にする', () => {
    expect(
      formatReviewSummary({
        errors: 1,
        warnings: 1,
        suggestions: 1,
        total: 3,
      }),
    ).toBe('1 Error / 1 Warning / 1 Suggestion')
  })

  it('0 件でも 3 種すべてを表示する', () => {
    expect(
      formatReviewSummary({
        errors: 0,
        warnings: 0,
        suggestions: 0,
        total: 0,
      }),
    ).toBe('0 Errors / 0 Warnings / 0 Suggestions')
  })
})

describe('reviewLevelLabel', () => {
  it('INFO は SUGGESTION と表示する', () => {
    expect(reviewLevelLabel('error')).toBe('ERROR')
    expect(reviewLevelLabel('warning')).toBe('WARNING')
    expect(reviewLevelLabel('info')).toBe('SUGGESTION')
  })
})
