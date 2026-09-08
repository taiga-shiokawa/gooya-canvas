# テンプレートの抽象化 と Node Reference 設計

## 1. テンプレートの抽象化

### 1.1 方針

前回は実案件の手順をノードへ 1:1 で写した。今回は**フローの形だけを残す**。

| | 前回 | 今回 |
|---|---|---|
| ノード数 | 14〜21 | 8〜9 |
| title | 「ヘッダー名で列位置を解決」 | 「データを加工・集計する」 |
| config | `provider: "Google Sheets"` | `provider: "スプレッドシート / 台帳"` |
| Note | 実案件の落とし穴を 1 ノードに 200 字以上 | 「決めておくこと」1 ノードに判断の観点だけ |

特定サービス名（Google Sheets / Power Automate / Excel Online）を config の値から外す。
テンプレートは「どのサービスでも成り立つ骨格」であるべきで、サービスの選択は
利用者が Inspector で埋める最初の作業になる。`promptSettings.target` は残す
（実装ターゲットはギャラリーの選択軸であり、フローの中身ではない）。

削った落とし穴の知識は永続文書へは移さない。テンプレートの Note ではなく
案件ごとのステアリングで扱う情報であり、前回分は
`.steering/20260908-workflow-templates/design.md` §1.3 に記録済みである。

### 1.2 4 本のノード構成

Note は接続を持たないため Edge 数はノード数より少ない。

**T1 `scheduled-report-teams`（8 ノード / 7 Edge）**

```
trigger(定期実行) → condition(実行してよいか？)
  ├ スキップ → end(実行しない)
  └ 実行する → dataSource(対象データを取得)
              → action(集計・加工する)
              → notification(結果を通知する)
              → end(完了)
+ note(決めておくこと)
```

**T2 `overdue-reminder`（9 ノード / 8 Edge）**

```
trigger(定期実行) → dataSource(対象の一覧を取得)
  → dataSource(対応済みの記録を取得)
  → action(突合して未対応を抽出)
  → condition(未対応があるか？)
      ├ ない → end(対象なし)
      └ ある → notification(担当者へ督促する) → end(完了)
+ note(決めておくこと)
```

**T3 `chat-search-bot`（8 ノード / 7 Edge）**

```
trigger(チャットでの問い合わせ) → ai(問い合わせから条件を読み取る)
  → dataSource(条件でデータを検索)
  → condition(該当があるか？)
      ├ ある → notification(結果を返す)     ┐
      └ ない → notification(該当なしを返す) ┘→ end(回答完了)
+ note(決めておくこと)
```

**T4 `llm-extract-approve`（9 ノード / 8 Edge）**

```
trigger(担当者が実行する) → dataSource(対象データを取得)
  → ai(内容を読み取って項目化する)
  → humanTask(担当者が内容を確認する)
  → condition(承認されたか？)
      ├ 却下 → end(反映しない)
      └ 承認 → action(システムへ反映する) → end(完了)
+ note(決めておくこと)
```

### 1.3 Review を 0 件に保つ制約

`RV-I01`〜`I03`（API 失敗時の処理 / 重複実行対策 / Logging の記載）は
**`action` または `integration` ノードが 1 つ以上あるときだけ**発火し、
`action` / `integration` / `note` のテキストからキーワードを探す。

T1 / T2 / T4 は `action` を持つため、Note の「決めておくこと」に
「失敗したときにリトライするか」「重複して実行されないか」「実行ログを残すか」を
自然な形で入れて満たす。抽象化の方針とも矛盾しない（実装手順ではなく判断の観点）。

T3 は `action` / `integration` を持たないため `RV-I` は発火しないが、
体裁を揃えるため同じ Note を置く。

`RV-W02`〜`W05` は `notification.recipient` / `wait.duration` /
`humanTask.role` / `trigger.system` を必ず埋める。`wait` は今回どのテンプレートも使わない。

## 2. Node Reference

### 2.1 配置

