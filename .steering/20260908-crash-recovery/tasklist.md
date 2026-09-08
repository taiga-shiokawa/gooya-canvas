# Crash Recovery タスク

- [x] `RecoveryStoragePort`（`save` / `load` / `clear`）を application/ports へ定義（CR-1）
- [x] `browserRecoveryStoragePort`（localStorage 具象。参照不可・容量超過を吸収）（CR-7）
- [x] `recoverySerialization`（封筒 `{ savedAt, project }` の Zod 検証と往復）（CR-6）
- [x] `recoverySavedAtLabel`（表示用の日時整形。不正値は null）
- [x] `recoveryUseCases`（debounce 自動保存の購読 / pendingRecovery / restore / discard）（CR-1, CR-2, CR-3, CR-5）
- [x] `startupUseCases`（復旧データがあればサンプルを読み込まない）（CR-4）
- [x] `ProjectDialog` に `cancelLabel` / `onDismiss` を追加（後方互換）
- [x] `useRecoveryPrompt`（復旧ダイアログの状態生成）（CR-2）
- [x] `src/app/ports.ts` へ配線（具象・タイマー・現在時刻の注入）
- [x] `src/app/AppRecoveryDialog.tsx` を追加し `App.tsx` へ設置
- [x] `src/main.tsx` を `startupUseCases.start()` に置き換え
- [x] 単体テスト（serialization / useCases / startup / savedAt 整形）
- [x] `format:check` / `lint` / `test` / `build` / `playwright test`
- [x] 実機確認（dev サーバー + headless Chromium）
- [ ] `docs/` への反映（メインブランチ側で実施。§7.5 の「（要確認）」の確定を含む）
