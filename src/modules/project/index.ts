// project モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使うものだけを出す。他モジュールは import しない。
export type { ProjectFilePort } from './application/ports/ProjectFilePort'
export type { RecoveryStoragePort } from './application/ports/RecoveryStoragePort'
export {
  createProjectUseCases,
  type OpenProjectResult,
  type ProjectUseCases,
  type ProjectUseCasesDeps,
  type SaveProjectResult,
} from './application/projectUseCases'
export type { RecoverySnapshot } from './application/recoverySerialization'
export {
  createRecoveryUseCases,
  RECOVERY_DEBOUNCE_MS,
  RECOVERY_MAX_DEBOUNCE_MS,
  type RecoveryDelay,
  type RecoveryUseCases,
  type RecoveryUseCasesDeps,
} from './application/recoveryUseCases'
export {
  createStartupUseCases,
  type StartupUseCases,
  type StartupUseCasesDeps,
} from './application/startupUseCases'
export {
  REFERENCE_TEMPLATE_ID,
  TEMPLATE_CATEGORY_LABELS,
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
  type WorkflowTemplateCategory,
} from './application/templateCatalog'
// infrastructure 具象は composition root が注入するためだけに公開する（§5.3 / AD-10）
export { createBrowserProjectFilePort } from './infrastructure/browserProjectFilePort'
export { createBrowserRecoveryStoragePort } from './infrastructure/browserRecoveryStoragePort'
export {
  ProjectDialog,
  type ProjectDialogState,
} from './presentation/ProjectDialog'
export {
  TemplateGallery,
  type TemplateGalleryState,
} from './presentation/TemplateGallery'
export {
  useProjectCommands,
  type ProjectCommands,
} from './presentation/useProjectCommands'
export { useRecoveryPrompt } from './presentation/useRecoveryPrompt'
