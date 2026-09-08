# Phase 3 — Inspector タスクリスト

要求は `requirements.md`、設計は `design.md`。

**状態: 完了（2026-09-08）。**

## 1. 選択状態の移送

- [x] **T-1: `canvasUseCases.selectElements` 追加** — 選択 ID を store へ publish
- [x] **T-2: `WorkflowCanvas` に `onSelectionChange` を追加**（`fromReactFlowIds` 経由）

## 2. workflow domain

- [x] **T-3: `domain/conditionBranchEditing.ts` 新規** — 分岐リネーム / 追加 / 削除の純関数と最低数ガード
- [x] **T-4: `workflow/index.ts` の公開 API 更新**

## 3. inspector モジュール

- [x] **T-5: `application/inspectorUseCases.ts`** — store 更新の唯一の入口
- [x] **T-6: `presentation/` 一式**（Inspector / NodeInspector / EdgeInspector / NodeConfigForm / nodeConfigFields / ConditionBranchesField / WaitDurationField / InspectorTextField）
- [x] **T-7: `inspector/index.ts`**

## 4. app への組み込み

- [x] **T-8: `App.tsx` の右ペインを `<Inspector />` へ置換**

## 5. 実装中に判明した必須対応

- [x] **T-9: `WorkflowNodeCard` で `useUpdateNodeInternals` を呼ぶ** — 分岐増減・改名時に Handle が再計算されず Edge が旧位置に描画される問題（design §1.6）

## 6. テスト

- [x] **T-10: `conditionBranchEditing.test.ts`（24 件）** — リネーム時の Edge 追随 / 削除時の Edge 削除 / 最低 2 つガード / 重複禁止
- [x] **T-11: `inspectorUseCases.test.ts`（22 件）** — 共通項目・config 更新の store 反映と dirty / Edge の label・description
- [x] **T-12: `canvasUseCases.test.ts` に `selectElements` の 5 件を追加**

## 7. 検証

- [x] **T-13: 品質チェック** — `format:check` / `lint` / `test`（6 ファイル・112 件）/ `build` すべて PASS
- [x] **T-14: 動作検証**（dev サーバ + ブラウザ）

## 8. 完了条件

- [x] AC-P3-1 〜 AC-P3-7（`requirements.md` §2）を満たす
- [x] roadmap Phase 3 の完了条件 **AC-010 / AC-011（FR-009 / FR-010）** を満たす
- [ ] `docs/` の更新（design §2）— **メイン側で実施**

## 9. 検証記録

ブラウザで確認した挙動:

- 選択 → Inspector 表示、Name 編集の Canvas 即時反映（AC-P3-2）
- Edge 選択と label 編集の即時反映（AC-P3-3）
- 分岐リネーム時の Edge 追随（AC-P3-4）、分岐追加時の Handle 再配置、分岐削除時の Edge 削除
- 最低 2 つガードのボタン disabled（AC-P3-5）
- 複数選択メッセージ、非選択時の空状態（AC-P3-6）
- Wait / Note / Trigger の種別別フォーム（AC-P3-1）

## 10. 既知の残課題

- 分岐リネーム直後に React Flow の dev 警告が 1 回出る（`Couldn't create edge for source handle id: "..."`）。Edge の描画コミットが `updateNodeInternals` の effect より先に走るため。次のコミットで正しく描画され機能上の影響はない。解消には Node と Edge の反映を 2 コミットに分ける必要があり、複雑さに見合わないと判断した
- store の `selectedEdgeId` が単数のため複数 Edge 選択を表現できない（design §3）
