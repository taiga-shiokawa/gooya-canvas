import { useCallback, useRef, useState } from 'react'
import type {
  ExportResult,
  ExportUseCases,
} from '../application/exportUseCases'
import type { ExportDialogState } from './ExportDialog'

// File メニューの Export コマンドと、それに伴うダイアログ・実行中状態をまとめて持つフック。
// presentation はユースケース呼び出しと表示だけを行い、判定ロジックは持たない。
// メニューの見た目は composition root（src/app/AppHeader.tsx）が組み立てる。

const EMPTY_MESSAGE =
  'Export できるノードがありません。ノードを追加してから実行してください。'

const PNG_FAILED_MESSAGE =
  'PNG を出力できませんでした。もう一度お試しください。'

const PDF_FAILED_MESSAGE =
  'PDF を出力できませんでした。もう一度お試しください。'

export type ExportCommands = {
  exportPng: () => void
  exportPdf: () => void
  /** Export 中は Canvas の表示を切り替えているため、二重実行させない。 */
  isExporting: boolean
  /** null の間はダイアログを表示しない。ExportDialog へそのまま渡す。 */
  dialog: ExportDialogState | null
}

export function useExportCommands(useCases: ExportUseCases): ExportCommands {
  const [isExporting, setIsExporting] = useState(false)
  const [dialog, setDialog] = useState<ExportDialogState | null>(null)
  // state の反映を待たずに連打された場合の防波堤（メニュー項目の disabled だけでは間に合わない）
  const runningRef = useRef(false)

  const closeDialog = useCallback(() => setDialog(null), [])

  const run = useCallback(
    (execute: () => Promise<ExportResult>, failedMessage: string) => {
      if (runningRef.current) return
      runningRef.current = true
      setIsExporting(true)

      void execute()
        .then((result) => {
          if (result === 'empty') {
            setDialog({
              title: 'Export',
              message: EMPTY_MESSAGE,
              onClose: closeDialog,
            })
          } else if (result === 'failed') {
            setDialog({
              title: 'エラー',
              message: failedMessage,
              onClose: closeDialog,
            })
          }
        })
        .finally(() => {
          runningRef.current = false
          setIsExporting(false)
        })
    },
    [closeDialog],
  )

  const exportPng = useCallback(() => {
    run(useCases.exportPng, PNG_FAILED_MESSAGE)
  }, [run, useCases])

  const exportPdf = useCallback(() => {
    run(useCases.exportPdf, PDF_FAILED_MESSAGE)
  }, [run, useCases])

  return { exportPng, exportPdf, isExporting, dialog }
}
