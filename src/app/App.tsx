import { NodePalette, WorkflowCanvas } from '@/modules/canvas'

// composition root。Phase 1 はポート具象が無いため注入はなく、
// レイアウト（Palette + Canvas）の組み立てのみを行う。
// Header メニュー / Inspector / ステータスバーは各フェーズで追加する
// （docs/functional-design.md §4.1）。
export function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-slate-200 px-4">
        <span className="text-sm font-semibold text-slate-800">
          GOOYA Canvas
        </span>
      </header>
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <main className="min-w-0 flex-1">
          <WorkflowCanvas />
        </main>
      </div>
    </div>
  )
}
