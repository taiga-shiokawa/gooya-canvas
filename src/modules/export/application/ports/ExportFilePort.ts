// ExportFilePort — Export 成果物（PNG / PDF）のダウンロード。
//
// docs/functional-design.md §2.3 のポート表には無い追加ポートである。
// project モジュールの `ProjectFilePort` は JSON 文字列専用であり、
// そもそも feature モジュール間の import は禁止されている（repository-structure §5.1 #4）ため、
// export モジュール側で Blob 用のダウンロード手段を持つ。
//
// 具象は infrastructure（Blob + <a download>）が実装し、composition root が注入する。
export type ExportFilePort = {
  /**
   * Blob を `name` のファイル名でダウンロードさせる（FR-016 / FR-017）。
   * 保存先の選択はブラウザのダウンロード機構に委ね、アプリは関与しない（§7.2 と同じ方針）。
   */
  download: (name: string, blob: Blob) => void
}
