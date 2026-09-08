// Undo 履歴の粒度をそろえる仕組み（docs/functional-design.md §11 / §6）。
//
// store の変更 1 回 = 履歴 1 件だと、Inspector の 1 文字ごとの入力がすべて履歴に積まれる。
// §6 は「編集確定単位（フィールドの blur / 入力 debounce）で 1 件」を要求しているため、
// **同じ編集対象への連続した変更**を時間窓でまとめる。
//
// 対象の同一性は呼び出し側が渡す `groupKey`（例: `node:<id>:title`）で判定する。
// キーが無い変更（ノード追加・削除・接続・ドラッグ確定など）は常に独立した 1 件にする。
// 時間だけで一括りにすると、続けざまの別操作までまとめてしまうためである。

export type HistoryGroupGate = {
  /** この変更を新しい履歴として積むべきか。呼び出しごとに内部状態を更新する。 */
  shouldRecord: (groupKey: string | null, now: number) => boolean
  /** グループ判定をリセットする（プロジェクト差し替え時など）。 */
  reset: () => void
}

export function createHistoryGroupGate(windowMs: number): HistoryGroupGate {
  let lastKey: string | null = null
  let lastAt = 0

  return {
    shouldRecord: (groupKey, now) => {
      const grouped =
        groupKey !== null && groupKey === lastKey && now - lastAt <= windowMs

      lastKey = groupKey
      lastAt = now
      return !grouped
    },
    reset: () => {
      lastKey = null
      lastAt = 0
    },
  }
}

// 「いま実行中の変更がどの編集対象のものか」を store の setter へ伝える経路。
// setter の引数に持たせると store の公開シグネチャが履歴の都合で汚れるため、
// 呼び出しの前後だけ有効なモジュール変数で受け渡す。同期実行の間しか生きない。
let pendingGroupKey: string | null = null

/**
 * `mutate` の中で起きる store 変更を `groupKey` の編集としてまとめる。
 * Inspector の各フィールドがこれで自分の識別子を渡す。
 */
export function withHistoryGroup(groupKey: string, mutate: () => void): void {
  const previous = pendingGroupKey
  pendingGroupKey = groupKey
  try {
    mutate()
  } finally {
    pendingGroupKey = previous
  }
}

/** 実行中の編集対象。store の履歴フックだけが読む。 */
export function currentHistoryGroup(): string | null {
  return pendingGroupKey
}
