# Phase 5 — Prompt Generator タスクリスト

要求は `requirements.md`、設計は `design.md`。

**状態: 完了（2026-09-08）。**

## 1. prompt モジュール

- [x] **T-1: `domain/promptTargets.ts`** — Implementation Target 7 種の表示名
- [x] **T-2: `domain/promptLabels.ts`** — 定型文の ja / en 対応表
- [x] **T-3: `domain/generatePrompt.ts`** — 決定論的純関数（design §1.2〜§1.5）
- [x] **T-4: `application/ports/ClipboardPort.ts`**
- [x] **T-5: `application/promptUseCases.ts`** — 生成実行 / promptSettings 更新 / コピー
- [x] **T-6: `infrastructure/browserClipboardPort.ts`**
- [x] **T-7: `presentation/PromptPanel.tsx`**（design §1.6）
- [x] **T-8: `prompt/index.ts`**

## 2. composition root と app

- [x] **T-9: `src/app/ports.ts` に `promptUseCases` を追加**
- [x] **T-10: `AppHeader.tsx` に Generate Prompt ボタンと Panel**

## 3. Phase 4 の積み残し

- [x] **T-11: 読込後の画面復元**（design §1.7）— canvas が store の viewport を購読
- [x] **T-12: mapper に viewport 変換 3 関数を追加**（`fromReactFlowViewport` / `toReactFlowViewport` / `sameViewport`）
- [x] **T-13: `canvasUseCases.updateViewport`**

## 4. 実装中に判明した不具合の修正

- [x] **T-14: 起動時に最大倍率までズームインする問題**（design §1.8）

## 5. テスト

- [x] **T-15: `generatePrompt.test.ts`（24 件）** — 決定論性 / 分岐フローのスナップショット / 手順順序 / 複数 Trigger / Cycle の打ち切り / config 反映 / Note / セクション省略 / Target・Language / 壊れた入力への耐性
- [x] **T-16: `e2e/mainFlow.spec.ts`** — 主要導線 1 本（New → Add → Connect → Edit → Save → Open → Generate Prompt）＋初回起動時のサンプル表示

## 6. 検証と文書更新

- [x] **T-17: 品質チェック** — `format:check` / `lint` / `tsc --noEmit` / `test`（12 ファイル・200 件）/ `build` すべて PASS
- [x] **T-18: E2E 実行** — 1 passed
- [x] **T-19: 永続文書更新**（design §2）— Phase 3・4 の持ち越し分を含む

## 7. 完了条件

- [x] AC-P5-1 〜 AC-P5-9（`requirements.md` §3）を満たす
- [x] roadmap Phase 5 の完了条件 **AC-020 / AC-021 / AC-022 / AC-023（FR-019〜FR-022）** を満たす
- [x] 主要導線 E2E が通る（以降 main マージの継続条件）

## 8. 実装中に確定した設計変更

| 項目 | 計画 | 実際 | 理由 |
|---|---|---|---|
| Panel の生成呼び出し | `useMemo` でメモ化 | **レンダー中に直接呼ぶ** | 真の入力（store）が引数に現れず依存配列に書けない。lint も「不要な依存」と警告する。生成は純関数で、Panel は入力 slice を購読しているため呼び直しで正しい |
| コピー完了表示 | `boolean` + effect でリセット | **コピーした本文を保持し現在値と比較** | effect 内の同期 setState は `react-hooks/set-state-in-effect` に抵触する。また boolean だと再生成後も表示が残り誤認させる |
| `fromReactFlowConnection` の入力型 | `Connection` | `Connection \| Edge` | Phase 2 で対応済み（`isValidConnection` 由来） |
| 起動時の fit | `fitView` prop に任せる | **prop + 実測完了後の再 fit** | design §1.8。prop 単独では最大倍率、prop 無しではノードが表示されない |

## 9. 検証記録

- Unit: 12 ファイル / 200 件 PASS
- E2E: `mainFlow.spec.ts` 1 passed。初回起動時にサンプル 11 ノードが**可視**で、初期倍率が 1 未満（全体が収まる）ことも assert している
- `generatePrompt` の代表フロー出力はインラインスナップショットで固定済み（第 2 の外部契約の退行検知）

## 10. 既知の残課題

- Crash Recovery（NFR-006）は未着手
- `## Open Questions` は Flow Review（Phase 6）待ちで常に省略される
- store の `selectedEdgeId` が単数（Phase 3 からの持ち越し）
- `.gitattributes` 未整備。Windows の `core.autocrlf=true` では clone 直後に `format:check` が落ちる（development-guidelines §4.2 に記載）
