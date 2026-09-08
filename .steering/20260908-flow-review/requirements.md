# Phase 6 — Flow Review 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 6`。完了条件は **AC-024 / AC-025 / AC-026 / AC-027 / AC-028（FR-023 / FR-024）**。

## 1. 今回の要求内容

| # | 要求 | 出典 |
|---|---|---|
| R-1 | Domain Model を入力に Rule-based で解析し、ERROR / WARNING / INFO の 3 段階で結果を返す。外部 AI を使わない | FR-023 / functional-design §10.1 |
| R-2 | §10.2 の 13 ルール（RV-E01〜E03 / RV-W01〜W07 / RV-I01〜I03）を実装する | FR-023 / AC-024〜028 |
| R-3 | Review Panel に件数サマリと問題一覧を表示する（INFO は SUGGESTION 表記） | FR-024 / §10.3 |
| R-4 | 問題をクリックすると該当 Node を選択して Canvas 中央へスクロールする | FR-024 / §10.3 |
| R-5 | ステータスバーへサマリを反映する | §4.3 |

## 2. 受け入れ条件

- AC-P6-1: Trigger が無い Workflow で ERROR が出る（AC-025）
- AC-P6-2: End が無い Workflow で ERROR が出る（AC-026）
- AC-P6-3: どの Edge にも繋がっていない Node で ERROR が出る（AC-024）。ただし **note は除外**
- AC-P6-4: Condition の未接続分岐で WARNING が出る（AC-027）
- AC-P6-5: 必須 Node 設定の欠落（Notification の Recipient / Wait の Duration / Human Task の Role / Trigger の対象システム）で WARNING が出る（AC-028）
- AC-P6-6: `2 Errors / 4 Warnings / 3 Suggestions` 形式のサマリが Panel とステータスバーに出る
- AC-P6-7: 問題をクリックすると該当 Node が選択され Canvas 中央へ移動する
- AC-P6-8: `npm run format:check` → `lint` → `test` → `build` がすべて通る

## 3. 制約事項

- **`reviewWorkflow` は決定論的純関数**。入力は Domain Model のみ（§10.1）。`Date.now()` / `Math.random()` を内部で呼ばない
- **Cycle が存在し得る**（§5.2 で Cycle は禁止していない）。到達可能性の解析は必ず訪問済み集合で打ち切る
- **`@xyflow/react` は canvas モジュール外で import 禁止**（依存方向 #5）。review から直接 Canvas を操作できない
- **feature モジュール間の import は禁止**（依存方向 #4）。ステータスバー（`src/app/`）へ結果を渡すには `shared` の store を経由する
- Review 結果は Domain Model ではない。**保存対象にせず dirty も立てない**
- ノード種別の知識（分岐・推奨 config キー）は `workflow` domain のものを再利用し、review 側に複製しない
- Radix 等のヘッドレス UI は未導入
