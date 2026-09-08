import { NodePalette, WorkflowCanvas } from '@/modules/canvas'
import { Inspector } from '@/modules/inspector'
import { AppHeader } from './AppHeader'
import { AppStatusBar } from './AppStatusBar'

// composition root。レイアウトの組み立てとポート具象の注入だけを行う
// （docs/functional-design.md §4.1 の 3 ペイン + Header + Status Bar）。
// 4 スロットに分けてあるのは、後続フェーズが互いに競合せず埋められるようにするため:
// Header = Phase 4 / 5 / 6・7、Inspector ペイン = Phase 3（実装済み）、Status Bar = Phase 4 / 6。
export function App() {
  return (
    <div className="flex h-full flex-col bg-slate-100">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <main className="min-w-0 flex-1">
          <WorkflowCanvas />
        </main>
        <Inspector />
      </div>
      <AppStatusBar />
    </div>
  )
}
