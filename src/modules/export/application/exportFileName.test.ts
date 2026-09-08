import { DEFAULT_PROJECT_NAME } from '@/modules/workflow'
import { describe, expect, it } from 'vitest'
import {
  PDF_FILE_EXTENSION,
  PNG_FILE_EXTENSION,
  toExportFileName,
} from './exportFileName'

// Export 成果物のファイル名（docs/functional-design.md §8）。

describe('toExportFileName', () => {
  it('{project-name}.png / {project-name}.pdf を組み立てる', () => {
    expect(toExportFileName('Sales Report', PNG_FILE_EXTENSION)).toBe(
      'Sales Report.png',
    )
    expect(toExportFileName('Sales Report', PDF_FILE_EXTENSION)).toBe(
      'Sales Report.pdf',
    )
  })

  it('日本語のプロジェクト名をそのまま使う', () => {
    expect(toExportFileName('面接評価リマインダー', PNG_FILE_EXTENSION)).toBe(
      '面接評価リマインダー.png',
    )
  })

  it('ファイル名に使えない文字を落とす', () => {
    expect(toExportFileName('a/b\\c:d*e?f"g<h>i|j', PNG_FILE_EXTENSION)).toBe(
      'a b c d e f g h i j.png',
    )
  })

  it('パス区切りを残さない（ディレクトリを跨がせない）', () => {
    const name = toExportFileName('../../etc/passwd', PDF_FILE_EXTENSION)

    expect(name).not.toContain('/')
    expect(name).not.toContain('\\')
    expect(name).toBe('etc passwd.pdf')
  })

  it('制御文字・改行を落とす', () => {
    expect(toExportFileName('report \tname\n', PNG_FILE_EXTENSION)).toBe(
      'report name.png',
    )
  })

  it('先頭・末尾のドットと空白を落とす', () => {
    expect(toExportFileName('  .hidden.  ', PNG_FILE_EXTENSION)).toBe(
      'hidden.png',
    )
  })

  it('空・空白だけの名前は既定名にフォールバックする', () => {
    expect(toExportFileName('', PNG_FILE_EXTENSION)).toBe(
      `${DEFAULT_PROJECT_NAME}.png`,
    )
    expect(toExportFileName('   ', PDF_FILE_EXTENSION)).toBe(
      `${DEFAULT_PROJECT_NAME}.pdf`,
    )
  })

  it('Windows の予約デバイス名は既定名にフォールバックする', () => {
    expect(toExportFileName('CON', PNG_FILE_EXTENSION)).toBe(
      `${DEFAULT_PROJECT_NAME}.png`,
    )
  })

  it('長すぎる名前を切り詰める', () => {
    expect(toExportFileName('x'.repeat(500), PNG_FILE_EXTENSION)).toBe(
      `${'x'.repeat(100)}.png`,
    )
  })
})
