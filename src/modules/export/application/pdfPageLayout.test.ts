import { describe, expect, it } from 'vitest'
import { computePdfPageLayout } from './pdfPageLayout'

/** A4（mm）。 */
const A4_SHORT = 210
const A4_LONG = 297
const MARGIN = 12

describe('computePdfPageLayout', () => {
  it('横長の画像は landscape の A4 を選ぶ', () => {
    const layout = computePdfPageLayout({ pixelWidth: 4000, pixelHeight: 1600 })

    expect(layout.orientation).toBe('landscape')
    expect(layout.pageWidth).toBe(A4_LONG)
    expect(layout.pageHeight).toBe(A4_SHORT)
  })

  it('縦長の画像は portrait の A4 を選ぶ', () => {
    const layout = computePdfPageLayout({ pixelWidth: 1000, pixelHeight: 2400 })

    expect(layout.orientation).toBe('portrait')
    expect(layout.pageWidth).toBe(A4_SHORT)
    expect(layout.pageHeight).toBe(A4_LONG)
  })

  it('正方形は portrait とする', () => {
    expect(
      computePdfPageLayout({ pixelWidth: 1000, pixelHeight: 1000 }).orientation,
    ).toBe('portrait')
  })

  it('画像は縦横比を保ったまま 1 ページへ収まる', () => {
    const layout = computePdfPageLayout({ pixelWidth: 4000, pixelHeight: 1600 })
    const { image } = layout

    expect(image.width / image.height).toBeCloseTo(4000 / 1600, 2)
    expect(image.x).toBeGreaterThanOrEqual(MARGIN - 0.01)
    expect(image.y).toBeGreaterThanOrEqual(MARGIN)
    expect(image.x + image.width).toBeLessThanOrEqual(
      layout.pageWidth - MARGIN + 0.01,
    )
    expect(image.y + image.height).toBeLessThanOrEqual(
      layout.pageHeight - MARGIN + 0.01,
    )
  })

  it('画像は余白とタイトル・日付の帯を除いた領域の中央に置かれる', () => {
    const layout = computePdfPageLayout({ pixelWidth: 4000, pixelHeight: 1600 })

    // 横方向はページ中央
    expect(layout.image.x).toBeCloseTo(
      (layout.pageWidth - layout.image.width) / 2,
      1,
    )
    // 縦方向はタイトル帯の下端と日付帯の上端の中央
    const contentTop = MARGIN + 11
    const contentBottom = layout.pageHeight - 8 - MARGIN
    expect(layout.image.y + layout.image.height / 2).toBeCloseTo(
      (contentTop + contentBottom) / 2,
      1,
    )
  })

  it('極端に横長でも幅が用紙をはみ出さない', () => {
    const layout = computePdfPageLayout({ pixelWidth: 8000, pixelHeight: 200 })

    expect(layout.image.width).toBeCloseTo(layout.pageWidth - MARGIN * 2, 2)
    expect(layout.image.height).toBeLessThan(20)
  })

  it('極端に縦長でも高さが用紙をはみ出さない', () => {
    const layout = computePdfPageLayout({ pixelWidth: 200, pixelHeight: 8000 })

    // 高さ側が制約になるので、幅は用紙幅よりずっと小さくなる
    expect(layout.image.height).toBeLessThanOrEqual(
      layout.pageHeight - MARGIN * 2,
    )
    expect(layout.image.width).toBeLessThan(layout.pageWidth - MARGIN * 2)
    expect(layout.image.width / layout.image.height).toBeCloseTo(200 / 8000, 3)
  })

  it('Project Name と Generated Date の位置を返す', () => {
    const layout = computePdfPageLayout({ pixelWidth: 1000, pixelHeight: 800 })

    expect(layout.title.x).toBe(MARGIN)
    expect(layout.title.y).toBeGreaterThan(MARGIN)
    expect(layout.title.y).toBeLessThan(layout.image.y)
    expect(layout.generatedDate.x).toBe(MARGIN)
    expect(layout.generatedDate.y).toBe(layout.pageHeight - MARGIN)
    expect(layout.generatedDate.y).toBeGreaterThan(
      layout.image.y + layout.image.height,
    )
  })

  it('0 や非有限のピクセル寸法でも NaN を返さない', () => {
    for (const image of [
      { pixelWidth: 0, pixelHeight: 0 },
      { pixelWidth: Number.NaN, pixelHeight: 100 },
      { pixelWidth: 100, pixelHeight: Number.POSITIVE_INFINITY },
    ]) {
      const layout = computePdfPageLayout(image)
      expect(Number.isFinite(layout.image.width)).toBe(true)
      expect(Number.isFinite(layout.image.height)).toBe(true)
      expect(layout.image.width).toBeGreaterThan(0)
      expect(layout.image.height).toBeGreaterThan(0)
    }
  })
})
