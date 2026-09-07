// workflow モジュールの公開 API（docs/repository-structure.md §5.4）。
// Domain Model 型は全モジュールが import してよい。
export {
  isWorkflowNodeKind,
  WORKFLOW_NODE_KINDS,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeKind,
  type WorkflowPosition,
} from './domain/types'
