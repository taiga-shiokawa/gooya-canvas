// Export 側から Canvas を触るための受け渡し口（docs/functional-design.md §8.1 / §8.3）。
//
// Export が必要とする「全 Node / Edge の Bounding Box」「画像化対象の DOM 要素」
// 「Export 用表示への切替」はいずれも @xyflow/react と Canvas の DOM に依存するが、
// @xyflow/react は canvas モジュールに封じ込められており（repository-structure §5.1 #5）、
// export ↔ canvas の相互 import も禁止されている（同 #4）。
//
// そこで canvas 側にこのレジストリを置き、マウント中の WorkflowCanvas が自身の実装を登録する。
// composition root（src/app/ports.ts）は下の `canvasExportSource` を export モジュールの
// ポートとして注入する。両モジュールは互いを知らないまま繋がる。
//
// 実装が登録されていない（Canvas 未マウント）間も安全に呼べるよう、既定値を返す。

/** Flow 座標系の矩形。export 側の `CanvasImageBounds` と構造的に一致させる。 */
export type CanvasExportBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasExportSource = {
  /** 全 Node / Edge を囲む Bounding Box。対象が無ければ null。 */
  getContentBounds: () => CanvasExportBounds | null
  /** 画像化対象の DOM 要素（全 Node / Edge を含む React Flow の viewport）。 */
  getCaptureTarget: () => HTMLElement | null
  /** Export 用表示へ切り替え、通常表示へ戻す後始末関数を解決する。 */
  beginExportView: () => Promise<() => void>
}

const noop = () => {}

let registered: CanvasExportSource | null = null

/**
 * マウント中の Canvas を登録する。戻り値は登録解除関数（useEffect の後始末に使う）。
 * StrictMode の二重実行で後から登録された実装を消さないよう、同一実装のときだけ解除する。
 */
export function registerCanvasExportSource(
  source: CanvasExportSource,
): () => void {
  registered = source
  return () => {
    if (registered === source) registered = null
  }
}

/** composition root が注入する窓口。参照はアプリの生存期間で不変。 */
export const canvasExportSource: CanvasExportSource = {
  getContentBounds: () => registered?.getContentBounds() ?? null,
  getCaptureTarget: () => registered?.getCaptureTarget() ?? null,
  beginExportView: async () => {
    if (registered === null) return noop
    return registered.beginExportView()
  },
}
