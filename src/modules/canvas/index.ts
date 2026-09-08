// canvas モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使う presentation のみを出す。
// @xyflow/react 由来の型は公開しない（NFR-010）。
export {
  canvasEditCommands,
  type CanvasEditCommands,
} from './presentation/canvasEditCommands'
export {
  canvasExportSource,
  type CanvasExportBounds,
  type CanvasExportSource,
} from './presentation/canvasExportSource'
export { NodePalette } from './presentation/NodePalette'
export {
  NodeReferencePanel,
  type NodeReferencePanelProps,
} from './presentation/NodeReferencePanel'
export { WorkflowCanvas } from './presentation/WorkflowCanvas'
