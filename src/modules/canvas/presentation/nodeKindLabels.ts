import type { WorkflowNodeKind } from '@/modules/workflow'

// Palette の表示名。Node 追加時の data.title の既定値にも使う。
// 用語は英語表記を正とする（docs/glossary.md §4）。
const NODE_KIND_LABELS: Record<WorkflowNodeKind, string> = {
  trigger: 'Trigger',
  dataSource: 'Data Source',
  action: 'Action',
  condition: 'Condition',
  wait: 'Wait',
  humanTask: 'Human Task',
  notification: 'Notification',
  ai: 'AI',
  integration: 'Integration',
  end: 'End',
  note: 'Note',
}

export function nodeKindLabel(kind: WorkflowNodeKind): string {
  return NODE_KIND_LABELS[kind]
}
