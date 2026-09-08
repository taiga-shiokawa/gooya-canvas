import { SCHEMA_VERSION, type WorkflowProject } from '@/modules/workflow'
import { describe, expect, it } from 'vitest'
import sampleProjectJson from '../assets/samples/interview-evaluation-reminder.gooya-canvas.json?raw'
import { deserializeProject, serializeProject } from './projectSerialization'

// Unit テストの重点対象 2 位「serialization / deserialization」
// （docs/development-guidelines.md §5.1）。DOM を使わない。

const project: WorkflowProject = {
  schemaVersion: SCHEMA_VERSION,
  metadata: {
    id: 'project-1',
    name: 'Roundtrip',
    description: '保存 → 読込で一致することを確かめる',
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T02:34:56.000Z',
  },
  viewport: { x: -128.5, y: 64.25, zoom: 0.8 },
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      position: { x: 12.5, y: -40 },
      data: {
        title: '面接終了',
        description: 'Google Calendar',
        config: { system: 'Google Calendar', event: 'ended' },
      },
    },
    {
      id: 'node-condition',
      type: 'condition',
      position: { x: 320, y: 160 },
      data: {
        title: '評価済み？',
        config: { branches: ['Yes', 'No'], nested: { deep: [1, 2, 3] } },
        notes: '分岐は Inspector から変更できる',
      },
    },
    {
      id: 'node-end',
      type: 'end',
      position: { x: 640, y: 0 },
      data: { title: '完了', config: { outcome: 'Completed' } },
    },
  ],
  edges: [
    {
      id: 'edge-yes',
      source: 'node-condition',
      target: 'node-end',
      sourceHandle: 'Yes',
      label: 'Yes',
      data: { description: '入力済みなら終了' },
    },
    {
      id: 'edge-trigger',
      source: 'node-trigger',
      target: 'node-condition',
    },
  ],
  promptSettings: {
    target: 'power-automate',
    language: 'ja',
    additionalInstructions: '冪等に実装すること',
  },
}

describe('serializeProject', () => {
  it('検証済みのプロジェクトを JSON 文字列にする', () => {
    const result = serializeProject(project)

    expect(result.ok).toBe(true)
    expect(result.ok && JSON.parse(result.json)).toEqual(project)
  })

  it('スキーマに合わないプロジェクトは保存用の JSON にしない（§7.2）', () => {
    // NaN は静的には number だが JSON では表現できない（stringify で null になる）。
    // 保存前 validation が無ければ壊れたファイルを書き出してしまう典型例。
    const broken: WorkflowProject = {
      ...project,
      viewport: { ...project.viewport, zoom: Number.NaN },
    }

    expect(serializeProject(broken)).toEqual({
      ok: false,
      reason: 'invalid-schema',
    })
  })
})

