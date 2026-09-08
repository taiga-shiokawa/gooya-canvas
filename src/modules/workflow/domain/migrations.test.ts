import { describe, expect, it } from 'vitest'
import {
  migrateProject,
  SCHEMA_MIGRATIONS,
  type SchemaMigration,
} from './migrations'
import type { WorkflowProject } from './types'
import { SCHEMA_VERSION } from './workflowProject'

// Unit テストの重点対象 3 位「Schema migration（新しい schemaVersion の拒否含む）」
// （docs/development-guidelines.md §5.1）。

function projectAt(schemaVersion: string): WorkflowProject {
  return {
    schemaVersion,
    metadata: {
      id: 'project-1',
      name: 'Sample',
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
  }
}

describe('SCHEMA_MIGRATIONS', () => {
  it('MVP 時点では空である（docs/functional-design.md §7.4）', () => {
    expect(SCHEMA_MIGRATIONS).toEqual([])
  })
})

describe('migrateProject', () => {
  it('現行版はそのまま通す', () => {
    const project = projectAt(SCHEMA_VERSION)

    expect(migrateProject(project)).toEqual({ ok: true, project })
  })

  it('現行版より新しい schemaVersion は拒否する', () => {
    expect(migrateProject(projectAt('2.0'))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    })
  })

  it('経路の無い旧版は拒否する（レジストリが空の MVP では全ての旧版が該当）', () => {
    expect(migrateProject(projectAt('0.9'))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    })
  })

  it('schemaVersion が空文字でも拒否する', () => {
    expect(migrateProject(projectAt(''))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    })
  })

  it('旧版を順次適用して現行版まで引き上げる', () => {
    const migrations: SchemaMigration[] = [
      {
        from: '0.8',
        to: '0.9',
        migrate: (project) => ({
          ...project,
          metadata: { ...project.metadata, name: `${project.metadata.name}/8` },
        }),
      },
      {
        from: '0.9',
        to: SCHEMA_VERSION,
        migrate: (project) => ({
          ...project,
          metadata: { ...project.metadata, name: `${project.metadata.name}/9` },
        }),
      },
    ]

    const result = migrateProject(projectAt('0.8'), migrations)

    expect(result.ok).toBe(true)
    expect(result.ok && result.project.schemaVersion).toBe(SCHEMA_VERSION)
    // 適用順が 0.8 → 0.9 → 現行版であること
    expect(result.ok && result.project.metadata.name).toBe('Sample/8/9')
  })

  it('決定論的である（同じ入力から常に同じ結果を返す）', () => {
    const project = projectAt(SCHEMA_VERSION)

    expect(migrateProject(project)).toEqual(migrateProject(project))
  })

  it('入力を破壊しない', () => {
    const project = projectAt('0.9')
    const migrations: SchemaMigration[] = [
      {
        from: '0.9',
        to: SCHEMA_VERSION,
        migrate: (input) => ({ ...input, nodes: [] }),
      },
    ]

    migrateProject(project, migrations)

    expect(project.schemaVersion).toBe('0.9')
  })

  it('循環したレジストリでも停止する', () => {
    const migrations: SchemaMigration[] = [
      { from: '0.8', to: '0.9', migrate: (project) => project },
      { from: '0.9', to: '0.8', migrate: (project) => project },
    ]

    expect(migrateProject(projectAt('0.8'), migrations)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    })
  })
})
