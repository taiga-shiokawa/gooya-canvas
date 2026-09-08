import { useWorkflowStore } from '@/modules/shared'
import { useEffect, useRef } from 'react'
import { EdgeInspector } from './EdgeInspector'
import { NodeInspector } from './NodeInspector'

// 右ペイン本体（FR-009 / docs/functional-design.md §4.1 / §6）。
// 選択状態は store が所有し（§2.4。Phase 3 で canvas から移管）、ここは購読するだけ。
// 編集できるのは単一選択のときだけとする。複数選択時の一括編集は機能設計に定義が無く、
// 「どの要素を編集しているか」が曖昧なまま値を書き換えるほうが危険なため、件数表示に留める。

function InspectorMessage({ children }: { children: string }) {
  return <p className="p-3 text-xs text-slate-500">{children}</p>
}

/** 編集できる最初の入力（Node なら Name、Edge なら Label）。読み取り専用項目は飛ばす。 */
const FIRST_FIELD_SELECTOR =
  'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'

export function Inspector() {
  const selectedNodeIds = useWorkflowStore((state) => state.selectedNodeIds)
  const selectedEdgeId = useWorkflowStore((state) => state.selectedEdgeId)
  const nodes = useWorkflowStore((state) => state.nodes)
  const edges = useWorkflowStore((state) => state.edges)

  // Context Menu の Edit（FR-004 / §5.4）。canvas は inspector を import できないので
  // 要求は store 経由で届く（NodeFocusRequest と同じ形）。要求のたびに token が増える。
  const focusToken = useWorkflowStore(
    (state) => state.inspectorFocusRequest?.token ?? 0,
  )
  const fieldsRef = useRef<HTMLDivElement>(null)

  const selectionCount = selectedNodeIds.length + (selectedEdgeId ? 1 : 0)
  const selectedNode =
    selectionCount === 1
      ? nodes.find((node) => node.id === selectedNodeIds[0])
      : undefined
  const selectedEdge =
    selectionCount === 1
      ? edges.find((edge) => edge.id === selectedEdgeId)
      : undefined

  // 選択の反映と要求は同じ更新で届くため、この effect が走る時点で対象のフォームは
  // 描画済み（子の mount 後に親の effect が走る）。初期値 0 は「要求なし」。
  useEffect(() => {
    if (focusToken === 0) return

    const field = fieldsRef.current?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(FIRST_FIELD_SELECTOR)
    field?.focus()
    // すぐ打ち直せるよう全選択する（Edit で開いた直後の主目的は名前の付け替え）
    field?.select()
  }, [focusToken])

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Inspector
      </h2>

      {selectionCount === 0 ? (
        <InspectorMessage>
          ノードまたは Edge を選択してください。
        </InspectorMessage>
      ) : null}

      {selectionCount > 1 ? (
        <InspectorMessage>
          {`${selectionCount} 個の要素を選択中です。編集するには 1 つだけ選択してください。`}
        </InspectorMessage>
      ) : null}

      {/* 選択が変わったら編集中のローカル状態（分岐名の下書き）を破棄する */}
      <div ref={fieldsRef}>
        {selectedNode ? (
          <NodeInspector key={selectedNode.id} node={selectedNode} />
        ) : null}
        {selectedEdge ? (
          <EdgeInspector key={selectedEdge.id} edge={selectedEdge} />
        ) : null}
      </div>
    </aside>
  )
}
