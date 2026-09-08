# Workflow Template 要件

対象: `docs/development-roadmap.md` §4 の拡張候補「Template」。
既存の Persistence（Phase 4）機構をそのまま使う前提（roadmap §4 の記載どおり）。

## 背景

Canvas を空から組み始めるコストが高い。実案件 23 件（社内の GAS / Power Automate /
Copilot Studio 案件）を調査したところ、業務フローの骨格が数パターンに収束しており、
「ユースケースを選ぶと基本ノードが配置済み」の状態から始められれば初動が短くなる。

調査対象と抽出結果は design.md §1 に記載する。

## 機能要件

| # | 要件 | 出典 |
|---|---|---|
| TP-1 | 複数のテンプレートを `.gooya-canvas.json` として持ち、カタログから一覧できる | roadmap §4 |
| TP-2 | File メニューに `New from Template` を追加し、ギャラリーダイアログでテンプレートを選べる | functional-design §4.2 |
| TP-3 | テンプレートを選ぶと現在の Workflow を置き換える。dirty なら確認を挟む（New と同じ扱い） | §7.1 |
| TP-4 | テンプレートは `promptSettings.target` を持ち、選択時にその実装ターゲットが初期選択される | FR-021 |
| TP-5 | ギャラリーはユースケース分類（category）でグルーピングし、実装ターゲットをバッジで示す | — |
| TP-6 | ギャラリーから「空のプロジェクト」も選べる（New と同じ結果） | §7.1 |
| TP-7 | 第 1 弾のテンプレートは 4 本 + 既存サンプル 1 本の計 5 本とする | — |

### 第 1 弾のテンプレート（頻度順。該当案件数は design.md §1）

| ID | 名称 | category | target | 該当案件数 |
|---|---|---|---|---|
| `scheduled-report-teams` | 定期バッチ集計 → Teams カード通知 | notification | `google-apps-script` | 9 |
| `overdue-reminder` | 未対応者の督促（台帳 × 証跡の突合） | notification | `google-apps-script` | 4 |
| `chat-search-bot` | チャット起点 自然文検索 → 出典付き回答 | search | `power-automate` | 5 |
| `llm-extract-approve` | LLM 抽出 → 人の確認 → 承認後だけ反映 | ai | `generic` | 3 |
| `interview-evaluation-reminder` | 面接評価リマインダー（既存サンプル） | reminder | `power-automate` | 2 |

## 非機能要件

| # | 要件 | 出典 |
|---|---|---|
| TP-8 | テンプレート JSON は Open と同じ経路（`JSON.parse` → Zod validation → migration）を通す。専用の読み込み経路を作らない | NFR-005 / repository-structure §6.2 |
| TP-9 | テンプレート JSON に秘密情報・実 URL・個人名を含めない | NFR-001 / NFR-002 |
| TP-10 | 全テンプレートが Flow Review で ERROR（RV-E01〜E03）を出さない状態であること | functional-design §10.2 |
| TP-11 | カタログは `project` モジュールが所有し、`app` からは presentation 経由でのみ触る | architecture §3.2 |
| TP-12 | テンプレート読込は dirty を立てない（サンプル読込と同じ扱い） | §7.6 |

## 対象外（第 2 弾以降）

- ユーザー自作テンプレートの保存・管理（MVP は同梱の読み取り専用のみ）
- 残り 7 パターン（承認カード / 閾値監視 / onEdit 引当 / データブリッジ /
  DWH → シート / 下書き作成 / 自動修復ループ）。design.md §1 に一覧を残す
- 初回起動時のギャラリー表示（現状のサンプル固定読み込みを維持する）

## 受け入れ確認（実機）

- File > New from Template でギャラリーが開き、5 本が category 別に並ぶ
- テンプレートを選ぶと Canvas が置き換わり、Prompt Panel の target が初期選択されている
- dirty な状態で選ぶと確認ダイアログが出る / キャンセルで元の Workflow が残る
- 各テンプレートで Flow Review を実行して ERROR が 0 件
- 各テンプレートで Generate Prompt が成立する
- 「空のプロジェクト」で New と同じ結果になる
- E2E の主要導線（`e2e/mainFlow.spec.ts`）に退行がない
