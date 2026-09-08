import {
  createEmptyProject,
  DEFAULT_VIEWPORT,
  type WorkflowEdge,
  type WorkflowMetadata,
  type WorkflowNode,
  type WorkflowProject,
  type WorkflowPromptSettings,
  type WorkflowViewport,
} from '@/modules/workflow'
import { create } from 'zustand'

// Source of Truth は Domain Model（docs/architecture.md §3.3）。
// 公開シグネチャに @xyflow/react 由来の型を出さない（NFR-010）。選択状態も ID のみを持つ。
// Undo / Redo（zundo の temporal middleware）は Phase 8 で適用する。
export type WorkflowStoreState = {
  // --- Domain Model（プロジェクトファイルへ保存される） ---
  metadata: WorkflowMetadata
  viewport: WorkflowViewport
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  promptSettings: WorkflowPromptSettings

  // --- UI 状態（保存対象外。docs/functional-design.md §2.4） ---
  isDirty: boolean
  selectedNodeIds: readonly string[]
  selectedEdgeId: string | null

  // --- 更新（各モジュールの application 層のユースケース経由で呼ぶ。presentation から直接呼ばない） ---
  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: WorkflowEdge[]) => void
  setMetadata: (metadata: WorkflowMetadata) => void
  setPromptSettings: (promptSettings: WorkflowPromptSettings) => void
  setViewport: (viewport: WorkflowViewport) => void
  setSelection: (selection: {
    nodeIds: readonly string[]
    edgeId: string | null
  }) => void
  /** New / Open / Crash Recovery の復元。dirty を倒し選択を解除する。 */
  replaceProject: (project: WorkflowProject) => void
  /** 正式保存の成功時に dirty を倒す（docs/functional-design.md §7.2）。 */
  markSaved: () => void
}

// dirty の判定規則（docs/functional-design.md §2.4）:
// nodes / edges / metadata / promptSettings の変更で立て、viewport と選択状態では立てない。
// Pan / Zoom のたびに未保存インジケータが点くのを避けるためであり、Viewport を Undo 履歴の
// 対象外とする §11 の方針とも一貫する。

const initialProject = createEmptyProject({
  id: crypto.randomUUID(),
  now: new Date().toISOString(),
})

export const useWorkflowStore = create<WorkflowStoreState>((set) => ({
  metadata: initialProject.metadata,
  viewport: initialProject.viewport,
  nodes: initialProject.nodes,
  edges: initialProject.edges,
  promptSettings: initialProject.promptSettings ?? {},

  isDirty: false,
  selectedNodeIds: [],
  selectedEdgeId: null,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  setMetadata: (metadata) => set({ metadata, isDirty: true }),
  setPromptSettings: (promptSettings) => set({ promptSettings, isDirty: true }),
  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) =>
    set({
      selectedNodeIds: selection.nodeIds,
      selectedEdgeId: selection.edgeId,
    }),

  replaceProject: (project) =>
    set({
      metadata: project.metadata,
      viewport: project.viewport ?? DEFAULT_VIEWPORT,
      nodes: project.nodes,
      edges: project.edges,
      promptSettings: project.promptSettings ?? {},
      isDirty: false,
      selectedNodeIds: [],
      selectedEdgeId: null,
    }),

  markSaved: () => set({ isDirty: false }),
}))
