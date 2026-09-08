import type { WorkflowNode } from './types'

// Node Type ごとの接続許否（FR-007 / docs/functional-design.md §5.2）。
// 純関数。接続時に判定し、不許可の接続は作成しない。

export type ConnectionCheck =
  { allowed: true } | { allowed: false; reason: string }

export type ConnectionCandidate = {
  source: WorkflowNode | undefined
  target: WorkflowNode | undefined
}

const ALLOWED: ConnectionCheck = { allowed: true }

function deny(reason: string): ConnectionCheck {
  return { allowed: false, reason }
}

/**
 * 接続の許否を判定する。
 *
 * Cycle（Retry 等の Loop）と多重辺は**禁止しない**。到達不能や終了経路の欠如は
 * 接続時ではなく Flow Review が指摘する（docs/functional-design.md §5.2 / §10）。
 */
export function canConnect(candidate: ConnectionCandidate): ConnectionCheck {
  const { source, target } = candidate

  if (!source || !target) {
    return deny('接続元または接続先のノードが見つかりません。')
  }
  if (source.id === target.id) {
    return deny('自分自身へは接続できません。')
  }
  if (source.type === 'note' || target.type === 'note') {
    return deny(
      'Note は設計上の補足であり、処理に参加しないため接続できません。',
    )
  }
  if (target.type === 'trigger') {
    return deny('Trigger は業務の起点のため、入力を受け取れません。')
  }
  if (source.type === 'end') {
    return deny('End は業務の終端のため、出力を持てません。')
  }

  return ALLOWED
}
