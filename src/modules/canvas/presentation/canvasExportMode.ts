import { createContext, useContext } from 'react'

// Export 用表示かどうかを Canvas 配下へ配る context（docs/functional-design.md §8.3 / AC-018）。
//
// Handle と選択枠は Custom Node が描くので、非表示の指示をノードまで届ける必要がある。
// ノードの `data` に持たせると React Flow へ渡す配列を作り直すことになり、
// measured / selected が失われる（§2.4 の controlled flow の要点）。
// context なら配列に触れずに再描画だけを起こせるため、こちらを使う。

export const CanvasExportModeContext = createContext(false)

export function useCanvasExportMode(): boolean {
  return useContext(CanvasExportModeContext)
}
