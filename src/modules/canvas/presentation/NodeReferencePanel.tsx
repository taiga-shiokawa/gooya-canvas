import {
  CONNECTION_RULES,
  findNodeKindReference,
  nodeKindLabel,
  WORKFLOW_NODE_KINDS,
  type WorkflowNodeKind,
} from '@/modules/workflow'
import { useEffect, useRef, useState } from 'react'
import { NODE_KIND_ACCENT } from './nodes/nodeKindAccent'
import { NodeKindIcon } from './nodes/nodeKindIcon'

// ノード種別の公式リファレンス（.steering/20260908-abstract-templates-and-reference/design.md §2.3）。
//
// 解説の内容は workflow の domain（`nodeReference.ts`）が所有し、ここは表示だけを行う。
// canvas に置いているのは、Palette と同じアイコン（`nodeKindIcon`）とアクセント色
// （`nodeKindAccent`）で見せる必要があり、どちらも canvas の presentation にあるため。
//
// 11 種を縦に並べると読みづらいので、左に種別一覧・右に詳細のマスタ / ディテール構成にする。
// Esc クローズ・フォーカストラップは <dialog>.showModal() に委ねる
// （ProjectDialog / TemplateGallery と同じ方針。development-guidelines §4.1）。

export type NodeReferencePanelProps = {
  /** false の間は <dialog> を描画しない（showModal を再実行させるため）。 */
  open: boolean
  onClose: () => void
}

const TITLE_ID = 'node-reference-title'
const DESCRIPTION_ID = 'node-reference-description'

export function NodeReferencePanel({ open, onClose }: NodeReferencePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<WorkflowNodeKind>('trigger')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [open])

  if (!open) return null

  const reference = findNodeKindReference(selected)
  const accent = NODE_KIND_ACCENT[selected]

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      aria-describedby={DESCRIPTION_ID}
      onClose={onClose}
      className="m-auto flex h-[min(40rem,calc(100vh-4rem))] w-[52rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-1">
          <h2 id={TITLE_ID} className="text-sm font-semibold text-slate-900">
            Node Reference
          </h2>
          <p id={DESCRIPTION_ID} className="text-sm text-slate-600">
            11 種のノードが何を表し、どう使うかの解説です。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          閉じる
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="ノード種別"
          className="flex w-48 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2"
        >
          {WORKFLOW_NODE_KINDS.map((kind) => {
            const isSelected = kind === selected
            return (
              <button
                key={kind}
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => setSelected(kind)}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  isSelected
                    ? 'bg-white font-medium text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded ${NODE_KIND_ACCENT[kind].chip}`}
                >
                  <NodeKindIcon kind={kind} className="size-4" />
                </span>
                {nodeKindLabel(kind)}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-4">
          {reference ? (
            <article className="flex flex-col gap-4">
              <header className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded ${accent.chip}`}
                >
                  <NodeKindIcon kind={selected} className="size-5" />
                </span>
                <div className="flex flex-col">
                  <h3 className="text-base font-semibold text-slate-900">
                    {nodeKindLabel(selected)}
                  </h3>
                  <p className={`text-xs ${accent.label}`}>
                    {reference.summary}
                  </p>
                </div>
              </header>

              <section className="flex flex-col gap-1.5">
                <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                  使いどころ
                </h4>
                <p className="text-sm leading-relaxed text-slate-700">
                  {reference.usage}
                </p>
              </section>

              {reference.connection ? (
                <section className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                    このノードの接続の制約
                  </h4>
                  <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                    {reference.connection}
                  </p>
                </section>
              ) : null}

              <section className="flex flex-col gap-1.5">
                <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                  設定項目
                </h4>
                {reference.configKeys.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    設定項目はありません（タイトルと本文だけを使います）。
                  </p>
                ) : (
                  <dl className="flex flex-col gap-2">
                    {reference.configKeys.map((entry) => (
                      <div
                        key={entry.key}
                        className="rounded border border-slate-200 px-3 py-2"
                      >
                        <dt className="flex items-center gap-2">
                          <code className="font-mono text-xs text-slate-800">
                            {entry.key}
                          </code>
                          {entry.required ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                              未設定だと Review が指摘
                            </span>
                          ) : null}
                        </dt>
                        <dd className="mt-1 text-sm leading-relaxed text-slate-600">
                          {entry.description}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section className="flex flex-col gap-1.5">
                <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                  共通の接続ルール
                </h4>
                <ul className="flex flex-col gap-1">
                  {CONNECTION_RULES.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-2 text-sm leading-relaxed text-slate-600"
                    >
                      <span aria-hidden="true" className="text-slate-400">
                        ・
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}
