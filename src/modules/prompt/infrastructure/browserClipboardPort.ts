import type { ClipboardPort } from '../application/ports/ClipboardPort'

// Clipboard API の具象。ブラウザ API に触れてよいのはこの層だけ。

export function createBrowserClipboardPort(): ClipboardPort {
  return {
    copy: async (text) => {
      // navigator.clipboard はセキュアコンテキスト外では undefined になり、
      // 権限が無い場合は reject する。どちらもポートの外へ漏らさず false にする。
      if (!navigator.clipboard) return false
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        return false
      }
    },
  }
}
