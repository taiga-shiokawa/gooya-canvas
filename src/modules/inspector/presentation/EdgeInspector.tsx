import type { WorkflowEdge } from '@/modules/workflow'
import {
  updateEdgeDescription,
  updateEdgeLabel,
} from '../application/inspectorUseCases'
import { InspectorTextField } from './InspectorTextField'

// Edge 選択時の Inspector（FR-010 / docs/functional-design.md §6）。項目は Label / Description。

type EdgeInspectorProps = {
  edge: WorkflowEdge
}

export function EdgeInspector({ edge }: EdgeInspectorProps) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <InspectorTextField
        label="Label"
        value={edge.label ?? ''}
        placeholder="Yes / No / Completed / Pending"
        onChange={(value) => updateEdgeLabel(edge.id, value)}
      />
      <InspectorTextField
        label="Description"
        value={edge.data?.description ?? ''}
        placeholder="この遷移が起きる条件など"
        multiline
        onChange={(value) => updateEdgeDescription(edge.id, value)}
      />
      {edge.sourceHandle ? (
        <InspectorTextField
          label="Branch"
          value={edge.sourceHandle}
          readOnly
          hint="分岐名の変更は Condition ノードの Inspector から行います。"
        />
      ) : null}
    </div>
  )
}
