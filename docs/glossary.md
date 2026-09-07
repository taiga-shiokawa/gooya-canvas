# GOOYA Canvas 用語集（ユビキタス言語定義）

本書は GOOYA Canvas のドキュメント・コード・会話で使う用語の**意味の合意**と**コード上の対応**を定義する永続的ドキュメントである。
各用語の仕様詳細は所有文書（`product-requirements.md` / `functional-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md`）が持ち、本書は定義を重複転記しない。

表記原則: UI・コード・ドキュメント見出しでは英語表記（Node / Edge / Inspector 等）を正とし、日本語は説明文中の訳語として用いる（対応は §4）。

---

## 1. ドメイン用語

### 1.1 Workflow とその構成要素

| 用語 | 定義 | 詳細 |
|---|---|---|
| Workflow | ノードとエッジで表現された業務フローの構造化データ。GOOYA Canvas が蓄積する中心資産であり、JSON 保存・Prompt 生成・Flow Review すべての入力となる | functional-design §2.4 |
| Workflow Domain Model | Workflow を表す純粋 TypeScript の型・Zod スキーマ・migration・接続ルールの総体。React / @xyflow/react に依存しない。Source of Truth は Zustand store が保持する Domain Model である（NFR-010） | functional-design §2 |
| WorkflowProject | プロジェクト 1 件のルート構造（`schemaVersion` / `metadata` / `viewport` / `nodes` / `edges` / `promptSettings`）。プロジェクトファイルの中身そのもの | functional-design §3.2 |
| Node（WorkflowNode） | 業務フローの 1 ステップ。`type`（下表の 11 種）・`position`・`data`（title / description / config / notes）を持つ | functional-design §3.2〜3.3 |
| Edge（WorkflowEdge） | Node 間の接続。`label`（Yes / No / Completed / Pending 等）を持てる | functional-design §5.3 |
| Condition Edge | Condition ノードから出る Edge。`sourceHandle` に分岐名を保持し、分岐名を `label` の初期値とする | functional-design §5.3 |
| Branch（分岐） | Condition ノードの `config.branches`（初期値 `["Yes", "No"]`、ユーザー変更可）。分岐ごとに Source Handle を持つ | functional-design §3.3, §5.2 |
| Source Handle | ノードの出力側接続点。Condition では分岐の識別に使う | functional-design §5.2〜5.3 |
| Connection Validation（接続ルール） | Node Type ごとの接続許否判定（Trigger は incoming 0、End は outgoing 0、自己接続禁止。Cycle は禁止しない）（FR-007） | functional-design §5.2 |

### 1.2 Node の 11 種別

コード値（`WorkflowNodeKind`、camelCase）と意味。config の推奨キーは functional-design §3.3 が所有する。

| コード値 | 表示名 | 意味 |
|---|---|---|
| `trigger` | Trigger | 業務開始条件（Calendar Event / Schedule / Form Submitted 等） |
| `dataSource` | Data Source | データ取得元（Google Sheets / Salesforce / BigQuery 等） |
| `action` | Action | 通常処理（データ取得・更新・集計・ファイル生成・API 呼び出し等） |
| `condition` | Condition | 条件分岐。最低 2 つの Branch を持つ |
| `wait` | Wait | 待機。設計情報として保持し、スケジューラは実装しない |
| `humanTask` | Human Task | 人間による作業（Role / Action / Expected Result） |
| `notification` | Notification | 通知（Provider / Recipient / Message / Purpose） |
| `ai` | AI | AI 処理（Summarize / Classify 等）。特定 AI Provider に依存させない（NFR-011） |
| `integration` | Integration | 外部システムとの接続（REST API / Webhook / Microsoft Graph 等） |
| `end` | End | Workflow の終了（outcome: Completed / Cancelled / Failed / No Action） |
| `note` | Note | 設計上の補足。Workflow 処理には参加せず、Prompt へコメントとして出力可能（FR-022） |

### 1.3 生成・レビュー

