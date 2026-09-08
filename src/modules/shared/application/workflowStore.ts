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
import { temporal } from 'zundo'
import { create } from 'zustand'
import type { ReviewFinding } from '../domain/reviewFinding'
import { createHistoryGroupGate, currentHistoryGroup } from './historyGrouping'

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

/**
 * Context Menu の Edit から Inspector への「最初の入力へフォーカスしてほしい」という要求
 * （FR-004 / docs/functional-design.md §5.4）。
 *
 * canvas は inspector を import できない（repository-structure §5.1 #4）ので、
 * NodeFocusRequest と同じ形で store を経由させる。対象要素は選択状態が決めるため、
 * この要求自体は「いつ要求されたか」を表す token だけを持つ。
 */
export type InspectorFocusRequest = {
  token: number
}

/** Domain Model のグラフ部分。nodes / edges を 1 回の更新でまとめて差し替えるときに使う。 */
export type WorkflowGraphState = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// Source of Truth は Domain Model（docs/architecture.md §3.3）。
// 公開シグネチャに @xyflow/react 由来の型を出さない（NFR-010）。選択状態も ID のみを持つ。
// Undo / Redo は zundo の temporal middleware で nodes / edges だけを追跡する（§11）。
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
  inspectorFocusRequest: InspectorFocusRequest | null

  // --- 更新（各モジュールの application 層のユースケース経由で呼ぶ。presentation から直接呼ばない） ---
  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: WorkflowEdge[]) => void
  /**
   * nodes と edges を 1 回の更新で差し替える（削除・複製・Paste・分岐編集）。
   * setNodes → setEdges と 2 回に分けると Undo 履歴が 2 件になり、
   * 1 操作を戻すのに Ctrl+Z を 2 回押すことになるため、必ずこちらを使う（§11）。
   */
  setGraph: (graph: WorkflowGraphState) => void
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
  /** Context Menu の Edit から Inspector へフォーカスを要求する（FR-004 / §5.4）。 */
  requestInspectorFocus: () => void
  /** New / Open / Crash Recovery の復元。dirty を倒し選択を解除し、履歴を空にする。 */
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

/**
 * Undo 履歴の保持件数（docs/functional-design.md §11 の「（要確認）」に対する確定値）。
 *
 * 1 件が保持するのは `{ nodes, edges }` の配列 2 本だけで、要素は非破壊更新により
 * 変更のなかったものが共有される（構造共有）。100 件でも実メモリはノード数十個ぶんの
 * 参照配列にとどまるため、「作業セッション中に押し戻したい範囲」を優先して 100 とする。
 */
export const HISTORY_LIMIT = 100

/**
 * 連続入力を 1 件へまとめる時間窓（ms）。§6 の「入力 debounce」に対応する。
 * 打鍵の間隔がこれを超えたら別の編集とみなす。
 */
const HISTORY_GROUP_WINDOW_MS = 500

const historyGroupGate = createHistoryGroupGate(HISTORY_GROUP_WINDOW_MS)

const initialProject = createEmptyProject({
  id: crypto.randomUUID(),
  now: new Date().toISOString(),
})

export const useWorkflowStore = create<WorkflowStoreState>()(
  temporal(
    (set) => ({
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
      inspectorFocusRequest: null,

      setNodes: (nodes) => set({ nodes, isDirty: true }),
      setEdges: (edges) => set({ edges, isDirty: true }),
      setGraph: (graph) =>
        set({ nodes: graph.nodes, edges: graph.edges, isDirty: true }),
      setMetadata: (metadata) => set({ metadata, isDirty: true }),
      setPromptSettings: (promptSettings) =>
        set({ promptSettings, isDirty: true }),
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
      requestInspectorFocus: () =>
        set((state) => ({
          inspectorFocusRequest: {
            token: (state.inspectorFocusRequest?.token ?? 0) + 1,
          },
        })),

      replaceProject: (project) => {
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
          inspectorFocusRequest: null,
        })

        // 別プロジェクトの操作を Undo できてはいけない（§11）。
        // set より後に呼ぶ必要がある（この set 自身が積んだ 1 件も消すため）。
        clearWorkflowHistory()
      },

      markSaved: () => set({ isDirty: false }),
    }),
    {
      // 履歴の対象は nodes / edges のみ（§11）。viewport・選択状態・isDirty・
      // promptSettings・metadata・reviewFindings・nodeFocusRequest は対象外。
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      limit: HISTORY_LIMIT,
      // nodes / edges が変わっていない更新（Pan / Zoom・選択・Review 結果・dirty の
      // 上げ下げ）を履歴に積まない。更新はすべて非破壊なので参照比較で足りる。
      equality: (pastState, currentState) =>
        pastState.nodes === currentState.nodes &&
        pastState.edges === currentState.edges,
      // 1 文字ごとの Inspector 入力を 1 件にまとめる（§6 / ./historyGrouping.ts）。
      // ドラッグ移動は canvas 側がドラッグ終了時に 1 回だけ store を更新するため、
      // ここでまとめる必要はない（§11 の「1 ドラッグ = 履歴 1 件」）。
      handleSet: (handleSet) => (pastState) => {
        if (!historyGroupGate.shouldRecord(currentHistoryGroup(), Date.now()))
          return
        handleSet(pastState)
      },
    },
  ),
)

/**
 * Undo / Redo 履歴を空にする（New / Open / Crash Recovery の直後。§11）。
 * `replaceProject` から呼ばれる。`useWorkflowStore` の初期化後にしか実行されない。
 */
export function clearWorkflowHistory(): void {
  useWorkflowStore.temporal.getState().clear()
  historyGroupGate.reset()
}
