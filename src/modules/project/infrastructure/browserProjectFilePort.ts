import type { ProjectFilePort } from '../application/ports/ProjectFilePort'

// ProjectFilePort の具象（docs/repository-structure.md §5.2）。
// ブラウザ API に触れてよいのはこの層だけであり、例外はここで吸収して
// ポートのシグネチャが定める型へ変換する（development-guidelines §2.3）。
// ドメインロジック（ファイル名生成・validation）は持たない。

const JSON_MIME_TYPE = 'application/json'

/** File Picker が受け付ける拡張子。`.gooya-canvas.json` は `.json` に含まれる。 */
const FILE_ACCEPT = '.json,application/json'

export function createBrowserProjectFilePort(): ProjectFilePort {
  return {
    download: (name, json) => {
      const blob = new Blob([json], { type: JSON_MIME_TYPE })
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

    pickAndRead: () =>
      new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = FILE_ACCEPT
        input.hidden = true

        const finish = (text: string | null) => {
          input.remove()
          resolve(text)
        }

        // ダイアログを閉じただけの場合。change は発火しないので cancel で拾う
        input.addEventListener('cancel', () => finish(null))

        input.addEventListener('change', () => {
          const file = input.files?.[0]
          if (!file) {
            finish(null)
            return
          }
          // 読み取り失敗（権限・I/O エラー）も呼び出し側へ例外を漏らさない
          file.text().then(
            (text) => finish(text),
            () => finish(null),
          )
        })

        document.body.append(input)
        input.click()
      }),
  }
}
