import {
  SCHEMA_VERSION,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeKind,
  type WorkflowProject,
  type WorkflowPromptSettings,
} from '@/modules/workflow'
import { describe, expect, it } from 'vitest'
import { generatePrompt } from './generatePrompt'

function node(
  id: string,
  type: WorkflowNodeKind,
  title: string,
  config: Record<string, unknown> = {},
  extra: { description?: string; notes?: string } = {},
): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { title, config, ...extra },
  }
}

function project(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[] = [],
  overrides: {
    name?: string
    description?: string
    promptSettings?: WorkflowPromptSettings
  } = {},
): WorkflowProject {
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      id: 'project-1',
      name: overrides.name ?? '面接評価リマインド',
      description: overrides.description,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes,
    edges,
    promptSettings: overrides.promptSettings,
  }
}

/** functional-design §7.6 のサンプルを縮めた、分岐と合流を含む代表的なフロー。 */
function branchingProject(): WorkflowProject {
  return project(
    [
      node('t1', 'trigger', '面接終了', {
        system: 'Google Calendar',
        event: '面接終了',
      }),
      node('w1', 'wait', '60分待機', { duration: 60, unit: 'minutes' }),
      node('c1', 'condition', '評価済み？', { branches: ['Yes', 'No'] }),
      node('n1', 'notification', 'Teams通知', {
        provider: 'Microsoft Teams',
        recipient: '面接官',
        message: '評価を入力してください',
      }),
      node('e1', 'end', '完了', { outcome: 'Completed' }),
    ],
    [
      { id: 'x1', source: 't1', target: 'w1' },
      { id: 'x2', source: 'w1', target: 'c1' },
      {
        id: 'x3',
        source: 'c1',
        target: 'e1',
        sourceHandle: 'Yes',
        label: 'Yes',
      },
      { id: 'x4', source: 'c1', target: 'n1', sourceHandle: 'No', label: 'No' },
      { id: 'x5', source: 'n1', target: 'e1' },
    ],
  )
}

describe('generatePrompt — 決定論性（FR-019 / §9.1）', () => {
  it('同じ Workflow からは常に同じ Prompt を生成する', () => {
    expect(generatePrompt(branchingProject())).toBe(
      generatePrompt(branchingProject()),
    )
  })

  it('分岐を含む代表フローの出力を固定する', () => {
    // Markdown のセクション構成は第 2 の外部契約（§12）。
    // ここが変わるときは docs/functional-design.md §9.2 の更新を伴う。
    expect(generatePrompt(branchingProject())).toMatchInlineSnapshot(`
      "# 実装依頼

      次の業務フロー「面接評価リマインド」を実装してください。

      Implementation target: Generic

      ## Workflow

      ### 起点: 面接終了

      1. **面接終了**（Trigger） — Google Calendar / 面接終了
      1. **60分待機**（Wait） — 60 minutes
      1. **評価済み？**（Condition）
        - **Yes**:
          1. **完了**（End） — Completed
        - **No**:
          1. **Teams通知**（Notification） — Microsoft Teams / 面接官 / 評価を入力してください
          1. **完了**（既出の手順に合流）

      ## Trigger

      - **面接終了**（Trigger） — Google Calendar / 面接終了

      ## Conditions

      - **評価済み？**（Condition）
        - **Yes** の場合: **完了**
        - **No** の場合: **Teams通知**

      ## Notifications

      - **Teams通知**（Notification） — Microsoft Teams / 面接官 / 評価を入力してください

      ## Acceptance Criteria

      - **評価済み？** が **Yes** の場合に **完了** が実行される。
      - **評価済み？** が **No** の場合に **Teams通知** が実行される。
      - **完了** に到達した場合、Completed。
      "
    `)
  })
})

