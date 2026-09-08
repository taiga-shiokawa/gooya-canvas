// PdfComposerPort（docs/functional-design.md §2.3 / §8.2）。
// 具象は infrastructure（jsPDF）が実装し、composition root（src/app/）が注入する。
//
// ページサイズと配置の決定は application の純関数（pdfPageLayout.ts）が持ち、
// infrastructure は受け取った寸法どおりに描画するだけにする。
// infrastructure は application を import できない（repository-structure §5.1 #2）ため、
// 計算結果は `meta.layout` としてポート越しに渡す。

/** ページ上の矩形（単位 mm）。 */
export type PdfRect = {
  x: number
  y: number
  width: number
  height: number
}

/** テキストの配置（単位 mm。`y` はベースライン）。 */
export type PdfTextPlacement = {
  x: number
  y: number
  /** 単位 pt（jsPDF の setFontSize と同じ単位）。 */
  fontSize: number
}

export type PdfPageLayout = {
  orientation: 'portrait' | 'landscape'
  pageWidth: number
  pageHeight: number
  /** Canvas 全体を 1 ページに Fit させた画像の配置（§8.2）。 */
  image: PdfRect
  /** Project Name の配置。 */
  title: PdfTextPlacement
  /** Generated Date の配置。 */
  generatedDate: PdfTextPlacement
}

export type PdfImage = {
  /** CanvasImagePort が生成した PNG。 */
  blob: Blob
  pixelWidth: number
  pixelHeight: number
}

export type PdfMeta = {
  /** PDF へ付記する Project Name（FR-017）。 */
  projectName: string
  /** PDF へ付記する Generated Date。整形済みの文字列を渡す（FR-017）。 */
  generatedDate: string
  layout: PdfPageLayout
}

export type PdfComposerPort = {
  /** 画像を 1 ページに Fit させた PDF を生成する。失敗したら `null`。 */
  compose: (image: PdfImage, meta: PdfMeta) => Promise<Blob | null>
}
