import { useWorkflowStore } from '@/modules/shared'

// Status Bar（docs/functional-design.md §4.3）。
// dirty インジケータは Phase 4（Persistence）。Review サマリは Phase 6 で埋める。
// dirty を立てる / 倒す条件は store 側が持つ（§2.4）。ここは表示だけを行う。
export function AppStatusBar() {
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const projectName = useWorkflowStore((state) => state.metadata.name)

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
    </footer>
  )
}
