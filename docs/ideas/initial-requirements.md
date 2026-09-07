# GOOYA Canvas 実装引き継ぎ書

## 1. プロジェクト概要

### プロダクト名

GOOYA Canvas

### コンセプト

業務を描く。実装につなぐ。

GOOYA Canvasは、FDE・AIエンジニア・開発者がクライアントや社内依頼者へのヒアリングを行いながら、業務フローを視覚的に設計するWebアプリケーションである。

Draw.ioのようにノードと線を使って業務フローを組み立てるが、単なる図ではなく、それぞれのノードに「トリガー」「条件判定」「待機」「人間による作業」「通知」「AI処理」などの意味を持たせる。

完成したフローから、AIコーディングツールへ渡せる実装プロンプトを自動生成する。

基本思想は以下。

```text
ヒアリング
   ↓
業務フローをCanvasで設計
   ↓
構造化されたWorkflowデータ
   ↓
仕様・実装プロンプトを自動生成
   ↓
Codex / Claude Code / Gemini CLI等
   ↓
実装
```

GOOYA Canvas自体は業務自動化を実行するシステムではない。
業務要件を実装可能な形へ変換するDesign Tool / Requirement Engineering Toolである。

## 2. 主な利用者

### Primary User

GOOYAの以下の職種。

- FDE
- AIコンサルタント
- AIエンジニア
- Web/業務システム開発者

基本的には開発者側が利用する。
依頼者へ「自分でノーコード開発してください」と要求するツールではない。

FDEがヒアリングをしながらCanvasを操作し、
「現在の業務はこういう流れですね」
「この場合はどうなりますか？」
「ここで誰が判断しますか？」
などを確認しながら業務を構造化する用途を中心とする。

### Secondary User

ツール操作に慣れた依頼者・業務担当者については、自身でフローを作成して開発者へ渡せるようにしてもよい。

## 3. 解決したい課題

業務改善案件では、依頼内容が次のような曖昧な自然言語から始まることが多い。

例：
Google Calendarで面接が終わった1時間後にTeamsで評価を催促したい。

しかし実装するには、

- どのCalendarを対象にするのか
- 面接終了の定義
- キャンセル時の処理
- 面接官の特定方法
- 評価済み判定方法
- 通知先
- 営業時間外の扱い
- 再通知条件
- 最大通知回数
- API失敗時
- 重複実行時

など多数の追加要件を整理する必要がある。

現在はこれを、

- 会話
- メモ
- Draw.io
- 仕様書
- チャット

などへ分散して記録している。

GOOYA Canvasでは、
業務フローそのものを構造化データとして保持し、そのデータから実装仕様を生成する。

## 4. MVPのスコープ

MVPでは以下を実装する。

### 必須

1. Workflow Canvas
2. ノード追加
3. ノード移動
4. ノード接続
5. ノード削除
6. ノード複製
7. 複数選択
8. ズーム / パン
9. MiniMap
10. Node Inspector
11. Edge設定
12. Undo / Redo
13. JSON保存
14. JSON読込
15. PDF出力
16. PNG出力
17. 実装プロンプト生成
18. フロー簡易レビュー
19. 新規プロジェクト作成

### MVPでは実装しない

- ユーザー認証
- DB
- サーバー保存
- リアルタイム共同編集
- Google Drive API連携
- Microsoft Graph連携
- Power Automate実行
- Cloudflare Workflow実行
- GAS生成・デプロイ
- AIによる直接的なコード実行
- プロジェクト共有機能
- 権限管理

## 5. 保存方式

GOOYA CanvasはサーバーDBを持たない。
Canvasのプロジェクトそのものをファイルとして扱う。

推奨ファイル形式

```text
*.gooya-canvas.json
```

JSONであることを明示的に残し、MVP段階での解析・デバッグ・Git管理を容易にする。

例：

```text
interview-reminder.gooya-canvas.json
sales-kpi-notification.gooya-canvas.json
attendance-reminder.gooya-canvas.json
```

ユーザーは、

