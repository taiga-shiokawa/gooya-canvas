# Phase 4 — Project Persistence タスクリスト

要求は `requirements.md`、設計は `design.md`。

**状態: 完了（2026-09-08）。**

## 1. workflow domain

- [x] **T-1: `domain/schemas.ts` 新規** — §3.2 と同形の Zod スキーマ一式
- [x] **T-2: `domain/migrations.ts` 新規** — `SCHEMA_MIGRATIONS`（MVP は空）と `migrateProject`
- [x] **T-3: `workflow/index.ts` の公開 API 更新**

## 2. project モジュール

- [x] **T-4: `application/ports/ProjectFilePort.ts`**
- [x] **T-5: `application/projectFileName.ts`** — ファイル名生成とサニタイズ
- [x] **T-6: `application/projectSerialization.ts`** — JSON.parse → Zod → migration
- [x] **T-7: `application/projectUseCases.ts`** — New / Save / Open / サンプル読込
- [x] **T-8: `infrastructure/browserProjectFilePort.ts`**
- [x] **T-9: `presentation/ProjectDialog.tsx` / `useProjectCommands.ts`**
- [x] **T-10: `assets/samples/interview-evaluation-reminder.gooya-canvas.json`**（11 ノード / 9 エッジ）
- [x] **T-11: `project/index.ts`**

## 3. composition root と app

- [x] **T-12: `src/app/ports.ts`** — 具象生成と注入（`filePort` / `now` / `newId`）
- [x] **T-13: `AppHeader.tsx` に File メニュー**（New / Open / Save）
- [x] **T-14: `AppStatusBar.tsx` にプロジェクト名 + dirty インジケータ**
- [x] **T-15: `src/main.tsx` で `loadSampleProjectIfEmpty()`**（`App.tsx` を触らずに実現するため）

## 4. テスト（development-guidelines §5.1 の重点対象 1〜3 位）

- [x] **T-16: `schemas.test.ts`（14 件）** — 受理 / 拒否 / 未知キーの後方互換 / `z.infer` と型定義の一致
- [x] **T-17: `migrations.test.ts`（9 件）** — 現行版より新しい schemaVersion の拒否
- [x] **T-18: `projectFileName.test.ts`（10 件）** — サニタイズ
- [x] **T-19: `projectSerialization.test.ts`（12 件）** — **保存 → 読込のラウンドトリップ一致（AC-014）**、2 回往復で同一 JSON
- [x] **T-20: `projectUseCases.test.ts`（13 件）** — 不正入力時に store が変更されないこと（AC-015）、サンプルがスキーマを通ること

## 5. 検証

- [x] **T-21: 品質チェック** — `format:check` / `lint` / `test`（9 ファイル・125 件）/ `build` すべて PASS
- [x] **T-22: 動作検証**（dev サーバ + ブラウザ）

## 6. 完了条件

- [x] AC-P4-1 〜 AC-P4-7（`requirements.md` §2）を満たす
- [x] roadmap Phase 4 の完了条件 **AC-012 / AC-013 / AC-014 / AC-015（FR-011〜FR-015）** を満たす
- [ ] `docs/` の更新（design §2）— **メイン側で実施**
- [ ] fitView 相当の画面復元（design §1.7）— **canvas モジュールの変更が必要。メイン側で実施**

## 7. 検証記録

ブラウザで確認した挙動: サンプル表示（AC-P4-5）/ File メニュー / dirty 表示（AC-P4-6）/ 確認ダイアログ（`open:true`、top layer、文言・aria 一致）/ New 確定。

型一致テストが実効性を持つことも確認済み（意図的に片方を別型へ変えると `tsc -b` が TS2344 で落ちる）。

## 8. 既知の残課題

- **fitView 未実装**（design §1.7）。読込後の画面復元は canvas が `store.viewport` を購読する形で行うのが望ましい
- Crash Recovery（NFR-006）は意図的にスコープ外
- 検証順序（Zod → migration）の限界（design §2）。MVP は実害なし
