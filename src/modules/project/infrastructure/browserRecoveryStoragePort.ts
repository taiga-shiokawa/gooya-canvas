import type { RecoveryStoragePort } from '../application/ports/RecoveryStoragePort'

// RecoveryStoragePort の具象（docs/repository-structure.md §5.2）。
// ブラウザ API に触れてよいのはこの層だけであり、例外はここで吸収して
// ポートのシグネチャが定める型へ変換する（development-guidelines §2.3）。
// ドメインロジック（validation・保存間隔の判断）は持たない。
//
// localStorage は次の 2 通りで失敗する。どちらも呼び出し側へ漏らさない。
// 1. `localStorage` の参照自体が SecurityError を投げる（サイトデータをブロックする設定）
// 2. `setItem` が QuotaExceededError を投げる（概ね 5MB の上限。シークレットモードでは上限が小さい）
//
// 書き込みに失敗しても既存の（1 世代古い）復旧データは残す。
// 消してしまうより古いデータが残っている方が救済になるため。

/** 復旧データの localStorage キー。他アプリと衝突しないよう名前空間を付ける。 */
const RECOVERY_STORAGE_KEY = 'gooya-canvas:recovery'

/** localStorage 自体を参照できない環境では null を返す。 */
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function createBrowserRecoveryStoragePort(): RecoveryStoragePort {
  return {
    save: (json) => {
      try {
        getStorage()?.setItem(RECOVERY_STORAGE_KEY, json)
      } catch {
        // 容量超過・書き込み不可。復旧は best effort なので握りつぶす
      }
    },

    load: () => {
      try {
        return getStorage()?.getItem(RECOVERY_STORAGE_KEY) ?? null
      } catch {
        return null
      }
    },

    clear: () => {
      try {
        getStorage()?.removeItem(RECOVERY_STORAGE_KEY)
      } catch {
        // 削除できなくても呼び出し側にできることは無い
      }
    },
  }
}
