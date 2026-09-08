import { useEffect, useRef } from 'react'

// Node / Edge の Context Menu（FR-004 / docs/functional-design.md §5.4）。
// 項目は Edit（Inspector へフォーカス）/ Duplicate / Delete の 3 つ。
//
// Radix 等のヘッドレス UI は未導入のため自前実装で、Esc クローズ・外側クリック・
// role="menu" / "menuitem" を担保する（docs/development-guidelines.md §4.1）。
// 実装の型は src/app/AppMenu.tsx（Header のメニュー）と揃えている。

export type CanvasContextMenuTarget = {
  kind: 'node' | 'edge'
  /** Canvas ラッパー左上からの相対座標（px）。 */
  x: number
  y: number
}

type CanvasContextMenuProps = {
  target: CanvasContextMenuTarget
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}

const MENU_ITEM_CLASS =
  'w-full rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent'

export function CanvasContextMenu({
  target,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const node = event.target
      if (node instanceof Node && menuRef.current?.contains(node)) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const run = (command: () => void) => {
    onClose()
    command()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={target.kind === 'node' ? 'Node' : 'Edge'}
      style={{ left: target.x, top: target.y }}
      className="absolute z-30 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => run(onEdit)}
        className={MENU_ITEM_CLASS}
      >
        Edit
      </button>
      {/* 複製は Node の操作（§5.1）。Edge 単体の複製は両端のノードを伴わず
          定義できないため、項目は出したまま無効にする。 */}
      <button
        type="button"
        role="menuitem"
        disabled={target.kind !== 'node'}
        onClick={() => run(onDuplicate)}
        className={MENU_ITEM_CLASS}
      >
        Duplicate
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => run(onDelete)}
        className={MENU_ITEM_CLASS}
      >
        Delete
      </button>
    </div>
  )
}