describe('generatePrompt — Node 順序と分岐の反映（AC-021）', () => {
  it('Trigger を起点に Edge を辿った順で手順を並べる', () => {
    const prompt = generatePrompt(branchingProject())
    const steps = ['面接終了', '60分待機', '評価済み？', 'Teams通知']
    const positions = steps.map((title) => prompt.indexOf(`1. **${title}**`))

    expect(positions.every((index) => index >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('Condition の分岐ごとに手順を分けて書く', () => {
    const prompt = generatePrompt(branchingProject())

    expect(prompt).toContain('- **Yes**:')
    expect(prompt).toContain('- **No**:')
  })

  it('Trigger が複数あるときは各 Trigger 起点で列挙する', () => {
    const prompt = generatePrompt(
      project(
        [
          node('t1', 'trigger', '定時実行', { system: 'Schedule' }),
          node('t2', 'trigger', '手動実行', { system: 'Manual Trigger' }),
          node('a1', 'action', '集計', { operation: '集計' }),
        ],
        [
          { id: 'x1', source: 't1', target: 'a1' },
          { id: 'x2', source: 't2', target: 'a1' },
        ],
      ),
    )

    expect(prompt).toContain('### 起点: 定時実行')
    expect(prompt).toContain('### 起点: 手動実行')
  })

  it('Trigger が無いときは手順を導出できない旨を書く', () => {
    const prompt = generatePrompt(
      project([node('a1', 'action', '集計', { operation: '集計' })]),
    )

    expect(prompt).toContain('Trigger ノードが定義されていないため')
  })

  it('Cycle があっても無限に展開せず合流として書く', () => {
    // 接続時に Cycle を禁止していない（§5.2）ため、生成側で止める必要がある
    const prompt = generatePrompt(
      project(
        [
          node('t1', 'trigger', '開始'),
          node('a1', 'action', 'API 呼び出し'),
          node('c1', 'condition', '成功？', { branches: ['Yes', 'No'] }),
          node('e1', 'end', '完了'),
        ],
        [
          { id: 'x1', source: 't1', target: 'a1' },
          { id: 'x2', source: 'a1', target: 'c1' },
          { id: 'x3', source: 'c1', target: 'e1', sourceHandle: 'Yes' },
          // Retry: Condition から Action へ戻る
          { id: 'x4', source: 'c1', target: 'a1', sourceHandle: 'No' },
        ],
      ),
    )

    expect(prompt).toContain('**API 呼び出し**（既出の手順に合流）')
  })

  it('分岐に接続先が無いときはその旨を書く', () => {
    const prompt = generatePrompt(
      project(
        [
          node('t1', 'trigger', '開始'),
          node('c1', 'condition', '判定', { branches: ['Yes', 'No'] }),
          node('e1', 'end', '完了'),
        ],
        [
          { id: 'x1', source: 't1', target: 'c1' },
          { id: 'x2', source: 'c1', target: 'e1', sourceHandle: 'Yes' },
        ],
      ),
    )

    expect(prompt).toContain('**No** の場合: 接続先が未定義')
  })
})

describe('generatePrompt — Node 設定値の反映（AC-022）', () => {
  it('Human Task の role / action を出す', () => {
    const prompt = generatePrompt(
      project([
        node('h1', 'humanTask', '評価入力', {
          role: '面接官',
          action: '評価シートを記入',
          expectedResult: '評価が確定する',
        }),
      ]),
    )

    expect(prompt).toContain('## Human Tasks')
    expect(prompt).toContain('面接官 / 評価シートを記入 / 評価が確定する')
  })

  it('AI の constraints と追加指示を Constraints に集める', () => {
    const prompt = generatePrompt(
      project(
        [node('ai1', 'ai', '要約', { constraints: '出力は 200 字以内' })],
        [],
        {
          promptSettings: {
            additionalInstructions: 'エラー時は Teams へ通知する',
          },
        },
      ),
    )

    expect(prompt).toContain('## Constraints')
    expect(prompt).toContain('**要約**: 出力は 200 字以内')
    expect(prompt).toContain('追加指示: エラー時は Teams へ通知する')
  })

  it('Wait は duration と unit をまとめて書く', () => {
    const prompt = generatePrompt(
      project(
        [
          node('t1', 'trigger', '開始'),
          node('w1', 'wait', '待機', { duration: 24, unit: 'hours' }),
        ],
        [{ id: 'x1', source: 't1', target: 'w1' }],
      ),
    )

    expect(prompt).toContain('**待機**（Wait） — 24 hours')
  })

  it('空文字の config は未設定として扱い出力しない', () => {
    const prompt = generatePrompt(
      project([node('t1', 'trigger', '開始', { system: '   ', event: '' })]),
    )

    expect(prompt).toContain('- **開始**（Trigger）')
    // 値が無いので summary の「 — 」ごと落ちる
    expect(prompt).not.toContain('開始**（Trigger） —')
  })
})

describe('generatePrompt — Note の出力（FR-022）', () => {
  it('Note は手順ではなくコメントとして出す', () => {
    const prompt = generatePrompt(
      project([
        node('t1', 'trigger', '開始'),
        node('nt1', 'note', '前提', {}, { notes: '人事部の運用ルールに従う' }),
      ]),
    )

    expect(prompt).toContain('## Notes')
    expect(prompt).toContain('**前提**: 人事部の運用ルールに従う')
    // Note は接続できないため手順には現れない（§5.2）
    expect(prompt).not.toContain('1. **前提**')
  })

  it('notes が無ければ description を使う', () => {
    const prompt = generatePrompt(
      project([node('nt1', 'note', '補足', {}, { description: '要確認' })]),
    )

    expect(prompt).toContain('**補足**: 要確認')
  })
})

describe('generatePrompt — セクションの省略（§9.2）', () => {
  it('該当データが無いセクションは出さない', () => {
    const prompt = generatePrompt(project([node('t1', 'trigger', '開始')]))

    expect(prompt).not.toContain('## Human Tasks')
    expect(prompt).not.toContain('## Notifications')
    expect(prompt).not.toContain('## Conditions')
    expect(prompt).not.toContain('## Notes')
    expect(prompt).not.toContain('## Constraints')
    // Flow Review は Phase 6 のため Open Questions は生成されない
    expect(prompt).not.toContain('## Open Questions')
  })

  it('description が無ければ 目的 を出さない', () => {
    expect(generatePrompt(project([]))).not.toContain('## 目的')
  })

  it('description があれば 目的 を出す', () => {
    const prompt = generatePrompt(
      project([], [], { description: '評価漏れを防ぐ' }),
    )

    expect(prompt).toContain('## 目的')
    expect(prompt).toContain('評価漏れを防ぐ')
  })
})

describe('generatePrompt — Target と Language（FR-021 / §9.3）', () => {
  it('Implementation target を明記する', () => {
    const prompt = generatePrompt(
      project([], [], { promptSettings: { target: 'google-apps-script' } }),
    )

    expect(prompt).toContain('Implementation target: Google Apps Script')
  })

  it('未設定なら Generic を既定にする', () => {
    expect(generatePrompt(project([]))).toContain(
      'Implementation target: Generic',
    )
  })

  it('Language: en で定型文を英語にする', () => {
    const prompt = generatePrompt(
      project([node('t1', 'trigger', 'Interview finished')], [], {
        promptSettings: { language: 'en' },
      }),
    )

    expect(prompt).toContain('# Implementation Request')
    expect(prompt).toContain('Entry point: Interview finished')
    expect(prompt).not.toContain('# 実装依頼')
  })

  it('定型文だけを訳し、ユーザーが入力した title は訳さない', () => {
    const prompt = generatePrompt(
      project([node('t1', 'trigger', '面接終了')], [], {
        promptSettings: { language: 'en' },
      }),
    )

    expect(prompt).toContain('面接終了')
  })
})

describe('generatePrompt — 壊れた入力への耐性', () => {
  it('config が想定外の型でも落ちない', () => {
    // config は Record<string, unknown>。ファイル由来なので任意の形を取り得る
    const prompt = generatePrompt(
      project([
        node('n1', 'notification', '通知', {
          provider: { nested: true },
          recipient: ['a', 'b'],
          message: null,
        }),
      ]),
    )

    expect(prompt).toContain('**通知**（Notification）')
  })

  it('存在しないノードを指す Edge を無視する', () => {
    const prompt = generatePrompt(
      project(
        [node('t1', 'trigger', '開始')],
        [{ id: 'x1', source: 't1', target: 'ghost' }],
      ),
    )

    expect(prompt).toContain('1. **開始**（Trigger）')
  })

  it('Condition の branches が壊れていても既定値で処理する', () => {
    const prompt = generatePrompt(
      project([
        node('t1', 'trigger', '開始'),
        node('c1', 'condition', '判定', { branches: 'Yes,No' }),
      ]),
    )

    expect(prompt).toContain('**Yes** の場合')
    expect(prompt).toContain('**No** の場合')
  })
})
