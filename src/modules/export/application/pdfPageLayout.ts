import type { PdfPageLayout } from './ports/PdfComposerPort'

// PDF のページサイズ決定と 1 ページ Fit の寸法計算（docs/functional-design.md §8.2）。
// 複数ページ分割は MVP 後の拡張候補（development-roadmap §4）なので、用紙は A4 固定とする。
// 純関数なので jsPDF もブラウザも要らない（development-guidelines §5.1）。

/** A4（mm）。 */
const A4_SHORT_SIDE = 210
const A4_LONG_SIDE = 297

/** 上下左右の余白（mm）。 */
const MARGIN = 12

/** Project Name / Generated Date の文字サイズ（pt）。 */
const TITLE_FONT_SIZE = 12
const DATE_FONT_SIZE = 9

/** タイトル行・日付行が占める帯の高さ（mm）。画像はこの間に収める。 */
const TITLE_BAND = 11
const DATE_BAND = 8

/** mm の端数は 0.01 まで。PDF の座標を安定させ、テストの期待値も読みやすくする。 */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * 画像のピクセル寸法から、A4 1 ページへ Fit させたレイアウトを決める。
 *
 * 横長の画像は landscape、それ以外は portrait を選ぶ。画像は縦横比を保ったまま
 * 余白とタイトル・日付の帯を除いた領域へ最大化し、中央へ置く。
 */
export function computePdfPageLayout(image: {
  pixelWidth: number
  pixelHeight: number
}): PdfPageLayout {
  // 0 や非有限が来ても NaN を撒かないように 1px 以上へ丸める
  const pixelWidth = Number.isFinite(image.pixelWidth)
    ? Math.max(1, image.pixelWidth)
    : 1
  const pixelHeight = Number.isFinite(image.pixelHeight)
    ? Math.max(1, image.pixelHeight)
    : 1

  const landscape = pixelWidth > pixelHeight
  const pageWidth = landscape ? A4_LONG_SIDE : A4_SHORT_SIDE
  const pageHeight = landscape ? A4_SHORT_SIDE : A4_LONG_SIDE

  const contentTop = MARGIN + TITLE_BAND
  const contentWidth = pageWidth - MARGIN * 2
  const contentHeight = pageHeight - contentTop - DATE_BAND - MARGIN

  const ratio = Math.min(contentWidth / pixelWidth, contentHeight / pixelHeight)
  const drawWidth = pixelWidth * ratio
  const drawHeight = pixelHeight * ratio

  return {
    orientation: landscape ? 'landscape' : 'portrait',
    pageWidth,
    pageHeight,
    image: {
      x: round((pageWidth - drawWidth) / 2),
      y: round(contentTop + (contentHeight - drawHeight) / 2),
      width: round(drawWidth),
      height: round(drawHeight),
    },
    title: {
      x: MARGIN,
      // ベースラインなので、帯の上端から文字サイズぶん下げる（pt → mm は 25.4 / 72）
      y: round(MARGIN + (TITLE_FONT_SIZE * 25.4) / 72),
      fontSize: TITLE_FONT_SIZE,
    },
    generatedDate: {
      x: MARGIN,
      y: round(pageHeight - MARGIN),
      fontSize: DATE_FONT_SIZE,
    },
  }
}
