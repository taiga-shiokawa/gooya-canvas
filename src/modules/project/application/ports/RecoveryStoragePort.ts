// RecoveryStoragePort（docs/functional-design.md §2.3、docs/repository-structure.md §5.2）。
// 具象は infrastructure（localStorage）が実装し、composition root（src/app/）が注入する。
// DI コンテナは使わない（AD-10）。
//
// ポートのシグネチャにライブラリ固有型・例外を出さない（development-guidelines §2.3）。
// localStorage は容量上限（概ね 5MB）に達したときや、シークレットモード・
// サイトデータのブロック設定で参照そのものが例外を投げることがある。
// **それらはすべて具象が境界内で吸収し**、呼び出し側は失敗を例外として受け取らない。
//
// **localStorage は正式な保存先ではない**（§7.5）。ここに置くのは事故時の救済用の
// 一時データだけであり、正式な保存は ProjectFilePort（JSON ファイル）が担う。
export type RecoveryStoragePort = {
  /**
   * 復旧データ（JSON 文字列）を書き込む（NFR-006）。
   * 容量超過などで書き込めなかった場合も例外を投げず、静かに諦める。
   */
  save: (json: string) => void

  /**
   * 復旧データを読み出す。存在しない場合と読み取れなかった場合は `null` を返す。
   * 中身が壊れているかどうかは判定しない（Zod validation は application の責務）。
   */
  load: () => string | null

  /** 復旧データを削除する。存在しない場合は何もしない。 */
  clear: () => void
}
