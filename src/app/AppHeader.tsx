import { canvasEditCommands } from '@/modules/canvas'
import { ExportDialog, useExportCommands } from '@/modules/export'
import { ProjectDialog, useProjectCommands } from '@/modules/project'
import { PromptPanel } from '@/modules/prompt'
import { ReviewPanel } from '@/modules/review'
import {
  redoWorkflow,
  undoWorkflow,
  useWorkflowHistory,
  useWorkflowStore,
} from '@/modules/shared'
import { useState } from 'react'
import { AppMenu, type AppMenuItem } from './AppMenu'
import {
  exportUseCases,
  projectUseCases,
  promptUseCases,
  reviewUseCases,
} from './ports'
import { useAppShortcuts } from './useAppShortcuts'

// Header（docs/functional-design.md §4.2）。
// File メニューは Phase 4（Persistence）+ Phase 7（Export）、Edit メニューは Phase 8、
// Main Actions の Generate Prompt は Phase 5、Review Flow は Phase 6。
//
// メニューの見た目・キーボード操作は自前実装の AppMenu が持ち、ここは項目の定義
// （何を出し、何を呼ぶか）だけを書く。canvas / project という別モジュールのコマンドを
// 同じ場所から呼べるのは composition root だけの特権（repository-structure §5.3）。

export function AppHeader() {
  const commands = useProjectCommands(projectUseCases)
  const exportCommands = useExportCommands(exportUseCases)
  const { canUndo, canRedo } = useWorkflowHistory()
  const hasSelection = useWorkflowStore(
    (state) =>
      state.selectedNodeIds.length > 0 || state.selectedEdgeId !== null,
  )
  const hasSelectedNode = useWorkflowStore(
    (state) => state.selectedNodeIds.length > 0,
  )
  const [promptOpen, setPromptOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  useAppShortcuts({
    saveProject: commands.saveProject,
    openProject: commands.openProject,
  })

  const fileItems: AppMenuItem[] = [
    { label: 'New', onSelect: commands.newProject },
    { label: 'Open Project', onSelect: commands.openProject },
    { label: 'Save Project', onSelect: commands.saveProject },
    {
      label: 'Export PDF',
      onSelect: exportCommands.exportPdf,
      disabled: exportCommands.isExporting,
      separatorBefore: true,
    },
    {
      label: 'Export PNG',
      onSelect: exportCommands.exportPng,
      disabled: exportCommands.isExporting,
    },
  ]

  const editItems: AppMenuItem[] = [
    { label: 'Undo', onSelect: undoWorkflow, disabled: !canUndo },
    { label: 'Redo', onSelect: redoWorkflow, disabled: !canRedo },
    {
      label: 'Delete',
      onSelect: canvasEditCommands.deleteSelection,
      disabled: !hasSelection,
      separatorBefore: true,
    },
    {
      label: 'Duplicate',
      onSelect: canvasEditCommands.duplicateSelection,
      disabled: !hasSelectedNode,
    },
  ]

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <span className="text-sm font-semibold text-slate-800">GOOYA Canvas</span>

      <nav className="flex items-center gap-1" aria-label="Main">
        <AppMenu label="File" items={fileItems} />
        <AppMenu label="Edit" items={editItems} />
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            // 開くたびに最新の Workflow で解析し直す（結果は store が保持する）
            reviewUseCases.run()
            setReviewOpen(true)
          }}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Review Flow
        </button>
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Generate Prompt
        </button>
      </div>

      <ProjectDialog state={commands.dialog} />
      <ExportDialog state={exportCommands.dialog} />
      {promptOpen ? (
        <PromptPanel
          useCases={promptUseCases}
          onClose={() => setPromptOpen(false)}
        />
      ) : null}
      {reviewOpen ? (
        <ReviewPanel
          useCases={reviewUseCases}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
    </header>
  )
}
