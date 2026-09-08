import type { PromptTarget } from '@/modules/workflow'

// Implementation Target の表示名（FR-021 / docs/functional-design.md §9.3）。
// コード上のリテラルは kebab-case（docs/glossary.md §5.1）だが、
// Prompt と Panel には人が読む表記を出す。

const PROMPT_TARGET_LABELS: Record<PromptTarget, string> = {
  generic: 'Generic',
  'google-apps-script': 'Google Apps Script',
  'power-automate': 'Power Automate',
  cloudflare: 'Cloudflare',
  azure: 'Azure',
  'web-application': 'Web Application',
  other: 'Other',
}

export function promptTargetLabel(target: PromptTarget): string {
  return PROMPT_TARGET_LABELS[target]
}

export const DEFAULT_PROMPT_TARGET: PromptTarget = 'generic'
