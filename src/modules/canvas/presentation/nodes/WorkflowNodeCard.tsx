import { nodeKindLabel, type WorkflowNodeKind } from '@/modules/workflow'
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { useEffect } from 'react'
import { NODE_KIND_ACCENT } from './nodeKindAccent'
import { NodeKindIcon } from './nodeKindIcon'
import type { WorkflowNodeCardData } from './workflowNodeCardData'

// 11 種すべてに登録する汎用カード（FR-008）。種別差は
// アイコン・アクセント色・Handle 構成の 3 点だけなので、コンポーネントは 1 つで足りる。
// 表示するのは icon / node type / title / short description のみ。詳細は Inspector に委ねる。

export type WorkflowCardNode = Node<WorkflowNodeCardData, WorkflowNodeKind>

/** Handle 構成は docs/functional-design.md §5.2 の incoming / outgoing 表から決まる。 */
const KINDS_WITHOUT_TARGET: readonly WorkflowNodeKind[] = ['trigger', 'note']
const KINDS_WITHOUT_SOURCE: readonly WorkflowNodeKind[] = ['end', 'note']

/** Source Handle の水平位置（%）。Condition は分岐ラベル帯のセル中央へ揃える。 */
function sourceHandleOffset(index: number, count: number): string {
  return `${((index + 0.5) / count) * 100}%`
}

export function WorkflowNodeCard({
  id,
  data,
  selected,
}: NodeProps<WorkflowCardNode>) {
  const accent = NODE_KIND_ACCENT[data.kind]
  const hasTarget = !KINDS_WITHOUT_TARGET.includes(data.kind)
  const hasSource = !KINDS_WITHOUT_SOURCE.includes(data.kind)
  const branches = data.kind === 'condition' ? data.branches : []

  // Inspector から分岐を追加・削除・リネームすると Handle の id と位置が変わる。
  // React Flow が handleBounds を再計算するのは type / handle position の変更と
  // リサイズ検知時だけなので、分岐の変更は自分で通知しないと Edge が旧位置のまま描画される。
  // 改行区切りで結合し、["A B"] と ["A","B"] を取り違えないようにする。
  const updateNodeInternals = useUpdateNodeInternals()
  const branchKey = branches.join('\n')
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, branchKey, updateNodeInternals])

  return (
    <div
      className={`w-56 rounded-lg border bg-white shadow-sm transition-shadow ${accent.border} ${
        selected ? 'shadow-md ring-2 ring-slate-400' : ''
      }`}
    >
      {hasTarget ? (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2 !border-2 !border-white !bg-slate-400"
        />
      ) : null}

      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded ${accent.chip}`}
        >
          <NodeKindIcon kind={data.kind} className="size-4" />
        </span>
        <span
          className={`text-[10px] font-semibold tracking-wider uppercase ${accent.label}`}
        >
          {nodeKindLabel(data.kind)}
        </span>
      </div>

      <div className="px-3 pt-1 pb-2.5">
        <p className="truncate text-sm font-medium text-slate-900">
          {data.title}
        </p>
        {data.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
            {data.description}
          </p>
        ) : null}
      </div>

      {branches.length > 0 ? (
        <div className="flex border-t border-slate-200">
          {branches.map((branch) => (
            <span
              key={branch}
              className="flex-1 truncate border-r border-slate-100 px-1.5 py-1 text-center text-[10px] text-slate-500 last:border-r-0"
              title={branch}
            >
              {branch}
            </span>
          ))}
        </div>
      ) : null}

      {hasSource && branches.length === 0 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2 !border-2 !border-white !bg-slate-400"
        />
      ) : null}

      {branches.map((branch, index) => (
        <Handle
          key={branch}
          id={branch}
          type="source"
          position={Position.Bottom}
          style={{ left: sourceHandleOffset(index, branches.length) }}
          className="!size-2 !border-2 !border-white !bg-violet-500"
        />
      ))}
    </div>
  )
}
