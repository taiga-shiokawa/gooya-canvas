import type { ProjectUseCases } from './projectUseCases'
import type { RecoveryUseCases } from './recoveryUseCases'

// 起動時処理の順序（docs/functional-design.md §7.5 / §7.6）。
//
// サンプルを読み込むのは「復旧データも既存プロジェクトもない場合」（§7.6）である。
// 復旧データがあるのに先にサンプルを読み込むと、ユーザーが Restore を選ぶ前から
// Canvas がサンプルで埋まり、Discard したときにサンプルが残ってしまう。
// この判定順序を composition root（src/main.tsx）へ書くと DOM 無しでは検証できないため、
// application のユースケースとして切り出す。

export type StartupUseCasesDeps = {
  project: Pick<ProjectUseCases, 'loadSampleProjectIfEmpty'>
  recovery: Pick<RecoveryUseCases, 'pendingRecovery' | 'startAutoSave'>
}

export type StartupUseCases = {
  /**
   * 起動時に 1 回だけ呼ぶ。復旧データの有無を判定し、自動保存の購読を開始する。
   * 戻り値を呼ぶと自動保存を停止する（アプリの寿命と同じなので通常は使わない）。
   *
   * 復旧データが見つかった場合、ダイアログ（presentation）が Restore / Discard を
   * ユーザーへ尋ねる。ここでは store を変更しない。
   */
  start: () => () => void
}

export function createStartupUseCases(
  deps: StartupUseCasesDeps,
): StartupUseCases {
  return {
    start: () => {
      if (deps.recovery.pendingRecovery() === null) {
        deps.project.loadSampleProjectIfEmpty()
      }

      // サンプル読込は dirty を立てないが、購読の開始はその後に置く方が意図が明確
      return deps.recovery.startAutoSave()
    },
  }
}
