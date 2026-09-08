import { createEmptyProject } from '@/modules/workflow'
import { describe, expect, it } from 'vitest'
import type { RecoverySnapshot } from './recoverySerialization'
import { createStartupUseCases } from './startupUseCases'

// 起動時の判定順序（docs/functional-design.md §7.5 / §7.6）。
// 「復旧データも既存プロジェクトもない場合」だけサンプルを読み込む。

const SAVED_AT = '2026-09-08T09:00:00.000Z'

const snapshot: RecoverySnapshot = {
  savedAt: SAVED_AT,
  project: createEmptyProject({ id: 'project-1', now: SAVED_AT }),
}

function setUp(pending: RecoverySnapshot | null) {
  const calls = { sample: 0, autoSave: 0, stop: 0 }
  const startup = createStartupUseCases({
    project: {
      loadSampleProjectIfEmpty: () => {
        calls.sample += 1
        return true
      },
    },
    recovery: {
      pendingRecovery: () => pending,
      startAutoSave: () => {
        calls.autoSave += 1
        return () => {
          calls.stop += 1
        }
      },
    },
  })
  return { calls, startup }
}

describe('start（§7.5 / §7.6）', () => {
  it('復旧データがあるときはサンプルを読み込まない', () => {
    const { calls, startup } = setUp(snapshot)

    startup.start()

    expect(calls.sample).toBe(0)
  })

  it('復旧データが無いときはサンプルを読み込む', () => {
    const { calls, startup } = setUp(null)

    startup.start()

    expect(calls.sample).toBe(1)
  })

  it('どちらの場合も自動保存を開始し、戻り値で停止できる', () => {
    for (const pending of [snapshot, null]) {
      const { calls, startup } = setUp(pending)

      const stop = startup.start()
      expect(calls.autoSave).toBe(1)

      stop()
      expect(calls.stop).toBe(1)
    }
  })
})
