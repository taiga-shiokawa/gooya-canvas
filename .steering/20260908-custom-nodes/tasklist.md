# Phase 2 — Custom Nodes タスクリスト

要求は `requirements.md`、設計は `design.md`。上から順に依存する。

**状態: 完了（2026-09-08）。** 実装中に確定した設計変更は §8 に記録する。

## 1. workflow domain

- [x] **T-1: `domain/types.ts` へ §3.2 の残り型を追加**（design §1.5）
- [x] **T-2: `domain/nodeCatalog.ts` 新規**（design §1.1）
- [x] **T-3: `domain/connectionRules.ts` 新規**（design §1.2）
- [x] **T-4: `workflow/index.ts` の公開 API 更新**

## 2. shared store

- [x] **T-5: `shared/application/workflowStore.ts` の slice 拡張**（design §1.6）

## 3. canvas

- [x] **T-6: `canvasUseCases.ts` — 初期 config / 接続ルール / Condition Edge label**
- [x] **T-7: `nodes/` 4 ファイル新規**（design §1.3）
- [x] **T-8: `reactFlowMapper.ts` の `toReactFlow` / `mergeReactFlowNodes` 変更**（design §1.4）
- [x] **T-9: `WorkflowCanvas.tsx` へ `nodeTypes` 登録**
- [x] **T-10: `NodePalette.tsx` の import 元変更 + アイコン表示、`nodeKindLabels.ts` 削除**

## 4. app シェル

- [x] **T-11: `AppHeader.tsx` / `AppStatusBar.tsx` 新規、`App.tsx` を 4 スロット構成へ**（design §1.7）

## 5. テスト

- [x] **T-12: `connectionRules.test.ts`** — AC-P2-3 の 4 パターン + 許可されるケース + Cycle が禁止されないこと
- [x] **T-13: `nodeCatalog.test.ts`** — 11 種すべてに label がある / Condition の初期 branches / `conditionBranches` の不正値フォールバック
- [x] **T-14: `canvasUseCases.test.ts` 更新** — 初期 config の投入、接続ルールによる拒否、Condition Edge の label 初期化
- [x] **T-15: `reactFlowMapper.test.ts` 更新** — `type` の写像、`data` 全フィールドの変更検出（design §1.4 の回帰テスト）

## 6. 検証と文書更新

- [x] **T-16: 品質チェック** — `format:check` → `lint` → `test` → `build`
- [x] **T-17: 動作検証** — AC-P2-1 / AC-P2-2 / AC-P2-3 / AC-P2-4 をブラウザで確認
- [x] **T-18: 永続文書更新** — `functional-design.md`（§2.4 dirty 規則 / §5.2 note 確定）、`repository-structure.md` §2、`development-roadmap.md` 現在地（design §4）

## 7. 完了条件

- [x] AC-P2-1 〜 AC-P2-5（`requirements.md` §3）を満たす
- [x] roadmap Phase 2 の完了条件 **FR-001 / FR-007（残余）/ FR-008** を満たす
- [x] design §4 の `docs/` 更新が済み、「（要確認）」2 件（note 接続可否 / dirty 対象）が解消されている

## 8. 実装中に確定した設計変更

`design.md` の計画に対する差分。

| 項目 | 計画 | 実際 | 理由 |
|---|---|---|---|
| `fromReactFlowConnection` の入力型 | `Connection` | **`Connection \| Edge`** | `isValidConnection` は `Edge \| Connection` を渡してくる。React Flow 型の差異を吸収するのは mapper の責務のため、呼び出し側でなく mapper 側を広げた（repository-structure §4.3） |
| `WorkflowNodeCardData` の置き場 | `WorkflowNodeCard.tsx` 内 | **`nodes/workflowNodeCardData.ts` に分離** | mapper（`.ts`）が型だけのために `.tsx` を import するのを避けるため |
| 接続の UI フィードバック | 計画外 | **`isValidConnection` を追加** | 接続を無言で拒否するだけだと操作ミスの原因が分からない。ドラッグ中に不許可の接続先をハイライトさせないことで、作成前に判別できる |
| Edge の変更検出 | 計画は label のみ | **`data.description` も比較対象に追加** | Phase 3 が Edge Description を編集する。ここを漏らすと編集が Canvas に反映されないため、mapper を触るのは本フェーズで完結させた |

## 9. 検証記録

- 品質チェック: `format:check` / `lint` / `test`（61 件）/ `build` すべて PASS
- 動作検証（dev サーバ + ブラウザ）:
  - Palette に 11 種がアイコン付きで並ぶ（AC-P2-1）
  - 投入したノードに icon / node type / title が表示される（AC-P2-2）
  - Handle 構成が functional-design §5.2 の表と一致（AC-P2-4）:
    trigger = target 0 / source 1、condition = target 1 / source 2（id は `Yes` / `No`）、
    notification = target 1 / source 1、end = target 1 / source 0、note = target 0 / source 0
  - コンソールエラーなし
- AC-P2-3（接続の拒否）は Unit テストで担保（`connectionRules.test.ts` / `canvasUseCases.test.ts`）。
  Handle が存在しない end / note / trigger は UI 上そもそも不許可の接続を試みられない
