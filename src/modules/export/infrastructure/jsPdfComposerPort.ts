import { jsPDF } from 'jspdf'
import type {
  PdfComposerPort,
  PdfImage,
  PdfMeta,
  PdfTextPlacement,
} from '../application/ports/PdfComposerPort'

// PdfComposerPort の具象（jsPDF。AD-06 / docs/repository-structure.md §5.2）。
// ページサイズと配置は application の純関数が決めた `meta.layout` に従うだけで、
// この層は計算を持たない。例外は境界内で吸収して null を返す（development-guidelines §2.3）。

/** 用紙は A4 固定（§8.2。複数ページ分割は MVP 後の拡張候補）。 */
const PAGE_FORMAT = 'a4'

/** Generated Date は本文より控えめな灰色にする。 */
const DATE_TEXT_GRAY = 110

/** Project Name は黒。 */
const TITLE_TEXT_BLACK = 0

const PT_TO_MM = 25.4 / 72

/** テキストを画像化するときの倍率。文字が粗くならない程度に大きく取る。 */
const TEXT_RASTER_SCALE = 4

/**
 * jsPDF の標準フォントで描ける範囲か。
 *
 * 標準 14 フォントは WinAnsi（Latin-1 相当）しか持たないため、日本語の
 * Project Name をそのまま `doc.text` へ渡すと文字化けするか消える。
 */
function isWinAnsiSafe(text: string): boolean {
  // 半角の可視文字（U+0020..U+007E）と Latin-1 補助（U+00A0..U+00FF）だけを許す。
  // 正規表現の文字クラスにすると非表示文字がソースへ紛れるのでコードポイントで判定する。
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    const isAscii = code >= 0x20 && code <= 0x7e
    const isLatin1Supplement = code >= 0xa0 && code <= 0xff
    if (!isAscii && !isLatin1Supplement) return false
  }
  return true
}

type RasterizedText = {
  dataUrl: string
  widthMm: number
  heightMm: number
  /** ベースラインから画像上端までの距離（mm）。配置を doc.text と揃えるのに使う。 */
  ascentMm: number
}

/**
 * テキストをブラウザのシステムフォントで描画して PNG にする。
 *
 * CJK フォントをバンドルせずに日本語を PDF へ載せるための手段
 * （バンドルは数 MB になり、NFR-004 の「外部フォントを読み込まない」方針とも噛み合わない）。
 * 描けなければ null を返し、呼び出し側はそのテキストを省略する（文字化けを出すよりよい）。
 */
function rasterizeText(
  text: string,
  fontSizePt: number,
  color: string,
  maxWidthMm: number,
): RasterizedText | null {
  const fontPx = fontSizePt * TEXT_RASTER_SCALE
  const font = `${fontPx}px system-ui, 'Segoe UI', 'Yu Gothic UI', Roboto, sans-serif`

  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) return null

  measureContext.font = font
  const metrics = measureContext.measureText(text)
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent)
  const width = Math.ceil(metrics.width)
  if (width <= 0 || ascent + descent <= 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = ascent + descent
  const context = canvas.getContext('2d')
  if (!context) return null

  context.font = font
  context.fillStyle = color
  context.textBaseline = 'alphabetic'
  context.fillText(text, 0, ascent)

  const mmPerPx = PT_TO_MM / TEXT_RASTER_SCALE
  // 長い名前でページからはみ出さないよう、必要なら比率を保ったまま縮める
  const scale = Math.min(1, maxWidthMm / (canvas.width * mmPerPx))

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm: canvas.width * mmPerPx * scale,
    heightMm: canvas.height * mmPerPx * scale,
    ascentMm: ascent * mmPerPx * scale,
  }
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('failed to read image blob'))
    })
    reader.addEventListener('error', () => {
      reject(new Error('failed to read image blob'))
    })
    reader.readAsDataURL(blob)
  })
}

/**
 * テキストを 1 行描く。WinAnsi で描けるならそのまま文字として、
 * 描けない（日本語等）なら画像化して埋め込む。
 * `grayLevel` は文字として描く場合の `setTextColor` に使う。
 */
function drawText(
  doc: jsPDF,
  text: string,
  placement: PdfTextPlacement,
  cssColor: string,
  grayLevel: number,
): void {
  if (isWinAnsiSafe(text)) {
    doc.setFontSize(placement.fontSize)
    doc.setTextColor(grayLevel)
    doc.text(text, placement.x, placement.y)
    return
  }

  const available = doc.internal.pageSize.getWidth() - placement.x * 2
  const rasterized = rasterizeText(
    text,
    placement.fontSize,
    cssColor,
    available,
  )
  // 描けなければそのテキストは省く。文字化けを出すよりよい
  if (!rasterized) return

  doc.addImage(
    rasterized.dataUrl,
    'PNG',
    placement.x,
    placement.y - rasterized.ascentMm,
    rasterized.widthMm,
    rasterized.heightMm,
  )
}

export function createJsPdfComposerPort(): PdfComposerPort {
  return {
    compose: async (image: PdfImage, meta: PdfMeta) => {
      const { layout } = meta

      try {
        const dataUrl = await toDataUrl(image.blob)

        const doc = new jsPDF({
          orientation: layout.orientation,
          unit: 'mm',
          format: PAGE_FORMAT,
          compress: true,
        })

        doc.addImage(
          dataUrl,
          'PNG',
          layout.image.x,
          layout.image.y,
          layout.image.width,
          layout.image.height,
          undefined,
          'FAST',
        )

        drawText(
          doc,
          meta.projectName,
          layout.title,
          '#000000',
          TITLE_TEXT_BLACK,
        )
        drawText(
          doc,
          `Generated: ${meta.generatedDate}`,
          layout.generatedDate,
          `rgb(${DATE_TEXT_GRAY},${DATE_TEXT_GRAY},${DATE_TEXT_GRAY})`,
          DATE_TEXT_GRAY,
        )

        return doc.output('blob')
      } catch {
        return null
      }
    },
  }
}