| 用語 | 定義 | 詳細 |
|---|---|---|
| Prompt Generator | Workflow Domain Model から**決定論的に** Markdown を生成する中心機能。外部 LLM API を使わない（FR-019） | functional-design §9 |
| Implementation Prompt（実装プロンプト） | Prompt Generator が生成する Markdown の実装依頼文書。Codex / Claude Code 等へそのまま渡す。プロジェクトファイルに次ぐ第 2 の外部契約 | functional-design §9.2, §12 |
| Prompt Target（Implementation Target） | Prompt が想定する実装先の選択肢。`generic` / `google-apps-script` / `power-automate` / `cloudflare` / `azure` / `web-application` / `other` の 7 種 | functional-design §9.3 |
| Prompt Panel | Generate Prompt で開く Drawer / Modal。プレビュー・Target / Language 切替・Copy Prompt を提供する | functional-design §9.3 |
| Flow Review | Workflow を Rule-based で解析し要件不足を指摘する機能。レベルは **ERROR / WARNING / INFO** の 3 段階（INFO は UI 上「SUGGESTION」と表示）。ルール ID は `RV-Exx` / `RV-Wxx` / `RV-Ixx`（FR-023） | functional-design §10 |
| Open Questions | Implementation Prompt 内の未確定事項セクション。Flow Review の WARNING / INFO を転記する | functional-design §9.2 |

### 1.4 永続化・互換性

| 用語 | 定義 | 詳細 |
|---|---|---|
| プロジェクトファイル | `{project-name}.gooya-canvas.json`。プロジェクトの**正式な保存先**であり、本システムの第 1 の外部契約。ユーザー自身が PC / Google Drive / SharePoint 等へ配置する | functional-design §7, §12 |
| schemaVersion | プロジェクトファイルの構造バージョン。現行 `"1.0"`（定数 `SCHEMA_VERSION`）。現行版より新しいファイルは開かない（FR-014） | functional-design §7.4 |
| Schema Migration | 旧 schemaVersion のファイルを読込時に現行版へ順次変換する純関数の連鎖。MVP 時点でレジストリは空 | functional-design §7.4 |
| Crash Recovery | dirty 状態の Domain Model を localStorage へ自動保存し、起動時に復元を提案する仕組み。**正式保存ではない**（NFR-006） | functional-design §7.5 |
| Port（ポート） | application 層が定義し infrastructure 層が実装する interface。5 種（§5.2）。依存性逆転の担保点 | functional-design §2.3 |
| Reference Workflow | 初回起動時に読み込まれるサンプルプロジェクト「**Interview Evaluation Reminder**」（面接評価リマインダー）（FR-015） | functional-design §7.6 |

### 1.5 MVP 後の拡張候補の用語（development-roadmap §4）

| 用語 | 定義 |
|---|---|
| AI Draft | 自然言語から Workflow JSON を生成して Canvas 化する機能 |
| AI Review | Rule-based Review に加え、業務例外・運用リスク・セキュリティ等を AI がレビューする機能 |
| AI Enhance Prompt | 決定論的に生成した Prompt を LLM で補強する機能 |
| Auto Layout（Tidy Flow） | ELK.js 等による Left→Right / Top→Bottom の自動整列 |
| Swimlane | 人・部署・システムの責任範囲をレーンとして可視化する表現。FDE のヒアリング用途で重要になる可能性がある |
| Template | 社内業務改善事例を通常の `.gooya-canvas.json` として提供・再利用する仕組み |

## 2. ビジネス用語

| 用語 | 定義 |
|---|---|
| FDE | GOOYA 社内の職種で、本プロダクトの中心ユーザー。ヒアリングをしながら Canvas を操作し業務を構造化する。正式名称（略語の展開）: （要確認）— 全文書で未定義 |
| Primary User | GOOYA 社内の FDE・AIコンサルタント・AIエンジニア・Web/業務システム開発者。基本的に開発者側が利用する |
| Secondary User | ツール操作に慣れた依頼者・業務担当者。自身でフローを作成して開発者へ渡す使い方を許容する |
| ヒアリング | FDE が依頼者へ業務内容を確認する行為。GOOYA Canvas はヒアリング中のその場での構造化を支援する |
| Design Tool / Requirement Engineering Tool | GOOYA Canvas の位置づけ。業務自動化を**実行しない**。業務要件を実装可能な形へ変換する設計ツールである |
| 実装先 | Power Automate / GAS / Cloudflare / Azure Functions / n8n 等。GOOYA Canvas の競合ではなく、生成した設計の実装対象と捉える |
| 業務改善の設計図 | GOOYA Canvas が資産化する対象。ソースコードではなく「どう業務を分析し、どう改善したか」の記録そのもの（中核思想） |
| MVP | 本ドキュメント群が定義する初期リリース範囲。サーバー・DB・認証・外部 LLM API を持たない Browser Only 構成 |
| Phase 2 | development-roadmap では実装フェーズ名（Phase 0〜8 の一つ）。MVP 後の拡張候補群の意味では用いない — その意味では「MVP 後の拡張候補（development-roadmap §4）」と表記する（用語は §1.5） |
| BYOK | Bring Your Own Key。将来 AI API を導入する場合の候補方式の一つ（ユーザー自身の API キーを利用する。NFR-003 関連） |

