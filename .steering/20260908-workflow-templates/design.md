# Workflow Template 設計

## 1. 情報源: 実案件 23 件のパターン調査

`C:\...\Desktop\開発ログ`（15 案件）と `C:\...\Desktop\my-gas`（8 案件）を調査した。
`codex-skill-demo`（自動化要素なし）と `NotebookLM検証`（空ディレクトリ）は対象外。

### 1.1 頻出サービス・トリガー

| サービス | 案件数 | トリガー | 案件数 |
|---|---|---|---|
| Microsoft Teams | 19 | 手動・テスト経路（`test*` / `dryRun*` / Quick Action） | 17 |
| Google Apps Script | 15 | 時間主導・Recurrence | 14 |
| Power Automate（中継） | 15 | チャット発話（Teams / Copilot Studio） | 7 |
| Google Sheets | 12 | Webhook 受信（HTTP POST） | 5 |
| LLM（Copilot Studio / Azure OpenAI / Prompt Builder） | 10 | doGet（Web アプリ） | 4 |
| Drive / OneDrive | 8 | onOpen カスタムメニュー | 4 |
| Copilot Studio | 7 | Adaptive Card のボタン・フォーム送信 | 4 |
| Excel Online (Business) | 4 | onEdit | 2 |
| Slack | 0 | onFormSubmit / ファイル更新監視 / メール受信 | 0 |

設計に効く事実:

- **通知先は Teams 一択**。Slack はゼロ、メール送信もゼロ（下書き作成が 3 件、
  管理者向けエラーメールが 1 件だけ）。テンプレートの `notification.provider` は Teams を既定にする
- **Teams への到達経路が 2 系統ある**。直接 Incoming Webhook と、Power Automate 経由
  （個人 DM・Graph 経由のチャネルメンションに必要）。後者は `integration` ノードで表す
- **`DRY_RUN` と手動テスト経路が 17/23 案件にある**。テンプレートの必須要素として `condition` で表す
- **ファイル更新監視とメール受信は一度も採用されていない**。テンプレートに入れない

### 1.2 抽出されたパターン（頻度順）

★ が第 1 弾の実装対象。

| ★ | パターン | 該当案件数 | target |
|---|---|---|---|
| ★ | 定期バッチ集計 → Teams カード通知 | 9 | `google-apps-script` |
| ★ | チャット起点 自然文検索 → 出典付き回答 | 5 | `power-automate` |
| ★ | 未対応者の督促（台帳 × 証跡の突合） | 4 | `google-apps-script` |
| ★ | LLM 抽出 → 人の確認 → 承認後だけ反映 | 3 | `generic` |
| ★ | イベント駆動 待機 → リマインド → 再通知 | 2 | `power-automate`（既存サンプル） |
| | データブリッジ（自前 Web App で外部 SaaS を正規化） | 4 | `google-apps-script` |
| | 承認カード → 台帳更新 | 3 | `power-automate` |
| | 閾値監視 → 着地見込み予測 → アラート | 2 | `google-apps-script` |
| | onEdit 起点の他シート値引当 → 派生列の自動計算 | 2 | `google-apps-script` |
| | DWH クエリ → シート全面更新 → 集計配信 | 2 | `google-apps-script` |
| | 文面生成 → 下書き作成（送信しない） | 2 | `power-automate` |
| | 自動修復ループ（失敗分類 → 戦略変更 → 再実行） | 2 | `power-automate` |

### 1.3 テンプレートへ Note ノードとして埋める実務の教訓

各案件の開発ログに残っていた「実際に踏んだ罠」。テンプレートの主要な価値はここにある。

- Excel Online の既定 256 行では取り切れない → 改ページ ON・しきい値 1000
- 上位 N 件で切る処理を LLM に後処理させると 11 件目以降を静かに取りこぼす
- メール下書きはリトライ禁止（Apps Script の POST は 302 先で結果が返り重複下書きになる）
- GAS の `everyWeeks(2)` は位相が固定されて壊れる → 週次トリガー + 間隔ゲート
- GAS の `atHour()` は時台しか保証しない → 0 時スケジューラ + `.at()` ワンタイムトリガーの 2 段構え
- 分母 0 は率「—」でゼロ除算しない / 列が見つからなければ即エラー（サイレントな誤集計を出さない）
- 通知記録は送信前に書く（再実行時の二重通知防止）
- Adaptive Card の `msteams.entities` メンションはエラーにならず静かに失敗する
- 秘密情報は Script Properties / Key Vault（23/23 案件）

## 2. 構成

### 2.1 テンプレート実体

