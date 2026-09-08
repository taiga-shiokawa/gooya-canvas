// export モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使うものだけを出す。他モジュールは import しない。
export {
  createExportUseCases,
  type ExportResult,
  type ExportUseCases,
  type ExportUseCasesDeps,
} from './application/exportUseCases'
export type {
  CanvasImageBounds,
  CanvasImageOptions,
  CanvasImagePort,
} from './application/ports/CanvasImagePort'
export type { CanvasSourcePort } from './application/ports/CanvasSourcePort'
export type { ExportFilePort } from './application/ports/ExportFilePort'
export type { PdfComposerPort } from './application/ports/PdfComposerPort'
// infrastructure 具象は composition root が注入するためだけに公開する（§5.3 / AD-10）
export { createBrowserExportFilePort } from './infrastructure/browserExportFilePort'
export {
  createHtmlToImageCanvasImagePort,
  type HtmlToImageCanvasImagePortDeps,
} from './infrastructure/htmlToImageCanvasImagePort'
export { createJsPdfComposerPort } from './infrastructure/jsPdfComposerPort'
export {
  ExportDialog,
  type ExportDialogState,
} from './presentation/ExportDialog'
export {
  useExportCommands,
  type ExportCommands,
} from './presentation/useExportCommands'
