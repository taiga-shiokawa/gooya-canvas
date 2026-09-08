import { ProjectDialog, useProjectCommands } from '@/modules/project'
import { PromptPanel } from '@/modules/prompt'
import { useCallback, useEffect, useRef, useState } from 'react'
import { projectUseCases, promptUseCases } from './ports'

// Header（docs/functional-design.md §4.2）。
// File メニューは Phase 4（Persistence）、Generate Prompt は Phase 5。
// Export PDF / PNG は Phase 7、Main Actions の Review Flow は Phase 6 で埋める。
//
// ヘッドレス UI ライブラリは未導入のため、メニューは自前実装で
// Esc クローズ・外側クリック・aria 属性・フォーカス復帰を担保する
// （docs/development-guidelines.md §4.1）。

const MENU_ID = 'app-file-menu'

const MENU_ITEM_CLASS =
  'w-full rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none'

export function AppHeader() {
  const commands = useProjectCommands(projectUseCases)
  const [promptOpen, setPromptOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenu, menuOpen])

  const runCommand = (command: () => void) => {
    closeMenu(true)
    command()
  }

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <span className="text-sm font-semibold text-slate-800">GOOYA Canvas</span>

      <nav className="flex items-center gap-1" aria-label="File">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            ref={triggerRef}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? MENU_ID : undefined}
            onClick={() => setMenuOpen((open) => !open)}
            className={`rounded px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100 ${
              menuOpen ? 'bg-slate-100' : ''
            }`}
          >
            File
          </button>

          {menuOpen ? (
            <div
              id={MENU_ID}
              role="menu"
              aria-label="File"
              className="absolute top-full left-0 z-20 mt-1 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => runCommand(commands.newProject)}
                className={MENU_ITEM_CLASS}
              >
                New
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => runCommand(commands.openProject)}
                className={MENU_ITEM_CLASS}
              >
                Open Project
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => runCommand(commands.saveProject)}
                className={MENU_ITEM_CLASS}
              >
                Save Project
              </button>
            </div>
          ) : null}
        </div>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Generate Prompt
        </button>
      </div>

      <ProjectDialog state={commands.dialog} />
      {promptOpen ? (
        <PromptPanel
          useCases={promptUseCases}
          onClose={() => setPromptOpen(false)}
        />
      ) : null}
    </header>
  )
}
