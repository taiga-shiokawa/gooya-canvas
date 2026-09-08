import type { ExportFilePort } from '../application/ports/ExportFilePort'

// ExportFilePort の具象（Blob + <a download>。docs/repository-structure.md §5.2）。
// project の browserProjectFilePort と同じ手順だが、あちらは JSON 文字列専用であり、
// feature モジュール間の import も禁止されている（§5.1 #4）ため別実装として持つ。

export function createBrowserExportFilePort(): ExportFilePort {
  return {
    download: (name, blob) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = url
      anchor.download = name
      anchor.rel = 'noopener'
      anchor.hidden = true

      document.body.append(anchor)
      anchor.click()
      anchor.remove()

      // click() 直後に revoke するとダウンロードが始まらないブラウザがあるため
      // 現在のタスクを抜けてから解放する
      setTimeout(() => URL.revokeObjectURL(url), 0)
    },
  }
}
