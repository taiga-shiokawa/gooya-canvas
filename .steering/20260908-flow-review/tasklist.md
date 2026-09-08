# Phase 6 — Flow Review タスクリスト

要求は `requirements.md`、設計は `design.md`。

**状態: 完了（2026-09-08）。**

## 1. shared（結果の受け渡し基盤）

- [x] **T-1: `shared/domain/reviewFinding.ts`** — `ReviewFinding` / `ReviewLevel` / `ReviewSummary` と集計・表記の純関数
- [x] **T-2: store へ `reviewFindings` / `nodeFocusRequest` slice を追加** — 保存対象外・dirty を立てない・`replaceProject` でクリア
- [x] **T-3: `shared/index.ts` の公開 API 更新**

## 2. review モジュール

- [x] **T-4: `domain/reviewWorkflow.ts`** — 13 ルールの決定論的純関数
- [x] **T-5: `application/reviewUseCases.ts`** — `run` / `clear` / `focusNode`
- [x] **T-6: `presentation/ReviewPanel.tsx`** — 非モーダル。サマリ + レベル別一覧 + 再実行
- [x] **T-7: `review/index.ts`**

## 3. canvas（センタリング）

- [x] **T-8: `canvasUseCases.subscribeNodeFocusRequests`**
- [x] **T-9: `WorkflowCanvas` でフォーカス要求を購読し `setCenter`**（選択の反映も含む）

## 4. app

- [x] **T-10: `AppHeader.tsx` の Main Actions に Review Flow ボタンと Panel**
- [x] **T-11: `AppStatusBar.tsx` にサマリ表示**（未実行時は非表示）
- [x] **T-12: `src/app/ports.ts` に `reviewUseCases`**

## 5. テスト

- [x] **T-13: `reviewWorkflow.test.ts`（33 件）** — 13 ルール × 検出 / 非検出、Cycle での停止、note の除外、決定論性、並び順
- [x] **T-14: `reviewFinding.test.ts`（10 件）** — 件数集計・サマリ表記・レベル表示名

## 6. 検証

- [x] **T-15: 品質チェック** — `format:check` / `lint` / `tsc --noEmit` / `test`（14 ファイル・243 件）/ `build` すべて PASS
- [x] **T-16: 動作検証**（dev サーバ + ブラウザ）

## 7. 完了条件

- [x] AC-P6-1 〜 AC-P6-8（`requirements.md` §2）を満たす
- [x] roadmap Phase 6 の完了条件 **AC-024 / AC-025 / AC-026 / AC-027 / AC-028（FR-023 / FR-024）** を満たす
- [ ] `docs/` の更新（design §3）— **メイン側で実施**

## 8. 検証記録

ブラウザで確認した挙動:

- サンプル（Interview Evaluation Reminder）は指摘 0 件
- Wait を削除すると RV-W07、End を削除すると RV-W01 を検出
- 問題をクリックすると Inspector に該当ノードが出てセンタリングされる
- ステータスバーにサマリが反映される

センタリング座標は実測値（`translate(-637.472px, 115.956px)`）が期待値と完全一致することを確認済み。

## 9. 既知の残課題

- **Prompt の `## Open Questions` は未連携**（design §2 に理由と必要な変更を記載）
- Review 結果は編集後も残る（Panel の「再実行」で更新）。無効化ポリシー未定
- RV-W06 と RV-W07 が同じ経路で 2 件出ることがある
- 300ms のセンタリング**アニメーション**自体は目視できていない（検証環境で `requestAnimationFrame` が停止していたため）。duration 0 での最終座標一致は確認済み
- Panel は左下固定のため Node Palette と重なる。Phase 8 で配置を見直す余地あり