```text
GOOYA Canvas
   ↓
Save Project
   ↓
.gooya-canvas.json
   ↓
PC / Google Drive / SharePoint等へ保存
```

という運用を行う。

Google DriveへGOOYA Canvas自身が保存する機能はMVPでは実装しない。
ユーザーが書き出したファイルをDriveへ配置すればよい。

## 6. 技術スタック

### Frontend

```text
React
TypeScript
Vite
```

### Canvas Engine

```text
@xyflow/react
```

React FlowをCanvasエンジンとして利用する。
自前で以下を実装し直さないこと。

- Node dragging
- Edge connection
- Zoom
- Pan
- Selection
- Multi-selection
- Viewport
- MiniMap
- Controls

GOOYA Canvas独自機能はCustom Nodeとして実装する。

### State Management

```text
Zustand
```

Canvas全体の状態を一元管理する。
React Flowのnodes / edgesだけでなく、

- project metadata
- selectedNodeId
- selectedEdgeId
- inspector state
- prompt settings
- history
- dirty state

等も管理する。

### Schema Validation

```text
Zod
```

読み込んだプロジェクトJSONを必ずvalidateする。
未知・破損・古いschemaVersionのファイルをそのままstateへ入れない。

### Styling

推奨：

```text
Tailwind CSS
```

必要に応じて、

```text
Radix UI
```

等を利用してよい。

Canvas本体のノードは独自デザインとする。
特定UIフレームワークへ強く依存しすぎないこと。

## 7. Next.jsを採用しない理由

今回のMVPでは、

- DBなし
- 認証なし
- APIなし
- SSR不要
- SEO不要
- Server Actions不要
- サーバーサイドデータ取得不要

である。

アプリの中心は、

```text
Canvas manipulation
state management
drag & drop
browser file APIs
export
prompt generation
```

であり、ほぼすべてClient Side処理となる。

そのためMVPは、
React + ViteによるSPA
とする。

将来的に、

- SSO
- 組織認証
- AI API proxy
- Google Drive直接保存
- プロジェクト共有
- 共同編集
- Audit Log

などを実装するときにNext.js等のフルスタック構成を再検討する。

## 8. 基本画面

デスクトップ利用を前提とする。

```text
┌─────────────────────────────────────────────────────────────┐
│ GOOYA Canvas     File  Edit  View       Review  Prompt      │
├────────────┬───────────────────────────────┬────────────────┤
│            │                               │                │
│ Nodes      │                               │ Inspector      │
│            │                               │                │
│ Trigger    │        Workflow Canvas        │ Node name      │
│ Data       │                               │ Description    │
│ Action     │                               │ Provider       │
│ Condition  │                               │ Settings       │
│ Wait       │                               │                │
│ Human      │                               │                │
│ Notify     │                               │                │
│ AI         │                               │                │
│ End        │                               │                │
│            │                               │                │
├────────────┴───────────────────────────────┴────────────────┤
│ Status / validation                                         │
└─────────────────────────────────────────────────────────────┘
```

## 9. Header

Headerには最低限以下を配置する。

File

- New
- Open Project
- Save Project
- Export PDF
- Export PNG

Edit

- Undo
- Redo
- Delete
- Duplicate

View

- Fit View
- Zoom In
- Zoom Out

Main Actions

- Review Flow
- Generate Prompt

## 10. Node Palette

左側へNode Paletteを配置する。
MVPでは以下を用意する。

### 1. Trigger

業務開始条件。
例：

- Calendar Event
- Schedule
- Form Submitted
- File Created
- Manual Trigger
- API Event

### 2. Data Source

データ取得元。
例：

- Google Sheets
- Excel
- Salesforce
- HRMOS
- BigQuery
- SharePoint
- Database
- API

### 3. Action

通常処理。
例：

- データ取得
- データ更新
- 集計
- ファイル生成
- API呼び出し

### 4. Condition

条件分岐。
最低2つのSource Handleを持つ。

初期値：

```text
Yes
No
```

ユーザーが、

```text
Completed
Pending
```