describe('保存 → 読込のラウンドトリップ（AC-014）', () => {
  it('Node 位置・Edge・設定が完全に一致する', () => {
    const serialized = serializeProject(project)
    expect(serialized.ok).toBe(true)
    if (!serialized.ok) return

    const restored = deserializeProject(serialized.json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return

    expect(restored.project).toEqual(project)
    expect(restored.project.nodes.map((node) => node.position)).toEqual(
      project.nodes.map((node) => node.position),
    )
    expect(restored.project.edges).toEqual(project.edges)
    expect(restored.project.viewport).toEqual(project.viewport)
    expect(restored.project.promptSettings).toEqual(project.promptSettings)
  })

  it('config の未知キー・入れ子の値を失わない', () => {
    const serialized = serializeProject(project)
    if (!serialized.ok) throw new Error('serialize failed')

    const restored = deserializeProject(serialized.json)
    if (!restored.ok) throw new Error('deserialize failed')

    expect(restored.project.nodes[1].data.config).toEqual({
      branches: ['Yes', 'No'],
      nested: { deep: [1, 2, 3] },
    })
  })

  it('2 回往復しても同じ JSON になる（決定論的）', () => {
    const first = serializeProject(project)
    if (!first.ok) throw new Error('serialize failed')

    const restored = deserializeProject(first.json)
    if (!restored.ok) throw new Error('deserialize failed')

    const second = serializeProject(restored.project)
    expect(second.ok && second.json).toBe(first.json)
  })
})

describe('deserializeProject の異常系（AC-015 / §7.3）', () => {
  it('JSON として壊れている文字列を拒否する', () => {
    expect(deserializeProject('{ nodes: [')).toEqual({
      ok: false,
      reason: 'invalid-json',
    })
    expect(deserializeProject('')).toEqual({
      ok: false,
      reason: 'invalid-json',
    })
  })

  it('JSON ではあるがプロジェクトでないものを拒否する', () => {
    expect(deserializeProject('{"hello":"world"}')).toEqual({
      ok: false,
      reason: 'invalid-schema',
    })
    expect(deserializeProject('[]')).toEqual({
      ok: false,
      reason: 'invalid-schema',
    })
    expect(deserializeProject('null')).toEqual({
      ok: false,
      reason: 'invalid-schema',
    })
  })

  it('必須キーが欠けたプロジェクトを拒否する', () => {
    const withoutViewport = {
      schemaVersion: project.schemaVersion,
      metadata: project.metadata,
      nodes: project.nodes,
      edges: project.edges,
    }

    expect(deserializeProject(JSON.stringify(withoutViewport))).toEqual({
      ok: false,
      reason: 'invalid-schema',
    })
  })

  it('現行版より新しい schemaVersion を拒否する（§7.4）', () => {
    const future = JSON.stringify({ ...project, schemaVersion: '2.0' })

    expect(deserializeProject(future)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    })
  })
})

describe('バンドルしたサンプル（FR-015 / §7.6）', () => {
  it('通常の Open と同じ経路（Zod validation → migration）を通る', () => {
    const result = deserializeProject(sampleProjectJson)

    expect(result.ok).toBe(true)
  })

  it('Interview Evaluation Reminder のフロー構造を持つ', () => {
    const result = deserializeProject(sampleProjectJson)
    if (!result.ok) throw new Error('sample is invalid')

    const { nodes, edges } = result.project
    const kinds = nodes.map((node) => node.type)

    expect(result.project.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.project.metadata.name).toBe('Interview Evaluation Reminder')
    expect(kinds).toContain('trigger')
    expect(kinds.filter((kind) => kind === 'condition')).toHaveLength(2)
    expect(kinds.filter((kind) => kind === 'notification')).toHaveLength(2)
    expect(kinds.filter((kind) => kind === 'wait')).toHaveLength(2)
    expect(kinds.filter((kind) => kind === 'end')).toHaveLength(3)

    // Condition の分岐が Edge の sourceHandle / label と対応する（FR-010）
    for (const condition of nodes.filter((node) => node.type === 'condition')) {
      const outgoing = edges.filter((edge) => edge.source === condition.id)
      expect(outgoing.map((edge) => edge.sourceHandle).sort()).toEqual([
        'No',
        'Yes',
      ])
      expect(outgoing.map((edge) => edge.label).sort()).toEqual(['No', 'Yes'])
    }

    // Edge の両端が実在するノードを指す
    const ids = new Set(nodes.map((node) => node.id))
    for (const edge of edges) {
      expect(ids.has(edge.source)).toBe(true)
      expect(ids.has(edge.target)).toBe(true)
    }

    // note は接続しない（docs/functional-design.md §5.2）
    const noteIds = nodes
      .filter((node) => node.type === 'note')
      .map((node) => node.id)
    for (const edge of edges) {
      expect(noteIds).not.toContain(edge.source)
      expect(noteIds).not.toContain(edge.target)
    }
  })

  it('ノードの座標が重ならない', () => {
    const result = deserializeProject(sampleProjectJson)
    if (!result.ok) throw new Error('sample is invalid')

    const positions = result.project.nodes.map(
      (node) => `${node.position.x},${node.position.y}`,
    )

    expect(new Set(positions).size).toBe(positions.length)
  })
})
