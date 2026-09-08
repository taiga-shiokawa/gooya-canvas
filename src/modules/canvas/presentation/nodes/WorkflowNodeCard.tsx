import { nodeKindLabel, type WorkflowNodeKind } from '@/modules/workflow'
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { useEffect } from 'react'
import { useCanvasExportMode } from '../canvasExportMode'
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

/**
 * Export 用表示では Handle を消す（§8.3 / AC-018）。
 *
 * アンマウントではなく `visibility: hidden` にするのは、Handle の DOM が消えると
 * React Flow が持つ handleBounds の前提が崩れて Edge の描画位置が変わりうるため。
 * 見えないだけの要素は html-to-image の出力にも現れない。
 */
const HANDLE_CLASS = '!size-2 !border-2 !border-white'

export function WorkflowNodeCard({
  id,
  data,
  selected,
}: NodeProps<WorkflowCardNode>) {
  const accent = NODE_KIND_ACCENT[data.kind]
  const hasTarget = !KINDS_WITHOUT_TARGET.includes(data.kind)
  const hasSource = !KINDS_WITHOUT_SOURCE.includes(data.kind)
  const branches = data.kind === 'condition' ? data.branches : []

  // Export 用表示のあいだは Handle と選択枠を出さない（§8.3 / AC-018）。
  // transition も切る。付けたままだと選択枠が 150ms かけて消えるため、
  // 消え切る前に画像化されて枠が写り込む。
  const exportMode = useCanvasExportMode()
  const handleVisibility = exportMode ? 'invisible' : ''

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
      className={`w-56 rounded-lg border bg-white shadow-sm ${
        exportMode ? '' : 'transition-shadow'
      } ${accent.border} ${
        selected && !exportMode ? 'shadow-md ring-2 ring-slate-400' : ''
      }`}
    >
      {hasTarget ? (
        <Handle
          type="target"
          position={Position.Top}
          className={`${HANDLE_CLASS} !bg-slate-400 ${handleVisibility}`}
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
          className={`${HANDLE_CLASS} !bg-slate-400 ${handleVisibility}`}
        />
      ) : null}

      {branches.map((branch, index) => (
        <Handle
          key={branch}
          id={branch}
          type="source"
          position={Position.Bottom}
          style={{ left: sourceHandleOffset(index, branches.length) }}
          className={`${HANDLE_CLASS} !bg-violet-500 ${handleVisibility}`}
        />
      ))}
    </div>
  )
}
