# Phase 3 — Inspector 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 3`。完了条件は **AC-010 / AC-011（FR-009 / FR-010）**。

## 1. 今回の要求内容

| # | 要求 | 出典 |
|---|---|---|
| R-1 | Node 選択で右ペインに Inspector を表示する。共通項目は Name / Description / Node Type（読み取り専用）/ Notes | FR-009 / functional-design §6 |
| R-2 | Node Type ごとの専用フォームを共通項目の下に表示する（§3.3 の config キーに対応） | FR-009 / functional-design §6 |
| R-3 | 編集は store の Domain Model を直接更新し、**即座に Canvas へ反映**する | AC-011 / functional-design §6 |
| R-4 | Edge 選択時は Label / Description を編集できる | FR-010 / functional-design §6 |
| R-5 | Condition の分岐名を Inspector から変更でき、変更時は該当 Edge の `sourceHandle` / `label` へ反映する | FR-010 / functional-design §5.3 |
| R-6 | 非選択時は空状態を表示する | functional-design §6 |
| R-7 | 選択状態を `canvas` の presentation から `shared` の store へ移す（ID のみ保持） | functional-design §2.4 |
| R-8 | config へ秘密情報を保存させない旨の注意書きを Inspector に表示する | NFR-002 / functional-design §3.3 |

## 2. 受け入れ条件

- AC-P3-1: Node を選択すると共通 4 項目と種別別フォームが表示され、編集できる（AC-010）
- AC-P3-2: 編集した title / description が即座に Canvas のカード表示へ反映される（AC-011）
- AC-P3-3: Edge を選択すると Label / Description を編集でき、Canvas の Edge Label へ即反映される
- AC-P3-4: Condition の分岐をリネームすると、該当 Edge の `sourceHandle` と `label` が追随する
- AC-P3-5: Condition の分岐を追加・削除でき、分岐が 2 つ未満にはできない
- AC-P3-6: 何も選択していないとき空状態が表示される
- AC-P3-7: `npm run format:check` → `lint` → `test` → `build` がすべて通る

## 3. 制約事項

- **`@xyflow/react` を inspector から import しない**（依存方向 #5。React Flow は canvas モジュール専用）
- 選択状態は store に **ID のみ**を持つ。React Flow 型を store へ出さない（NFR-010）
- inspector モジュールは **application + presentation の 2 層のみ**（repository-structure §2.1）。domain / infrastructure を作らない
- Node と Edge をまたぐ整合処理（分岐編集）は純関数として `workflow` の domain に置く
- Radix 等のヘッドレス UI は未導入。自前実装する
- 選択状態の変更で `isDirty` を立てない（Phase 2 で確定した dirty 判定規則）
- Undo 履歴の確定単位（blur / debounce）は **Phase 8（zundo 導入）のスコープ**。本作業では実装しない
- Context Menu の「Edit（Inspector へフォーカス）」（§5.4）は Context Menu 自体が Phase 8 のためスコープ外
