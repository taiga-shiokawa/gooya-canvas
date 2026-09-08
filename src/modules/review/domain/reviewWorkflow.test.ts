import type { ReviewFinding } from '@/modules/shared'
import {
  NODE_CONFIG_KEYS,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowNodeKind,
} from '@/modules/workflow'
import { describe, expect, it } from 'vitest'
import {
  REQUIRED_CONFIG_RULES,
  REVIEW_RULE_IDS,
  reviewWorkflow,
} from './reviewWorkflow'

// 13 ルールすべてについて「検出される場合」と「検出されない場合」の両方を確認する
// （docs/functional-design.md §10.2 / development-guidelines §5.1）。

type NodeOptions = {
  title?: string
  description?: string
  notes?: string
  config?: Record<string, unknown>
}

function node(
  id: string,
  type: WorkflowNodeKind,
  options: NodeOptions = {},
): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      title: options.title ?? id,
      description: options.description,
      notes: options.notes,
      config: options.config ?? {},
    },
  }
}

function edge(
  source: string,
  target: string,
  sourceHandle?: string,
): WorkflowEdge {
  return {
    id: `${source}->${target}${sourceHandle ? `:${sourceHandle}` : ''}`,
    source,
    target,
    sourceHandle,
    label: sourceHandle,
  }
}

function ruleIds(findings: readonly ReviewFinding[]): string[] {
  return findings.map((finding) => finding.ruleId)
}

function findingsFor(
  findings: readonly ReviewFinding[],
  ruleId: string,
): ReviewFinding[] {
  return findings.filter((finding) => finding.ruleId === ruleId)
}

/** 指摘が 1 件も出ない最小構成。各ルールはここを崩して検証する。 */
function cleanGraph(): WorkflowGraph {
  return {
    nodes: [
      node('t1', 'trigger', { config: { system: 'Google Calendar' } }),
      node('e1', 'end', { config: { outcome: 'Completed' } }),
    ],
    edges: [edge('t1', 'e1')],
  }
}

describe('reviewWorkflow', () => {
  it('問題のない Workflow では指摘が出ない', () => {
    expect(reviewWorkflow(cleanGraph())).toEqual([])
  })

  it('空の Workflow では Trigger なし / End なしだけが出る', () => {
    expect(ruleIds(reviewWorkflow({ nodes: [], edges: [] }))).toEqual([
      'RV-E01',
      'RV-E02',
    ])
  })

  it('同じ入力からは常に同じ結果が返る（決定論性）', () => {
    const graph = cleanGraph()
    graph.nodes.push(node('a1', 'action'))
    expect(reviewWorkflow(graph)).toEqual(reviewWorkflow(graph))
  })

  it('結果はルール ID 昇順に並ぶ', () => {
    const graph: WorkflowGraph = {
      nodes: [node('a1', 'action'), node('n1', 'notification')],
      edges: [],
    }
    const order: readonly string[] = REVIEW_RULE_IDS
    const ids = ruleIds(reviewWorkflow(graph))
    const ordered = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    expect(ids).toEqual(ordered)
  })
})

describe('RV-E01: Trigger ノードが存在しない', () => {
  it('Trigger が無ければ検出する', () => {
    const graph: WorkflowGraph = {
      nodes: [node('e1', 'end', { config: { outcome: 'Completed' } })],
      edges: [],
    }
    expect(ruleIds(reviewWorkflow(graph))).toContain('RV-E01')
  })

  it('Trigger があれば検出しない', () => {
    expect(ruleIds(reviewWorkflow(cleanGraph()))).not.toContain('RV-E01')
  })
})

describe('RV-E02: End ノードが存在しない', () => {
  it('End が無ければ検出する', () => {
    const graph: WorkflowGraph = {
      nodes: [node('t1', 'trigger', { config: { system: 'Form' } })],
      edges: [],
    }
    expect(ruleIds(reviewWorkflow(graph))).toContain('RV-E02')
  })

  it('End があれば検出しない', () => {
    expect(ruleIds(reviewWorkflow(cleanGraph()))).not.toContain('RV-E02')
  })
})

describe('RV-E03: どの Edge にも接続されていない Node', () => {
  it('孤立した Node を検出する', () => {
    const graph = cleanGraph()
    graph.nodes.push(node('w1', 'wait', { config: { duration: 60 } }))

    const isolated = findingsFor(reviewWorkflow(graph), 'RV-E03')
    expect(isolated).toHaveLength(1)
    expect(isolated[0].nodeId).toBe('w1')
    expect(isolated[0].level).toBe('error')
  })

  it('接続されていれば検出しない', () => {
    expect(ruleIds(reviewWorkflow(cleanGraph()))).not.toContain('RV-E03')
  })

  it('note は接続できないため検出しない（§5.2）', () => {
    const graph = cleanGraph()
    graph.nodes.push(node('note1', 'note', { notes: '補足' }))

    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-E03')
  })

  it('参照先を失った Edge は接続として数えない', () => {
    const graph = cleanGraph()
    graph.nodes.push(node('a1', 'action'))
    graph.edges.push(edge('a1', 'deleted-node'))

    expect(findingsFor(reviewWorkflow(graph), 'RV-E03')[0].nodeId).toBe('a1')
  })
})

