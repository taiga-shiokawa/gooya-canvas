// Export 用表示の一部（docs/functional-design.md §8.3 の前処理）。
//
// html-to-image は `<svg>` に出会うとその配下を**そのまま deep clone するだけ**で、
// 子要素へ算出済みスタイルを写さない（clone-node.js: `if (isSVGElement(clonedNode)) return`）。
// 一方 React Flow の Edge は `<path class="react-flow__edge-path">` のように
// **CSS クラスだけ**で stroke / fill を決めている。
// 画像化はページのスタイルシートが効かない環境（SVG の foreignObject）で行われるため、
// そのままでは Edge の線が消え、ラベルの背景が黒く塗り潰されて出力される。
//
// そこで画像化の直前に、算出済みの表現属性を live DOM の SVG 要素へインライン化し、
// 画像化が終わったら元に戻す。React Flow の CSS を export モジュール側へ複製せずに済む。

/** クローンへ持ち越す必要がある SVG の表現プロパティ。 */
const SVG_STYLE_PROPERTIES = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'opacity',
  'visibility',
] as const

/**
 * `root` 配下の `<svg>` の子要素へ算出済みスタイルをインライン化する。
 * 戻り値は `style` 属性を元へ戻す後始末関数。
 */
export function inlineSvgStylesForExport(root: ParentNode): () => void {
  const restores: (() => void)[] = []

  for (const svg of root.querySelectorAll('svg')) {
    // svg 要素そのものは html-to-image がスタイルを写すので、対象は配下だけでよい
    for (const element of svg.querySelectorAll('*')) {
      if (!(element instanceof SVGElement)) continue

      const previous = element.getAttribute('style')
      const computed = getComputedStyle(element)

      for (const property of SVG_STYLE_PROPERTIES) {
        const value = computed.getPropertyValue(property)
        if (value !== '') element.style.setProperty(property, value)
      }

      restores.push(() => {
        if (previous === null) element.removeAttribute('style')
        else element.setAttribute('style', previous)
      })
    }
  }

  return () => {
    for (const restore of restores) restore()
  }
}
