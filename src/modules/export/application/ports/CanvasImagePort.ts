// CanvasImagePort（docs/functional-design.md §2.3、docs/repository-structure.md §5.2）。
// 具象は infrastructure（html-to-image）が実装し、composition root（src/app/）が注入する。
// DI コンテナは使わない（AD-10）。
//
// ポートのシグネチャにライブラリ固有型・例外を出さない（development-guidelines §2.3）。
// 具象は境界内で catch し、失敗を `null` として返す（ProjectFilePort.pickAndRead と同じ規約）。

/**
 * 画像化する領域。Canvas（Flow）座標系の矩形である。
 *
 * Viewport の可視範囲ではなく**全 Node / Edge を囲む Bounding Box**を渡す
 * （FR-016 / AC-019 / docs/functional-design.md §8.1）。画面外のノードも出力に含める。
 */
export type CanvasImageBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasImageOptions = {
  /**
   * 出力画像のピクセル幅。`pixelWidth / bounds.width` が拡大率となり、
   * 1 を超える値が「高解像度」を意味する（FR-016）。
   */
  pixelWidth: number
  /** 出力画像のピクセル高さ。 */
  pixelHeight: number
  /** 背景色。PDF へ貼るため透過にせず塗りつぶす。 */
  backgroundColor: string
}

export type CanvasImagePort = {
  /**
   * `bounds` の領域を PNG として画像化する（FR-016 / §8.1）。
   *
   * 画像化に失敗した場合と対象要素が見つからない場合は `null` を返す。
   * 呼び出し側は `null` を「出力できなかった」として扱う。
   */
  capture: (
    bounds: CanvasImageBounds,
    options: CanvasImageOptions,
  ) => Promise<Blob | null>
}
