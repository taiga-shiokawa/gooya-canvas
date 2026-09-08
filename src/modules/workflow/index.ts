// workflow モジュールの公開 API（docs/repository-structure.md §5.4）。
// Domain Model 型・ノード種別カタログ・接続ルール・migration 適用関数は全モジュールが import してよい。
export {
  addConditionBranch,
  MIN_CONDITION_BRANCHES,
  removeConditionBranch,
  renameConditionBranch,
  type WorkflowGraph,
} from './domain/conditionBranchEditing'
export {
  canConnect,
  type ConnectionCandidate,
  type ConnectionCheck,
} from './domain/connectionRules'
export {
  duplicateSubgraph,
  extractSubgraph,
  type DuplicateSubgraphOptions,
} from './domain/graphDuplication'
export {
  migrateProject,
  SCHEMA_MIGRATIONS,
  type MigrateProjectResult,
  type SchemaMigration,
} from './domain/migrations'
export {
  conditionBranches,
  createDefaultNodeData,
  DEFAULT_CONDITION_BRANCHES,
  NODE_CONFIG_KEYS,
  nodeKindLabel,
} from './domain/nodeCatalog'
export {
  CONNECTION_RULES,
  findNodeKindReference,
  NODE_KIND_REFERENCES,
  type NodeConfigKeyReference,
  type NodeKindReference,
} from './domain/nodeReference'
export {
  promptLanguageSchema,
  promptTargetSchema,
  workflowEdgeSchema,
  workflowMetadataSchema,
  workflowNodeConfigSchema,
  workflowNodeKindSchema,
  workflowNodeSchema,
  workflowPositionSchema,
  workflowProjectSchema,
  workflowPromptSettingsSchema,
  workflowViewportSchema,
} from './domain/schemas'
export {
  isPromptTarget,
  isWorkflowNodeKind,
  PROMPT_TARGETS,
  WORKFLOW_NODE_KINDS,
  type PromptLanguage,
  type PromptTarget,
  type WorkflowEdge,
  type WorkflowMetadata,
  type WorkflowNode,
  type WorkflowNodeKind,
  type WorkflowPosition,
  type WorkflowProject,
  type WorkflowPromptSettings,
  type WorkflowViewport,
} from './domain/types'
export {
  createEmptyProject,
  DEFAULT_PROJECT_NAME,
  DEFAULT_VIEWPORT,
  SCHEMA_VERSION,
} from './domain/workflowProject'