| 対象 | 置き場所 | 理由 |
|---|---|---|
| 解説の内容 | `src/modules/workflow/domain/nodeReference.ts` | ノード種別のドメイン知識。`nodeCatalog.ts`（ラベル・推奨 config キー）と同じ所有者に置く（RF-6） |
| 解説の表示 | `src/modules/canvas/presentation/NodeReferencePanel.tsx` | 下記 |

**表示を `canvas` に置く判断**: リファレンスは Palette と同じアイコン（`nodeKindIcon`）と
アクセント色（`nodeKindAccent`）で示す必要がある（RF-4）。どちらも
`canvas/presentation/nodes/` にあり、モジュール間のコピーも相互 import も禁止されている
（repository-structure §4.1 #3 / §5.1 #4）。新モジュールは作らない方針（RF-8）なので、
選択肢は「canvas に置く」か「アイコンとアクセントを shared へ移す」の 2 つ。

canvas は既に `NodePalette`（11 種を一覧する UI）を持っており、
「ノード種別の一覧を見せる UI」は canvas の既存の役割の延長である。
アイコンとアクセントを shared へ動かすと canvas 内の 3 ファイルを触ることになり、
得るものが「リファレンスを別モジュールに置ける」だけなので採らない。

### 2.2 データ構造

```ts
export type NodeConfigKeyReference = {
  key: string
  /** 何を書く欄か。 */
  description: string
  /** Flow Review が欠落を警告するキー（RV-W02〜W05）。 */
  required?: boolean
}

export type NodeKindReference = {
  kind: WorkflowNodeKind
  /** 一言でいうと何か。 */
  summary: string
  /** どういうときに置くか。 */
  usage: string
  /** 接続の制約（無い種別は undefined）。 */
  connection?: string
  configKeys: readonly NodeConfigKeyReference[]
}

export const NODE_KIND_REFERENCES: readonly NodeKindReference[]
/** 種別に依らない共通の接続ルール（FR-007 / §5.2）。 */
export const CONNECTION_RULES: readonly string[]
```

`configKeys` の `key` の集合が `NODE_CONFIG_KEYS[kind]` と一致することを
`nodeReference.test.ts` が検査する（RF-7）。`required` が
`REQUIRED_CONFIG_RULES`（review の domain）と一致することは
**review 側のテスト**が検査する — review は workflow を import できるが逆はできず、
review の domain ルールを公開 API へ出さずに済む。

### 2.3 UI

`<dialog>.showModal()` ベースのモーダル（`ProjectDialog` / `TemplateGallery` と同じ方針）。
11 種を縦に並べると読みづらいので**左に種別一覧・右に詳細**のマスタ / ディテール構成にする。
初期選択は `trigger`。左の一覧は Palette と同じ並び（`WORKFLOW_NODE_KINDS`）・同じアイコン・同じ色。

共通の接続ルール（`CONNECTION_RULES`）は詳細ペインの末尾に常時表示する。

### 2.4 composition root

`src/app/AppHeader.tsx` の nav に `Reference` を追加する。File / Edit は `AppMenu`
（ドロップダウン）だが、Reference は項目を持たず直接パネルを開くため素のボタンにする。
見た目は `AppMenu` のトリガーと揃える。

## 3. テスト

| 対象 | 内容 |
|---|---|
| `workflow/domain/nodeReference.test.ts` | 11 種すべてが解説を持つ / 並びが `WORKFLOW_NODE_KINDS` と一致 / `configKeys` が `NODE_CONFIG_KEYS` と一致 / summary・usage が空でない / `CONNECTION_RULES` が空でない |
| `review/domain/reviewWorkflow.test.ts` | `REQUIRED_CONFIG_RULES` と `NODE_KIND_REFERENCES` の `required` が一致する |
| `app/templateReview.test.ts` | 既存。テンプレートのノード数が 8〜9 であることを追加で検査する |
| `project/application/templateCatalog.test.ts` | 既存。実 URL を含まないことに加え、特定サービス名を config に持たないことは目視とし機械検査はしない（表記が多様で偽陰性・偽陽性が出るため） |

## 4. 未解決

- リファレンスの多言語化（Prompt は ja / en を切り替えるが、リファレンスは ja のみ）。
  必要になった時点で `promptSettings.language` と揃えるか判断する（要確認）
