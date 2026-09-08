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
import type { ReviewFinding } from '../domain/reviewFinding'

/**
 * Review Panel から Canvas への「このノードへ寄ってほしい」という要求（FR-024）。
 * review は @xyflow/react を import できない（repository-structure §5.1 #5）ため、
 * 直接 Canvas を動かさず store に要求を置き、canvas がそれを購読して実行する。
 * `token` は単調増加。同じノードを続けてクリックしても新しい要求として検知させるため、
 * nodeId だけでなく token で新旧を判定する。
 */
export type NodeFocusRequest = {
  nodeId: string
  token: number
}

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
  /**
   * 直近の Flow Review の結果（docs/functional-design.md §10）。未実行なら null。
   * Domain Model ではないので保存対象にせず、変更で dirty も立てない。
   */
  reviewFindings: readonly ReviewFinding[] | null
  nodeFocusRequest: NodeFocusRequest | null

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
  /** Flow Review の実行結果を差し替える（review の application だけが呼ぶ）。 */
  setReviewFindings: (findings: readonly ReviewFinding[]) => void
  clearReviewFindings: () => void
  /** Review 結果のクリックから Canvas へフォーカスを要求する（FR-024）。 */
  requestNodeFocus: (nodeId: string) => void
  /** New / Open / Crash Recovery の復元。dirty を倒し選択を解除する。 */
  replaceProject: (project: WorkflowProject) => void
  /** 正式保存の成功時に dirty を倒す（docs/functional-design.md §7.2）。 */
  markSaved: () => void
}

/** Review 結果の selector。件数サマリは shared/domain の純関数で描画時に導出する。 */
export const selectReviewFindings = (
  state: WorkflowStoreState,
): readonly ReviewFinding[] | null => state.reviewFindings

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
  reviewFindings: null,
  nodeFocusRequest: null,

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

  setReviewFindings: (reviewFindings) => set({ reviewFindings }),
  clearReviewFindings: () => set({ reviewFindings: null }),
  requestNodeFocus: (nodeId) =>
    set((state) => ({
      nodeFocusRequest: {
        nodeId,
        token: (state.nodeFocusRequest?.token ?? 0) + 1,
      },
    })),

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
      // 別の Workflow に入れ替わった以上、前の Workflow に対する Review 結果は無効
      reviewFindings: null,
      nodeFocusRequest: null,
    }),

  markSaved: () => set({ isDirty: false }),
}))
