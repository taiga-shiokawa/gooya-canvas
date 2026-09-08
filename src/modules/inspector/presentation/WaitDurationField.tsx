import type { WorkflowNode } from '@/modules/workflow'
import {
  updateNodeConfigNumber,
  updateNodeConfigText,
} from '../application/inspectorUseCases'
import { InspectorTextField } from './InspectorTextField'
import { configText } from './nodeConfigFields'

// Wait の duration + unit（docs/functional-design.md §3.3 / §6）。
// 数値と単位の 2 項目で 1 つの待機時間を表すため、データ駆動のテキスト項目ではなく
// 1 行に組んだ専用フォームにする。unit は「minutes / hours 等」と例示なので候補付きの自由入力。

const UNIT_SUGGESTIONS = ['minutes', 'hours', 'days', 'business days'] as const

type WaitDurationFieldProps = {
  node: WorkflowNode
}

export function WaitDurationField({ node }: WaitDurationFieldProps) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-20 shrink-0">
        <InspectorTextField
          label="Duration"
          value={configText(node.data.config, 'duration')}
          numeric
          onChange={(value) =>
            updateNodeConfigNumber(node.id, 'duration', value)
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <InspectorTextField
          label="Unit"
          value={configText(node.data.config, 'unit')}
          suggestions={UNIT_SUGGESTIONS}
          onChange={(value) => updateNodeConfigText(node.id, 'unit', value)}
        />
      </div>
    </div>
  )
}
