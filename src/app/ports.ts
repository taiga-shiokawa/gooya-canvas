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
  createBrowserRecoveryStoragePort,
  createProjectUseCases,
  createRecoveryUseCases,
  createStartupUseCases,
  type ProjectUseCases,
  type RecoveryUseCases,
  type StartupUseCases,
} from '@/modules/project'
import {
  createBrowserClipboardPort,
  createPromptUseCases,
  type PromptUseCases,
} from '@/modules/prompt'
import { createReviewUseCases, type ReviewUseCases } from '@/modules/review'

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

// Flow Review（Phase 6）。外部依存（ポート）を持たないが、他のユースケースと同じく
// composition root で 1 インスタンスだけ組み立てて presentation へ渡す。
export const reviewUseCases: ReviewUseCases = createReviewUseCases()

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

// Crash Recovery（NFR-006 / §7.5）。debounce のタイマーもブラウザ API なので
// application へ直接持ち込まず、現在時刻と同じくここで注入する。
export const recoveryUseCases: RecoveryUseCases = createRecoveryUseCases({
  storage: createBrowserRecoveryStoragePort(),
  now: () => new Date().toISOString(),
  delay: (callback, delayMs) => {
    const timer = setTimeout(callback, delayMs)
    return () => clearTimeout(timer)
  },
})

// 起動時処理（§7.5 / §7.6）。復旧データの有無でサンプル読込の要否が決まるため、
// 判定順序は application が持ち、src/main.tsx は start() を呼ぶだけにする。
export const startupUseCases: StartupUseCases = createStartupUseCases({
  project: projectUseCases,
  recovery: recoveryUseCases,
})
