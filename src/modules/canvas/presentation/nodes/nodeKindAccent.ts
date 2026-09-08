import type { WorkflowNodeKind } from '@/modules/workflow'

// 種別ごとのアクセント。Tailwind は静的なクラス文字列しか検出しないため、
// 色名を組み立てず完全なクラス名で持つ（docs/development-guidelines.md §4.1）。

export type NodeKindAccent = {
  /** アイコンチップの背景と文字色 */
  chip: string
  /** node type ラベルの文字色 */
  label: string
  /** カード外周のボーダー色 */
  border: string
}

export const NODE_KIND_ACCENT: Record<WorkflowNodeKind, NodeKindAccent> = {
  trigger: {
    chip: 'bg-amber-100 text-amber-700',
    label: 'text-amber-700',
    border: 'border-amber-200',
  },
  dataSource: {
    chip: 'bg-sky-100 text-sky-700',
    label: 'text-sky-700',
    border: 'border-sky-200',
  },
  action: {
    chip: 'bg-blue-100 text-blue-700',
    label: 'text-blue-700',
    border: 'border-blue-200',
  },
  condition: {
    chip: 'bg-violet-100 text-violet-700',
    label: 'text-violet-700',
    border: 'border-violet-200',
  },
  wait: {
    chip: 'bg-slate-200 text-slate-700',
    label: 'text-slate-600',
    border: 'border-slate-300',
  },
  humanTask: {
    chip: 'bg-teal-100 text-teal-700',
    label: 'text-teal-700',
    border: 'border-teal-200',
  },
  notification: {
    chip: 'bg-orange-100 text-orange-700',
    label: 'text-orange-700',
    border: 'border-orange-200',
  },
  ai: {
    chip: 'bg-fuchsia-100 text-fuchsia-700',
    label: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
  },
  integration: {
    chip: 'bg-cyan-100 text-cyan-700',
    label: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  end: {
    chip: 'bg-rose-100 text-rose-700',
    label: 'text-rose-700',
    border: 'border-rose-200',
  },
  note: {
    chip: 'bg-yellow-100 text-yellow-700',
    label: 'text-yellow-700',
    border: 'border-yellow-200',
  },
}
