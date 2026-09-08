// ProjectFilePort（docs/functional-design.md §2.3、docs/repository-structure.md §5.2）。
// 具象は infrastructure（Blob + <a download> / <input type="file">）が実装し、
// composition root（src/app/）が注入する。DI コンテナは使わない（AD-10）。
//
// ポートのシグネチャにライブラリ固有型・例外を出さない（development-guidelines §2.3）。
// 具象は境界内で catch し、ここで定める型へ変換して返す。
export type ProjectFilePort = {
  /**
   * JSON 文字列を `name` のファイル名でダウンロードさせる（FR-012）。
   * 保存先の選択はブラウザのダウンロード機構に委ね、アプリは関与しない（§7.2）。
   */
  download: (name: string, json: string) => void

  /**
   * File Picker を開き、選択されたファイルの中身を文字列で返す（FR-013）。
   *
   * ユーザーがキャンセルした場合と、ファイルを読み取れなかった場合は `null` を返す。
   * 呼び出し側は `null` を「何も起きなかった」として扱い、Canvas を変更しない。
   */
  pickAndRead: () => Promise<string | null>
}
