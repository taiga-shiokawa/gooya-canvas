import type { WorkflowProject, WorkflowViewport } from './types'

// WorkflowProject の定数と生成（docs/functional-design.md §3.2 / §7.1 / §7.4）。
// Zod スキーマ（schemas.ts）と migration レジストリ（migrations.ts）は Phase 4 で追加する。

/** 現行の schemaVersion。保存時は常にこの版で書き出す（FR-014）。 */
export const SCHEMA_VERSION = '1.0'

export const DEFAULT_VIEWPORT: WorkflowViewport = { x: 0, y: 0, zoom: 1 }

export const DEFAULT_PROJECT_NAME = 'Untitled Workflow'

type CreateEmptyProjectInput = {
  /** crypto.randomUUID() の結果。純関数に保つため呼び出し側が採番する（AD-08）。 */
  id: string
  /** ISO 8601。同上の理由で呼び出し側が渡す。 */
  now: string
  name?: string
}

/** 空の WorkflowProject を作る（File > New / 起動時の初期状態）。 */
export function createEmptyProject(
  input: CreateEmptyProjectInput,
): WorkflowProject {
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      id: input.id,
      name: input.name ?? DEFAULT_PROJECT_NAME,
      createdAt: input.now,
      updatedAt: input.now,
    },
    viewport: DEFAULT_VIEWPORT,
    nodes: [],
    edges: [],
    promptSettings: {},
  }
}
