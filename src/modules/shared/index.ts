// shared モジュールの公開 API（docs/repository-structure.md §5.4）。
// store のフック / selector、共通 UI 部品、純ユーティリティのみを出す。
export {
  useWorkflowStore,
  type WorkflowStoreState,
} from './application/workflowStore'
