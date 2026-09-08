import { nodeKindLabel, type WorkflowNode } from '@/modules/workflow'
import { updateNodeText } from '../application/inspectorUseCases'
import { InspectorTextField } from './InspectorTextField'
import { NodeConfigForm } from './NodeConfigForm'

// Node 選択時の Inspector（FR-009 / docs/functional-design.md §6）。
// 共通項目 = Name / Description / Node Type（読み取り専用）/ Notes。その下に種別別フォーム。

type NodeInspectorProps = {
  node: WorkflowNode
}

export function NodeInspector({ node }: NodeInspectorProps) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <InspectorTextField
        label="Name"
        value={node.data.title}
        placeholder="ノード名"
        onChange={(value) => updateNodeText(node.id, 'title', value)}
      />
      <InspectorTextField
        label="Description"
        value={node.data.description ?? ''}
        placeholder="このノードで何をするか"
        multiline
        onChange={(value) => updateNodeText(node.id, 'description', value)}
      />
      <InspectorTextField
        label="Node Type"
        value={nodeKindLabel(node.type)}
        readOnly
      />
      <InspectorTextField
        label="Notes"
        value={node.data.notes ?? ''}
        placeholder="設計上の補足（Prompt にコメントとして出力されます）"
        multiline
        onChange={(value) => updateNodeText(node.id, 'notes', value)}
      />

      <NodeConfigForm node={node} />

      {/* NFR-002 / docs/functional-design.md §3.3 末尾 */}
      <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800">
        API Key・Password・Access Token・Webhook Secret
        などの秘密情報は入力しないでください。「Authentication: OAuth required」
        のような設計情報のみを記載します。
      </p>
    </div>
  )
}
