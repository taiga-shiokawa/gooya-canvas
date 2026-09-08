import { useWorkflowStore } from '@/modules/shared'
import {
  createEmptyProject,
  DEFAULT_PROJECT_NAME,
  SCHEMA_VERSION,
  type WorkflowEdge,
  type WorkflowNode,
} from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectFilePort } from './ports/ProjectFilePort'
import { PROJECT_FILE_EXTENSION } from './projectFileName'
import { deserializeProject } from './projectSerialization'
import { createProjectUseCases, type ProjectUseCases } from './projectUseCases'

// New / Save / Open のユースケース（docs/functional-design.md §7.1〜§7.3）。
// ProjectFilePort を差し替えるので DOM もブラウザ API も要らない。

const NOW = '2026-09-08T09:00:00.000Z'
const NEW_ID = 'generated-id'

type FakeFilePort = ProjectFilePort & {
  downloads: { name: string; json: string }[]
  /** pickAndRead が返す値。null はキャンセル。 */
  nextRead: string | null
}

function createFakeFilePort(): FakeFilePort {
  const port: FakeFilePort = {
    downloads: [],
    nextRead: null,
    download: (name, json) => {
      port.downloads.push({ name, json })
    },
    pickAndRead: () => Promise.resolve(port.nextRead),
  }
  return port
}

const nodes: WorkflowNode[] = [
  {
    id: 'node-trigger',
    type: 'trigger',
    position: { x: 10, y: 20 },
    data: { title: '面接終了', config: { system: 'Google Calendar' } },
  },
  {
    id: 'node-condition',
    type: 'condition',
    position: { x: 300, y: 180 },
    data: { title: '評価済み？', config: { branches: ['Yes', 'No'] } },
  },
  {
    id: 'node-end',
    type: 'end',
    position: { x: 620, y: 40 },
    data: { title: '完了', config: { outcome: 'Completed' } },
  },
]

const edges: WorkflowEdge[] = [
  { id: 'edge-1', source: 'node-trigger', target: 'node-condition' },
  {
    id: 'edge-2',
    source: 'node-condition',
    target: 'node-end',
    sourceHandle: 'Yes',
    label: 'Yes',
  },
]

let filePort: FakeFilePort
let useCases: ProjectUseCases

/** 編集済み（dirty）の状態を作る。 */
function seedEditedProject(name = 'Interview Flow'): void {
  const store = useWorkflowStore.getState()
  store.replaceProject({
    ...createEmptyProject({ id: 'project-1', now: '2026-09-01T00:00:00.000Z' }),
    metadata: {
      id: 'project-1',
      name,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    viewport: { x: -40, y: 12, zoom: 0.9 },
    nodes,
    edges,
    promptSettings: { target: 'power-automate', language: 'ja' },
  })
  useWorkflowStore.getState().setNodes(nodes)
}

beforeEach(() => {
  filePort = createFakeFilePort()
  useCases = createProjectUseCases({
    filePort,
    now: () => NOW,
    newId: () => NEW_ID,
  })
  useWorkflowStore
    .getState()
    .replaceProject(
      createEmptyProject({ id: 'initial', now: '2026-09-01T00:00:00.000Z' }),
    )
})

describe('newProject（FR-011 / §7.1）', () => {
  it('空のプロジェクトで store を初期化し dirty を倒す', () => {
    seedEditedProject()

    useCases.newProject()

    const state = useWorkflowStore.getState()
    expect(state.nodes).toEqual([])
    expect(state.edges).toEqual([])
    expect(state.metadata.id).toBe(NEW_ID)
    expect(state.metadata.name).toBe(DEFAULT_PROJECT_NAME)
    expect(state.metadata.createdAt).toBe(NOW)
    expect(state.isDirty).toBe(false)
  })
})

describe('saveProject（FR-012 / AC-012 / §7.2）', () => {
  it('{project-name}.gooya-canvas.json をダウンロードさせる', () => {
    seedEditedProject('Interview Flow')

    expect(useCases.saveProject()).toBe('saved')
    expect(filePort.downloads).toHaveLength(1)
    expect(filePort.downloads[0].name).toBe(
      `Interview Flow${PROJECT_FILE_EXTENSION}`,
    )
  })

  it('ファイル名に使えない文字をサニタイズする', () => {
    seedEditedProject('2026/09 面接: 評価')

    useCases.saveProject()

    expect(filePort.downloads[0].name).toBe(
      `2026 09 面接 評価${PROJECT_FILE_EXTENSION}`,
    )
  })

  it('現行 schemaVersion と更新後の updatedAt を書き出す', () => {
    seedEditedProject()

    useCases.saveProject()
    const saved = deserializeProject(filePort.downloads[0].json)

    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.project.schemaVersion).toBe(SCHEMA_VERSION)
    expect(saved.project.metadata.updatedAt).toBe(NOW)
    // createdAt は保存で書き換えない
    expect(saved.project.metadata.createdAt).toBe('2026-09-01T00:00:00.000Z')
  })

  it('保存に成功したら dirty を倒す', () => {
    seedEditedProject()
    expect(useWorkflowStore.getState().isDirty).toBe(true)

    useCases.saveProject()

    expect(useWorkflowStore.getState().isDirty).toBe(false)
    expect(useWorkflowStore.getState().metadata.updatedAt).toBe(NOW)
  })
})

