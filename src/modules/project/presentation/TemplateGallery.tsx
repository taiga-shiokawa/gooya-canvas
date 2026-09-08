import type { PromptTarget } from '@/modules/workflow'
import { useEffect, useRef } from 'react'
import {
  groupTemplatesByCategory,
  type WorkflowTemplate,
} from '../application/templateCatalog'

// テンプレートギャラリー（TP-2 / TP-5 / TP-6）。
//
// ProjectDialog と同じく <dialog>.showModal() に Esc クローズ・フォーカストラップ・
// aria-modal を委ねる（development-guidelines §4.1）。state が null の間はマウントしない。
//
// dirty の確認は useProjectCommands が「ギャラリーを開く前」に済ませている。
// ここは選択と閉じるだけを扱う。

/**
 * target の表示名。PROMPT_TARGETS の識別子をそのまま出すと読みにくいため対応表を持つ。
 * `Record<PromptTarget, string>` にしてあるので、target が増えたら型検査で気づける。
 */
const TARGET_LABELS: Record<PromptTarget, string> = {
  generic: '汎用',
  'google-apps-script': 'Google Apps Script',
  'power-automate': 'Power Automate',
  cloudflare: 'Cloudflare',
  azure: 'Azure',
  'web-application': 'Web Application',
  other: 'その他',
}

export type TemplateGalleryState = {
  /** テンプレートを選んだ。id はカタログの `WorkflowTemplate.id`。 */
  onSelect: (templateId: string) => void
  /** 空のプロジェクトで始める（File > New と同じ結果。TP-6）。 */
  onSelectEmpty: () => void
  onClose: () => void
}

type TemplateGalleryProps = {
  state: TemplateGalleryState | null
}

const TITLE_ID = 'template-gallery-title'
const DESCRIPTION_ID = 'template-gallery-description'

const CARD_CLASS =
  'flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500'

function TargetBadge({ target }: { target: PromptTarget }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
      {TARGET_LABELS[target]}
    </span>
  )
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: WorkflowTemplate
  onSelect: (templateId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={CARD_CLASS}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {template.name}
        </span>
        <TargetBadge target={template.target} />
      </span>
      <span className="text-xs leading-relaxed text-slate-600">
        {template.description}
      </span>
      <span className="text-xs text-slate-400">
        社内の実案件 {template.sourceCount} 件に該当
      </span>
    </button>
  )
}

export function TemplateGallery({ state }: TemplateGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [state])

  if (!state) return null

  const groups = groupTemplatesByCategory()

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      aria-describedby={DESCRIPTION_ID}
      onClose={state.onClose}
      className="m-auto flex max-h-[calc(100vh-4rem)] w-[42rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4">
        <h2 id={TITLE_ID} className="text-sm font-semibold text-slate-900">
          テンプレートから開始
        </h2>
        <p id={DESCRIPTION_ID} className="text-sm text-slate-600">
          ユースケースを選ぶと、基本のノードが配置された状態で始められます。各ノードの
          Notes に実装時の注意点が入っています。
        </p>
      </div>

      {/*
        tabIndex={-1} は「順次フォーカス順から外す」ために必要。Chrome はスクロール可能な
        コンテナを自動的にフォーカス可能にするため、これが無いと showModal() の初期フォーカスが
        最初のテンプレートカードではなくこの div に当たり、意味のないフォーカスリングが出る。
        プログラム的なフォーカスとキーボードスクロールは -1 でも従来どおり効く。
      */}
      <div
        tabIndex={-1}
        className="flex flex-col gap-5 overflow-y-auto px-5 py-4"
      >
        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500">
              {group.label}
            </h3>
            <div className="flex flex-col gap-2">
              {group.templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={state.onSelect}
                />
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500">
            ゼロから作る
          </h3>
          <button
            type="button"
            onClick={state.onSelectEmpty}
            className={CARD_CLASS}
          >
            <span className="text-sm font-semibold text-slate-900">
              空のプロジェクト
            </span>
            <span className="text-xs leading-relaxed text-slate-600">
              ノードのない状態から設計を始めます（File &gt; New と同じ）。
            </span>
          </button>
        </section>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={state.onClose}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          キャンセル
        </button>
      </div>
    </dialog>
  )
}
