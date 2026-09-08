import { useMemo, useState } from 'react'
import { formatRecoverySavedAt } from '../application/recoverySavedAtLabel'
import type { RecoveryUseCases } from '../application/recoveryUseCases'
import type { ProjectDialogState } from './ProjectDialog'

// 起動時の復旧ダイアログ（docs/functional-design.md §7.5 / §4.4）。
// presentation は store の購読とユースケース呼び出しだけを行い、判定ロジックは持たない。
// ダイアログの見た目は ProjectDialog を再利用する（確認ダイアログと同形のため）。

const RECOVERY_TITLE = '未保存の復旧データ'

/** 日時が読めなかった場合の文言。日時抜きでも復旧の可否は判断できる。 */
const RECOVERY_MESSAGE_WITHOUT_TIME =
  '前回の未保存データが見つかりました。復元しますか？'

const RESTORE_LABEL = '復元する'
const DISCARD_LABEL = '破棄する'

/**
 * 起動時に復旧データがあれば復旧ダイアログの状態を返す（無ければ null）。
 *
 * - 復元する → store を置き換え、復旧データを削除する
 * - 破棄する → 復旧データを削除する（Canvas は空のまま。File > New と同じ状態）
 * - Esc → **データを残したまま**閉じる。破棄が副次ボタン側にあるため、
 *   誤操作しやすい Esc に破壊的な動作を割り当てない
 */
export function useRecoveryPrompt(
  useCases: RecoveryUseCases,
): ProjectDialogState | null {
  // 起動時に読み出した結果を 1 度だけ受け取る。pendingRecovery は初回の結果を
  // 保持するので、StrictMode の二重呼び出しでも同じ値が返る
  const [snapshot] = useState(() => useCases.pendingRecovery())
  const [answered, setAnswered] = useState(false)

  return useMemo(() => {
    if (!snapshot || answered) return null

    const savedAt = formatRecoverySavedAt(snapshot.savedAt)

    return {
      kind: 'confirm',
      title: RECOVERY_TITLE,
      message:
        savedAt === null
          ? RECOVERY_MESSAGE_WITHOUT_TIME
          : `${savedAt} 時点の未保存データが見つかりました。復元しますか？`,
      confirmLabel: RESTORE_LABEL,
      cancelLabel: DISCARD_LABEL,
      onConfirm: () => {
        useCases.restore()
        setAnswered(true)
      },
      onCancel: () => {
        useCases.discard()
        setAnswered(true)
      },
      onDismiss: () => setAnswered(true),
    }
  }, [answered, snapshot, useCases])
}