describe('RV-W01: Condition の未接続分岐', () => {
  function conditionGraph(edges: WorkflowEdge[]): WorkflowGraph {
    return {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('c1', 'condition', {
          title: '評価済み？',
          config: { branches: ['Yes', 'No'] },
        }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges,
    }
  }

  it('未接続の分岐を分岐ごとに検出する', () => {
    const findings = findingsFor(
      reviewWorkflow(
        conditionGraph([edge('t1', 'c1'), edge('c1', 'e1', 'Yes')]),
      ),
      'RV-W01',
    )

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeId).toBe('c1')
    expect(findings[0].message).toContain('No')
  })

  it('全分岐が接続されていれば検出しない', () => {
    const findings = reviewWorkflow(
      conditionGraph([
        edge('t1', 'c1'),
        edge('c1', 'e1', 'Yes'),
        edge('c1', 'e1', 'No'),
      ]),
    )

    expect(ruleIds(findings)).not.toContain('RV-W01')
  })

  it('sourceHandle が分岐名と対応しない Edge は接続と数えない', () => {
    const findings = findingsFor(
      reviewWorkflow(conditionGraph([edge('t1', 'c1'), edge('c1', 'e1')])),
      'RV-W01',
    )

    expect(findings).toHaveLength(2)
  })
})

describe('RV-W02〜W05: 必須 Node 設定の欠落', () => {
  // 対象キーは workflow の推奨キー（§3.3）の部分集合であること。
  // review 側にキーの知識を複製していないことをここで機械的に確認する。
  it('対象キーはすべて NODE_CONFIG_KEYS に含まれる', () => {
    for (const rule of REQUIRED_CONFIG_RULES) {
      expect(NODE_CONFIG_KEYS[rule.kind]).toContain(rule.key)
    }
  })

  /** t1 → target → e1 の直列に対象ノードを挟んだグラフ。 */
  function chainWith(target: WorkflowNode): WorkflowGraph {
    return {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        target,
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [edge('t1', target.id), edge(target.id, 'e1')],
    }
  }

  it('RV-W02: Notification の Recipient が空なら検出する', () => {
    const findings = findingsFor(
      reviewWorkflow(
        chainWith(
          node('n1', 'notification', {
            config: { provider: 'Microsoft Teams', recipient: '   ' },
          }),
        ),
      ),
      'RV-W02',
    )

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeId).toBe('n1')
  })

  it('RV-W02: Recipient があれば検出しない', () => {
    const graph = chainWith(
      node('n1', 'notification', { config: { recipient: '面接官' } }),
    )
    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-W02')
  })

  it('RV-W03: Wait の Duration が未設定なら検出する', () => {
    const graph = chainWith(node('w1', 'wait', { config: { unit: 'minutes' } }))
    expect(ruleIds(reviewWorkflow(graph))).toContain('RV-W03')
  })

  it('RV-W03: Duration があれば検出しない（数値も設定済みと扱う）', () => {
    const graph = chainWith(
      node('w1', 'wait', { config: { duration: 60, unit: 'minutes' } }),
    )
    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-W03')
  })

  it('RV-W04: Human Task の Role が未設定なら検出する', () => {
    const graph = chainWith(
      node('h1', 'humanTask', { config: { action: '評価入力' } }),
    )
    expect(ruleIds(reviewWorkflow(graph))).toContain('RV-W04')
  })

  it('RV-W04: Role があれば検出しない', () => {
    const graph = chainWith(
      node('h1', 'humanTask', { config: { role: '面接官' } }),
    )
    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-W04')
  })

  it('RV-W05: Trigger の system が未設定なら検出する', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('t1', 'trigger', { config: { event: '面接終了' } }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [edge('t1', 'e1')],
    }

    const findings = findingsFor(reviewWorkflow(graph), 'RV-W05')
    expect(findings).toHaveLength(1)
    expect(findings[0].nodeId).toBe('t1')
  })

  it('RV-W05: system があれば検出しない', () => {
    expect(ruleIds(reviewWorkflow(cleanGraph()))).not.toContain('RV-W05')
  })
})

