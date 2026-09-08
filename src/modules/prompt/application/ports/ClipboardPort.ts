/**
 * Prompt を Clipboard へコピーする（AC-023 / docs/functional-design.md §2.3）。
 *
 * 具象は infrastructure が実装する。コピー可否はブラウザの権限や
 * セキュアコンテキストに依存するため、例外を投げずに成否を返す
 * （ライブラリ・ブラウザ固有の例外をポートの外へ漏らさない — development-guidelines §2.3）。
 */
export type ClipboardPort = {
  copy: (text: string) => Promise<boolean>
}
