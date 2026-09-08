import { useEffect, useRef } from 'react'

// 確認ダイアログ（dirty 時の New / Open。§7.1 / §7.3）とエラーダイアログ（AC-015）。
// Radix 等のヘッドレス UI は未導入のため自前実装だが、フォーカストラップ・Esc クローズ・
// aria-modal はネイティブの <dialog>.showModal() に委ねる（development-guidelines §4.1）。
// state が null の間はマウントしないので、close イベントは Esc / ボタン操作でのみ起きる。

export type ProjectDialogState =
  | {
      kind: 'confirm'
      title: string
      message: string
      confirmLabel: string
      /** 副次ボタンの文言。既定は「キャンセル」。 */
      cancelLabel?: string
      onConfirm: () => void
      onCancel: () => void
      /**
       * Esc で閉じたときの動作。既定は `onCancel`。
       * 副次ボタンが破壊的（復旧データの破棄など）な場合に、
       * 「Esc = 何もせず閉じる」を別に定義するために使う。
       */
      onDismiss?: () => void
    }
  | {
      kind: 'error'
      title: string
      message: string
      onClose: () => void
    }

type ProjectDialogProps = {
  state: ProjectDialogState | null
}

const TITLE_ID = 'project-dialog-title'
const DESCRIPTION_ID = 'project-dialog-description'

export function ProjectDialog({ state }: ProjectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // showModal() が Esc・フォーカストラップ・:modal を有効にする。初期フォーカスも
  // ブラウザが最初の操作可能要素（確認ダイアログでは「キャンセル」）へ当てるため、
  // React の autoFocus は使わない（破壊的な既定を選ばせない意図とも一致する）。
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [state])

  if (!state) return null

  const dismiss =
    state.kind === 'confirm'
      ? (state.onDismiss ?? state.onCancel)
      : state.onClose

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      aria-describedby={DESCRIPTION_ID}
      onClose={dismiss}
      className="m-auto w-[28rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex flex-col gap-2 px-5 pt-5">
        <h2 id={TITLE_ID} className="text-sm font-semibold text-slate-900">
          {state.title}
        </h2>
        <p
          id={DESCRIPTION_ID}
          className="text-sm leading-relaxed text-slate-600"
        >
          {state.message}
        </p>
      </div>

      <div className="flex justify-end gap-2 px-5 pt-5 pb-5">
        {state.kind === 'confirm' ? (
          <>
            <button
              type="button"
              onClick={state.onCancel}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              {state.cancelLabel ?? 'キャンセル'}
            </button>
            <button
              type="button"
              onClick={state.onConfirm}
              className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              {state.confirmLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={state.onClose}
            className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            閉じる
          </button>
        )}
      </div>
    </dialog>
  )
}
