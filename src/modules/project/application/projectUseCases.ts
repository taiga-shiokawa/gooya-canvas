import { useWorkflowStore } from '@/modules/shared'
import {
  createEmptyProject,
  SCHEMA_VERSION,
  type WorkflowProject,
} from '@/modules/workflow'
// サンプルは `?raw` で文字列として取り込み、通常の Open と同じ
// JSON.parse → Zod validation → migration を通す（repository-structure §6.2 / NFR-005）
import sampleProjectJson from '../assets/samples/interview-evaluation-reminder.gooya-canvas.json?raw'
import type { ProjectFilePort } from './ports/ProjectFilePort'
import { toProjectFileName } from './projectFileName'
import { deserializeProject, serializeProject } from './projectSerialization'

// New / Save / Open のユースケース（docs/functional-design.md §7.1〜§7.3）。
// store 更新の唯一の入口であり、presentation は store の setter を直接呼ばない。
//
// Crash Recovery（NFR-006 / §7.5）は Phase 4 のスコープ外のため RecoveryStoragePort を持たない。

export type ProjectUseCasesDeps = {
  filePort: ProjectFilePort
  /** 現在時刻を ISO 8601 で返す。決定論性のため注入する（development-guidelines §2.2）。 */
  now: () => string
  /** ID 採番（AD-08: crypto.randomUUID）。同上の理由で注入する。 */
  newId: () => string
}

export type SaveProjectResult = 'saved' | 'invalid'

export type OpenProjectResult = 'opened' | 'cancelled' | 'failed'

export type ProjectUseCases = {
  /** File > New（FR-011 / §7.1）。dirty の確認は presentation 側で済ませてから呼ぶ。 */
  newProject: () => void
  /** File > Save Project（FR-012 / AC-012 / §7.2）。 */
  saveProject: () => SaveProjectResult
  /** File > Open Project（FR-013 / AC-013〜015 / §7.3）。 */
  openProject: () => Promise<OpenProjectResult>
  /**
   * 初回起動時のサンプル読込（FR-015 / §7.6）。
   * Crash Recovery が無いため「store が空のとき」を初回起動とみなす。
   * 読み込んだら true、既に内容があるか読込に失敗したら false を返す。
   */
  loadSampleProjectIfEmpty: () => boolean
}

export function createProjectUseCases(
  deps: ProjectUseCasesDeps,
): ProjectUseCases {
  function replaceWith(project: WorkflowProject): void {
    useWorkflowStore.getState().replaceProject(project)
  }

  return {
    newProject: () => {
      replaceWith(createEmptyProject({ id: deps.newId(), now: deps.now() }))
    },

    saveProject: () => {
      const state = useWorkflowStore.getState()
      const metadata = { ...state.metadata, updatedAt: deps.now() }
      const project: WorkflowProject = {
        schemaVersion: SCHEMA_VERSION,
        metadata,
        viewport: state.viewport,
        nodes: state.nodes,
        edges: state.edges,
        promptSettings: state.promptSettings,
      }

      // validation に失敗したら保存しない（§7.2）
      const serialized = serializeProject(project)
      if (!serialized.ok) return 'invalid'

      deps.filePort.download(toProjectFileName(metadata.name), serialized.json)

      // 保存したファイルと store の updatedAt を揃えてから dirty を倒す
      state.setMetadata(metadata)
      state.markSaved()
      return 'saved'
    },

    openProject: async () => {
      const text = await deps.filePort.pickAndRead()
      if (text === null) return 'cancelled'

      const result = deserializeProject(text)
      // JSON.parse 失敗 / validation 失敗 / 未知の schemaVersion では
      // 既存の Canvas 状態を一切変更しない（AC-015 / §7.3）
      if (!result.ok) return 'failed'

      replaceWith(result.project)
      return 'opened'
    },

    loadSampleProjectIfEmpty: () => {
      const state = useWorkflowStore.getState()
      if (state.nodes.length > 0 || state.edges.length > 0) return false

      const result = deserializeProject(sampleProjectJson)
      if (!result.ok) return false

      replaceWith(result.project)
      return true
    },
  }
}
