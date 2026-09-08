import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import {
  workflowEdgeSchema,
  workflowNodeSchema,
  workflowProjectSchema,
} from './schemas'
import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowProject,
  WorkflowPromptSettings,
} from './types'
import { SCHEMA_VERSION } from './workflowProject'

// Unit テストの重点対象 1 位「Workflow Schema の受理・拒否」
// （docs/development-guidelines.md §5.1）。DOM・ブラウザ API のモックなしで動く。

const validProject: WorkflowProject = {
  schemaVersion: SCHEMA_VERSION,
  metadata: {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    name: 'Sales Report',
    description: '月次レポートの自動化',
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T01:00:00.000Z',
  },
  viewport: { x: -120, y: 40, zoom: 0.75 },
  nodes: [
    {
      id: 'a1b2c3d4-0000-4000-8000-000000000002',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: {
        title: 'Schedule',
        description: '毎朝 9:00',
        config: { system: 'Schedule', event: 'daily' },
      },
    },
    {
      id: 'a1b2c3d4-0000-4000-8000-000000000003',
      type: 'end',
      position: { x: 320, y: 0 },
      data: { title: 'Done', config: { outcome: 'Completed' }, notes: 'メモ' },
    },
  ],
  edges: [
    {
      id: 'a1b2c3d4-0000-4000-8000-000000000004',
      source: 'a1b2c3d4-0000-4000-8000-000000000002',
      target: 'a1b2c3d4-0000-4000-8000-000000000003',
      label: 'Completed',
      data: { description: '正常終了' },
    },
  ],
  promptSettings: { target: 'power-automate', language: 'ja' },
}

describe('workflowProjectSchema', () => {
  it('正しい WorkflowProject を受理する', () => {
    const result = workflowProjectSchema.safeParse(validProject)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(validProject)
  })

  it('optional なキーが無くても受理する', () => {
    const minimal = {
      schemaVersion: SCHEMA_VERSION,
      metadata: {
        id: 'id',
        name: 'Untitled Workflow',
        createdAt: '2026-09-08T00:00:00.000Z',
        updatedAt: '2026-09-08T00:00:00.000Z',
      },
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      edges: [],
    }

    expect(workflowProjectSchema.safeParse(minimal).success).toBe(true)
  })

  it('必須キーが欠けている場合は拒否する', () => {
    const withoutMetadata = {
      schemaVersion: validProject.schemaVersion,
      viewport: validProject.viewport,
      nodes: validProject.nodes,
      edges: validProject.edges,
    }

    expect(workflowProjectSchema.safeParse(withoutMetadata).success).toBe(false)
  })

  it('型が一致しない場合は拒否する', () => {
    const wrongPositionType = {
      ...validProject,
      nodes: [
        {
          ...validProject.nodes[0],
          position: { x: '0', y: 0 },
        },
      ],
    }

    expect(workflowProjectSchema.safeParse(wrongPositionType).success).toBe(
      false,
    )
  })

  it('未知の Node 種別は拒否する', () => {
    const unknownKind = {
      ...validProject,
      nodes: [{ ...validProject.nodes[0], type: 'webhook' }],
    }

    expect(workflowProjectSchema.safeParse(unknownKind).success).toBe(false)
  })

  it('未知の Prompt Target は拒否する', () => {
    const unknownTarget = {
      ...validProject,
      promptSettings: { target: 'kintone' },
    }

    expect(workflowProjectSchema.safeParse(unknownTarget).success).toBe(false)
  })

  it('オブジェクト以外は拒否する', () => {
    expect(workflowProjectSchema.safeParse(null).success).toBe(false)
    expect(workflowProjectSchema.safeParse('{}').success).toBe(false)
    expect(workflowProjectSchema.safeParse([]).success).toBe(false)
  })

  it('nodes / edges が配列でない場合は拒否する', () => {
    expect(
      workflowProjectSchema.safeParse({ ...validProject, nodes: {} }).success,
    ).toBe(false)
    expect(
      workflowProjectSchema.safeParse({ ...validProject, edges: null }).success,
    ).toBe(false)
  })
})

describe('config の後方互換（docs/functional-design.md §3.2）', () => {
  it('推奨キーに無いキーを持つ config を受理し、値を保持する', () => {
    const nodeWithUnknownConfig = {
      id: 'node-1',
      type: 'wait',
      position: { x: 0, y: 0 },
      data: {
        title: 'Wait',
        config: {
          duration: 60,
          unit: 'minutes',
          // 将来の版・他ツールが書いた未知のキー
          retryPolicy: { attempts: 3, backoff: 'exponential' },
          futureFlag: true,
        },
      },
    }

    const result = workflowNodeSchema.safeParse(nodeWithUnknownConfig)

    expect(result.success).toBe(true)
    expect(result.data?.data.config).toEqual(nodeWithUnknownConfig.data.config)
  })

  it('config が空オブジェクトでも受理する', () => {
    const result = workflowNodeSchema.safeParse({
      id: 'node-1',
      type: 'note',
      position: { x: 0, y: 0 },
      data: { title: 'Note', config: {} },
    })

    expect(result.success).toBe(true)
  })

  it('config がオブジェクトでない場合は拒否する', () => {
    const result = workflowNodeSchema.safeParse({
      id: 'node-1',
      type: 'action',
      position: { x: 0, y: 0 },
      data: { title: 'Action', config: 'none' },
    })

    expect(result.success).toBe(false)
  })
})

describe('workflowEdgeSchema', () => {
  it('sourceHandle / label を保持する（Condition 分岐。FR-010）', () => {
    const result = workflowEdgeSchema.safeParse({
      id: 'edge-1',
      source: 'condition-1',
      target: 'end-1',
      sourceHandle: 'Yes',
      label: 'Yes',
    })

    expect(result.success).toBe(true)
    expect(result.data?.sourceHandle).toBe('Yes')
    expect(result.data?.label).toBe('Yes')
  })

  it('source / target が欠けている場合は拒否する', () => {
    expect(workflowEdgeSchema.safeParse({ id: 'edge-1' }).success).toBe(false)
  })
})

describe('スキーマと型定義の一致（docs/functional-design.md §3.2）', () => {
  // tsc -b が src 配下を型検査するため、乖離すればビルドが落ちる
  it('z.infer が Domain Model の型と一致する', () => {
    expectTypeOf<
      z.infer<typeof workflowProjectSchema>
    >().toEqualTypeOf<WorkflowProject>()
    expectTypeOf<
      z.infer<typeof workflowNodeSchema>
    >().toEqualTypeOf<WorkflowNode>()
    expectTypeOf<
      z.infer<typeof workflowEdgeSchema>
    >().toEqualTypeOf<WorkflowEdge>()
    expectTypeOf<
      NonNullable<z.infer<typeof workflowProjectSchema>['promptSettings']>
    >().toEqualTypeOf<WorkflowPromptSettings>()
  })
})