## 3. UI/UX 用語

| 用語 | 定義 | 詳細 |
|---|---|---|
| Workflow Canvas | 中央ペイン。ノードと線で業務フローを編集する領域 | functional-design §4.1 |
| Node Palette | 左ペイン。11 種の Node をドラッグ&ドロップで Canvas へ追加する一覧 | functional-design §5.1 |
| Inspector | 右ペイン。選択中の Node / Edge の共通項目と Node Type 別設定を編集する。編集は即 Canvas へ反映（AC-011） | functional-design §6 |
| Review Panel | Flow Review の結果（件数サマリと問題一覧）を表示するパネル。問題クリックで該当 Node を選択し Canvas 中央へ移動（FR-024） | functional-design §10.3 |
| Header | 上部メニュー。File / Edit / View と Main Actions（Review Flow / Generate Prompt） | functional-design §4.2 |
| Status Bar（ステータスバー） | 下部バー。dirty 状態と直近 Review サマリを表示 | functional-design §4.3 |
| MiniMap | Canvas 全体の縮小表示（React Flow 提供） | FR-003 |
| Fit View | 全 Node / Edge が収まるよう Viewport を調整する操作 | FR-003 |
| Viewport | Canvas の表示位置とズーム（x / y / zoom）。Undo / Redo の履歴対象外 | functional-design §11 |
| Grid / Snap to Grid | Canvas の格子表示と、移動時の格子吸着 | FR-004 |
| Selection Rectangle | ドラッグ矩形による複数選択 | FR-004 |
| Context Menu | Node / Edge 上の右クリックメニュー（Edit / Duplicate / Delete） | functional-design §5.4 |
| Edge Label | Canvas 上に表示される Edge の `label` | functional-design §5.3 |
| dirty | 未保存変更がある状態。ステータスバーに表示し、New / Open 時は確認ダイアログを挟む | functional-design §7.1〜7.3 |
| Handles | ノードの接続点。Export 時に非表示にする Editor UI の一つ（AC-018） | functional-design §8.3 |

## 4. 英語・日本語対応表

ドキュメント・UI では英語表記を正とする。日本語訳は説明文中でのみ用いる。

| 英語（正） | 日本語 | 備考 |
|---|---|---|
| Workflow | 業務フロー | データとしては「Workflow」、業務の文脈では「業務フロー」 |
| Node | ノード | |
| Edge | エッジ / 線 | |
| Trigger | トリガー | |
| Condition | 条件分岐 | `product-requirements.md`（FR-010）の表記に統一する。「条件判定」は用いない |
| Wait | 待機 | |
| Human Task | 人間による作業 | |
| Notification | 通知 | |
| AI | AI 処理 | |
| Data Source | データ取得元 | |
| Integration | 外部システムとの接続 | |
| End | 終了 | |
| Note | 補足 / 注釈 | |
| Implementation Prompt | 実装プロンプト | |
| Flow Review | フロー簡易レビュー | 初期要求メモの機能名。本文では「Flow Review」を正とする |
| Save Project / Open Project | 保存 / 読込 | |
| Export | 出力 | PNG / PDF |
| Branch | 分岐 | |
| dirty | 未保存変更あり | |

## 5. コード上の命名規則（用語とコードの対応）

命名規則の全体は `development-guidelines.md` §3 が所有する。ここではドメイン用語との対応のみ示す。

### 5.1 型・スキーマ・定数

