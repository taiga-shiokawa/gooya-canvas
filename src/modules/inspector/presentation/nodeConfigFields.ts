import { NODE_CONFIG_KEYS, type WorkflowNodeKind } from '@/modules/workflow'

// 種別別フォームの定義（docs/functional-design.md §3.3 の推奨キーに対応）。
// 項目の正は workflow domain の NODE_CONFIG_KEYS であり、ここはその各キーへ
// 「ラベル・入力形式・入力候補」という表示情報だけを与える。11 種ごとにフォームを
// 書き分けず、この表からデータ駆動で組み立てる（キーの追加は domain 側の 1 行で済む）。

export type InspectorFieldControl = 'text' | 'textarea' | 'number'

export type NodeConfigField = {
  key: string
  label: string
  control: InspectorFieldControl
  placeholder?: string
  /** datalist の候補。自由入力は妨げない（§3.3 の値は「等」付きの例示のため）。 */
  suggestions?: readonly string[]
}

type FieldPresentation = Omit<NodeConfigField, 'key'>

/**
 * 単純なテキスト入力に収まらないため、専用コンポーネントが描画するキー。
 * ここに挙げたキーはデータ駆動のフォームから除外する。
 */
const CUSTOM_FIELD_KEYS: Partial<Record<WorkflowNodeKind, readonly string[]>> =
  {
    condition: ['branches'],
    wait: ['duration', 'unit'],
  }

// 表に無いキーもあり得る（domain 側でキーが増えた直後など）ので Partial で受ける
/** キー共通の既定表示。種別で候補が変わるものは KIND_FIELD_OVERRIDES で差し替える。 */
const DEFAULT_FIELDS: Partial<Record<string, FieldPresentation>> = {
  system: { label: 'System', control: 'text' },
  event: {
    label: 'Event',
    control: 'text',
    placeholder: '面接終了 / 申請提出',
  },
  provider: { label: 'Provider', control: 'text' },
  operation: {
    label: 'Operation',
    control: 'text',
    suggestions: [
      'データ取得',
      'データ更新',
      '集計',
      'ファイル生成',
      'API 呼び出し',
    ],
  },
  until: {
    label: 'Until',
    control: 'text',
    placeholder: '09:00 / Next business day',
  },
  role: { label: 'Role', control: 'text', placeholder: '人事担当 / 承認者' },
  action: { label: 'Action', control: 'textarea' },
  expectedResult: { label: 'Expected Result', control: 'textarea' },
  recipient: {
    label: 'Recipient',
    control: 'text',
    placeholder: '面接官 / 人事チャネル',
  },
  message: { label: 'Message', control: 'textarea' },
  purpose: { label: 'Purpose', control: 'textarea' },
  task: {
    label: 'Task',
    control: 'text',
    suggestions: ['Summarize', 'Classify', 'Extract', 'Generate', 'Evaluate'],
  },
  input: { label: 'Input', control: 'textarea' },
  expectedOutput: { label: 'Expected Output', control: 'textarea' },
  constraints: { label: 'Constraints', control: 'textarea' },
  outcome: {
    label: 'Outcome',
    control: 'text',
    suggestions: ['Completed', 'Cancelled', 'Failed', 'No Action'],
  },
}

/** 同名キーでも種別で候補が異なるもの（trigger と integration の system 等）。 */
const KIND_FIELD_OVERRIDES: Partial<
  Record<WorkflowNodeKind, Record<string, Partial<FieldPresentation>>>
> = {
  trigger: {
    system: {
      suggestions: [
        'Calendar Event',
        'Schedule',
        'Form Submitted',
        'File Created',
        'Manual Trigger',
        'API Event',
      ],
    },
  },
  dataSource: {
    provider: {
      suggestions: [
        'Google Sheets',
        'Excel',
        'Salesforce',
        'HRMOS',
        'BigQuery',
        'SharePoint',
        'Database',
        'API',
      ],
    },
  },
  notification: {
    provider: {
      suggestions: ['Microsoft Teams', 'Email', 'Slack', 'Other'],
    },
  },
  integration: {
    system: {
      suggestions: [
        'REST API',
        'Webhook',
        'Microsoft Graph',
        'Google API',
        'Salesforce API',
      ],
    },
  },
}

/** キー名から表示ラベルを作る最終手段（domain にキーが増えても表が落ちないように）。 */
function fallbackLabel(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function nodeConfigFields(
  kind: WorkflowNodeKind,
): readonly NodeConfigField[] {
  const custom = CUSTOM_FIELD_KEYS[kind] ?? []
  const overrides = KIND_FIELD_OVERRIDES[kind] ?? {}

  return NODE_CONFIG_KEYS[kind]
    .filter((key) => !custom.includes(key))
    .map((key) => ({
      key,
      label: fallbackLabel(key),
      control: 'text' as const,
      ...DEFAULT_FIELDS[key],
      ...overrides[key],
    }))
}

/** config は Record<string, unknown>（外部ファイル由来）なので、表示用に文字列へ落とす。 */
export function configText(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}
