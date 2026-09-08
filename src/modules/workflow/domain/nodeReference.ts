import type { WorkflowNodeKind } from './types'

// ノード種別の公式リファレンス（.steering/20260908-abstract-templates-and-reference/design.md §2）。
//
// 種別ごとの「何を表すか・どう使うか・どの config を埋めるか」はノード種別のドメイン知識なので
// `nodeCatalog.ts`（表示名・推奨 config キー・初期値）と同じ workflow の domain が所有する。
// 表示は canvas の presentation が行う（Palette と同じアイコン・色で見せるため）。
//
// 純 TypeScript のみ（React / @xyflow/react / ブラウザ API を持ち込まない）。

export type NodeConfigKeyReference = {
  key: string
  /** その欄に何を書くか。 */
  description: string
  /**
   * Flow Review が欠落を WARNING として指摘するキー（docs/functional-design.md §10.2 の
   * RV-W02〜W05）。review の `REQUIRED_CONFIG_RULES` と一致することは review 側のテストが
   * 検査する（workflow は review を import できないため、検査は review 側に置く）。
   */
  required?: boolean
}

export type NodeKindReference = {
  kind: WorkflowNodeKind
  /** 一言でいうと何を表すノードか。 */
  summary: string
  /** どういうときに置くか。 */
  usage: string
  /** その種別だけに掛かる接続の制約。共通ルールは CONNECTION_RULES を参照。 */
  connection?: string
  configKeys: readonly NodeConfigKeyReference[]
}

/**
 * 11 種の解説。並びは `WORKFLOW_NODE_KINDS` と一致させる（Palette と同じ順で見せるため）。
 * `configKeys` の key 集合が `NODE_CONFIG_KEYS` と一致することは nodeReference.test.ts が検査する。
 */
