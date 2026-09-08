import type { PromptLanguage } from '@/modules/workflow'

// Prompt の定型文（docs/functional-design.md §9.3 の Language 切替）。
// 切り替わるのは**定型文だけ**であり、ユーザーが入力した title / config は翻訳しない。

export type PromptLabels = {
  documentTitle: string
  intro: (projectName: string) => string
  implementationTarget: string
  purpose: string
  workflow: string
  entryPoint: (title: string) => string
  noTrigger: string
  mergesInto: (title: string) => string
  terminates: string
  trigger: string
  conditions: string
  branchLeadsTo: (branch: string, targets: string) => string
  branchUnconnected: (branch: string) => string
  humanTasks: string
  notifications: string
  constraints: string
  additionalInstructions: string
  notes: string
  acceptanceCriteria: string
  criterion: (condition: string, branch: string, target: string) => string
  criterionEnd: (target: string, outcome: string) => string
}

const JA: PromptLabels = {
  documentTitle: '実装依頼',
  intro: (projectName) =>
    `次の業務フロー「${projectName}」を実装してください。`,
  implementationTarget: 'Implementation target',
  purpose: '目的',
  workflow: 'Workflow',
  entryPoint: (title) => `起点: ${title}`,
  noTrigger: 'Trigger ノードが定義されていないため、手順を導出できません。',
  mergesInto: (title) => `${title}（既出の手順に合流）`,
  terminates: '（後続なし）',
  trigger: 'Trigger',
  conditions: 'Conditions',
  branchLeadsTo: (branch, targets) => `${branch} の場合: ${targets}`,
  branchUnconnected: (branch) => `${branch} の場合: 接続先が未定義`,
  humanTasks: 'Human Tasks',
  notifications: 'Notifications',
  constraints: 'Constraints',
  additionalInstructions: '追加指示',
  notes: 'Notes',
  acceptanceCriteria: 'Acceptance Criteria',
  criterion: (condition, branch, target) =>
    `${condition} が ${branch} の場合に ${target} が実行される。`,
  criterionEnd: (target, outcome) => `${target} に到達した場合、${outcome}。`,
}

const EN: PromptLabels = {
  documentTitle: 'Implementation Request',
  intro: (projectName) =>
    `Please implement the following workflow: "${projectName}".`,
  implementationTarget: 'Implementation target',
  purpose: 'Purpose',
  workflow: 'Workflow',
  entryPoint: (title) => `Entry point: ${title}`,
  noTrigger: 'No Trigger node is defined, so the steps cannot be derived.',
  mergesInto: (title) => `${title} (merges into a step described above)`,
  terminates: '(no outgoing step)',
  trigger: 'Trigger',
  conditions: 'Conditions',
  branchLeadsTo: (branch, targets) => `When ${branch}: ${targets}`,
  branchUnconnected: (branch) => `When ${branch}: no target connected`,
  humanTasks: 'Human Tasks',
  notifications: 'Notifications',
  constraints: 'Constraints',
  additionalInstructions: 'Additional instructions',
  notes: 'Notes',
  acceptanceCriteria: 'Acceptance Criteria',
  criterion: (condition, branch, target) =>
    `When ${condition} is ${branch}, ${target} runs.`,
  criterionEnd: (target, outcome) => `When ${target} is reached, ${outcome}.`,
}

export const DEFAULT_PROMPT_LANGUAGE: PromptLanguage = 'ja'

export function promptLabels(language: PromptLanguage): PromptLabels {
  return language === 'en' ? EN : JA
}
