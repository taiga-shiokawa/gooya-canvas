# Phase 8 — UX Polish タスクリスト

要求は `requirements.md`、設計は `design.md`。

**状態: 完了（2026-09-08）。**

## 1. Undo / Redo

- [x] **T-1: store へ zundo の `temporal` を適用**（`partialize` + `equality`、上限 100 件、`replaceProject` で履歴クリア）
- [x] **T-2: `setGraph` 追加** — nodes / edges の同時更新を履歴 1 件にする
- [x] **T-3: `shared/application/historyGrouping.ts`** — 編集対象キー + 時間窓のゲート
- [x] **T-4: `shared/application/workflowHistory.ts`** — `undoWorkflow` / `redoWorkflow` / 活性判定フック
- [x] **T-5: ドラッグを 1 件にまとめる** — ドラッグ中は store を触らず、`onNodeDragStop` で確定位置を 1 回反映
- [x] **T-6: Inspector 編集のグループ化** — `withHistoryGroup` を各ユースケースへ

## 2. 操作系

- [x] **T-7: `workflow/domain/graphDuplication.ts`** — `extractSubgraph` / `duplicateSubgraph`
- [x] **T-8: `canvas/application/canvasEditUseCases.ts`** — 削除 / 複製 / Copy / Paste / Inspector フォーカス要求
- [x] **T-9: `shared/domain/keyboardShortcut.ts`** — 判定の純関数
- [x] **T-10: `src/app/useAppShortcuts.ts`** — 配線（canvas と project を繋ぐのは composition root のみ）
- [x] **T-11: `canvas/presentation/CanvasContextMenu.tsx`**
- [x] **T-12: Snap to Grid（20px）**
- [x] **T-13: `src/app/AppMenu.tsx` と Edit メニュー** — File メニューの実装を共通部品へ切り出して共用

## 3. テスト

- [x] **T-14: `graphDuplication.test.ts`** — 新 ID / data 引き継ぎ / オフセット / 閉じた Edge のみ複製
- [x] **T-15: `keyboardShortcut.test.ts`** — 修飾キーの組み合わせ、入力欄フォーカス中の無効化
- [x] **T-16: `historyGrouping.test.ts`**
- [x] **T-17: `workflowHistory.test.ts`** — Undo / Redo、履歴対象外、`replaceProject` でのクリア、編集のまとめ
- [x] **T-18: `canvasEditUseCases.test.ts`**
- [x] **T-19: `canvasUseCases.test.ts` を `moveNodes` へ更新**

## 4. 検証

- [x] **T-20: 品質チェック** — `format:check` / `lint` / `tsc --noEmit` / `test`（23 ファイル・346 件）/ `build` すべて PASS
- [x] **T-21: E2E** — `playwright test` 1 passed（主要導線に退行なし）
- [x] **T-22: 動作検証** — headless Chromium で 40 項目、40/40 PASS・コンソールエラー 0

## 5. 完了条件

- [x] AC-P8-1 〜 AC-P8-10（`requirements.md` §2）を満たす
- [x] roadmap Phase 8 の完了条件 **FR-004 / FR-005 / FR-006（AC-006 を含む）** を満たす
- [ ] `docs/` の更新（design §6）— **メイン側で実施**

## 6. 検証記録（主なもの）

- ドラッグ 12 フレーム → **Ctrl+Z 1 回で元位置 (300,200) へ完全復帰**。Snap は (440,280) と 20px 格子に載る。viewport の transform は Undo 前後で不変
- Inspector で 1 文字ずつ入力 → Canvas へ即時反映 → **Ctrl+Z 1 回で入力前へ**
- 入力欄フォーカス中: Ctrl+A で Canvas は全選択されず、Delete で文字だけが消える
- Ctrl+A → Ctrl+D → Ctrl+C → Ctrl+V で node 2→4 / edge 1→2（**閉じた Edge も複製**）。いずれも Undo 1 回で取り消し
- Context Menu: Node で 3 項目、Edit で Inspector の入力へフォーカス（`document.activeElement` で確認）、Esc で閉じる
- Ctrl+S でダウンロード、Ctrl+O は dirty 時に確認ダイアログ。モーダル中は Ctrl+D が効かない
- MiniMap にノードが描画されたまま（§2.4 の退行なし）。New 直後の Ctrl+Z で前プロジェクトは戻らない

## 7. 既知の残課題

design §7 を参照。
