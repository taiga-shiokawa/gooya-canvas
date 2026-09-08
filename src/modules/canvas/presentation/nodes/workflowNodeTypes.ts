import { WORKFLOW_NODE_KINDS } from '@/modules/workflow'
import type { NodeTypes } from '@xyflow/react'
import { WorkflowNodeCard } from './WorkflowNodeCard'

/**
 * React Flow へ渡す nodeTypes。11 種すべてを同じ汎用カードへ割り当てる。
 *
 * **モジュールスコープの定数として定義すること。** React Flow は nodeTypes の参照が
 * 変わるたびに全ノードを再マウントするため、コンポーネント内で生成してはならない。
 */
export const workflowNodeTypes: NodeTypes = Object.fromEntries(
  WORKFLOW_NODE_KINDS.map((kind) => [kind, WorkflowNodeCard]),
)
