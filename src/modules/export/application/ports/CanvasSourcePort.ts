import type { CanvasImageBounds } from './CanvasImagePort'

// CanvasSourcePort — 画像化元となる Canvas。
//
// docs/functional-design.md §8.1 が要求する「全 Node / Edge の Bounding Box」と
// 「Export 用表示への切替」は @xyflow/react と Canvas の DOM に触れないと実現できないが、
// @xyflow/react は canvas モジュールに封じ込められており（repository-structure §5.1 #5）、
// export から canvas を import することもできない（同 #4）。
//
// そこで canvas モジュール側にこのポートへ構造的に適合する実装を置き、
// composition root（src/app/ports.ts）が両者を束ねる。export は canvas を知らない。
export type CanvasSourcePort = {
  /**
   * 全 Node / Edge を囲む Bounding Box を Flow 座標系で返す（AC-019）。
   * Canvas が未マウント、または対象が 1 つも無い場合は `null` を返す。
   */
  getContentBounds: () => CanvasImageBounds | null

  /**
   * Export 用表示へ切り替える（docs/functional-design.md §8.3 / AC-018）。
   *
   * 解決値は**通常表示へ復帰する後始末関数**。画像化の成否に関わらず必ず呼ぶこと。
   * 切替の反映（再描画）を待ってから解決するため Promise を返す。
   */
  beginExportView: () => Promise<() => void>
}
