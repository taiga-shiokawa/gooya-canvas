// Status Bar（docs/functional-design.md §4.3）。
// dirty インジケータは Phase 4（Persistence）、Review サマリは Phase 6 で埋める。
export function AppStatusBar() {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 text-xs text-slate-500" />
  )
}
