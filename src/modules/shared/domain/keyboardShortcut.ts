// キーボードショートカットの判定（FR-006 / docs/functional-design.md §5.5）。
//
// 判定だけを純関数として切り出し、`addEventListener` と `preventDefault` は
// composition root（src/app/useAppShortcuts.ts）に置く。domain はブラウザ API へ
// 依存できない（docs/repository-structure.md §5.1 #1）ため、DOM の `KeyboardEvent` 型も
// 使わず、必要な情報だけを持つ記述子を受け取る。

export type WorkflowShortcut =
  | 'delete'
  | 'undo'
  | 'redo'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'save'
  | 'open'
  | 'selectAll'

export type ShortcutKeyEvent = {
  /** `KeyboardEvent.key`。大文字小文字は問わない（Shift 併用で 'Z' になるため）。 */
  key: string
  ctrlKey: boolean
  /** Mac の Cmd。Ctrl と同じ主修飾キーとして扱う。 */
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
  /** フォーカス中の要素がテキスト入力（Input / Textarea / Select / contenteditable）か。 */
  editableTarget: boolean
}

/**
 * テキスト編集中でも通すショートカット。
 *
 * §5.5 が無効化を求めているのは「Canvas ショートカット」であり、Save / Open は
 * Canvas 操作ではない。むしろここで止めるとブラウザ既定（ページの保存 / ファイルを開く）が
 * 走ってしまうため、テキスト編集と競合しないこの 2 つだけは通す。
 */
const SHORTCUTS_ALLOWED_WHILE_EDITING: readonly WorkflowShortcut[] = [
  'save',
  'open',
]

function matchShortcut(event: ShortcutKeyEvent): WorkflowShortcut | null {
  // Alt / AltGr との組み合わせは対象外（Windows の AltGr は Ctrl+Alt として届くため、
  // 記号入力を Ctrl ショートカットと誤認しないようにする）
  if (event.altKey) return null

  const key = event.key.toLowerCase()
  // Windows / Linux は Ctrl、Mac は Cmd（metaKey）を主修飾キーとする
  const primary = event.ctrlKey || event.metaKey

  if (!primary) {
    if (event.shiftKey) return null
    // Backspace も削除に割り当てる（React Flow の既定と揃える）
    return key === 'delete' || key === 'backspace' ? 'delete' : null
  }

  if (event.shiftKey) return key === 'z' ? 'redo' : null

  switch (key) {
    case 'z':
      return 'undo'
    case 'd':
      return 'duplicate'
    case 'c':
      return 'copy'
    case 'v':
      return 'paste'
    case 's':
      return 'save'
    case 'o':
      return 'open'
    case 'a':
      return 'selectAll'
    default:
      return null
  }
}

/**
 * キー入力に対応するショートカットを返す。該当が無ければ null。
 * Input / Textarea へのフォーカス中は Canvas ショートカットを無効化する（§5.5）。
 */
export function resolveShortcut(
  event: ShortcutKeyEvent,
): WorkflowShortcut | null {
  const shortcut = matchShortcut(event)
  if (shortcut === null) return null

  if (
    event.editableTarget &&
    !SHORTCUTS_ALLOWED_WHILE_EDITING.includes(shortcut)
  )
    return null

  return shortcut
}
