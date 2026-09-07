import type { WorkflowEdge, WorkflowNode } from '@/modules/workflow'
import { create } from 'zustand'

// Source of Truth は Domain Model（docs/architecture.md §3.3）。
// 公開シグネチャに @xyflow/react 由来の型を出さない（NFR-010）。
// metadata / 選択状態 / dirty などの slice は各フェーズで追加する。
// Undo / Redo（zundo の temporal middleware）は Phase 8 で適用する。
export type WorkflowStoreState = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  /** 更新は canvas/application のユースケース経由で行う（presentation から直接呼ばない）。 */
  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: WorkflowEdge[]) => void
}

export const useWorkflowStore = create<WorkflowStoreState>((set) => ({
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}))
