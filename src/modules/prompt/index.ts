// prompt モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使うものだけを出す。他モジュールは import しない。
export type { ClipboardPort } from './application/ports/ClipboardPort'
export {
  createPromptUseCases,
  type PromptUseCases,
  type PromptUseCasesDeps,
} from './application/promptUseCases'
// infrastructure 具象は composition root が注入するためだけに公開する（§5.3 / AD-10）
export { createBrowserClipboardPort } from './infrastructure/browserClipboardPort'
export { PromptPanel } from './presentation/PromptPanel'
