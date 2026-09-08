import { useWorkflowStore, type WorkflowStoreState } from '@/modules/shared'
import { SCHEMA_VERSION, type WorkflowProject } from '@/modules/workflow'
import type { RecoveryStoragePort } from './ports/RecoveryStoragePort'
import {
  deserializeRecovery,
  serializeRecovery,
  type RecoverySnapshot,
} from './recoverySerialization'

// Crash Recovery のユースケース（docs/functional-design.md §7.5 / NFR-006）。
//
// - dirty の間だけ Domain Model を debounce 付きで RecoveryStoragePort へ自動保存する
// - 起動時に復旧データがあれば取り出し、Restore で store へ復元 / Discard で削除する
// - 正式保存（§7.2）成功時と New / Open 確定時に復旧データを削除する
//
// store 更新の入口はここ（application）であり、presentation は store の setter を直接呼ばない。

/**
 * 自動保存の debounce 間隔（ms）。
 *
 * docs/functional-design.md §7.5 は「（要確認）— 既定 5 秒程度を想定」としていたが、
 * 本実装では **2 秒**を採用する。localStorage への書き込みは同期でメインスレッドを
 * 止めるため 1 操作ごとの書き込みは避けたい一方、5 秒は喪失しうる編集量が大きい。
 * 操作の切れ目（ドラッグ終了・入力の一区切り）を跨がない最短の値として 2 秒とした。
 */
export const RECOVERY_DEBOUNCE_MS = 2_000

/**
 * 連続編集中でも、最初の変更からこの時間が経てば必ず 1 回書き出す（ms）。
 *
 * 純粋な debounce だけだと「長文を入力し続けている間は一度も保存されない」
 * という穴が残る（キー入力のたびにタイマーが延びるため）。上限を設けて
 * 喪失しうる編集時間を最大 10 秒に閉じ込める。
 */
export const RECOVERY_MAX_DEBOUNCE_MS = 10_000

/**
 * debounce のタイマー。`delayMs` 後に `callback` を 1 回呼び、戻り値の関数で取り消す。
 *
 * application はブラウザ API（setTimeout / clearTimeout）へ直接依存しないため
 * composition root から注入する（functional-design §2.2）。テストでは
 * フェイクに差し替えて実時間を待たずに検証する。
 */
export type RecoveryDelay = (
  callback: () => void,
  delayMs: number,
) => () => void

export type RecoveryUseCasesDeps = {
  storage: RecoveryStoragePort
  /** 自動保存した時刻（ISO 8601）。決定論性のため注入する（development-guidelines §2.2）。 */
  now: () => string
  delay: RecoveryDelay
  /** 既定は RECOVERY_DEBOUNCE_MS。 */
  debounceMs?: number
  /** 既定は RECOVERY_MAX_DEBOUNCE_MS。 */
  maxDebounceMs?: number
}

export type RecoveryUseCases = {
  /**
   * 起動時に見つかった復旧データを返す（無ければ null）。
   *
   * 壊れていた場合（不正 JSON / スキーマ不一致 / 未知の schemaVersion）は
   * 静かに破棄して null を返す。エラーはユーザーへ見せない（§7.5 / NFR-005）。
   * 初回の結果を保持するので、何度呼んでも同じ値を返す（起動判定とダイアログの二重読みを許す）。
   */
  pendingRecovery: () => RecoverySnapshot | null

  /**
   * Restore。復旧データで store を置き換え、復旧データを削除する。
   * 復元できたら true、復旧データが無ければ false を返す。
   */
  restore: () => boolean

  /** Discard。復旧データを削除する。store は変更しない。 */
  discard: () => void

  /**
   * dirty の間だけ自動保存する購読を開始する。戻り値を呼ぶと停止する。
   * アプリ起動時に 1 回だけ呼ぶ（composition root）。
   */
  startAutoSave: () => () => void
}

/** 復旧データへ書き出す対象。viewport も含めるが、変更検知の対象にはしない。 */
function toProject(state: WorkflowStoreState): WorkflowProject {
  return {
    schemaVersion: SCHEMA_VERSION,
    // updatedAt は正式保存（§7.2）でだけ更新する。自動保存は封筒の savedAt で表す
    metadata: state.metadata,
    viewport: state.viewport,
    nodes: state.nodes,
    edges: state.edges,
    promptSettings: state.promptSettings,
  }
}

