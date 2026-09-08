import { useEffect, useRef } from 'react'

// Export の結果通知ダイアログ（出力対象なし・出力失敗）。
// Radix 等のヘッドレス UI は未導入のため自前実装だが、フォーカストラップ・Esc クローズ・
// aria-modal はネイティブの <dialog>.showModal() に委ねる（development-guidelines §4.1）。
// state が null の間はマウントしないので、close イベントは Esc / ボタン操作でのみ起きる。

export type ExportDialogState = {
  title: string
  message: string
  onClose: () => void
}

type ExportDialogProps = {
  state: ExportDialogState | null
}

const TITLE_ID = 'export-dialog-title'
const DESCRIPTION_ID = 'export-dialog-description'

export function ExportDialog({ state }: ExportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [state])

  if (!state) return null

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      aria-describedby={DESCRIPTION_ID}
      onClose={state.onClose}
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
        <button
          type="button"
          onClick={state.onClose}
          className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          閉じる
        </button>
      </div>
    </dialog>
  )
}
