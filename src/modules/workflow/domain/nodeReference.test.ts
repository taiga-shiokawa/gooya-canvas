import { describe, expect, it } from 'vitest'
import { NODE_CONFIG_KEYS } from './nodeCatalog'
import {
  CONNECTION_RULES,
  findNodeKindReference,
  NODE_KIND_REFERENCES,
} from './nodeReference'
import { WORKFLOW_NODE_KINDS } from './types'

// ノード種別リファレンス（.steering/20260908-abstract-templates-and-reference/design.md §2.2）。
// 網羅性と、nodeCatalog との config キーの一致を機械的に確認する（RF-7）。

describe('NODE_KIND_REFERENCES', () => {
  it('11 種すべてを WORKFLOW_NODE_KINDS と同じ並びで持つ', () => {
    expect(NODE_KIND_REFERENCES.map((reference) => reference.kind)).toEqual([
      ...WORKFLOW_NODE_KINDS,
    ])
  })

  it.each(NODE_KIND_REFERENCES.map((reference) => [reference.kind, reference]))(
    '%s の summary と usage が空でない',
    (_kind, reference) => {
      expect(reference.summary.trim().length).toBeGreaterThan(0)
      expect(reference.usage.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(NODE_KIND_REFERENCES.map((reference) => [reference.kind, reference]))(
    '%s の configKeys が NODE_CONFIG_KEYS と一致する',
    (kind, reference) => {
      expect(reference.configKeys.map((entry) => entry.key)).toEqual([
        ...NODE_CONFIG_KEYS[kind],
      ])
    },
  )

  it.each(NODE_KIND_REFERENCES.map((reference) => [reference.kind, reference]))(
    '%s の config キーの説明が空でない',
    (_kind, reference) => {
      for (const entry of reference.configKeys) {
        expect(entry.description.trim().length).toBeGreaterThan(0)
      }
    },
  )

  it('kind が重複していない', () => {
    const kinds = NODE_KIND_REFERENCES.map((reference) => reference.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
  })

  it('接続の制約を持つのは trigger / end / note の 3 種', () => {
    const withConnection = NODE_KIND_REFERENCES.filter(
      (reference) => reference.connection !== undefined,
    ).map((reference) => reference.kind)

    expect(withConnection).toEqual(['trigger', 'end', 'note'])
  })
})

describe('CONNECTION_RULES', () => {
  it('共通の接続ルールを持つ', () => {
    expect(CONNECTION_RULES.length).toBeGreaterThan(0)
    for (const rule of CONNECTION_RULES) {
      expect(rule.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('findNodeKindReference', () => {
  it('種別から解説を引ける', () => {
    expect(findNodeKindReference('condition')?.summary).toContain('分岐')
  })
})
