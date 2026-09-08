import { useCallback, useEffect, useId, useRef, useState } from 'react'

// Header のドロップダウンメニュー（docs/functional-design.md §4.2 の File / Edit）。
//
// ヘッドレス UI ライブラリは未導入のため自前実装で、Esc クローズ・外側クリック・
// role="menu" / "menuitem"・フォーカス復帰を担保する（docs/development-guidelines.md §4.1）。
// メニューが 2 つになったので、Phase 4 で File メニューに書いていた実装をここへ切り出し、
// 項目の定義（何を出すか）だけを AppHeader に残す。

export type AppMenuItem = {
  label: string
  onSelect: () => void
  disabled?: boolean
  /** この項目の前に区切り線を引く。 */
  separatorBefore?: boolean
}

type AppMenuProps = {
  label: string
  items: readonly AppMenuItem[]
}

const MENU_ITEM_CLASS =
  'w-full rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent'

export function AppMenu({ label, items }: AppMenuProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`rounded px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100 ${
          open ? 'bg-slate-100' : ''
        }`}
      >
        {label}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute top-full left-0 z-20 mt-1 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore ? (
                <hr className="my-1 border-slate-200" />
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  // 先に閉じてトリガーへフォーカスを戻す。コマンドが Inspector などへ
                  // フォーカスを移す場合に、それを奪い返さない順序にしている。
                  close(true)
                  item.onSelect()
                }}
                className={MENU_ITEM_CLASS}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
