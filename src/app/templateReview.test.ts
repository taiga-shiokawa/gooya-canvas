import {
  createProjectUseCases,
  REFERENCE_TEMPLATE_ID,
  WORKFLOW_TEMPLATES,
  type ProjectFilePort,
} from '@/modules/project'
import { createReviewUseCases } from '@/modules/review'
import { summarizeReviewFindings, useWorkflowStore } from '@/modules/shared'
import { createEmptyProject } from '@/modules/workflow'
import { beforeEach, describe, expect, it } from 'vitest'

// 同梱テンプレートが Flow Review で ERROR を出さないことの検査（TP-10）。
//
// このテストが `src/app/` にあるのは、project（テンプレート）と review（解析）という
// 2 つの feature モジュールを同時に触る必要があり、それが許されるのは composition root
// だけであるため（docs/repository-structure.md §5.1 #4 / §5.3）。
// 公開 API だけを使い、実際の「テンプレート読込 → Review 実行」の経路を通す。

const filePort: ProjectFilePort = {
  download: () => {},
  pickAndRead: () => Promise.resolve(null),
}

const projectUseCases = createProjectUseCases({
  filePort,
  now: () => '2026-09-08T00:00:00.000Z',
  newId: () => 'test-id',
})

const reviewUseCases = createReviewUseCases()

beforeEach(() => {
  useWorkflowStore
    .getState()
    .replaceProject(
      createEmptyProject({ id: 'test-id', now: '2026-09-08T00:00:00.000Z' }),
    )
})

describe.each(WORKFLOW_TEMPLATES.map((template) => [template.id]))(
  'テンプレート %s',
  (templateId) => {
    it('読み込める', () => {
      expect(projectUseCases.loadTemplate(templateId)).toBe(true)
      expect(useWorkflowStore.getState().nodes.length).toBeGreaterThan(0)
    })

    it('Flow Review で SUGGESTION を出さない（非機能の観点が書かれている）', () => {
      projectUseCases.loadTemplate(templateId)

      const findings = reviewUseCases.run()
      const suggestions = findings.filter((finding) => finding.level === 'info')

      expect(
        suggestions.map((finding) => `${finding.ruleId}: ${finding.message}`),
      ).toEqual([])
    })

    it('読み込んでも dirty にならない（TP-12）', () => {
      projectUseCases.loadTemplate(templateId)
      expect(useWorkflowStore.getState().isDirty).toBe(false)
    })

    it('Flow Review で ERROR を出さない（TP-10）', () => {
      projectUseCases.loadTemplate(templateId)

      const findings = reviewUseCases.run()
      const errors = findings.filter((finding) => finding.level === 'error')

      // 落ちたときにどのルールで落ちたか分かるようにメッセージごと比較する
      expect(
        errors.map((finding) => `${finding.ruleId}: ${finding.message}`),
      ).toEqual([])
    })

    it('Flow Review で WARNING を出さない（設定の欠落・未接続の分岐がない）', () => {
      projectUseCases.loadTemplate(templateId)

      const findings = reviewUseCases.run()
      const warnings = findings.filter((finding) => finding.level === 'warning')

      expect(
        warnings.map((finding) => `${finding.ruleId}: ${finding.message}`),
      ).toEqual([])
    })

    it('そのまま保存できる', () => {
      projectUseCases.loadTemplate(templateId)
      expect(projectUseCases.saveProject()).toBe('saved')
    })
  },
)

describe('loadTemplate', () => {
  it('未知の id では store を変更せず false を返す', () => {
    const before = useWorkflowStore.getState().nodes

    expect(projectUseCases.loadTemplate('no-such-template')).toBe(false)
    expect(useWorkflowStore.getState().nodes).toBe(before)
  })
})

describe('テンプレート全体のサマリ', () => {
  it('すべてのテンプレートで指摘が 0 件', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      projectUseCases.loadTemplate(template.id)
      const summary = summarizeReviewFindings(reviewUseCases.run())

      expect({ id: template.id, total: summary.total }).toEqual({
        id: template.id,
        total: 0,
      })
    }
  })
})

// テンプレートは「作り始めるきっかけ」であり実装手順書ではない（AB-1）。
// 前回 14〜21 ノードまで具体化して読み手の負担になったため、上限を機械的に固定する。
// Reference Workflow（初回起動のサンプル）は解説用の実例なので対象外。
describe('テンプレートのノード数（AB-1）', () => {
  const ABSTRACT_TEMPLATES = WORKFLOW_TEMPLATES.filter(
    (template) => template.id !== REFERENCE_TEMPLATE_ID,
  )

  it('Reference Workflow 以外のテンプレートが対象になっている', () => {
    expect(ABSTRACT_TEMPLATES.length).toBe(WORKFLOW_TEMPLATES.length - 1)
  })

  it.each(ABSTRACT_TEMPLATES.map((template) => [template.id]))(
    '%s は 10 ノード以下',
    (templateId) => {
      projectUseCases.loadTemplate(templateId)
      expect(useWorkflowStore.getState().nodes.length).toBeLessThanOrEqual(10)
    },
  )
})
