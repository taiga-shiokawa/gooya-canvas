// Header（docs/functional-design.md §4.2）。
// File メニューは Phase 4（Persistence）、Export は Phase 7、
// Main Actions の Generate Prompt は Phase 5、Review Flow は Phase 6 で埋める。
export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <span className="text-sm font-semibold text-slate-800">GOOYA Canvas</span>
      <nav className="flex items-center gap-1" aria-label="File" />
      <div className="ml-auto flex items-center gap-2" />
    </header>
  )
}
