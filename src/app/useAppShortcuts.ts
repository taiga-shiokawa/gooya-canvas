import { canvasEditCommands } from '@/modules/canvas'
import { redoWorkflow, resolveShortcut, undoWorkflow } from '@/modules/shared'
import { useEffect } from 'react'

// キーボードショートカットの配線（FR-006 / docs/functional-design.md §5.5）。
//
// Ctrl+S / Ctrl+O は project のユースケース、それ以外は canvas の操作であり、
// feature モジュール同士は import できない（repository-structure §5.1 #4）。
// 両方を知ってよいのは composition root だけなので、ここで 1 本のハンドラにまとめる。
// 判定そのものは shared/domain の純関数 `resolveShortcut` が持つ（テスト対象）。

type AppShortcutCommands = {
  saveProject: () => void
  openProject: () => void
}

/** テキスト編集中か。Canvas ショートカットを止める判断に使う（§5.5）。 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * モーダルダイアログ（New / Open の確認・エラー・Export・Prompt Panel）が開いているか。
 *
 * これらは `<dialog>.showModal()` で開くため画面操作は塞がれているが、keydown は
 * window まで届く。見えていない Canvas を裏で書き換えてしまわないよう、開いている間は
 * すべてのショートカットを止める。Review Panel は非モーダルなので対象外。
 */
function isModalDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null
}

export function useAppShortcuts(commands: AppShortcutCommands): void {
  const { saveProject, openProject } = commands

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isModalDialogOpen()) return

      const shortcut = resolveShortcut({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        editableTarget: isEditableTarget(event.target),
      })
      if (shortcut === null) return

      // ブラウザ標準（ページの保存・ファイルを開く・全選択・ブックマーク）を止める（§5.5）
      event.preventDefault()

      switch (shortcut) {
        case 'delete':
          canvasEditCommands.deleteSelection()
          return
        case 'undo':
          undoWorkflow()
          return
        case 'redo':
          redoWorkflow()
          return
        case 'duplicate':
          canvasEditCommands.duplicateSelection()
          return
        case 'copy':
          canvasEditCommands.copySelection()
          return
        case 'paste':
          canvasEditCommands.paste()
          return
        case 'selectAll':
          canvasEditCommands.selectAll()
          return
        case 'save':
          saveProject()
          return
        case 'open':
          openProject()
          return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openProject, saveProject])
}