`src/modules/project/assets/templates/*.gooya-canvas.json` に置く。
既存サンプル `interview-evaluation-reminder.gooya-canvas.json` も `assets/samples/` から
ここへ移し、**テンプレートとサンプルの実体を一箇所に統一する**（TP-1）。

Open と同じ `?raw` import → `deserializeProject`（`JSON.parse` → Zod → migration）を通す（TP-8）。
専用の読み込み経路は作らない。

ノード ID は UUID ではなく可読な文字列（`trigger-weekly` など）にする。
`workflowNodeSchema` の `id` は `z.string()` で形式を強制しておらず、ID の一意性は
プロジェクト内で足りる（テンプレート選択はプロジェクト全体を置き換える）。
差分レビューが可能になる利点が大きい。

### 2.2 カタログ

`src/modules/project/application/templateCatalog.ts`

```ts
export type WorkflowTemplateCategory = 'notification' | 'search' | 'ai' | 'reminder'

export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  category: WorkflowTemplateCategory
  /** ギャラリーのバッジ表示用。JSON の promptSettings.target と一致することをテストで担保する。 */
  target: PromptTarget
  /** 該当した実案件数（design.md §1.2）。ギャラリーの並び順の根拠。 */
  sourceCount: number
  json: string
}

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[]
export const TEMPLATE_CATEGORY_LABELS: Record<WorkflowTemplateCategory, string>
/** 初回起動時に読み込む Reference Workflow（§7.6）。 */
export const REFERENCE_TEMPLATE_ID = 'interview-evaluation-reminder'
```

`target` を JSON から都度パースせずカタログにも持つ。ギャラリー表示のたびに 5 件を
deserialize する必要がなくなり、二重管理のリスクは
「全テンプレートで `catalog.target === parsed.promptSettings.target`」を検査する
単体テストで消す。

### 2.3 ユースケース

`projectUseCases` に 1 つ追加する。

```ts
/** テンプレートから開始する（TP-3）。dirty の確認は presentation 側で済ませてから呼ぶ。 */
loadTemplate: (templateId: string) => boolean
```

`loadSampleProjectIfEmpty` は `REFERENCE_TEMPLATE_ID` のテンプレートを引くように書き換える。
挙動（store が空のときだけ読む・失敗時 false）は変えない。

`replaceProject` は dirty を倒すため、テンプレート読込が dirty を立てないこと（TP-12）は
サンプル読込と同じ経路で自動的に満たされる。

### 2.4 presentation

- `TemplateGallery.tsx` — `<dialog>.showModal()` ベース（`ProjectDialog` と同じ方針）。
  category 別にグルーピングし、各カードに名称・説明・target バッジを出す。
  先頭に「空のプロジェクト」のカードを置く（TP-6）
- `useProjectCommands` に `newFromTemplate: () => void` と
  `templateGallery: TemplateGalleryState | null` を追加する

**dirty 確認とギャラリーの順序**: 既存の New / Open と同じく **確認を先に出す**。
`confirmWhenDirty('テンプレートから開始', '破棄して選択', openGallery)`。

選択後に確認を出すほうが「破棄しますか」の問いとしては正確だが、`<dialog>` の入れ子に
なるうえ `confirmWhenDirty` を分岐させる必要がある。先に確認する構成では
「確認 → ギャラリーで Esc」の場合に何も破棄されずに終わる（安全側に外れる）だけなので、
既存コマンドとの一貫性を採る。

### 2.5 composition root

`src/app/AppHeader.tsx` の `fileItems` に `New from Template` を `New` の直後へ追加し、
`<TemplateGallery state={commands.templateGallery} />` を設置する。

## 3. テンプレート 4 本のノード構成

すべて Flow Review で ERROR（RV-E01 Trigger 不在 / RV-E02 End 不在 /
RV-E03 孤立ノード）が 0 件になること（TP-10）。WARNING も原則 0 件を目指し、
`notification.recipient` / `wait.duration` / `humanTask.role` / `trigger.system`
（RV-W02〜W05）を必ず埋め、Condition の全分岐を接続する（RV-W01）。

### T1 `scheduled-report-teams` — 定期バッチ集計 → Teams カード通知

```
trigger(時間主導 週次) → condition(営業日か)
  ├ No  → end(休業日: 配信しない)
  └ Yes → condition(多重実行ガード)
      ├ 実行中 → end(二重起動を中止)
      └ 取得   → dataSource(Sheets 台帳 一括取得)
                → action(ヘッダー名で列位置を解決)
                → action(期間フィルタ・重複除去)
                → action(担当者別に集計・前回比を算出)
                → condition(対象が 0 件か)
                    ├ 0件   → action(「該当なし」カードを組み立てる)
                    └ 1件以上 → action(Adaptive Card を組み立てる)
                → integration(Power Automate) → notification(Teams チャネル)
                → action(配信ログへ追記) → end(配信完了)
```

