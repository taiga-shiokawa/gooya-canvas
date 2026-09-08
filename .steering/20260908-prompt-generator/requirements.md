# Phase 5 — Prompt Generator 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 5`。完了条件は **AC-020 / AC-021 / AC-022 / AC-023（FR-019〜FR-022）** と、**主要導線 E2E の整備**。

## 1. 今回の要求内容

| # | 要求 | 出典 |
|---|---|---|
| R-1 | Domain Model から**決定論的に** Markdown 実装プロンプトを生成する。外部 AI へ送信せず動作する | FR-019 / AC-020 / functional-design §9.1 |
| R-2 | Node 順序と Condition 分岐が Prompt へ反映される | AC-021 / §9.1 |
| R-3 | Node 設定値が Prompt へ反映される | AC-022 / §9.2 |
| R-4 | Prompt Panel で表示し、Clipboard へコピーできる | FR-020 / AC-023 / §9.3 |
| R-5 | Implementation Target 7 種を選択でき、Prompt へ反映される（変更すると即時再生成） | FR-021 / §9.3 |
| R-6 | Note ノードを Prompt へコメントとして出力する | FR-022 / §9.2 |
| R-7 | Target / Language / additionalInstructions を `promptSettings` としてファイルに保存する | §9.3 |
| R-8 | 主要導線の E2E（New → Add → Connect → Edit → Save → Open → Generate Prompt）を整備する | development-guidelines §5.2 / roadmap §1 Phase 5 |

## 2. Phase 4 からの積み残し

| # | 要求 | 経緯 |
|---|---|---|
| R-9 | プロジェクト読込後に画面を復元する | `@xyflow/react` は canvas モジュール専用のため project 側から `fitView` を呼べず、Phase 4 では見送られていた（Phase 4 design §1.7） |

## 3. 受け入れ条件

- AC-P5-1: Generate Prompt で Markdown が表示される（AC-020）
- AC-P5-2: 同じ Workflow からは常に同じ Prompt が生成される（FR-019 の決定論性）
- AC-P5-3: Trigger 起点の手順と Condition の分岐が Prompt に現れる（AC-021）
- AC-P5-4: Node の config が Prompt に現れる（AC-022）
- AC-P5-5: Copy Prompt で Clipboard へコピーできる（AC-023）
- AC-P5-6: Target を変えると `Implementation target:` が即時に変わる（FR-021）
- AC-P5-7: Note が手順ではなく `## Notes` に出る（FR-022）
- AC-P5-8: 主要導線の E2E が通る
- AC-P5-9: `npm run format:check` → `lint` → `test` → `build` がすべて通る

## 4. 制約事項

- **入力は `WorkflowProject` のみ**。React Flow の状態を読まない（NFR-010）
- **外部 LLM API を使わない**（NFR-003）。Workflow データを外部へ送信するコードを書かない（NFR-001）
- 生成は**決定論的純関数**。`Date.now()` / `Math.random()` / `crypto.randomUUID()` を内部で呼ばない（development-guidelines §2.2）
- 生成される Markdown の**セクション構成は第 2 の外部契約**（functional-design §12）。変更は §9.2 の更新を伴う
- `dangerouslySetInnerHTML` と `eval` を使わない（development-guidelines §2.5）
- `## Open Questions`（§9.2）は Flow Review（Phase 6）の結果を転記するセクション。本フェーズでは該当データが無く、「該当データがないセクションは省略する」に従って出力されない
- `config` は `Record<string, unknown>`。外部ファイル由来なので**値の型を自前で絞ってから使う**
- Ctrl+S / Ctrl+O 等のショートカット（FR-006）は Phase 8
