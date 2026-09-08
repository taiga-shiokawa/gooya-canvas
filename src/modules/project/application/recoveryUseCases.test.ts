import { useWorkflowStore } from '@/modules/shared'
import { createEmptyProject, type WorkflowNode } from '@/modules/workflow'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RecoveryStoragePort } from './ports/RecoveryStoragePort'
import { serializeRecovery } from './recoverySerialization'
import {
  createRecoveryUseCases,
  RECOVERY_DEBOUNCE_MS,
  RECOVERY_MAX_DEBOUNCE_MS,
  type RecoveryDelay,
  type RecoveryUseCases,
} from './recoveryUseCases'

// Crash Recovery（docs/functional-design.md §7.5 / NFR-006）。
// RecoveryStoragePort とタイマーを差し替えるので DOM も localStorage も実時間も要らない。

const NOW = '2026-09-08T09:00:00.000Z'

const nodes: WorkflowNode[] = [
  {
    id: 'node-trigger',
    type: 'trigger',
    position: { x: 10, y: 20 },
    data: { title: '面接終了', config: { system: 'Google Calendar' } },
  },
]

type FakeStorage = RecoveryStoragePort & {
  value: string | null
  saves: number
  clears: number
}

function createFakeStorage(initial: string | null = null): FakeStorage {
  const storage: FakeStorage = {
    value: initial,
    saves: 0,
    clears: 0,
    save: (json) => {
      storage.value = json
      storage.saves += 1
    },
    load: () => storage.value,
    clear: () => {
      storage.value = null
      storage.clears += 1
    },
  }
  return storage
}

type FakeClock = {
  delay: RecoveryDelay
  /** 仮想時間を進め、期限の来たタイマーを発火させる。 */
  advance: (ms: number) => void
}

function createFakeClock(): FakeClock {
  let currentMs = 0
  let tasks: { dueAt: number; callback: () => void }[] = []

  return {
    delay: (callback, delayMs) => {
      const task = { dueAt: currentMs + delayMs, callback }
      tasks.push(task)
      return () => {
        tasks = tasks.filter((candidate) => candidate !== task)
      }
    },
    advance: (ms) => {
      const target = currentMs + ms
      for (;;) {
        const due = tasks
          .filter((task) => task.dueAt <= target)
          .sort((a, b) => a.dueAt - b.dueAt)[0]
        if (!due) break

        tasks = tasks.filter((task) => task !== due)
        currentMs = due.dueAt
        due.callback()
      }
      currentMs = target
    },
  }
}

let storage: FakeStorage
let clock: FakeClock
let useCases: RecoveryUseCases
let stopAutoSave: (() => void) | null = null

function setUp(initialStorage: string | null = null): void {
  storage = createFakeStorage(initialStorage)
  clock = createFakeClock()
  useCases = createRecoveryUseCases({
    storage,
    now: () => NOW,
    delay: clock.delay,
  })
}

