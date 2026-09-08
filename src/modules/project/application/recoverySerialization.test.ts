import { createEmptyProject, SCHEMA_VERSION } from '@/modules/workflow'
import { describe, expect, it } from 'vitest'
import { deserializeRecovery, serializeRecovery } from './recoverySerialization'

// 復旧データの reader / writer（docs/functional-design.md §7.5 / NFR-005）。
// localStorage の中身はユーザーが書き換えられる外部入力なので、
// **どんな文字列を渡しても例外を投げず ok: false を返す**ことが要件である。

const SAVED_AT = '2026-09-08T09:00:00.000Z'

const project = {
  ...createEmptyProject({ id: 'project-1', now: '2026-09-01T00:00:00.000Z' }),
  viewport: { x: -40, y: 12, zoom: 0.9 },
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger' as const,
      position: { x: 10, y: 20 },
      data: { title: '面接終了', config: { system: 'Google Calendar' } },
    },
  ],
  edges: [],
}

describe('serializeRecovery / deserializeRecovery', () => {
  it('savedAt と Domain Model を往復できる', () => {
    const json = serializeRecovery({ savedAt: SAVED_AT, project })
    expect(json).not.toBeNull()

    const result = deserializeRecovery(json ?? '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.savedAt).toBe(SAVED_AT)
    expect(result.snapshot.project).toEqual(project)
  })

  it('Domain Model が壊れていたら書き出さない', () => {
    const broken = { ...project, nodes: [{ id: 'n' }] }

    // 型としては通らない形を実行時に渡されても null を返す（store 由来でも無検証で書かない）
    expect(
      serializeRecovery({
        savedAt: SAVED_AT,
        // @ts-expect-error 壊れた Domain Model を意図的に渡す
        project: broken,
      }),
    ).toBeNull()
  })
})

describe('壊れた復旧データを読んでも例外を投げない（NFR-005）', () => {
  const invalidInputs: [string, string, string][] = [
    ['JSON として壊れている', '{ "savedAt": ', 'invalid-json'],
    ['空文字', '', 'invalid-json'],
    ['封筒ではない JSON', '{"hello":"world"}', 'invalid-schema'],
    ['配列', '[]', 'invalid-schema'],
    [
      'project がプロジェクトではない',
      JSON.stringify({ savedAt: SAVED_AT, project: { nodes: [] } }),
      'invalid-schema',
    ],
    ['savedAt が無い', JSON.stringify({ project }), 'invalid-schema'],
    [
      'project の型が一致しない',
      JSON.stringify({
        savedAt: SAVED_AT,
        project: {
          ...project,
          nodes: [
            { id: 'n', type: 'trigger', position: 'top', data: { title: 't' } },
          ],
        },
      }),
      'invalid-schema',
    ],
    [
      '現行版より新しい schemaVersion',
      JSON.stringify({
        savedAt: SAVED_AT,
        project: { ...project, schemaVersion: '9.9' },
      }),
      'unsupported-version',
    ],
  ]

  it.each(invalidInputs)('%s → ok: false', (_label, input, reason) => {
    const result = deserializeRecovery(input)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe(reason)
  })

  it('現行 schemaVersion のデータは受理する', () => {
    const json = serializeRecovery({ savedAt: SAVED_AT, project })
    const result = deserializeRecovery(json ?? '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.project.schemaVersion).toBe(SCHEMA_VERSION)
  })
})