export const NODE_KIND_REFERENCES: readonly NodeKindReference[] = [
  {
    kind: 'trigger',
    summary: 'フローが動き出すきっかけ。',
    usage:
      'すべてのフローの起点に置く。時刻が来た・データが変わった・人が操作した・外部から呼ばれたなど、「何がきっかけで始まるか」を 1 つに決める。きっかけが複数ある業務は Trigger を複数置いてよい。',
    connection:
      '入力を受け取れない（業務の起点なので、Trigger へ向かう接続は作れない）。',
    configKeys: [
      {
        key: 'system',
        description:
          'きっかけを検知する側のシステム。スケジューラ・チャットツール・業務システムなど。',
        required: true,
      },
      {
        key: 'event',
        description:
          '何が起きたときに動くか。「毎朝 8 時」「レコードが更新された」「利用者が発話した」など。',
      },
    ],
  },
  {
    kind: 'dataSource',
    summary: 'どこからデータを読むか。',
    usage:
      '判断や集計のもとになるデータを取ってくるところに置く。読むだけで、書き込みは Action で表す。複数の場所から読む業務は Data Source を並べる。',
    configKeys: [
      {
        key: 'provider',
        description:
          'データの置き場所。台帳・データベース・ファイル置き場・外部サービスなど。',
      },
    ],
  },
  {
    kind: 'action',
    summary: 'システムが行う処理。',
    usage:
      '集計・加工・書き込み・ファイル生成など、人の判断が要らない処理に置く。1 ノードに詰め込みすぎず、「あとで人に説明する単位」で切ると読みやすい。',
    configKeys: [
      {
        key: 'operation',
        description:
          '何をするか。「対象を絞り込んで集計する」「承認された項目を更新する」など、結果がわかる書き方にする。',
      },
    ],
  },
  {
    kind: 'condition',
    summary: '条件による分岐。',
    usage:
      'フローが 2 つ以上に分かれるところに置く。分岐名は `branches` で決め、その数だけ出力の接続口が増える。すべての分岐に接続先を作ること（未接続の分岐は Flow Review が指摘する）。',
    configKeys: [
      {
        key: 'branches',
        description:
          '分岐の名前の一覧。既定は Yes / No。名前を変えると出力の接続口のラベルも変わる。',
      },
    ],
  },
  {
    kind: 'wait',
    summary: '時間を待つ。',
    usage:
      '「1 時間後に確認する」「翌営業日まで待つ」のように、時間をまたぐ業務に置く。人の対応を待つ場合は Human Task と組み合わせる。',
    configKeys: [
      {
        key: 'duration',
        description: '待つ長さの数値。',
        required: true,
      },
      { key: 'unit', description: '待つ長さの単位。分・時間・日など。' },
      {
        key: 'until',
        description:
          '長さではなく時点で待つ場合の条件。「翌営業日の 9 時」「期限日」など。',
      },
    ],
  },
  {
    kind: 'humanTask',
    summary: '人がやること。',
    usage:
      '確認・承認・入力など、人の判断や作業が必要なところに置く。自動化の対象外であることを明示する意味もあるので、省略せず置くほうがよい。',
    configKeys: [
      {
        key: 'role',
        description: '誰がやるか。個人名ではなく役割で書く。',
        required: true,
      },
      { key: 'action', description: 'その人に何をしてもらうか。' },
      {
        key: 'expectedResult',
        description:
          'その作業が終わったとき何が得られるか。承認・却下の意思表示、入力済みのデータなど。',
      },
    ],
  },
  {
    kind: 'notification',
    summary: '人へ知らせる。',
    usage:
      'チャット・メールなどで人へ伝えるところに置く。「誰に」「何のために」を埋めておくと、実装時に宛先と文面の設計が決まる。',
    configKeys: [
      {
        key: 'provider',
        description: '知らせる手段。チャットツール・メールなど。',
      },
      {
        key: 'recipient',
        description: '誰に届くか。役割やチャネル名で書く。',
        required: true,
      },
      { key: 'message', description: '伝える内容の要点。' },
      {
        key: 'purpose',
        description:
          '何のために送るか。督促・共有・エスカレーションなど。文面の書き方が変わるので分けて書く。',
      },
    ],
  },
  {
    kind: 'ai',
    summary: 'AI に任せる処理。',
    usage:
      '要約・抽出・分類・文面生成など、決まった手順に落とせない処理に置く。出力をそのまま業務データへ入れず、Human Task や Action の検証を後ろに置くのが安全。',
    configKeys: [
      { key: 'task', description: 'AI に何をさせるか。' },
      { key: 'input', description: '何を渡すか。' },
      {
        key: 'expectedOutput',
        description:
          '何が返ってくることを期待するか。項目名と形まで決めておくと実装が安定する。',
      },
      {
        key: 'constraints',
        description:
          '守らせたい制約。「書かれていないことは推測しない」「件数を変えない」など。ここが空だと実装時に暴走しやすい。',
      },
    ],
  },
  {
    kind: 'integration',
    summary: '外部システムを呼ぶ。',
    usage:
      '他のサービスやシステムへ渡す・呼び出すところに置く。中継のためだけに 1 段挟む場合（個人宛の通知を送るために別サービスを経由するなど）にも使う。',
    configKeys: [{ key: 'system', description: '呼び出す先のシステム名。' }],
  },
  {
    kind: 'end',
    summary: 'フローの終わり。',
    usage:
      '経路ごとに置く。「正常に完了」「対象がなかった」「却下された」など終わり方が違うなら End を分けると、どの経路で終わったかが読み取れる。',
    connection:
      '出力を持てない（業務の終端なので、End から出る接続は作れない）。',
    configKeys: [
      {
        key: 'outcome',
        description:
          'どういう終わり方か。Completed / Skipped / Rejected など、状態がわかる言葉にする。',
      },
    ],
  },
  {
    kind: 'note',
    summary: '設計上の補足。',
    usage:
      '決めておくこと・前提・注意点を書き残すために置く。処理には参加しないので、フローの読み手に伝えたいことを自由に書いてよい。',
    connection: '接続できない（処理に参加しないため、入力も出力も持たない）。',
    configKeys: [],
  },
]

/** 種別に依らない共通の接続ルール（FR-007 / docs/functional-design.md §5.2）。 */
export const CONNECTION_RULES: readonly string[] = [
  '自分自身へは接続できない。',
  'Trigger は入力を受け取れず、End は出力を持てない。',
  'Note は処理に参加しないため接続できない。',
  '同じノードの組を複数の接続で結んでよい。',
  '経路が循環してよい（リトライや差し戻しを表せる）。到達できない経路や終端の欠落は、接続時ではなく Flow Review が指摘する。',
]

export function findNodeKindReference(
  kind: WorkflowNodeKind,
): NodeKindReference | undefined {
  return NODE_KIND_REFERENCES.find((reference) => reference.kind === kind)
}
