import {
  migrateProject,
  workflowProjectSchema,
  type WorkflowProject,
} from '@/modules/workflow'
import { z } from 'zod'

// Crash Recovery データの reader / writer（docs/functional-design.md §7.5 / NFR-006）。
// projectSerialization.ts（正式な保存・読込）と対になるが、**保存先も用途も別物**である。
// こちらは localStorage に置く一時データであり、正式な保存先として扱わない。
//
// localStorage の中身はユーザーが自由に書き換えられる外部入力である。
// **必ず Zod validate を通してから store へ入れる**（NFR-005 / development-guidelines §2.5）。
// 壊れていた場合はアプリを壊さず、静かに破棄する（呼び出し側が clear する）。

/** 復旧データ 1 件。`savedAt` は「いつの未保存データか」をユーザーへ示すために添える。 */
export type RecoverySnapshot = {
  /** 自動保存した時刻（ISO 8601）。Domain Model の updatedAt とは別物。 */
  savedAt: string
  project: WorkflowProject
}

// 保存形式は WorkflowProject そのままではなく `savedAt` を添えた封筒にする。
// 復旧ダイアログで日時を示せること、将来キー（保存理由など）を足せることが理由。
// project 部分は正式なプロジェクトファイルと同じスキーマなので、schemaVersion と
// migration（§7.4）の扱いも読込（§7.3）と揃う。
const recoveryEnvelopeSchema = z.object({
  savedAt: z.string(),
  project: workflowProjectSchema,
})

export type DeserializeRecoveryFailure =
  'invalid-json' | 'invalid-schema' | 'unsupported-version'

export type DeserializeRecoveryResult =
  | { ok: true; snapshot: RecoverySnapshot }
  | { ok: false; reason: DeserializeRecoveryFailure }

/**
 * 自動保存する JSON 文字列を組み立てる。
 *
 * 書き出す前にも validation を通し、壊れた Domain Model を localStorage へ
 * 残さない。validate できなければ `null` を返し、呼び出し側は書き込みを見送る。
 * インデントは付けない（人が読む形式ではなく、容量を使わない方が良いため）。
 */
export function serializeRecovery(snapshot: RecoverySnapshot): string | null {
  const parsed = recoveryEnvelopeSchema.safeParse(snapshot)
  if (!parsed.success) return null

  return JSON.stringify(parsed.data)
}

/**
 * 復旧データを読み出す（JSON.parse → Zod validation → Schema Migration）。
 *
 * 不正 JSON・スキーマ不一致・未知の schemaVersion のいずれでも
 * `ok: false` を返すだけで例外を投げない。呼び出し側は store を変更してはならない。
 */
export function deserializeRecovery(text: string): DeserializeRecoveryResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  const parsed = recoveryEnvelopeSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, reason: 'invalid-schema' }

  const migrated = migrateProject(parsed.data.project)
  if (!migrated.ok) return { ok: false, reason: migrated.reason }

  return {
    ok: true,
    snapshot: { savedAt: parsed.data.savedAt, project: migrated.project },
  }
}