/** 有効な復旧データ（前回セッションの残骸）を作る。 */
function validRecoveryJson(name = 'Recovered Flow'): string {
  const project = {
    ...createEmptyProject({ id: 'project-1', now: '2026-09-01T00:00:00.000Z' }),
    metadata: {
      id: 'project-1',
      name,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    nodes,
  }
  const json = serializeRecovery({ savedAt: NOW, project })
  if (json === null) throw new Error('テストデータが不正です')
  return json
}

/** 編集（dirty）を 1 回起こす。 */
function edit(): void {
  useWorkflowStore.getState().setNodes([...nodes])
}

beforeEach(() => {
  useWorkflowStore
    .getState()
    .replaceProject(
      createEmptyProject({ id: 'initial', now: '2026-09-01T00:00:00.000Z' }),
    )
  setUp()
})

afterEach(() => {
  stopAutoSave?.()
  stopAutoSave = null
})

describe('startAutoSave（§7.5）', () => {
  it('dirty のときだけ保存する', () => {
    stopAutoSave = useCases.startAutoSave()

    edit()
    clock.advance(RECOVERY_DEBOUNCE_MS)

    expect(storage.saves).toBe(1)
    expect(storage.value).not.toBeNull()
  })

  it('clean のまま store が入れ替わっても保存しない', () => {
    stopAutoSave = useCases.startAutoSave()

    // replaceProject は dirty を倒すので自動保存の対象外（New / Open と同じ経路）
    useWorkflowStore
      .getState()
      .replaceProject(createEmptyProject({ id: 'other', now: NOW }))
    clock.advance(RECOVERY_MAX_DEBOUNCE_MS)

    expect(storage.saves).toBe(0)
    expect(storage.value).toBeNull()
  })

  it('viewport と選択の変更だけでは保存しない（dirty も立たない）', () => {
    stopAutoSave = useCases.startAutoSave()

    useWorkflowStore.getState().setViewport({ x: 10, y: 20, zoom: 0.5 })
    useWorkflowStore.getState().setSelection({ nodeIds: ['n'], edgeId: null })
    clock.advance(RECOVERY_MAX_DEBOUNCE_MS)

    expect(storage.saves).toBe(0)
  })

  it('短時間の連続変更では 1 回だけ保存する（debounce）', () => {
    stopAutoSave = useCases.startAutoSave()

    edit()
    clock.advance(RECOVERY_DEBOUNCE_MS - 1)
    edit()
    clock.advance(RECOVERY_DEBOUNCE_MS - 1)
    edit()

    // ここまでは一度も期限に達していない
    expect(storage.saves).toBe(0)

    clock.advance(RECOVERY_DEBOUNCE_MS)
    expect(storage.saves).toBe(1)
  })

  it('編集が続いても上限時間で 1 回は書き出す', () => {
    stopAutoSave = useCases.startAutoSave()

    // debounce 未満の間隔で編集し続けても、上限（RECOVERY_MAX_DEBOUNCE_MS）で書かれる
    const step = RECOVERY_DEBOUNCE_MS - 1
    for (let elapsed = 0; elapsed < RECOVERY_MAX_DEBOUNCE_MS; elapsed += step) {
      edit()
      clock.advance(step)
    }

    expect(storage.saves).toBeGreaterThanOrEqual(1)
  })

  it('書き出す内容は現在の Domain Model（viewport 込み）である', () => {
    stopAutoSave = useCases.startAutoSave()

    useWorkflowStore.getState().setViewport({ x: -40, y: 12, zoom: 0.9 })
    edit()
    clock.advance(RECOVERY_DEBOUNCE_MS)

    const written: unknown = JSON.parse(storage.value ?? 'null')
    expect(written).toMatchObject({
      savedAt: NOW,
      project: {
        schemaVersion: '1.0',
        viewport: { x: -40, y: 12, zoom: 0.9 },
        nodes: [{ id: 'node-trigger' }],
      },
    })
  })

  it('停止したあとは保存しない', () => {
    const stop = useCases.startAutoSave()
    edit()
    stop()
    clock.advance(RECOVERY_MAX_DEBOUNCE_MS)

    expect(storage.saves).toBe(0)
  })
})

describe('復旧データの削除（§7.2 / §7.5）', () => {
  it('正式保存の成功（markSaved）で削除する', () => {
    stopAutoSave = useCases.startAutoSave()
    edit()
    clock.advance(RECOVERY_DEBOUNCE_MS)
    expect(storage.value).not.toBeNull()

    useWorkflowStore.getState().markSaved()

    expect(storage.value).toBeNull()
    expect(storage.clears).toBe(1)
  })

  it('New / Open 確定（replaceProject）で削除する', () => {
    stopAutoSave = useCases.startAutoSave()
    edit()
    clock.advance(RECOVERY_DEBOUNCE_MS)
    expect(storage.value).not.toBeNull()

    useWorkflowStore
      .getState()
      .replaceProject(createEmptyProject({ id: 'new-project', now: NOW }))

    expect(storage.value).toBeNull()
  })

  it('前回セッションの復旧データも New / Open 確定で削除する', () => {
    setUp(validRecoveryJson())
    stopAutoSave = useCases.startAutoSave()

    // dirty を経ずに New を実行しても、残っている復旧データは消える
    useWorkflowStore
      .getState()
      .replaceProject(createEmptyProject({ id: 'new-project', now: NOW }))

    expect(storage.value).toBeNull()
  })

  it('削除後に保存待ちのタイマーが発火しても書き戻さない', () => {
    stopAutoSave = useCases.startAutoSave()

    edit()
    useWorkflowStore.getState().markSaved()
    clock.advance(RECOVERY_MAX_DEBOUNCE_MS)

    expect(storage.value).toBeNull()
    expect(storage.saves).toBe(0)
  })
})

describe('pendingRecovery / restore / discard（§7.5）', () => {
  it('復旧データがあれば savedAt 付きで返す', () => {
    setUp(validRecoveryJson())

    const pending = useCases.pendingRecovery()

    expect(pending?.savedAt).toBe(NOW)
    expect(pending?.project.metadata.name).toBe('Recovered Flow')
    // 尋ねただけでは store を変更しない
    expect(useWorkflowStore.getState().nodes).toEqual([])
  })

  it('復旧データが無ければ null を返し storage も触らない', () => {
    expect(useCases.pendingRecovery()).toBeNull()
    expect(storage.clears).toBe(0)
  })

  it('restore で store を復元し復旧データを削除する', () => {
    setUp(validRecoveryJson())

    expect(useCases.restore()).toBe(true)

    const state = useWorkflowStore.getState()
    expect(state.metadata.name).toBe('Recovered Flow')
    expect(state.nodes).toEqual(nodes)
    // 復元直後は未編集扱い（§2.4）
    expect(state.isDirty).toBe(false)
    expect(storage.value).toBeNull()
  })

  it('discard で復旧データだけを削除し store は変更しない', () => {
    setUp(validRecoveryJson())
    const before = useWorkflowStore.getState()

    useCases.discard()

    const after = useWorkflowStore.getState()
    expect(after.nodes).toBe(before.nodes)
    expect(after.metadata).toBe(before.metadata)
    expect(storage.value).toBeNull()
    expect(useCases.pendingRecovery()).toBeNull()
  })
})

describe('壊れた復旧データでアプリを壊さない（NFR-005 / §7.5）', () => {
  const brokenInputs: [string, string][] = [
    ['不正 JSON', '{ "savedAt": '],
    ['空文字', ''],
    ['封筒ではない JSON', '{"hello":"world"}'],
    ['project がプロジェクトではない', '{"savedAt":"x","project":{}}'],
    [
      '未知の schemaVersion',
      JSON.stringify({
        savedAt: NOW,
        project: {
          ...createEmptyProject({ id: 'x', now: NOW }),
          schemaVersion: '9.9',
        },
      }),
    ],
  ]

  it.each(brokenInputs)(
    '%s → 静かに破棄して store を変更しない',
    (_l, input) => {
      setUp(input)
      const before = useWorkflowStore.getState()

      expect(useCases.pendingRecovery()).toBeNull()
      expect(useCases.restore()).toBe(false)
      stopAutoSave = useCases.startAutoSave()

      const after = useWorkflowStore.getState()
      expect(after.nodes).toBe(before.nodes)
      expect(after.edges).toBe(before.edges)
      expect(after.metadata).toBe(before.metadata)
      expect(after.viewport).toBe(before.viewport)
      expect(after.isDirty).toBe(before.isDirty)
      // 壊れたデータは残さない（次回起動でまた読もうとしない）
      expect(storage.value).toBeNull()
    },
  )

  it('ポートが常に空を返しても起動と自動保存が続く', () => {
    const brokenStorage: RecoveryStoragePort = {
      save: () => undefined,
      load: () => null,
      clear: () => undefined,
    }
    const localClock = createFakeClock()
    const localUseCases = createRecoveryUseCases({
      storage: brokenStorage,
      now: () => NOW,
      delay: localClock.delay,
    })

    expect(localUseCases.pendingRecovery()).toBeNull()
    const stop = localUseCases.startAutoSave()
    edit()
    expect(() => localClock.advance(RECOVERY_MAX_DEBOUNCE_MS)).not.toThrow()
    stop()
  })
})
