import { z } from 'zod'
import { PROMPT_TARGETS, WORKFLOW_NODE_KINDS } from './types'

// docs/functional-design.md §3.2 の型定義と同形の Zod スキーマ。
// 保存時（FR-012）・読込時（FR-013）の validation の正であり、外部契約
// `*.gooya-canvas.json`（§12）を実行時に検査する唯一の手段である（NFR-005）。
//
// types.ts の型と乖離しないことは schemas.test.ts の型検査（expectTypeOf）が担保する。
// 純 TypeScript のみ（React / @xyflow/react / ブラウザ API を持ち込まない）。

export const workflowNodeKindSchema = z.enum(WORKFLOW_NODE_KINDS)

export const promptTargetSchema = z.enum(PROMPT_TARGETS)

export const promptLanguageSchema = z.enum(['ja', 'en'])

export const workflowPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const workflowViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
})

// config は種別ごとのキーを強制しない（docs/functional-design.md §3.2 末尾）。
// 未知キーを持つファイルも読めることが後方互換の要件であり、推奨キー（§3.3）の
// 解釈は Inspector と Flow Review が行う。
export const workflowNodeConfigSchema = z.record(z.string(), z.unknown())

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: workflowNodeKindSchema,
  position: workflowPositionSchema,
  data: z.object({
    title: z.string(),
    description: z.string().optional(),
    config: workflowNodeConfigSchema,
    notes: z.string().optional(),
  }),
})

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  data: z
    .object({
      description: z.string().optional(),
    })
    .optional(),
})

export const workflowMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const workflowPromptSettingsSchema = z.object({
  target: promptTargetSchema.optional(),
  language: promptLanguageSchema.optional(),
  additionalInstructions: z.string().optional(),
})

// schemaVersion は「文字列であること」だけを検査する。現行版として受理できるかは
// migration（migrations.ts）が判定する（docs/functional-design.md §7.3 / §7.4）。
export const workflowProjectSchema = z.object({
  schemaVersion: z.string(),
  metadata: workflowMetadataSchema,
  viewport: workflowViewportSchema,
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  promptSettings: workflowPromptSettingsSchema.optional(),
})
