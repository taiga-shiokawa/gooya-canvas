import type { WorkflowProject } from './types'
import { SCHEMA_VERSION } from './workflowProject'

// Schema Migration（docs/functional-design.md §7.4 / FR-014 / NFR-008）。
// 旧版 → 現行版へ順次適用する純関数の連鎖。決定論的で、Date.now() /
// crypto.randomUUID() 等の非決定的要素を内部で呼ばない（development-guidelines §2.2）。

/** 1 段分の変換。`from` 版のプロジェクトを `to` 版へ引き上げる。 */
export type SchemaMigration = {
  from: string
  to: string
  migrate: (project: WorkflowProject) => WorkflowProject
}

/**
 * migration レジストリ。**MVP 時点では空**（docs/functional-design.md §7.4）。
 * schemaVersion を上げるときは、旧版から順に 1 段ずつ繋がるよう追加する。
 */
export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = []

export type MigrateProjectResult =
  | { ok: true; project: WorkflowProject }
  | { ok: false; reason: 'unsupported-version' }

/**
 * schemaVersion を現行版（SCHEMA_VERSION）まで引き上げる。
 *
 * 現行版へ到達する経路が無い版はすべて `unsupported-version` として拒否する。
 * これには**現行版より新しい版**が含まれ、異常ファイルと同じ扱いになる（§7.4）。
 *
 * @param migrations テストで連鎖を検証するための差し替え口。既定は SCHEMA_MIGRATIONS。
 */
export function migrateProject(
  project: WorkflowProject,
  migrations: readonly SchemaMigration[] = SCHEMA_MIGRATIONS,
): MigrateProjectResult {
  let current = project
  const visited = new Set<string>()

  while (current.schemaVersion !== SCHEMA_VERSION) {
    // レジストリが循環していても停止させる（壊れたレジストリで無限ループしない）
    if (visited.has(current.schemaVersion)) {
      return { ok: false, reason: 'unsupported-version' }
    }
    visited.add(current.schemaVersion)

    const migration = migrations.find(
      (candidate) => candidate.from === current.schemaVersion,
    )
    if (!migration) return { ok: false, reason: 'unsupported-version' }

    // 版の付け替えはここで行う。各 migrate はデータ形状の変換だけに集中させる。
    current = { ...migration.migrate(current), schemaVersion: migration.to }
  }

  return { ok: true, project: current }
}
