import { useWorkflowStore } from '@/modules/shared'
import { useCallback, useState } from 'react'
import type { ProjectUseCases } from '../application/projectUseCases'
import type { ProjectDialogState } from './ProjectDialog'
import type { TemplateGalleryState } from './TemplateGallery'

// File メニューの各コマンドと、それに伴うダイアログ状態をまとめて持つフック。
// presentation は store の購読とユースケース呼び出しだけを行い、判定ロジックは持たない。
// メニューの見た目は composition root（src/app/AppHeader.tsx）が組み立てる。

/** 異常ファイルを開いたときの文言（FR-013 / AC-015。docs/functional-design.md §7.3 の固定文言）。 */
const OPEN_FAILED_MESSAGE =
  'このファイルを開けませんでした。GOOYA Canvas のプロジェクトファイルか確認してください。'

/** 保存前 validation に失敗したときの文言（§7.2）。通常は起きない。 */
const SAVE_FAILED_MESSAGE =
  'このプロジェクトを保存できませんでした。ノードや設定の内容を確認してください。'

const UNSAVED_CHANGES_MESSAGE = '未保存の変更があります。破棄して続行しますか？'

/** テンプレートの読込に失敗したときの文言（TP-8）。同梱ファイルなので通常は起きない。 */
const TEMPLATE_FAILED_MESSAGE =
  'このテンプレートを読み込めませんでした。お手数ですが File > New から作成してください。'

export type ProjectCommands = {
  newProject: () => void
  openProject: () => void
  saveProject: () => void
  /** File > New from Template（TP-2）。dirty なら確認を挟んでからギャラリーを開く。 */
  newFromTemplate: () => void
  /** null の間はダイアログを表示しない。ProjectDialog へそのまま渡す。 */
  dialog: ProjectDialogState | null
  /** null の間はギャラリーを表示しない。TemplateGallery へそのまま渡す。 */
  templateGallery: TemplateGalleryState | null
}

export function useProjectCommands(useCases: ProjectUseCases): ProjectCommands {
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const [dialog, setDialog] = useState<ProjectDialogState | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const closeDialog = useCallback(() => setDialog(null), [])

  const showError = useCallback(
    (message: string) => {
      setDialog({
        kind: 'error',
        title: 'エラー',
        message,
        onClose: closeDialog,
      })
    },
    [closeDialog],
  )

  /** dirty なら確認を挟んでから実行する（§7.1 / §7.3）。 */
  const confirmWhenDirty = useCallback(
    (title: string, confirmLabel: string, run: () => void) => {
      if (!isDirty) {
        run()
        return
      }
      setDialog({
        kind: 'confirm',
        title,
        message: UNSAVED_CHANGES_MESSAGE,
        confirmLabel,
        onConfirm: () => {
          setDialog(null)
          run()
        },
        onCancel: closeDialog,
      })
    },
    [closeDialog, isDirty],
  )

  const runOpen = useCallback(() => {
    void useCases.openProject().then((result) => {
      if (result === 'failed') showError(OPEN_FAILED_MESSAGE)
    })
  }, [showError, useCases])

  const newProject = useCallback(() => {
    confirmWhenDirty('新規プロジェクト', '破棄して新規作成', () => {
      useCases.newProject()
    })
  }, [confirmWhenDirty, useCases])

  const openProject = useCallback(() => {
    confirmWhenDirty('プロジェクトを開く', '破棄して開く', runOpen)
  }, [confirmWhenDirty, runOpen])

  const saveProject = useCallback(() => {
    if (useCases.saveProject() === 'invalid') showError(SAVE_FAILED_MESSAGE)
  }, [showError, useCases])

  // dirty の確認は「ギャラリーを開く前」に出す。New / Open と同じ順序に揃えている。
  // 確認したあとギャラリーを閉じた場合は何も破棄されずに終わる（安全側に外れる）。
  const newFromTemplate = useCallback(() => {
    confirmWhenDirty('テンプレートから開始', '破棄して選択', () => {
      setGalleryOpen(true)
    })
  }, [confirmWhenDirty])

  const templateGallery: TemplateGalleryState | null = galleryOpen
    ? {
        onSelect: (templateId) => {
          setGalleryOpen(false)
          if (!useCases.loadTemplate(templateId)) {
            showError(TEMPLATE_FAILED_MESSAGE)
          }
        },
        onSelectEmpty: () => {
          setGalleryOpen(false)
          useCases.newProject()
        },
        onClose: () => setGalleryOpen(false),
      }
    : null

  return {
    newProject,
    openProject,
    saveProject,
    newFromTemplate,
    dialog,
    templateGallery,
  }
}