describe('RV-W06: Trigger から End へ到達しない', () => {
  it('End へ到達しない Trigger を検出する', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('a1', 'action', { config: { operation: 'データ取得' } }),
        node('t2', 'trigger', { config: { system: 'Schedule' } }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [edge('t1', 'a1'), edge('t2', 'e1')],
    }

    const findings = findingsFor(reviewWorkflow(graph), 'RV-W06')
    expect(findings).toHaveLength(1)
    expect(findings[0].nodeId).toBe('t1')
  })

  it('End へ到達できれば検出しない', () => {
    expect(ruleIds(reviewWorkflow(cleanGraph()))).not.toContain('RV-W06')
  })

  it('Cycle があっても停止し、End へ到達できなければ検出する', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('a1', 'action', { config: { operation: 'API 呼び出し' } }),
        node('a2', 'action', { config: { operation: 'リトライ' } }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      // a1 → a2 → a1 の Loop。End は別の場所に居て到達できない
      edges: [edge('t1', 'a1'), edge('a1', 'a2'), edge('a2', 'a1')],
    }

    expect(ruleIds(reviewWorkflow(graph))).toContain('RV-W06')
  })

  it('Cycle を含んでいても End へ到達できれば検出しない', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('c1', 'condition', { config: { branches: ['Yes', 'No'] } }),
        node('n1', 'notification', {
          config: { recipient: '面接官' },
          description: '失敗時はリトライし、重複通知しないようログを残す',
        }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [
        edge('t1', 'c1'),
        edge('c1', 'e1', 'Yes'),
        edge('c1', 'n1', 'No'),
        // 再通知の Loop（§5.2 で Cycle は禁止していない）
        edge('n1', 'c1'),
      ],
    }

    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-W06')
  })
})

describe('RV-W07: Notification の後に End への経路が無い', () => {
  it('Notification から End へ到達できなければ検出する', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('n1', 'notification', { config: { recipient: '面接官' } }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [edge('t1', 'n1'), edge('t1', 'e1')],
    }

    const findings = findingsFor(reviewWorkflow(graph), 'RV-W07')
    expect(findings).toHaveLength(1)
    expect(findings[0].nodeId).toBe('n1')
  })

  it('Notification から End へ到達できれば検出しない', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('n1', 'notification', { config: { recipient: '面接官' } }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [edge('t1', 'n1'), edge('n1', 'e1')],
    }

    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-W07')
  })
})

describe('RV-I01〜I03: 非機能の記載漏れ（SUGGESTION）', () => {
  /** integration / action を含む最小構成。INFO ルールの適用条件を満たす。 */
  function integrationGraph(options: NodeOptions = {}): WorkflowGraph {
    return {
      nodes: [
        node('t1', 'trigger', { config: { system: 'Form' } }),
        node('i1', 'integration', {
          config: { system: 'REST API' },
          ...options,
        }),
        node('e1', 'end', { config: { outcome: 'Completed' } }),
      ],
      edges: [edge('t1', 'i1'), edge('i1', 'e1')],
    }
  }

  it('記載が無ければ 3 件とも検出する', () => {
    expect(ruleIds(reviewWorkflow(integrationGraph()))).toEqual([
      'RV-I01',
      'RV-I02',
      'RV-I03',
    ])
  })

  it('integration / action が無ければ適用しない', () => {
    const graph = cleanGraph()
    graph.nodes.push(node('n1', 'notification', { config: { recipient: 'a' } }))
    graph.edges.push(edge('t1', 'n1'), edge('n1', 'e1'))

    const ids = ruleIds(reviewWorkflow(graph))
    expect(ids).not.toContain('RV-I01')
    expect(ids).not.toContain('RV-I02')
    expect(ids).not.toContain('RV-I03')
  })

  it('RV-I01: 失敗時の記載があれば検出しない', () => {
    const ids = ruleIds(
      reviewWorkflow(
        integrationGraph({ description: 'API 失敗時はリトライする' }),
      ),
    )
    expect(ids).not.toContain('RV-I01')
    expect(ids).toContain('RV-I02')
  })

  it('RV-I02: 重複実行対策の記載があれば検出しない', () => {
    const ids = ruleIds(
      reviewWorkflow(integrationGraph({ notes: '重複実行を防ぐキーを持つ' })),
    )
    expect(ids).not.toContain('RV-I02')
    expect(ids).toContain('RV-I01')
  })

  it('RV-I03: Logging の記載があれば検出しない', () => {
    const ids = ruleIds(
      reviewWorkflow(
        integrationGraph({ notes: 'Logging は Cloud Logging へ' }),
      ),
    )
    expect(ids).not.toContain('RV-I03')
  })

  it('note ノードの記載も検索対象にする', () => {
    const graph = integrationGraph()
    graph.nodes.push(
      node('note1', 'note', {
        notes: 'エラー時の扱い・冪等性・監査ログはここに記載',
      }),
    )

    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-I01')
    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-I02')
    expect(ruleIds(reviewWorkflow(graph))).not.toContain('RV-I03')
  })

  it('単語境界で照合する（logic は Logging の記載と見なさない）', () => {
    const ids = ruleIds(
      reviewWorkflow(integrationGraph({ description: 'business logic only' })),
    )
    expect(ids).toContain('RV-I03')
  })
})
