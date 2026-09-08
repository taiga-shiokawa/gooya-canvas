import { nodeKindLabel, type WorkflowNode } from '@/modules/workflow'
import { updateNodeConfigText } from '../application/inspectorUseCases'
import { ConditionBranchesField } from './ConditionBranchesField'
import { InspectorTextField } from './InspectorTextField'
import { configText, nodeConfigFields } from './nodeConfigFields'
import { WaitDurationField } from './WaitDurationField'

// Node Type 別フォーム（docs/functional-design.md §6）。
// 単純なテキスト項目は nodeConfigFields の表からデータ駆動で描画し、
// 単純な入力に収まらない Condition の分岐と Wait の duration + unit だけを専用部品に委ねる。

type NodeConfigFormProps = {
  node: WorkflowNode
}

export function NodeConfigForm({ node }: NodeConfigFormProps) {
  const fields = nodeConfigFields(node.type)
  const hasCustomField = node.type === 'condition' || node.type === 'wait'

  // note は config を持たない（title / notes のみ使用）
  if (fields.length === 0 && !hasCustomField) return null

  return (
    <section className="flex flex-col gap-3 border-t border-slate-200 pt-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {nodeKindLabel(node.type)} Settings
      </h3>

      {node.type === 'condition' ? (
        <ConditionBranchesField node={node} />
      ) : null}
      {node.type === 'wait' ? <WaitDurationField node={node} /> : null}

      {fields.map((field) => (
        <InspectorTextField
          key={field.key}
          label={field.label}
          value={configText(node.data.config, field.key)}
          placeholder={field.placeholder}
          suggestions={field.suggestions}
          multiline={field.control === 'textarea'}
          onChange={(value) => updateNodeConfigText(node.id, field.key, value)}
        />
      ))}
    </section>
  )
}
