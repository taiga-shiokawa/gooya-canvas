import {
  migrateProject,
  workflowProjectSchema,
  type WorkflowProject,
} from '@/modules/workflow'

// プロジェクトファイルの reader / writer（docs/repository-structure.md §7 の対応表）。
// Zod スキーマと migration は workflow ドメインが所有し、本ファイルは
// 「JSON 文字列 ↔ Domain Model」の変換フロー（§7.2 / §7.3）だけを組み立てる。
//
// **validate 前のオブジェクトを state / domain へ渡さない**（NFR-005）。
// deserializeProject が返すのは検証済みの WorkflowProject だけである。

/** 出力 JSON のインデント。人が diff を読める形で保存する。 */
const JSON_INDENT = 2

export type SerializeProjectResult =
  { ok: true; json: string } | { ok: false; reason: 'invalid-schema' }

export type DeserializeProjectFailure =
  'invalid-json' | 'invalid-schema' | 'unsupported-version'

export type DeserializeProjectResult =
  | { ok: true; project: WorkflowProject }
  | { ok: false; reason: DeserializeProjectFailure }

/**
 * 保存フロー（docs/functional-design.md §7.2）の
 * 「Zod validation → JSON.stringify()」部分。validation に失敗したら保存しない。
 */
export function serializeProject(
  project: WorkflowProject,
): SerializeProjectResult {
  const parsed = workflowProjectSchema.safeParse(project)
  if (!parsed.success) return { ok: false, reason: 'invalid-schema' }

  return { ok: true, json: JSON.stringify(parsed.data, null, JSON_INDENT) }
}

/**
 * 読込フロー（docs/functional-design.md §7.3）の
 * 「JSON.parse() → Zod validation → Schema Migration」部分。
 *
 * どの段で失敗しても呼び出し側は store を変更してはならない（AC-015）。
 * サンプル・テンプレート JSON も同じ経路を通す（repository-structure §6.2）。
 */
export function deserializeProject(text: string): DeserializeProjectResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  const parsed = workflowProjectSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, reason: 'invalid-schema' }

  return migrateProject(parsed.data)
}