などへ変更可能とする。

### 5. Wait

待機。
例：

```text
60 minutes
24 hours
Until 09:00
Next business day
```

MVPでは完全なスケジューラを実装する必要はない。
設計情報として保持する。

### 6. Human Task

人間による作業。
例：

```text
面接官が評価入力
上長が承認
担当者が内容確認
```

設定：

- Role
- Action
- Expected Result

### 7. Notification

通知。
Provider例：

- Microsoft Teams
- Email
- Slack
- Other

設定：

- Recipient
- Message
- Purpose

### 8. AI

AI処理。
例：

- Summarize
- Classify
- Extract
- Generate
- Evaluate

設定：

- Task
- Input
- Expected Output
- Constraints

特定AI Providerへ依存させない。

### 9. Integration

外部システムとの接続。
例：

```text
REST API
Webhook
Microsoft Graph
Google API
Salesforce API
```

### 10. End

Workflow終了。
例：

```text
Completed
Cancelled
Failed
No Action
```

### 11. Note

設計上の補足。
Workflow処理としてPromptへ必須ではないが、コメントとして出力可能にする。

## 11. Nodeデザイン

Nodeは単なる四角ではなく、種類が視覚的に判別できるようにする。

共通構造：

```text
┌─────────────────────────┐
│ icon  NODE TYPE         │
├─────────────────────────┤
│ 面接予定終了            │
│                         │
│ Google Calendar         │
└─────────────────────────┘
```

Nodeには最低限、

- icon
- node type
- title
- short description

を表示する。

詳細情報はInspectorへ表示する。
Canvas上に情報を詰め込みすぎない。

## 12. Inspector

Nodeをクリックすると右側Inspectorを表示する。

共通項目：

```text
Name
Description
Node Type
Notes
```

Node Typeごとの専用設定を追加する。

例：

Wait

```text
Duration: 60
Unit: minutes
```

Notification

```text
Provider: Microsoft Teams
Recipient: Interviewer
Message: 面接評価の入力状況をご確認ください
```

Human Task

```text
Role: Interviewer
Action: Complete evaluation
```

## 13. Edge

Edgeにも意味を持たせる。

通常Edge：

```text
A → B
```

Condition Edge：

```text
Yes
No
Completed
Pending
Success
Failure
```

などのlabelを持つ。

Condition NodeではsourceHandleIdを利用して分岐を区別する。

## 14. Workflowデータモデル

以下を基本とする。

```ts
type WorkflowProject = {
  schemaVersion: string;

  metadata: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };

  viewport: {
    x: number;
    y: number;
    zoom: number;
  };

  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  promptSettings?: {
    target?: string;
    language?: "ja" | "en";
    additionalInstructions?: string;
  };
};
```

## 15. Nodeデータ

概念例：

```ts
type WorkflowNodeKind =
  | "trigger"
  | "dataSource"
  | "action"
  | "condition"
  | "wait"
  | "humanTask"
  | "notification"
  | "ai"
  | "integration"
  | "end"
  | "note";
```

Node：

```ts
type WorkflowNode = {
  id: string;
  type: WorkflowNodeKind;

  position: {
    x: number;
    y: number;
  };

  data: {
    title: string;
    description?: string;
    config: Record<string, unknown>;
    notes?: string;
  };
};
```

## 16. Edgeデータ

```ts
type WorkflowEdge = {
  id: string;
  source: string;
  target: string;

  sourceHandle?: string;
  targetHandle?: string;

  label?: string;

  data?: {
    description?: string;
  };
};
```

React Flow独自型とDomain型を完全に密結合させすぎないこと。
将来的なschema migrationを考慮する。

## 17. Project File

Save Project時は、

```text
WorkflowProject
↓
Zod Validation
↓
JSON.stringify()
↓
Blob
↓
download
```

とする。

ファイル名：

```text
{project-name}.gooya-canvas.json
```

## 18. Open Project

Open Projectは、

```text
File Picker
↓
File.text()
↓
JSON.parse()
↓
Zod Validation
↓
Schema Migration
↓
Canvas State
↓
fitView()
```

