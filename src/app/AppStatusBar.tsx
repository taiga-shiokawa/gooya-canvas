import {
  formatReviewSummary,
  selectReviewFindings,
  summarizeReviewFindings,
  useWorkflowStore,
} from '@/modules/shared'

// Status Bar（docs/functional-design.md §4.3）。
// dirty インジケータは Phase 4（Persistence）、Review サマリは Phase 6。
// dirty を立てる / 倒す条件は store 側が持つ（§2.4）。ここは表示だけを行う。
// Review サマリは結果が保持されている間だけ出す（未実行なら何も出さない）。
export function AppStatusBar() {
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const projectName = useWorkflowStore((state) => state.metadata.name)
  const reviewFindings = useWorkflowStore(selectReviewFindings)

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 text-xs text-slate-500">
      <span className="truncate text-slate-600">{projectName}</span>
      <span className="flex items-center gap-1.5" aria-live="polite">
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${
            isDirty ? 'bg-amber-500' : 'bg-slate-300'
          }`}
        />
        {isDirty ? '未保存の変更があります' : '変更はありません'}
      </span>
      {reviewFindings ? (
        <span aria-live="polite" className="truncate text-slate-600">
          {`Review: ${formatReviewSummary(summarizeReviewFindings(reviewFindings))}`}
        </span>
      ) : null}
    </footer>
  )
}