| 用語 | コード上の識別子 | 規則 |
|---|---|---|
| Workflow Domain Model の型 | `WorkflowProject` / `WorkflowNode` / `WorkflowEdge` / `WorkflowNodeKind` / `PromptTarget` | PascalCase |
| Node 種別のリテラル | `"trigger"` `"dataSource"` `"action"` `"condition"` `"wait"` `"humanTask"` `"notification"` `"ai"` `"integration"` `"end"` `"note"` | camelCase 文字列 |
| Prompt Target のリテラル | `"generic"` `"google-apps-script"` `"power-automate"` `"cloudflare"` `"azure"` `"web-application"` `"other"` | kebab-case 文字列 |
| Zod スキーマ | `<名詞>Schema`（例: `workflowProjectSchema`） | camelCase |
| schemaVersion 現行値の定数 | `SCHEMA_VERSION`（値 `"1.0"`） | UPPER_SNAKE_CASE |
| store フック | `useWorkflowStore` | `use` 始まり |

### 5.2 ポート（5 種）

`<名詞>Port`・1 ポート 1 ファイル。定義場所・実装場所・シグネチャは functional-design §2.3 が所有する。

| ポート | 用途 |
|---|---|
| `ProjectFilePort` | プロジェクトファイルの保存・読込（FR-012, FR-013） |
| `RecoveryStoragePort` | Crash Recovery（NFR-006） |
| `CanvasImagePort` | Canvas の画像化（PNG / PDF の元画像）（FR-016） |
| `PdfComposerPort` | PDF 合成（FR-017） |
| `ClipboardPort` | Prompt のコピー（AC-023） |

### 5.3 主要ユースケース関数

動詞始まり camelCase。

| 関数 | 対応する用語・責務 |
|---|---|
| `generatePrompt` | Prompt Generator（Domain Model → Markdown） |
| `reviewWorkflow` | Flow Review（Domain Model → Review 結果） |

### 5.4 React Flow mapper の接頭辞（3 種）

Domain 型と React Flow 型の変換関数は、変換の向きを接頭辞で表す。React Flow 型が現れるのは `canvas` モジュールの presentation 層の mapper のみで、domain 層には持ち込まない。

| 接頭辞 | 向き | 意味 |
|---|---|---|
| `toReactFlow` | Domain → React Flow | Domain Model を React Flow の型へ写像する |
| `fromReactFlow*` | React Flow → Domain | React Flow から受け取った値を Domain の値へ逆変換する。単一関数ではなく値の種類ごとに分ける |
| `mergeReactFlow*` | Domain → 既存 React Flow 配列 | Domain の変更を既存配列へマージする（既存要素の参照を維持する） |

公開関数の一覧・各関数の責務・`merge` が必要な理由は `architecture.md` §3.3 が所有する。

### 5.5 ファイル命名

| 対象 | 規則 | 例 |
|---|---|---|
| プロジェクトファイル | `{project-name}.gooya-canvas.json`（kebab-case） | `interview-reminder.gooya-canvas.json` |
| バンドルする JSON アセット | kebab-case | `interview-evaluation-reminder.gooya-canvas.json` |

## 6. ID 体系（文書間トレーサビリティ）

| 接頭辞 | 対象 | 所有文書 |
|---|---|---|
| `FR-xxx` | 機能要件 | `product-requirements.md` |
| `NFR-xxx` | 非機能要件 | `product-requirements.md` |
| `US-xxx` | ユーザーストーリー | `product-requirements.md` |
| `AC-xxx` | 受け入れ条件 | `product-requirements.md` |
| `RV-Exx` / `RV-Wxx` / `RV-Ixx` | Flow Review ルール（ERROR / WARNING / INFO） | `functional-design.md` §10.2 |
| `AD-xx` | アーキテクチャ決定 | `architecture.md` |

---

## 付記: 本書の情報源

`docs/product-requirements.md`・`docs/functional-design.md`・`docs/architecture.md`（AD 一覧）・`docs/development-guidelines.md` §3（命名）、および初期要求メモ `docs/ideas/initial-requirements.md`（§10 Node Palette・§28 AI 機能・§35 Swimlane・§36 Templates 等）に基づく。定義の詳細は各所有文書を参照。
