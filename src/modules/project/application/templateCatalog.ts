import type { PromptTarget } from '@/modules/workflow'
// テンプレートは `?raw` で文字列として取り込み、通常の Open と同じ
// JSON.parse → Zod validation → migration を通す（repository-structure §6.2 / NFR-005）。
import chatSearchBotJson from '../assets/templates/chat-search-bot.gooya-canvas.json?raw'
import interviewEvaluationReminderJson from '../assets/templates/interview-evaluation-reminder.gooya-canvas.json?raw'
import llmExtractApproveJson from '../assets/templates/llm-extract-approve.gooya-canvas.json?raw'
import overdueReminderJson from '../assets/templates/overdue-reminder.gooya-canvas.json?raw'
import scheduledReportTeamsJson from '../assets/templates/scheduled-report-teams.gooya-canvas.json?raw'

// テンプレートカタログ（.steering/20260908-workflow-templates/design.md §2.2）。
//
// 各テンプレートは社内の実案件 23 件を調査して抽出した頻出パターンに対応する。
// `sourceCount` はその調査で該当した案件数であり、ギャラリーの並び順の根拠でもある
// （同じ category 内では該当案件が多いものを先に出す）。
//
// 実体は `assets/templates/*.gooya-canvas.json` にあり、初回起動で読み込む
// Reference Workflow（FR-015 / functional-design §7.6）もこのカタログの 1 件である。

export const WORKFLOW_TEMPLATE_CATEGORIES = [
  'notification',
  'search',
  'ai',
] as const

export type WorkflowTemplateCategory =
  (typeof WORKFLOW_TEMPLATE_CATEGORIES)[number]

/** ギャラリーの見出し。用語は英語表記を正とするが、分類名は日本語で示す（glossary §4 の対象外）。 */
export const TEMPLATE_CATEGORY_LABELS: Record<
  WorkflowTemplateCategory,
  string
> = {
  notification: '通知・リマインド',
  search: '検索・照会',
  ai: 'AI 活用',
}

export type WorkflowTemplate = {
  id: string
  name: string
  /** ギャラリーのカードに出す 1〜2 文の説明。 */
  description: string
  category: WorkflowTemplateCategory
  /**
   * ギャラリーのバッジ表示用。JSON の `promptSettings.target` と一致することは
   * templateCatalog.test.ts が検査する（表示のたびに deserialize しないための複製）。
   */
  target: PromptTarget
  /** 調査で該当した実案件数（design.md §1.2）。 */
  sourceCount: number
  json: string
}

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: 'scheduled-report-teams',
    name: '定期集計してレポートを通知',
    description:
      '決まった間隔でデータを集計し、結果をチームへ通知する。日次・週次のレポート配信の骨格。',
    category: 'notification',
    target: 'google-apps-script',
    sourceCount: 9,
    json: scheduledReportTeamsJson,
  },
  {
    id: 'overdue-reminder',
    name: '未対応者を見つけて督促',
    description:
      '対象の一覧と対応済みの記録を突き合わせ、未対応の人だけに通知する。提出・入力の督促の骨格。',
    category: 'notification',
    target: 'google-apps-script',
    sourceCount: 4,
    json: overdueReminderJson,
  },
  {
    id: 'interview-evaluation-reminder',
    // 表示名は JSON の metadata.name と一致させる（templateCatalog.test.ts が検査する）。
    // ギャラリーで選んだ名前と、読み込んだ直後にヘッダーへ出る名前を食い違わせないため。
    name: 'Interview Evaluation Reminder',
    description:
      '面接評価リマインダー。イベントの終了を起点に待機し、未対応なら再通知してエスカレーションする。時間をまたぐ督促フローの基本形。',
    category: 'notification',
    target: 'power-automate',
    sourceCount: 2,
    json: interviewEvaluationReminderJson,
  },
  {
    id: 'chat-search-bot',
    name: 'チャットから自然文で検索',
    description:
      'チャットの問い合わせから条件を読み取り、データを検索して結果を返す。台帳の照会を会話でできるようにする骨格。',
    category: 'search',
    target: 'power-automate',
    sourceCount: 5,
    json: chatSearchBotJson,
  },
  {
    id: 'llm-extract-approve',
    name: 'AI が読み取り、人が承認して反映',
    description:
      'テキストから AI に項目を読み取らせ、担当者が確認して承認したときだけシステムへ反映する。AI の出力を業務データに入れる前に人を挟む骨格。',
    category: 'ai',
    target: 'generic',
    sourceCount: 3,
    json: llmExtractApproveJson,
  },
]

/**
 * 初回起動で読み込む Reference Workflow（FR-015 / functional-design §7.6）。
 * この id がカタログに存在することは templateCatalog.test.ts が検査する。
 */
export const REFERENCE_TEMPLATE_ID = 'interview-evaluation-reminder'

export function findWorkflowTemplate(
  templateId: string,
): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((template) => template.id === templateId)
}

/**
 * ギャラリー表示用に category でグルーピングする。
 * category の並びは `WORKFLOW_TEMPLATE_CATEGORIES`、その中の並びは `sourceCount` の降順。
 * テンプレートが 1 件も無い category は返さない。
 */
export function groupTemplatesByCategory(): readonly {
  category: WorkflowTemplateCategory
  label: string
  templates: readonly WorkflowTemplate[]
}[] {
  return WORKFLOW_TEMPLATE_CATEGORIES.map((category) => ({
    category,
    label: TEMPLATE_CATEGORY_LABELS[category],
    templates: WORKFLOW_TEMPLATES.filter(
      (template) => template.category === category,
    ).sort((a, b) => b.sourceCount - a.sourceCount),
  })).filter((group) => group.templates.length > 0)
}
