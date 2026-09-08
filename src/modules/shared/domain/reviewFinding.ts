// Flow Review の結果型と件数サマリ（docs/functional-design.md §4.3 / §10.3）。
//
// 型を shared に置く理由: 結果を生成するのは review だが、表示するのは review の Panel と
// app のステータスバーの両方であり、feature モジュール間の直接 import は禁止されている
// （docs/repository-structure.md §5.1 #4）。受け渡し経路は shared の store 一本に絞り、
// その荷物である型と、件数の数え方・表記も shared が所有する（数え方を 2 箇所に複製しないため）。
//
// ルール ID の一覧そのもの（RV-Exx / RV-Wxx / RV-Ixx）は Review のルール知識なので
// review の domain が所有する。ここでは `ruleId: string` として受けるだけに留める。

/** ERROR / WARNING / INFO の 3 段階（docs/glossary.md）。並び順は重大度の降順。 */
export const REVIEW_LEVELS = ['error', 'warning', 'info'] as const

export type ReviewLevel = (typeof REVIEW_LEVELS)[number]

/** Review 結果 1 件（docs/functional-design.md §10.3）。 */
export type ReviewFinding = {
  /** ルール ID（例: 'RV-E01'）。 */
  readonly ruleId: string
  readonly level: ReviewLevel
  readonly message: string
  /** 対象 Node。持つ結果はクリックで該当 Node へ移動できる（FR-024）。 */
  readonly nodeId?: string
  readonly edgeId?: string
}

export type ReviewSummary = {
  readonly errors: number
  readonly warnings: number
  /** INFO は UI 上「SUGGESTION」と表示する（docs/glossary.md）。 */
  readonly suggestions: number
  readonly total: number
}

/** UI 表示名。INFO だけ「SUGGESTION」と読み替える（docs/functional-design.md §10.3）。 */
export function reviewLevelLabel(level: ReviewLevel): string {
  if (level === 'error') return 'ERROR'
  if (level === 'warning') return 'WARNING'
  return 'SUGGESTION'
}

export function summarizeReviewFindings(
  findings: readonly ReviewFinding[],
): ReviewSummary {
  let errors = 0
  let warnings = 0
  let suggestions = 0

  for (const finding of findings) {
    if (finding.level === 'error') errors += 1
    else if (finding.level === 'warning') warnings += 1
    else suggestions += 1
  }

  return { errors, warnings, suggestions, total: findings.length }
}

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** `2 Errors / 4 Warnings / 3 Suggestions` 形式（docs/functional-design.md §4.3 / §10.3）。 */
export function formatReviewSummary(summary: ReviewSummary): string {
  return [
    countLabel(summary.errors, 'Error'),
    countLabel(summary.warnings, 'Warning'),
    countLabel(summary.suggestions, 'Suggestion'),
  ].join(' / ')
}