Note: 間隔ゲートによる隔週化 / `atHour()` の 2 段構え / 分母 0 は「—」/
列欠落は即エラー / Script Properties。

### T2 `overdue-reminder` — 未対応者の督促（台帳 × 証跡の突合）

```
trigger(毎日 時間主導) → condition(休業日・送信時刻ゲート)
  ├ 対象外 → end(この時刻は送らない)
  └ 対象   → dataSource(台帳: 対象者一覧)
            → dataSource(証跡: Drive のファイル名・送信ログ)
            → action(氏名を正規化して部分一致で突合)
            → condition(未一致を曖昧一致で救済するか)
                ├ 救済する     → action(編集距離 1 で再突合し救済件数を記録)
                └ 救済しない   → action(未一致として報告枠へ回す)
            → action(期日までの残営業日を計算して閾値で絞る)
            → condition(冪等キーで既送信か)
                ├ 既送信 → end(重複通知を回避)
                └ 未送信 → condition(DRY_RUN か)
                    ├ DRY_RUN → end(ログ出力のみ)
                    └ 本番     → action(送信ログへ先に記録)
                              → integration(Power Automate) → notification(Teams 個人 DM)
                              → action(送信結果でログを更新) → end(督促完了)
```

Note: 冪等キーの構成 / 送信前に記録する理由 / 曖昧一致の救済件数を必ず通知に出す /
Excel Online の改ページ設定。

### T3 `chat-search-bot` — チャット起点 自然文検索 → 出典付き回答

```
trigger(Teams 発話) → ai(検索条件を構造化抽出)
  → action(パラメータ正規化・"-" センチネル)
  → dataSource(台帳を全件取得 ※改ページ ON)
  → action(決定的に AND フィルタ)
  → action(総件数を算出してから上位 N 件を切る)
  → condition(該当が 0 件か)
      ├ 0件   → notification(該当なしと条件緩和の提案)  → end
      └ 1件以上 → ai(適合理由を言語化・出典を付ける)
                → notification(Adaptive Card で回答) → end(回答完了)
```

Note: **LLM に絞り込みの後処理をさせない**（11 件目以降を静かに取りこぼす）/
省略可パラメータは Copilot Studio の入力一覧から消えるため `-` センチネル /
機密列は出力時除外ではなく読み取り範囲から外す。

### T4 `llm-extract-approve` — LLM 抽出 → 人の確認 → 承認後だけ反映

```
trigger(レコード画面の Quick Action) → dataSource(レコードと関連データ)
  → condition(入力テキストがあるか)
      ├ なし → end(AI を実行せず停止)
      └ あり → action(プロンプトを組み立てる)
              → ai(構造化抽出 ※明記なしは null・推測禁止)
              → action(スキーマ検証・許可リスト検査)
              → humanTask(担当者が確認画面で内容を確認)
              → condition(承認したか)
                  ├ 却下 → end(何も更新しない)
                  └ 承認 → action(AI 用項目のみ更新 ※標準項目は触らない)
                          → notification(更新結果を担当者へ通知) → end(反映完了)
```

Note: 自動保存・自動送信をしない安全境界 / AI が書き換えてよい項目の限定 /
認証情報は Named Credential 等でコード外に置く。

## 4. テスト

| 対象 | 内容 |
|---|---|
| `templateCatalog.test.ts` | 全テンプレートが deserialize できる / `catalog.target` が JSON と一致 / id 重複なし / `REFERENCE_TEMPLATE_ID` が存在する |
| `templateCatalog.test.ts` | 全テンプレートが Flow Review で ERROR 0 件（TP-10）※review の domain は純関数なので参照できる |
| `projectUseCases.test.ts` | `loadTemplate` が store を置き換える / 未知の id で false / `loadSampleProjectIfEmpty` の挙動が変わらない |

`review` の domain を `project` のテストから import すると依存方向に反する
（feature モジュール間の直接 import は禁止）。ERROR 0 件の検査は
**`review` モジュール側のテスト**（`reviewWorkflow.test.ts` か新規
`templates.review.test.ts`）に置き、テンプレート JSON を `?raw` で読む。

## 5. 未解決

- 残り 7 パターンの実装時期（§1.2 の ★ なし。roadmap §4 へ追記するか要確認）
- ユーザー自作テンプレートの保存（対象外。Save Project で代替できる）
- 初回起動をギャラリーにするか（今回は現状維持）
