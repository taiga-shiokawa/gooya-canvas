import { useWorkflowStore } from '@/modules/shared'
import {
  isPromptTarget,
  PROMPT_TARGETS,
  type PromptLanguage,
} from '@/modules/workflow'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_PROMPT_LANGUAGE } from '../domain/promptLabels'
import {
  DEFAULT_PROMPT_TARGET,
  promptTargetLabel,
} from '../domain/promptTargets'
import type { PromptUseCases } from '../application/promptUseCases'

// Prompt Panel（FR-020 / FR-021 / docs/functional-design.md §9.3）。
// Radix 等のヘッドレス UI は未導入のため、Esc クローズ・フォーカストラップ・aria-modal は
// ネイティブの <dialog>.showModal() に委ねる（development-guidelines §4.1）。
//
// Markdown は生のテキストとして <pre> に出す。dangerouslySetInnerHTML は使用禁止であり
// （development-guidelines §2.5）、実装依頼文書はそのままコピーできることが重要なため
// レンダリングよりプレーンテキスト表示が適切。

const TITLE_ID = 'prompt-panel-title'

const LANGUAGES: readonly { value: PromptLanguage; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
]

const FIELD_LABEL_CLASS =
  'flex flex-col gap-1 text-xs font-medium text-slate-600'

const CONTROL_CLASS =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-500'

type PromptPanelProps = {
  useCases: PromptUseCases
  onClose: () => void
}

export function PromptPanel({ useCases, onClose }: PromptPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // 「何をコピーしたか」を持ち、現在の生成結果と一致するときだけ完了表示にする。
  // boolean にすると再生成後も表示が残り、古い内容をコピーしたと誤認させる。
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  // 生成の入力になる slice をすべて購読する。Target を変えると即時に反映される（§9.3）
  // のは、setPromptSettings がこの購読を起こしてレンダーが走るため。
  const promptSettings = useWorkflowStore((state) => state.promptSettings)
  useWorkflowStore((state) => state.nodes)
  useWorkflowStore((state) => state.edges)
  useWorkflowStore((state) => state.metadata)

  // 生成は副作用の無い純関数であり、入力が変わったときだけこの関数が再実行される。
  // メモ化しないのは、真の入力（store）が引数に現れず useMemo の依存に書けないため。
  const prompt = useCases.generate()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const target = promptSettings.target ?? DEFAULT_PROMPT_TARGET
  const language = promptSettings.language ?? DEFAULT_PROMPT_LANGUAGE
  const copied = copiedPrompt === prompt

  const handleCopy = async () => {
    if (await useCases.copy(prompt)) setCopiedPrompt(prompt)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onClose}
      className="m-auto flex h-[80vh] w-[56rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
        <h2 id={TITLE_ID} className="text-sm font-semibold text-slate-900">
          Implementation Prompt
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          閉じる
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <label className={FIELD_LABEL_CLASS}>
          Implementation target
          <select
            value={target}
            onChange={(event) => {
              if (isPromptTarget(event.target.value)) {
                useCases.setTarget(event.target.value)
              }
            }}
            className={CONTROL_CLASS}
          >
            {PROMPT_TARGETS.map((value) => (
              <option key={value} value={value}>
                {promptTargetLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className={FIELD_LABEL_CLASS}>
          Language
          <select
            value={language}
            onChange={(event) =>
              useCases.setLanguage(event.target.value === 'en' ? 'en' : 'ja')
            }
            className={CONTROL_CLASS}
          >
            {LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={`${FIELD_LABEL_CLASS} min-w-64 flex-1`}>
          追加指示
          <input
            type="text"
            value={promptSettings.additionalInstructions ?? ''}
            onChange={(event) =>
              useCases.setAdditionalInstructions(event.target.value)
            }
            placeholder="Prompt の Constraints へ追記されます"
            className={CONTROL_CLASS}
          />
        </label>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Copy Prompt
        </button>
        <span aria-live="polite" className="text-xs text-slate-500">
          {copied ? 'コピーしました' : ''}
        </span>
      </div>

      <pre className="min-h-0 flex-1 overflow-auto px-5 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
        {prompt}
      </pre>
    </dialog>
  )
}
