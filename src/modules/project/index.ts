// project モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使うものだけを出す。他モジュールは import しない。
export type { ProjectFilePort } from './application/ports/ProjectFilePort'
export {
  createProjectUseCases,
  type OpenProjectResult,
  type ProjectUseCases,
  type ProjectUseCasesDeps,
  type SaveProjectResult,
} from './application/projectUseCases'
// infrastructure 具象は composition root が注入するためだけに公開する（§5.3 / AD-10）
export { createBrowserProjectFilePort } from './infrastructure/browserProjectFilePort'
export {
  ProjectDialog,
  type ProjectDialogState,
} from './presentation/ProjectDialog'
export {
  useProjectCommands,
  type ProjectCommands,
} from './presentation/useProjectCommands'
