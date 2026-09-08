# Phase 8 — UX Polish 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 8`（MVP 最終フェーズ）。完了条件は **FR-004 / FR-005 / FR-006**（AC-006 の複製導線を含む）。

## 1. 今回の要求内容

| # | 要求 | 出典 |
|---|---|---|
| R-1 | Undo / Redo。履歴対象は Node / Edge の追加・削除・移動・編集 | FR-005 / functional-design §11 / AD-07 |
| R-2 | キーボードショートカット 8 種 | FR-006 / §5.5 |
| R-3 | Context Menu（Edit / Duplicate / Delete） | FR-004 / §5.4 |
| R-4 | 複製（Ctrl+D / Context Menu）。新 ID・オフセット配置・設定値の引き継ぎ | FR-004 / AC-006 / §5.1 |
| R-5 | Copy / Paste。選択集合内で閉じている Edge も複製する | FR-004 / §5.1 |
| R-6 | Snap to Grid | §5.1 |
| R-7 | Header に Edit メニュー（Undo / Redo / Delete / Duplicate） | §4.2 |

Dirty Indicator は Phase 4 で実装済み。Crash Recovery（NFR-006）は別ブランチ。

## 2. 受け入れ条件

- AC-P8-1: Node / Edge の追加・削除・移動・編集が Undo / Redo できる（FR-005）
- AC-P8-2: **1 ドラッグ = 履歴 1 件**。Inspector の連続入力もまとまる（§11）
- AC-P8-3: Undo で viewport や選択状態が巻き戻らない（§11 の履歴対象外）
- AC-P8-4: New / Open の直後に Undo しても前のプロジェクトへ戻らない
- AC-P8-5: 8 種のショートカットが効き、**Input / Textarea フォーカス中は Canvas ショートカットが無効**（§5.5）
- AC-P8-6: Node / Edge 上の右クリックで Context Menu の 3 項目が出る（§5.4）
- AC-P8-7: 複製で新 ID が振られ、設定値を引き継ぎ、オフセット配置される（AC-006）
- AC-P8-8: Copy / Paste で選択集合内に閉じた Edge も複製される
- AC-P8-9: 移動が Snap to Grid に載る
- AC-P8-10: `format:check` / `lint` / `test` / `build` / `playwright test` がすべて通る

## 3. 制約事項

- **履歴対象は `nodes` / `edges` のみ**（§11）。viewport / 選択状態 / `isDirty` / `promptSettings` / `metadata` / `reviewFindings` / `nodeFocusRequest` は対象外
- クリップボードは**アプリ内メモリ**。OS クリップボード連携は §5.1 で「（要確認）」＝スコープ外
- **`@xyflow/react` は canvas モジュール外で import 禁止**（依存方向 #5）
- **feature モジュール間の import は禁止**（#4）。Ctrl+S / Ctrl+O は composition root で `project` と繋ぐ
- ID 採番は `crypto.randomUUID()`（AD-08）。純関数の内部で呼ばず引数で受け取る
- `WorkflowCanvas` の既存の責務（controlled flow の差分適用・viewport publish・起動時 fit・Export 用表示・Review のフォーカス購読）を壊さないこと
- Radix 等のヘッドレス UI は未導入
