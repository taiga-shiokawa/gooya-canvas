import { useWorkflowStore } from '@/modules/shared'
import { formatGeneratedDate } from './exportDateFormat'
import {
  PDF_FILE_EXTENSION,
  PNG_FILE_EXTENSION,
  toExportFileName,
} from './exportFileName'
import { planExportImage } from './exportImagePlan'
import { computePdfPageLayout } from './pdfPageLayout'
import type { CanvasImagePort } from './ports/CanvasImagePort'
import type { CanvasSourcePort } from './ports/CanvasSourcePort'
import type { ExportFilePort } from './ports/ExportFilePort'
import type { PdfComposerPort } from './ports/PdfComposerPort'

// PNG / PDF Export のユースケース（FR-016 / FR-017 / docs/functional-design.md §8）。
//
// 手順は §8.1 のとおり:
//   全 Node / Edge の Bounding Box を取得（Viewport の可視範囲ではない）
//   → Export 用表示へ切替 → 画像化 → 通常表示へ復帰 → ダウンロード
//
// Export は Domain Model を変更しないため dirty を立てない。store は読むだけである。

/** 高解像度出力（FR-016）。等倍だと文字が潰れるため既定で 2 倍にする。 */
const IMAGE_SCALE = 2

/** Bounding Box へ加える余白（Flow 座標系）。影・Edge の膨らみが切れないようにする。 */
const IMAGE_PADDING = 40

/** 出力画像の 1 辺の上限（px）。ブラウザの canvas 上限に対する安全側の値。 */
const MAX_PIXEL_SIZE = 8192

/** PNG / PDF とも背景は白で塗る（透過だと PDF 上で下地が透ける）。 */
const BACKGROUND_COLOR = '#ffffff'

export type ExportUseCasesDeps = {
  canvas: CanvasSourcePort
  image: CanvasImagePort
  pdf: PdfComposerPort
  file: ExportFilePort
  /** 現在時刻。決定論性のため注入する（development-guidelines §2.2）。 */
  now: () => Date
}

/** `empty` は出力対象のノードが無い場合。`failed` は画像化・PDF 合成に失敗した場合。 */
export type ExportResult = 'exported' | 'empty' | 'failed'

export type ExportUseCases = {
  /** File > Export PNG（FR-016 / AC-016 / §8.1）。 */
  exportPng: () => Promise<ExportResult>
  /** File > Export PDF（FR-017 / AC-017 / §8.2）。 */
  exportPdf: () => Promise<ExportResult>
}

type CapturedImage = {
  blob: Blob
  pixelWidth: number
  pixelHeight: number
}

type CaptureOutcome =
  { ok: true; image: CapturedImage } | { ok: false; reason: 'empty' | 'failed' }

export function createExportUseCases(deps: ExportUseCasesDeps): ExportUseCases {
  function projectName(): string {
    return useWorkflowStore.getState().metadata.name
  }

  /** PNG / PDF に共通する画像化フロー（§8.1）。 */
  async function captureCanvas(): Promise<CaptureOutcome> {
    const bounds = deps.canvas.getContentBounds()
    if (bounds === null) return { ok: false, reason: 'empty' }

    const plan = planExportImage(bounds, {
      padding: IMAGE_PADDING,
      scale: IMAGE_SCALE,
      maxPixelSize: MAX_PIXEL_SIZE,
    })
    if (plan === null) return { ok: false, reason: 'empty' }

    // Export 用表示（§8.3 / AC-018）。画像化が失敗しても通常表示へ必ず戻す
    const restore = await deps.canvas.beginExportView()
    try {
      const blob = await deps.image.capture(plan.area, {
        pixelWidth: plan.pixelWidth,
        pixelHeight: plan.pixelHeight,
        backgroundColor: BACKGROUND_COLOR,
      })
      if (blob === null) return { ok: false, reason: 'failed' }

      return {
        ok: true,
        image: {
          blob,
          pixelWidth: plan.pixelWidth,
          pixelHeight: plan.pixelHeight,
        },
      }
    } finally {
      restore()
    }
  }

  return {
    exportPng: async () => {
      const captured = await captureCanvas()
      if (!captured.ok) return captured.reason

      deps.file.download(
        toExportFileName(projectName(), PNG_FILE_EXTENSION),
        captured.image.blob,
      )
      return 'exported'
    },

    exportPdf: async () => {
      const captured = await captureCanvas()
      if (!captured.ok) return captured.reason

      const name = projectName()
      const pdf = await deps.pdf.compose(captured.image, {
        projectName: name,
        generatedDate: formatGeneratedDate(deps.now()),
        layout: computePdfPageLayout(captured.image),
      })
      if (pdf === null) return 'failed'

      deps.file.download(toExportFileName(name, PDF_FILE_EXTENSION), pdf)
      return 'exported'
    },
  }
}
