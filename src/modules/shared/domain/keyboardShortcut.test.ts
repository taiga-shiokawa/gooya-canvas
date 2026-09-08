import { describe, expect, it } from 'vitest'
import {
  resolveShortcut,
  type ShortcutKeyEvent,
  type WorkflowShortcut,
} from './keyboardShortcut'

function press(
  key: string,
  modifiers: Partial<Omit<ShortcutKeyEvent, 'key'>> = {},
): ShortcutKeyEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    editableTarget: false,
    ...modifiers,
  }
}

describe('resolveShortcut', () => {
  it.each<[string, ShortcutKeyEvent, WorkflowShortcut]>([
    ['Delete', press('Delete'), 'delete'],
    ['Backspace', press('Backspace'), 'delete'],
    ['Ctrl+Z', press('z', { ctrlKey: true }), 'undo'],
    ['Ctrl+Shift+Z', press('Z', { ctrlKey: true, shiftKey: true }), 'redo'],
    ['Ctrl+D', press('d', { ctrlKey: true }), 'duplicate'],
    ['Ctrl+C', press('c', { ctrlKey: true }), 'copy'],
    ['Ctrl+V', press('v', { ctrlKey: true }), 'paste'],
    ['Ctrl+S', press('s', { ctrlKey: true }), 'save'],
    ['Ctrl+O', press('o', { ctrlKey: true }), 'open'],
    ['Ctrl+A', press('a', { ctrlKey: true }), 'selectAll'],
  ])('%s を解決する', (_label, event, expected) => {
    expect(resolveShortcut(event)).toBe(expected)
  })

  it('Mac の Cmd を Ctrl と同じ主修飾キーとして扱う', () => {
    expect(resolveShortcut(press('s', { metaKey: true }))).toBe('save')
    expect(resolveShortcut(press('Z', { metaKey: true, shiftKey: true }))).toBe(
      'redo',
    )
  })

  it('Shift 付きの Z 以外は Redo にしない', () => {
    expect(resolveShortcut(press('d', { ctrlKey: true, shiftKey: true }))).toBe(
      null,
    )
  })

  it('修飾キーなしの文字キーは対象外', () => {
    expect(resolveShortcut(press('a'))).toBe(null)
    expect(resolveShortcut(press('s'))).toBe(null)
  })

  it('Shift + Delete は対象外', () => {
    expect(resolveShortcut(press('Delete', { shiftKey: true }))).toBe(null)
  })

  it('Alt / AltGr との組み合わせは対象外', () => {
    expect(resolveShortcut(press('s', { ctrlKey: true, altKey: true }))).toBe(
      null,
    )
  })

  it('割り当ての無いキーは null', () => {
    expect(resolveShortcut(press('k', { ctrlKey: true }))).toBe(null)
    expect(resolveShortcut(press('Enter'))).toBe(null)
  })

  describe('テキスト入力へのフォーカス中（§5.5）', () => {
    it.each<[string, ShortcutKeyEvent]>([
      ['Delete', press('Delete', { editableTarget: true })],
      ['Backspace', press('Backspace', { editableTarget: true })],
      ['Ctrl+A', press('a', { ctrlKey: true, editableTarget: true })],
      ['Ctrl+Z', press('z', { ctrlKey: true, editableTarget: true })],
      ['Ctrl+C', press('c', { ctrlKey: true, editableTarget: true })],
      ['Ctrl+V', press('v', { ctrlKey: true, editableTarget: true })],
      ['Ctrl+D', press('d', { ctrlKey: true, editableTarget: true })],
    ])('%s は Canvas へ効かせない', (_label, event) => {
      expect(resolveShortcut(event)).toBe(null)
    })

    it('Save / Open だけは通す（ブラウザ既定を止めるため）', () => {
      expect(
        resolveShortcut(press('s', { ctrlKey: true, editableTarget: true })),
      ).toBe('save')
      expect(
        resolveShortcut(press('o', { ctrlKey: true, editableTarget: true })),
      ).toBe('open')
    })
  })
})
