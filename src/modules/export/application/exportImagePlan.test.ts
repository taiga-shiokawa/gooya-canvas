import { describe, expect, it } from 'vitest'
import { planExportImage } from './exportImagePlan'

const OPTIONS = { padding: 40, scale: 2, maxPixelSize: 8192 }

describe('planExportImage', () => {
  it('Bounding Box の四辺へ余白を足した領域を画像化対象にする', () => {
    const plan = planExportImage(
      { x: 100, y: -50, width: 800, height: 400 },
      OPTIONS,
    )

    expect(plan?.area).toEqual({ x: 60, y: -90, width: 880, height: 480 })
  })

  it('希望倍率どおりのピクセルサイズを返す（高解像度出力）', () => {
    const plan = planExportImage(
      { x: 0, y: 0, width: 800, height: 400 },
      OPTIONS,
    )

    expect(plan?.pixelWidth).toBe((800 + 80) * 2)
    expect(plan?.pixelHeight).toBe((400 + 80) * 2)
  })

  it('上限を超える場合はアスペクト比を保ったまま倍率を下げる', () => {
    // 横に約 2400px 広がるサンプル相当。2 倍では上限 4000px を超える
    const plan = planExportImage(
      { x: 0, y: 0, width: 2420, height: 1000 },
      { padding: 40, scale: 2, maxPixelSize: 4000 },
    )

    expect(plan?.pixelWidth).toBe(4000)
    // 2500 : 1080 の比率が保たれる
    expect(plan?.pixelHeight).toBe(Math.round((1080 / 2500) * 4000))
  })

  it('縦長でも上限は長辺で判定する', () => {
    const plan = planExportImage(
      { x: 0, y: 0, width: 400, height: 3000 },
      { padding: 0, scale: 4, maxPixelSize: 6000 },
    )

    expect(plan?.pixelHeight).toBe(6000)
    expect(plan?.pixelWidth).toBe(800)
  })

  it('上限に収まっていれば倍率を上げ直さない', () => {
    const plan = planExportImage(
      { x: 0, y: 0, width: 100, height: 100 },
      { padding: 0, scale: 2, maxPixelSize: 8192 },
    )

    expect(plan).toEqual({
      area: { x: 0, y: 0, width: 100, height: 100 },
      pixelWidth: 200,
      pixelHeight: 200,
    })
  })

  it('幅・高さが 0 の Bounding Box は出力対象にしない', () => {
    expect(
      planExportImage({ x: 0, y: 0, width: 0, height: 100 }, OPTIONS),
    ).toBe(null)
    expect(
      planExportImage({ x: 0, y: 0, width: 100, height: 0 }, OPTIONS),
    ).toBe(null)
  })

  it('非有限の値を含む Bounding Box は出力対象にしない', () => {
    expect(
      planExportImage(
        { x: Number.NaN, y: 0, width: 100, height: 100 },
        OPTIONS,
      ),
    ).toBe(null)
    expect(
      planExportImage(
        { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 100 },
        OPTIONS,
      ),
    ).toBe(null)
  })

  it('負の余白は 0 として扱う', () => {
    const plan = planExportImage(
      { x: 10, y: 10, width: 100, height: 100 },
      { padding: -50, scale: 1, maxPixelSize: 8192 },
    )

    expect(plan?.area).toEqual({ x: 10, y: 10, width: 100, height: 100 })
  })
})