describe('openProject（FR-013 / AC-013 / §7.3）', () => {
  it('保存したファイルを読み込んで Canvas を置き換える', async () => {
    seedEditedProject()
    useCases.saveProject()
    const savedJson = filePort.downloads[0].json

    // 別のプロジェクトを編集中の状態にしてから開く
    useCases.newProject()
    expect(useWorkflowStore.getState().nodes).toEqual([])

    filePort.nextRead = savedJson
    await expect(useCases.openProject()).resolves.toBe('opened')

    const state = useWorkflowStore.getState()
    expect(state.metadata.name).toBe('Interview Flow')
    expect(state.isDirty).toBe(false)
  })

  it('保存 → 読込で Node 位置・Edge・設定が一致する（AC-014）', async () => {
    seedEditedProject()
    const before = useWorkflowStore.getState()
    const beforeNodes = before.nodes
    const beforeEdges = before.edges
    const beforeViewport = before.viewport
    const beforePromptSettings = before.promptSettings

    useCases.saveProject()
    filePort.nextRead = filePort.downloads[0].json
    useCases.newProject()

    await useCases.openProject()

    const after = useWorkflowStore.getState()
    expect(after.nodes).toEqual(beforeNodes)
    expect(after.edges).toEqual(beforeEdges)
    expect(after.viewport).toEqual(beforeViewport)
    expect(after.promptSettings).toEqual(beforePromptSettings)
  })

  it('キャンセルしたら何も変更しない', async () => {
    seedEditedProject()
    const before = useWorkflowStore.getState()

    filePort.nextRead = null
    await expect(useCases.openProject()).resolves.toBe('cancelled')

    const after = useWorkflowStore.getState()
    expect(after.nodes).toBe(before.nodes)
    expect(after.metadata).toBe(before.metadata)
    expect(after.isDirty).toBe(before.isDirty)
  })
})

describe('不正なファイルを開いても Canvas を壊さない（AC-015）', () => {
  const invalidInputs: [string, string][] = [
    ['JSON として壊れている', '{ "nodes": '],
    ['空文字', ''],
    ['プロジェクトではない JSON', '{"hello":"world"}'],
    ['配列', '[]'],
    [
      '必須キーが欠けている',
      JSON.stringify({ schemaVersion: '1.0', nodes: [], edges: [] }),
    ],
    [
      '型が一致しない',
      JSON.stringify({
        schemaVersion: '1.0',
        metadata: {
          id: 'x',
          name: 'x',
          createdAt: 'x',
          updatedAt: 'x',
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          { id: 'n', type: 'trigger', position: 'top', data: { title: 't' } },
        ],
        edges: [],
      }),
    ],
    [
      '現行版より新しい schemaVersion',
      JSON.stringify({
        schemaVersion: '9.9',
        metadata: {
          id: 'x',
          name: 'x',
          createdAt: 'x',
          updatedAt: 'x',
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [],
        edges: [],
      }),
    ],
  ]

  it.each(invalidInputs)(
    '%s → failed を返し store を変更しない',
    async (_label, input) => {
      seedEditedProject()
      const before = useWorkflowStore.getState()

      filePort.nextRead = input
      await expect(useCases.openProject()).resolves.toBe('failed')

      const after = useWorkflowStore.getState()
      // 参照ごと変わっていないことまで確認する（部分的な書き換えも起きていない）
      expect(after.nodes).toBe(before.nodes)
      expect(after.edges).toBe(before.edges)
      expect(after.metadata).toBe(before.metadata)
      expect(after.viewport).toBe(before.viewport)
      expect(after.promptSettings).toBe(before.promptSettings)
      expect(after.isDirty).toBe(before.isDirty)
    },
  )
})

describe('loadSampleProjectIfEmpty（FR-015 / §7.6）', () => {
  it('store が空ならサンプルを読み込む', () => {
    expect(useCases.loadSampleProjectIfEmpty()).toBe(true)

    const state = useWorkflowStore.getState()
    expect(state.metadata.name).toBe('Interview Evaluation Reminder')
    expect(state.nodes.length).toBeGreaterThan(0)
    expect(state.edges.length).toBeGreaterThan(0)
    // 読み込んだ直後は未編集
    expect(state.isDirty).toBe(false)
  })

  it('既に内容があれば何もしない（2 回目の呼び出しを含む）', () => {
    useCases.loadSampleProjectIfEmpty()
    const loaded = useWorkflowStore.getState().nodes

    expect(useCases.loadSampleProjectIfEmpty()).toBe(false)
    expect(useWorkflowStore.getState().nodes).toBe(loaded)
  })

  it('編集中のプロジェクトを上書きしない', () => {
    seedEditedProject()

    expect(useCases.loadSampleProjectIfEmpty()).toBe(false)
    expect(useWorkflowStore.getState().metadata.name).toBe('Interview Flow')
  })

  it('読み込んだサンプルをそのまま保存できる', () => {
    useCases.loadSampleProjectIfEmpty()

    expect(useCases.saveProject()).toBe('saved')
    expect(filePort.downloads[0].name).toBe(
      `Interview Evaluation Reminder${PROJECT_FILE_EXTENSION}`,
    )
  })
})
