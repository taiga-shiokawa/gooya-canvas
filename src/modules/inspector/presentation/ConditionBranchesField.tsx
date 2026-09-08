import {
  conditionBranches,
  MIN_CONDITION_BRANCHES,
  type WorkflowNode,
} from '@/modules/workflow'
import { useState, type KeyboardEvent } from 'react'
import {
  addConditionBranch,
  removeConditionBranch,
  renameConditionBranch,
} from '../application/inspectorUseCases'

// Condition の分岐編集（FR-010 / docs/functional-design.md §5.3）。
// 分岐名は Edge の sourceHandle でもあるため、1 打鍵ごとに確定させると入力途中の
// 空文字や重複で Edge が壊れる。ここだけは編集中の値をローカルに持ち、blur / Enter で
// 確定する（Phase 8 で Undo 履歴 1 件にまとめる単位ともそのまま一致する）。

type ConditionBranchesFieldProps = {
  node: WorkflowNode
}

export function ConditionBranchesField({ node }: ConditionBranchesFieldProps) {
  const branches = conditionBranches(node)
  const [draft, setDraft] = useState<{ index: number; value: string } | null>(
    null,
  )
  const canRemove = branches.length > MIN_CONDITION_BRANCHES

  const commit = () => {
    if (draft) renameConditionBranch(node.id, draft.index, draft.value)
    setDraft(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }
    if (event.key === 'Escape') {
      setDraft(null)
      event.currentTarget.blur()
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">Branches</span>

      {branches.map((branch, index) => (
        <div key={`${index}-${branch}`} className="flex items-center gap-1.5">
          <input
            type="text"
            value={draft?.index === index ? draft.value : branch}
            onChange={(event) => setDraft({ index, value: event.target.value })}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            aria-label={`Branch ${index + 1}`}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeConditionBranch(node.id, index)}
            disabled={!canRemove}
            title={
              canRemove
                ? 'この分岐を削除（接続中の Edge も削除されます）'
                : `分岐は最低 ${MIN_CONDITION_BRANCHES} つ必要です`
            }
            aria-label={`${branch} を削除`}
            className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => addConditionBranch(node.id)}
        className="self-start rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-100"
      >
        + 分岐を追加
      </button>

      <p className="text-[11px] text-slate-500">
        分岐名は Edge の接続点と対応します。名前を変えると接続中の Edge
        が追随し、分岐を削除するとその Edge も削除されます。
      </p>
    </div>
  )
}
