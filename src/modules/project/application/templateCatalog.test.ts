import { describe, expect, it } from 'vitest'
import { deserializeProject } from './projectSerialization'
import {
  findWorkflowTemplate,
  groupTemplatesByCategory,
  REFERENCE_TEMPLATE_ID,
  WORKFLOW_TEMPLATE_CATEGORIES,
  WORKFLOW_TEMPLATES,
} from './templateCatalog'

// テンプレートカタログ（.steering/20260908-workflow-templates/design.md §2.2）。
// 同梱 JSON が Open と同じ経路（JSON.parse → Zod → migration）を通ることと、
// カタログのメタデータが JSON の中身と乖離していないことを機械的に確認する。

describe('WORKFLOW_TEMPLATES', () => {
  it('第 1 弾の 5 本が登録されている（TP-7）', () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(5)
  })

  it('id が重複していない', () => {
    const ids = WORKFLOW_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(WORKFLOW_TEMPLATES.map((template) => [template.id, template]))(
    '%s は deserialize できる（TP-8）',
    (_id, template) => {
      const result = deserializeProject(template.json)
      expect(result.ok).toBe(true)
    },
  )

  it.each(WORKFLOW_TEMPLATES.map((template) => [template.id, template]))(
    '%s の target が JSON の promptSettings.target と一致する',
    (_id, template) => {
      const result = deserializeProject(template.json)
      if (!result.ok) throw new Error('deserialize に失敗した')

      expect(result.project.promptSettings?.target).toBe(template.target)
    },
  )

  it.each(WORKFLOW_TEMPLATES.map((template) => [template.id, template]))(
    '%s の name が JSON の metadata.name と一致する',
    (_id, template) => {
      const result = deserializeProject(template.json)
      if (!result.ok) throw new Error('deserialize に失敗した')

      expect(result.project.metadata.name).toBe(template.name)
    },
  )

  it.each(WORKFLOW_TEMPLATES.map((template) => [template.id, template]))(
    '%s は Node と Edge を持ち、Edge の端点がすべて存在する',
    (_id, template) => {
      const result = deserializeProject(template.json)
      if (!result.ok) throw new Error('deserialize に失敗した')

      const { nodes, edges } = result.project
      expect(nodes.length).toBeGreaterThan(0)
      expect(edges.length).toBeGreaterThan(0)

      const nodeIds = new Set(nodes.map((node) => node.id))
      for (const edge of edges) {
        expect(nodeIds).toContain(edge.source)
        expect(nodeIds).toContain(edge.target)
      }
    },
  )

  it.each(WORKFLOW_TEMPLATES.map((template) => [template.id, template]))(
    '%s は Node id・Edge id が重複していない',
    (_id, template) => {
      const result = deserializeProject(template.json)
      if (!result.ok) throw new Error('deserialize に失敗した')

      const nodeIds = result.project.nodes.map((node) => node.id)
      const edgeIds = result.project.edges.map((edge) => edge.id)
      expect(new Set(nodeIds).size).toBe(nodeIds.length)
      expect(new Set(edgeIds).size).toBe(edgeIds.length)
    },
  )

  it('秘密情報になりうる実 URL を含まない（TP-9）', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.json).not.toMatch(/https?:\/\//)
    }
  })

  // BOM 付き UTF-8 で保存すると JSON.parse が落ち、実行時は「読み込めませんでした」
  // ダイアログだけが出て原因がわからない。エディタや PowerShell の Set-Content が
  // 付けてしまうことがあるため、ファイル先頭を明示的に検査する。
  it('BOM で始まらない', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.json.charCodeAt(0)).not.toBe(0xfeff)
      expect(template.json.trimStart().startsWith('{')).toBe(true)
    }
  })
})

describe('REFERENCE_TEMPLATE_ID', () => {
  it('カタログに存在する（§7.6 のサンプル読込が成立する）', () => {
    expect(findWorkflowTemplate(REFERENCE_TEMPLATE_ID)).toBeDefined()
  })
})

describe('findWorkflowTemplate', () => {
  it('未知の id では undefined を返す', () => {
    expect(findWorkflowTemplate('no-such-template')).toBeUndefined()
  })
})

describe('groupTemplatesByCategory', () => {
  it('すべてのテンプレートがどこかの group に含まれる', () => {
    const grouped = groupTemplatesByCategory().flatMap(
      (group) => group.templates,
    )
    expect(grouped).toHaveLength(WORKFLOW_TEMPLATES.length)
  })

  it('group の並びは WORKFLOW_TEMPLATE_CATEGORIES の順である', () => {
    const categories = groupTemplatesByCategory().map((group) => group.category)
    expect(categories).toEqual(
      WORKFLOW_TEMPLATE_CATEGORIES.filter((category) =>
        WORKFLOW_TEMPLATES.some((template) => template.category === category),
      ),
    )
  })

  it('group 内は sourceCount の降順である', () => {
    for (const group of groupTemplatesByCategory()) {
      const counts = group.templates.map((template) => template.sourceCount)
      expect(counts).toEqual([...counts].sort((a, b) => b - a))
    }
  })

  it('元の WORKFLOW_TEMPLATES を並べ替えない', () => {
    const before = WORKFLOW_TEMPLATES.map((template) => template.id)
    groupTemplatesByCategory()
    expect(WORKFLOW_TEMPLATES.map((template) => template.id)).toEqual(before)
  })
})
