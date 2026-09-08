import { canvasExportSource } from '@/modules/canvas'
import {
  createBrowserExportFilePort,
  createExportUseCases,
  createHtmlToImageCanvasImagePort,
  createJsPdfComposerPort,
  type ExportUseCases,
} from '@/modules/export'
import {
  createBrowserProjectFilePort,
  createProjectUseCases,
  type ProjectUseCases,
} from '@/modules/project'
import {
  createBrowserClipboardPort,
  createPromptUseCases,
  type PromptUseCases,
} from '@/modules/prompt'

// composition root の配線（docs/repository-structure.md §5.3、AD-10）。
// ポート具象を生成して application service へ束ねるのはここだけの特権であり、
// DI コンテナは導入しない。非決定的な値（現在時刻・ID）もここで注入する。

export const projectUseCases: ProjectUseCases = createProjectUseCases({
  filePort: createBrowserProjectFilePort(),
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
})

export const promptUseCases: PromptUseCases = createPromptUseCases({
  clipboard: createBrowserClipboardPort(),
})

// Export（Phase 7）。@xyflow/react と Canvas の DOM に依存する部分は canvas モジュールが持ち
// （repository-structure §5.1 #5）、export はそれをポートとして受け取る。
// 両モジュールは互いを import しないので（同 #4）、ここで初めて繋がる。
export const exportUseCases: ExportUseCases = createExportUseCases({
  canvas: canvasExportSource,
  image: createHtmlToImageCanvasImagePort({
    resolveTarget: canvasExportSource.getCaptureTarget,
  }),
  pdf: createJsPdfComposerPort(),
  file: createBrowserExportFilePort(),
  now: () => new Date(),
})