とする。

異常ファイルの場合はCanvasを破壊せず、

```text
このファイルを開けませんでした。
GOOYA Canvasのプロジェクトファイルか確認してください。
```

と表示する。

## 19. Schema Version

必ずschemaVersionを持たせる。

例：

```json
{
  "schemaVersion": "1.0"
}
```

将来Node構造が変更された場合、

```text
1.0
 ↓
migrate
 ↓
1.1
```

というmigrationを可能にする。

## 20. ローカル保存

サーバーDBは使用しない。
プロジェクトファイルを正式な保存先とする。

ただしUX向上のため、

```text
localStorage
```

を利用した一時的なCrash Recoveryを実装してもよい。

これは正式保存ではない。

例：

```text
Unsaved recovery data found.
Restore?
```

という用途に限定する。

## 21. PDF出力

Canvas全体をPDFとして出力できること。

MVPでは、
Canvas全体を1ページへFitさせたPDF
でよい。

基本フロー：

```text
Canvas bounds取得
↓
Export用表示へ切替
↓
高解像度Image生成
↓
PDFへ配置
↓
Download
```

Export時には以下を非表示にする。

- Handles
- Selection Border
- MiniMap
- Controls
- Inspector
- Toolbar
- Grid

PDFへは、

- Project Name
- Workflow
- Generated Date

程度の情報を入れてよい。

巨大Workflowへの複数ページ分割はPhase 2とする。

## 22. PNG Export

Canvas全体を高解像度PNGとして出力する。

Export対象はViewportに見えている領域ではなく、
全Node / EdgeのBounding Box
とする。

## 23. Prompt Generator

GOOYA Canvasの中心機能。

MVPではLLM APIを必須にしない。
Workflow JSONから決定論的にMarkdown Promptを生成する。

つまり、

```text
Workflow JSON
↓
Prompt Generator
↓
Markdown
```

とする。

外部AIへCanvasの内容を送信しなくても動作すること。

## 24. Prompt出力例

例：

```markdown
# 実装依頼

Google Calendarを利用した面接評価リマインダーを実装してください。

## 目的

面接終了後に評価入力が放置されることを防止します。

## Workflow

1. Google Calendarから面接終了イベントを受け取る
2. 60分待機する
3. 評価完了状態を確認する
4. 完了している場合は処理を終了する
5. 未完了の場合はMicrosoft Teamsへ通知する
6. 24時間待機する
7. 再度評価状態を確認する
8. 未完了の場合は再通知する

## Trigger

Google Calendar
Event completed

## Conditions

### Evaluation completed?

Completed:
- End

Pending:
- Send Teams notification

## Human Tasks

Interviewer:
- Complete interview evaluation

## Notifications

Provider:
Microsoft Teams

Recipient:
Interviewer

Message:
面接評価の入力状況をご確認ください。

## Constraints

- 評価済みの場合は通知しない
- 同じイベントへの二重通知を防止する

## Open Questions

- 面接キャンセル時の処理が定義されていません
- API失敗時の処理が定義されていません

## Acceptance Criteria

1. 面接終了60分後に評価未完了なら通知される
2. 評価完了済みの場合は通知されない
3. 再通知後に評価完了した場合、その後の通知は行われない
```

## 25. Prompt Panel

Generate Promptを押すとDrawerまたはModalを開く。

画面：

```text
┌─────────────────────────────────┐
│ Implementation Prompt           │
├─────────────────────────────────┤
│                                 │
│ # 実装依頼                      │
│ ...                             │
│                                 │
├─────────────────────────────────┤
│ Target                          │
│ [ Generic ▼ ]                   │
│                                 │
│ [Copy Prompt]                   │
└─────────────────────────────────┘
```

Target候補：

```text
Generic
Google Apps Script
Power Automate
Cloudflare
Azure
Web Application
Other
```

MVPではTargetによって細かいコード生成をする必要はない。

Prompt内へ、

```text
Implementation target: Google Apps Script
```