/**
 * 自動保存を起動する変更の対象。dirty 判定（§2.4）と同じ 4 つに揃える。
 *
 * viewport と選択状態を含めないのは、Pan / Zoom のたびに debounce が延びて
 * かえって保存が遅れるため。書き出す内容には現在の viewport が入る。
 */
type PersistedSlice = Pick<
  WorkflowStoreState,
  'metadata' | 'nodes' | 'edges' | 'promptSettings'
>

function sliceOf(state: WorkflowStoreState): PersistedSlice {
  return {
    metadata: state.metadata,
    nodes: state.nodes,
    edges: state.edges,
    promptSettings: state.promptSettings,
  }
}

/** store は変更のたびに参照を差し替えるので、参照比較で足りる。 */
function isSameSlice(a: PersistedSlice, b: PersistedSlice): boolean {
  return (
    a.metadata === b.metadata &&
    a.nodes === b.nodes &&
    a.edges === b.edges &&
    a.promptSettings === b.promptSettings
  )
}

export function createRecoveryUseCases(
  deps: RecoveryUseCasesDeps,
): RecoveryUseCases {
  const debounceMs = deps.debounceMs ?? RECOVERY_DEBOUNCE_MS
  const maxDebounceMs = deps.maxDebounceMs ?? RECOVERY_MAX_DEBOUNCE_MS

  let probed = false
  let pending: RecoverySnapshot | null = null
  /** 復旧データが localStorage にある可能性。無駄な clear を避けるために持つ。 */
  let stored = false

  /** 起動時の読み出しは 1 回だけ行い、結果を保持する。 */
  function probe(): void {
    if (probed) return
    probed = true

    const text = deps.storage.load()
    if (text === null) return

    stored = true
    const result = deserializeRecovery(text)
    if (!result.ok) {
      // 壊れた復旧データはユーザーへ見せずに捨てる。アプリは通常起動を続ける
      clearStored()
      return
    }

    pending = result.snapshot
  }

  function clearStored(): void {
    if (!stored) return
    deps.storage.clear()
    stored = false
  }

  return {
    pendingRecovery: () => {
      probe()
      return pending
    },

    restore: () => {
      probe()
      if (!pending) return false

      // 復元は New / Open と同じ経路（replaceProject）。dirty は倒れる（§2.4）
      useWorkflowStore.getState().replaceProject(pending.project)
      pending = null
      clearStored()
      return true
    },

    discard: () => {
      probe()
      pending = null
      clearStored()
    },

    startAutoSave: () => {
      probe()

      let cancelDebounce: (() => void) | null = null
      let cancelMax: (() => void) | null = null
      let previous = sliceOf(useWorkflowStore.getState())
      let wasDirty = useWorkflowStore.getState().isDirty

      const cancelPending = (): void => {
        cancelDebounce?.()
        cancelDebounce = null
        cancelMax?.()
        cancelMax = null
      }

      const flush = (): void => {
        cancelPending()

        const state = useWorkflowStore.getState()
        // 待っている間に保存・New・Open が起きたら書かない
        if (!state.isDirty) return

        const json = serializeRecovery({
          savedAt: deps.now(),
          project: toProject(state),
        })
        if (json === null) return

        deps.storage.save(json)
        stored = true
      }

      const unsubscribe = useWorkflowStore.subscribe((state) => {
        const current = sliceOf(state)
        const changed = !isSameSlice(previous, current)
        previous = current

        if (!state.isDirty) {
          // 正式保存の成功（markSaved）と New / Open / Restore（replaceProject）で
          // 復旧データを削除する（§7.5）。viewport や選択の変更では触らない
          if (wasDirty || changed) {
            cancelPending()
            clearStored()
          }
          wasDirty = false
          return
        }

        wasDirty = true
        if (!changed) return

        cancelDebounce?.()
        cancelDebounce = deps.delay(flush, debounceMs)
        // 連続編集で debounce が延び続けても、上限で必ず 1 回書き出す
        cancelMax ??= deps.delay(flush, maxDebounceMs)
      })

      return () => {
        cancelPending()
        unsubscribe()
      }
    },
  }
}
