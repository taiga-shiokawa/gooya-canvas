import { toBlob } from 'html-to-image'
import type {
  CanvasImageBounds,
  CanvasImageOptions,
  CanvasImagePort,
} from '../application/ports/CanvasImagePort'

// CanvasImagePort の具象（html-to-image。AD-06 / docs/repository-structure.md §5.2）。
// 外部ライブラリとブラウザ API に触れてよいのはこの層だけであり、
// 例外はここで吸収してポートのシグネチャが定める型（Blob | null）へ変換する
// （development-guidelines §2.3）。
//
// 画像化対象の DOM 要素は canvas モジュールが解決する。@xyflow/react の DOM 構造
// （どの要素が全 Node / Edge を含むか）を export 側が知らないようにするためであり、
// resolver は composition root が canvas の公開 API から渡す（repository-structure §5.1 #5 / §5.3）。

export type HtmlToImageCanvasImagePortDeps = {
  /** 画像化対象の DOM 要素を返す。未マウントなら null。 */
  resolveTarget: () => HTMLElement | null
}

/**
 * `bounds` の領域が `pixelWidth × pixelHeight` に収まるよう、
 * **クローン側にだけ** transform を上書きして画像化する。
 *
 * html-to-image は複製したノードへ `style` を適用する仕様なので、
 * 画面に出ている Canvas の viewport は動かない = Pan / Zoom も未保存状態も汚さない。
 */
export function createHtmlToImageCanvasImagePort(
  deps: HtmlToImageCanvasImagePortDeps,
): CanvasImagePort {
  return {
    capture: async (bounds: CanvasImageBounds, options: CanvasImageOptions) => {
      const target = deps.resolveTarget()
      if (target === null) return null

      const scale = options.pixelWidth / bounds.width
      const offsetX = -bounds.x * scale
      const offsetY = -bounds.y * scale

      try {
        return await toBlob(target, {
          backgroundColor: options.backgroundColor,
          width: options.pixelWidth,
          height: options.pixelHeight,
          // 解像度は pixelWidth / pixelHeight 側で確保済み。
          // デバイス依存の倍率が二重に掛かるのを防ぐため 1 に固定する
          pixelRatio: 1,
          // 外部フォントの取得を行わない（NFR-001 / NFR-004。表示は System Font のみ）
          skipFonts: true,
          style: {
            width: `${options.pixelWidth}px`,
            height: `${options.pixelHeight}px`,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: '0 0',
          },
        })
      } catch {
        // ライブラリ固有の例外をポートの外へ漏らさない
        return null
      }
    },
  }
}