などを追加する程度でもよい。

## 26. Flow Review

もう一つの重要機能。

Canvasを解析して、要件不足を表示する。
MVPではAI APIを使わず、Rule-basedでよい。

例：

ERROR

- Triggerが存在しない
- Endが存在しない
- 接続されていないNodeがある

WARNING

- Conditionの片方の分岐が未接続
- NotificationのRecipientが空
- WaitのDurationが未設定
- Human TaskのRoleが未設定
- Triggerの対象システムが未定義
- Workflowに終了経路が存在しない可能性
- Notification後の終了条件が不明

INFO

- API失敗時の処理が定義されていない
- 重複実行対策が記載されていない
- Loggingについて記載がない

## 27. Review UI

```text
Flow Review

2 Errors
4 Warnings
3 Suggestions

ERROR
Condition「評価済み？」の
Pending側が接続されていません。

WARNING
Teams通知のRecipientが未設定です。

SUGGESTION
API失敗時の処理を検討してください。
```

Nodeに関係する問題をクリックすると、
該当Nodeを選択してCanvas中央へ移動する。

## 28. AI機能について

MVPでは外部LLM APIを必須にしない。
以下はPhase 2。

### AI Draft

自然言語：

```text
Google Calendarで面接終了後、
1時間待って評価未完了ならTeams通知。
24時間後も未完了なら再通知。
```

↓
Workflow JSON
↓
Canvas生成

### AI Review

Rule-based Reviewに加えてAIが、

- 業務例外
- 運用上のリスク
- セキュリティ
- 権限
- エラー処理
- 人間による判断
- SLA

などをレビューする。

### AI Enhance Prompt

Deterministic Generatorが生成したPromptをLLMで補強する。

## 29. AI APIの扱い

現時点では、
外部LLM APIキーをGOOYA Canvasへハードコードしないこと。

MVPではAI APIなしでも価値が成立する構造にする。

将来的にAI APIを導入する場合は、

- BYOK
- 社内API Gateway
- Azure OpenAI
- OpenAI API Proxy

などを別途検討する。

## 30. Undo / Redo

以下をHistory対象とする。

- Node追加
- Node削除
- Node移動
- Node編集
- Edge追加
- Edge削除
- Edge編集

ViewportのZoom/PanはHistory対象外でよい。

## 31. Keyboard Shortcuts

最低限：

```text
Delete
Node / Edge削除

Ctrl + Z
Undo

Ctrl + Shift + Z
Redo

Ctrl + D
Duplicate

Ctrl + C
Copy

Ctrl + V
Paste

Ctrl + S
Save Project

Ctrl + O
Open Project

Ctrl + A
Select All
```

ブラウザ標準動作と競合する場合は適切にpreventDefaultする。
ただしInput / Textarea入力中はCanvas Shortcutを無効化する。

## 32. Connection Validation

Node Typeに応じて接続ルールを持たせる。

例：

Trigger：

```text
incoming: 0
outgoing: many
```

End：

```text
incoming: many
outgoing: 0
```

Condition：

```text
incoming: many
outgoing: branches
```

自分自身への接続は禁止。

ただしWorkflowにはRetryなどでLoopが存在し得るため、
Cycle自体は禁止しない。

## 33. Canvas UX

Draw.ioに近い操作感を目指す。

必要なもの：

- Grid
- Snap to Grid
- Selection Rectangle
- Multi Select
- Drag
- Zoom
- Pan
- Fit View
- MiniMap
- Connection Handles
- Edge Labels
- Context Menu

Context Menu：

```text
Edit
Duplicate
Delete
```

## 34. Auto Layout

MVPでは必須ではない。

Phase 2で、

```text
ELK.js
```

等を利用したAuto Layoutを検討する。

ボタン：

```text
Tidy Flow
```

を押すと、

```text
Left → Right
```

または、

```text
Top → Bottom
```

へ整理できるようにする。

## 35. Swimlane

非常に有用だがMVP後でよい。

例えば、

