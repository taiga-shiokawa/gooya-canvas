import { useWorkflowStore } from '@/modules/shared'
import { EdgeInspector } from './EdgeInspector'
import { NodeInspector } from './NodeInspector'

// 右ペイン本体（FR-009 / docs/functional-design.md §4.1 / §6）。
// 選択状態は store が所有し（§2.4。Phase 3 で canvas から移管）、ここは購読するだけ。
// 編集できるのは単一選択のときだけとする。複数選択時の一括編集は機能設計に定義が無く、
// 「どの要素を編集しているか」が曖昧なまま値を書き換えるほうが危険なため、件数表示に留める。

function InspectorMessage({ children }: { children: string }) {
  return <p className="p-3 text-xs text-slate-500">{children}</p>
}

export function Inspector() {
  const selectedNodeIds = useWorkflowStore((state) => state.selectedNodeIds)
  const selectedEdgeId = useWorkflowStore((state) => state.selectedEdgeId)
  const nodes = useWorkflowStore((state) => state.nodes)
  const edges = useWorkflowStore((state) => state.edges)

  const selectionCount = selectedNodeIds.length + (selectedEdgeId ? 1 : 0)
  const selectedNode =
    selectionCount === 1
      ? nodes.find((node) => node.id === selectedNodeIds[0])
      : undefined
  const selectedEdge =
    selectionCount === 1
      ? edges.find((edge) => edge.id === selectedEdgeId)
      : undefined

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
      {selectedNode ? (
        <NodeInspector key={selectedNode.id} node={selectedNode} />
      ) : null}
      {selectedEdge ? (
        <EdgeInspector key={selectedEdge.id} edge={selectedEdge} />
      ) : null}
    </aside>
  )
}
