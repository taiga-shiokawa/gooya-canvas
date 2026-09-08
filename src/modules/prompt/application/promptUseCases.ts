import { useWorkflowStore } from '@/modules/shared'
import {
  SCHEMA_VERSION,
  type PromptLanguage,
  type PromptTarget,
  type WorkflowProject,
} from '@/modules/workflow'
import { generatePrompt } from '../domain/generatePrompt'
import type { ClipboardPort } from './ports/ClipboardPort'

// Prompt 生成の実行とコピー（FR-019〜FR-022 / docs/functional-design.md §9）。
// 生成そのものは domain の純関数。ここは store からの入力組み立てと副作用の面倒を見る。

export type PromptUseCasesDeps = {
  clipboard: ClipboardPort
}

export type PromptUseCases = {
  /** 現在の store の内容から Markdown を生成する。 */
  generate: () => string
  /** Target を変更する（即時再生成は presentation が generate を呼び直して行う）。 */
  setTarget: (target: PromptTarget) => void
  setLanguage: (language: PromptLanguage) => void
  setAdditionalInstructions: (instructions: string) => void
  /** Clipboard へコピーする（AC-023）。成功したら true。 */
  copy: (text: string) => Promise<boolean>
}

/**
 * store の現在値から Prompt 生成の入力となる WorkflowProject を組み立てる。
 * 保存時（projectUseCases）と違い `updatedAt` を更新しない。Prompt を開くたびに
 * 内容が変わると決定論性が崩れ、スナップショットテストも成立しなくなるため。
 */
function currentProject(): WorkflowProject {
  const state = useWorkflowStore.getState()
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: state.metadata,
    viewport: state.viewport,
    nodes: state.nodes,
    edges: state.edges,
    promptSettings: state.promptSettings,
  }
}

export function createPromptUseCases(deps: PromptUseCasesDeps): PromptUseCases {
  return {
    generate: () => generatePrompt(currentProject()),

    setTarget: (target) => {
      const state = useWorkflowStore.getState()
      state.setPromptSettings({ ...state.promptSettings, target })
    },

    setLanguage: (language) => {
      const state = useWorkflowStore.getState()
      state.setPromptSettings({ ...state.promptSettings, language })
    },

    setAdditionalInstructions: (instructions) => {
      const state = useWorkflowStore.getState()
      const next = { ...state.promptSettings }
      // 空文字は「未設定」として扱い、キーごと落とす（保存 JSON に空値を残さない）
      if (instructions.trim().length > 0)
        next.additionalInstructions = instructions
      else delete next.additionalInstructions
      state.setPromptSettings(next)
    },

    copy: (text) => deps.clipboard.copy(text),
  }
}