```text
┌───────── User ─────────┐
│ Form Submit            │
└────────────────────────┘

┌──────── System ────────┐
│ Validate → Save        │
└────────────────────────┘

┌──────── Manager ───────┐
│ Review → Approve       │
└────────────────────────┘
```

として、

- 人
- 部署
- システム

の責任範囲を可視化する。

FDEのヒアリング用途では非常に重要な機能になる可能性がある。

## 36. Templates

Phase 2。

GOOYA社内で作成した業務改善事例をTemplateとして提供する。

例：

```text
面接評価リマインド
勤務表提出催促
営業KPI週次通知
問い合わせ分類
Teams週次サマリー
Salesforce自動入力
議事録→タスク生成
```

Templateも通常の、

```text
.gooya-canvas.json
```

として管理可能とする。

## 37. 推奨ディレクトリ

```text
src/
├─ app/
│  └─ App.tsx
│
├─ components/
│  ├─ canvas/
│  │  ├─ WorkflowCanvas.tsx
│  │  ├─ CanvasToolbar.tsx
│  │  ├─ NodePalette.tsx
│  │  └─ CanvasContextMenu.tsx
│  │
│  ├─ inspector/
│  │  ├─ Inspector.tsx
│  │  ├─ TriggerInspector.tsx
│  │  ├─ ConditionInspector.tsx
│  │  ├─ WaitInspector.tsx
│  │  └─ NotificationInspector.tsx
│  │
│  ├─ nodes/
│  │  ├─ BaseWorkflowNode.tsx
│  │  ├─ TriggerNode.tsx
│  │  ├─ DataSourceNode.tsx
│  │  ├─ ActionNode.tsx
│  │  ├─ ConditionNode.tsx
│  │  ├─ WaitNode.tsx
│  │  ├─ HumanTaskNode.tsx
│  │  ├─ NotificationNode.tsx
│  │  ├─ AiNode.tsx
│  │  ├─ IntegrationNode.tsx
│  │  └─ EndNode.tsx
│  │
│  ├─ prompt/
│  │  └─ PromptPanel.tsx
│  │
│  └─ review/
│     └─ ReviewPanel.tsx
│
├─ domain/
│  ├─ workflow.ts
│  ├─ node-types.ts
│  └─ schemas.ts
│
├─ store/
│  └─ workflowStore.ts
│
├─ generators/
│  ├─ promptGenerator.ts
│  ├─ pdfExporter.ts
│  └─ imageExporter.ts
│
├─ validators/
│  └─ workflowValidator.ts
│
├─ persistence/
│  ├─ projectReader.ts
│  ├─ projectWriter.ts
│  └─ migrations.ts
│
└─ utils/
```

## 38. アーキテクチャ上の重要ルール

Canvas UIとWorkflow Domainを分離する。

悪い例：

```text
Prompt Generator
↓
ReactFlow Nodeを直接読む
```

良い例：

```text
ReactFlow UI
      ↓
Workflow Domain Model
      ↓
 ┌────┼────────┐
 ↓    ↓        ↓
JSON Prompt   Review
```

React FlowはRenderer / Interaction Engineとして扱う。

GOOYA Canvasの本当の資産は、
Workflow Domain Model
である。

## 39. セキュリティ方針

MVPではサーバーへWorkflowを送信しない。

可能な限り、

```text
Browser Only
```

で処理する。

外部フォント・外部スクリプトも必要最低限とする。

可能であれば、

- System Font
- Bundled Icons

を利用する。

Workflowには実際の、

- API Key
- Password
- Access Token
- Webhook Secret

を保存させない。

Nodeには、

```text
Authentication: OAuth required
```

などの設計情報だけを保持する。

## 40. MVP初期サンプル

最初から空Canvasだけを出さず、
サンプルプロジェクトを1つ用意する。

Interview Evaluation Reminder

```text
Google Calendar
      ↓
面接終了
      ↓
60分待機
      ↓
評価済み？
   ┌──┴──┐
  Yes    No
   ↓      ↓
  End   Teams通知
          ↓
       24時間待機
          ↓
       評価済み？
       ┌──┴──┐
      Yes    No
       ↓      ↓
      End   再通知
              ↓
             End
```

