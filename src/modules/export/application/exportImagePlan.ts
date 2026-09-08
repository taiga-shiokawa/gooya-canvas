import type { CanvasImageBounds } from './ports/CanvasImagePort'

// 画像化の寸法決め（docs/functional-design.md §8.1）。
// Bounding Box に余白を足し、希望解像度を掛けて出力ピクセルサイズを決める純関数。
// 副作用を持たないのでブラウザ無しでテストできる（development-guidelines §5.1）。

export type ExportImagePlanOptions = {
  /**
   * Bounding Box の四辺へ加える余白（Flow 座標系）。
   * Node の影と Edge の膨らみが切れないようにするためのもの（AC-019）。
   */
  padding: number
  /** 希望する解像度倍率。1 を超えると高解像度になる（FR-016）。 */
  scale: number
  /**
   * 出力画像の 1 辺の上限（px）。
   * ブラウザの canvas サイズ上限に触れると画像化が無言で失敗するため、超える場合は倍率を下げる。
   */
  maxPixelSize: number
}

export type ExportImagePlan = {
  /** 実際に画像化する領域（Bounding Box + 余白）。 */
  area: CanvasImageBounds
  pixelWidth: number
  pixelHeight: number
}

function isPositiveSize(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * Bounding Box から画像化の計画を立てる。
 * 描画対象として成立しない Bounding Box（幅・高さが 0 以下 / 非有限）に対しては `null` を返す。
 */
export function planExportImage(
  bounds: CanvasImageBounds,
  options: ExportImagePlanOptions,
): ExportImagePlan | null {
  if (!isPositiveSize(bounds.width) || !isPositiveSize(bounds.height)) {
    return null
  }
  if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) return null

  const padding = Number.isFinite(options.padding)
    ? Math.max(0, options.padding)
    : 0

  const area: CanvasImageBounds = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  }

  const requested = isPositiveSize(options.scale) ? options.scale : 1
  const limit = isPositiveSize(options.maxPixelSize)
    ? options.maxPixelSize
    : Number.POSITIVE_INFINITY

  // 長辺が上限を超えるときだけ倍率を下げる（アスペクト比は変えない）
  const scale = Math.min(requested, limit / area.width, limit / area.height)

  return {
    area,
    pixelWidth: Math.max(1, Math.round(area.width * scale)),
    pixelHeight: Math.max(1, Math.round(area.height * scale)),
  }
}
