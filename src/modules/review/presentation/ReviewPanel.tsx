import {
  formatReviewSummary,
  REVIEW_LEVELS,
  reviewLevelLabel,
  selectReviewFindings,
  summarizeReviewFindings,
  useWorkflowStore,
  type ReviewFinding,
  type ReviewLevel,
} from '@/modules/shared'
import { useEffect, useRef } from 'react'
import type { ReviewUseCases } from '../application/reviewUseCases'

// Review Panel（FR-024 / docs/functional-design.md §10.3）。
//
// PromptPanel と違い**モーダルにしない**。問題をクリックすると背後の Canvas が該当 Node へ
// 移動する（FR-024）ので、Canvas が見えていて操作できる必要があるため。
// ヘッドレス UI ライブラリは未導入（development-guidelines §4.1）なので、Esc クローズと
// aria 属性は自前で担保する。非モーダルのためフォーカストラップは張らない。
//
// 判定ロジックは domain、実行と保持は application にあり、ここは購読と表示だけを行う。

const LEVEL_STYLES: Record<ReviewLevel, { badge: string; marker: string }> = {
  error: { badge: 'bg-red-100 text-red-700', marker: 'bg-red-500' },
  warning: { badge: 'bg-amber-100 text-amber-700', marker: 'bg-amber-500' },
  info: { badge: 'bg-sky-100 text-sky-700', marker: 'bg-sky-500' },
}

const BUTTON_CLASS =
  'rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500'

type ReviewPanelProps = {
  useCases: ReviewUseCases
  onClose: () => void
}

export function ReviewPanel({ useCases, onClose }: ReviewPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const findings = useWorkflowStore(selectReviewFindings)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const summary = findings ? summarizeReviewFindings(findings) : null

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Flow Review"
      className="fixed bottom-10 left-4 z-30 flex max-h-[45vh] w-96 flex-col rounded-lg border border-slate-200 bg-white text-slate-800 shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-900">Flow Review</h2>
        <button
          type="button"
          onClick={() => useCases.run()}
          className={`${BUTTON_CLASS} ml-auto`}
        >
          再実行
        </button>
        <button type="button" onClick={onClose} className={BUTTON_CLASS}>
          閉じる
        </button>
      </div>

      <p
        aria-live="polite"
        className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600"
      >
        {summary
          ? formatReviewSummary(summary)
          : 'Review が未実行です。「再実行」で解析します。'}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {summary && summary.total === 0 ? (
          <p className="text-xs text-slate-500">
            指摘はありません。Workflow は主要なルールを満たしています。
          </p>
        ) : null}

        {findings
          ? REVIEW_LEVELS.map((level) => {
              const items = findings.filter(
                (finding) => finding.level === level,
              )
              if (items.length === 0) return null

              return (
                <section key={level} className="mb-3 last:mb-0">
                  <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <span
                      className={`rounded px-1.5 py-0.5 ${LEVEL_STYLES[level].badge}`}
                    >
                      {reviewLevelLabel(level)}
                    </span>
                    <span>{items.length}</span>
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {items.map((finding, index) => (
                      <li key={`${finding.ruleId}-${finding.nodeId ?? index}`}>
                        <ReviewFindingItem
                          finding={finding}
                          onFocusNode={useCases.focusNode}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          : null}
      </div>
    </aside>
  )
}

function ReviewFindingItem({
  finding,
  onFocusNode,
}: {
  finding: ReviewFinding
  onFocusNode: (nodeId: string) => void
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${LEVEL_STYLES[finding.level].marker}`}
      />
      <span className="min-w-0">
        <span className="font-mono text-[10px] text-slate-400">
          {finding.ruleId}
        </span>{' '}
        {finding.message}
      </span>
    </>
  )

  // Node に紐づく問題だけがクリックで移動できる（FR-024）。
  // 紐づかない問題（Trigger なし等）はボタンにせず、押せそうに見せない。
  if (!finding.nodeId) {
    return (
      <span className="flex gap-2 rounded px-2 py-1 text-xs text-slate-600">
        {body}
      </span>
    )
  }

  const nodeId = finding.nodeId
  return (
    <button
      type="button"
      onClick={() => onFocusNode(nodeId)}
      className="flex w-full gap-2 rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
    >
      {body}
    </button>
  )
}