これをGOOYA CanvasのReference Workflowとする。

## 41. MVP Acceptance Criteria

### Canvas

- NodeをPaletteから追加できる
- Nodeを自由に移動できる
- Node同士を接続できる
- Edgeを削除できる
- Nodeを削除できる
- Nodeを複製できる
- Zoom / Panできる
- Fit Viewできる
- MiniMapが使える

### Inspector

- Node選択で設定を編集できる
- 編集内容が即Canvasへ反映される

### Persistence

- `.gooya-canvas.json` をDownloadできる
- 保存したファイルを再読込できる
- 読込前後でNode位置・Edge・設定が一致する
- 不正JSONを読み込んでもアプリが壊れない

### Export

- Canvas全体をPNG化できる
- Canvas全体をPDF化できる
- Export画像にEditor UIが含まれない
- Canvasの端が切れない

### Prompt

- WorkflowからMarkdown Promptを生成できる
- Node順序と分岐がPromptへ反映される
- Node設定値がPromptへ反映される
- PromptをClipboardへコピーできる

### Review

- 未接続Nodeを検出できる
- Triggerなしを検出できる
- Endなしを検出できる
- Condition未接続Branchを検出できる
- 必須Node設定の欠落を検出できる

## 42. Test

### Unit Test

以下を重点的にテストする。

```text
Workflow Schema
Project serialization
Project deserialization
Schema migration
Prompt generation
Flow validation
```

Canvas UIより、
Domain Model / Generator / Validator
のテストを重視する。

### E2E

Playwright等で、

```text
New Project
↓
Add Nodes
↓
Connect
↓
Edit
↓
Save
↓
Open
↓
Generate Prompt
```

の主要導線を検証する。

## 43. 開発順序

以下の順番で実装する。

### Phase 0

Project setup

```text
React
TypeScript
Vite
React Flow
Zustand
Zod
```

### Phase 1

Canvas foundation

- React Flow配置
- Node追加
- Node移動
- Edge接続
- Zoom
- Pan
- MiniMap

### Phase 2

Custom Nodes

- Trigger
- Action
- Condition
- Wait
- Notification
- Human
- AI
- End

### Phase 3

Inspector

各Node設定UI。

### Phase 4

Project Persistence

- Save JSON
- Open JSON
- Schema Validation

### Phase 5

Prompt Generator

Workflow → Markdown。

### Phase 6

Flow Review

Rule-based validation。

### Phase 7

Export

- PNG
- PDF

### Phase 8

UX Polish

- Undo / Redo
- Keyboard Shortcut
- Context Menu
- Copy / Paste
- Snap
- Dirty Indicator

## 44. 最重要の設計思想

GOOYA Canvasを、
Power Automateやn8nの競合にしないこと。

GOOYA Canvas自身はWorkflowを実行しない。

役割は、

```text
Business Requirement
       ↓
Visual Workflow
       ↓
Structured Specification
       ↓
Implementation Prompt
```

である。

Power Automate、GAS、Cloudflare、Azure Functions、n8nなどは、
GOOYA Canvasが作った設計の実装先
と捉える。

## 45. 将来的な理想形

最終的には、

```text
依頼者
「毎週Excelを確認して、
数字が悪い担当者へTeamsしています」
           ↓
FDEがGOOYA Canvasを操作
           ↓
業務Flow完成
           ↓
GOOYA Canvasが抜け漏れを指摘
           ↓
FDEが追加ヒアリング
           ↓
Flow完成
           ↓
Generate Prompt
           ↓
Codex / Claude Code
           ↓
実装
           ↓
成功したCanvasをTemplate化
           ↓
次の案件で再利用
```

というサイクルを実現する。

蓄積するべき資産は単なるソースコードではない。
GOOYAがどう業務を分析し、どう改善したかという「業務改善の設計図」そのものを資産化する。

これをGOOYA Canvasの中核思想とする。
