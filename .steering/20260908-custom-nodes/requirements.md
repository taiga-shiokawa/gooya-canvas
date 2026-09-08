# Phase 2 — Custom Nodes 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 2`。完了条件は **FR-001 / FR-007（残余）/ FR-008**。

## 1. 今回の要求内容

Phase 1 は React Flow のデフォルトノードで `title` のみを表示し、接続ガードは自己接続禁止だけだった。
本作業でこれを Node Type 11 種に対応した Custom Node へ差し替え、種別に応じた接続ルールを効かせる。

| # | 要求 | 出典 |
|---|---|---|
| R-1 | Node 追加時に種別ごとの既定 `title` と初期 `config` を設定する（Condition は `branches: ["Yes","No"]`） | FR-001 / functional-design §5.1 |
| R-2 | 各ノードは **icon / node type / title / short description** のみを表示する。詳細は Inspector に委ねる | FR-008 / functional-design §5.1 |
| R-3 | Node Type ごとの接続ルールで接続許否を判定し、不許可の接続を作成しない | FR-007 / functional-design §5.2 |
| R-4 | Condition は `branches` の数だけ Source Handle を持ち、接続時に分岐名を Edge の `label` 初期値とする | FR-010 の一部 / functional-design §5.3 |

## 2. 並列実装の土台整備（本作業に含める理由）

Phase 3（Inspector）と Phase 4（Persistence）は roadmap §2 上で相互独立であり並行着手できる。
両者を git worktree で並列実装するため、**双方が奪い合う共有ファイルを本作業で先に確定**させる。

| # | 要求 | 理由 |
|---|---|---|
| R-5 | `docs/functional-design.md §3.2` の型定義を **workflow domain に完全に揃える**（`WorkflowProject` / `WorkflowMetadata` / `WorkflowViewport` / `WorkflowPromptSettings` / `PromptTarget` / `SCHEMA_VERSION`） | Phase 4（Zod スキーマ）と Phase 5（Prompt 入力）が同じ型を必要とする。型だけ先に確定させ、Zod スキーマ・migration は Phase 4 に残す |
| R-6 | store を MVP 完成形の slice 構成へ拡張する（metadata / viewport / promptSettings / isDirty / 選択状態） | `shared/application/workflowStore.ts` は Phase 3〜5 の全てが編集する唯一の共有ファイル。ここを先に確定すれば並列ブランチが競合しない |
| R-7 | App シェルを Header / Canvas / Inspector ペイン / Status Bar の 4 スロットへ分割する（中身は空） | Phase 3 は Inspector ペイン、Phase 4 は Header と Status Bar を埋める。**別ファイル**にしておけば並列ブランチが競合しない |

R-5 / R-6 / R-7 は Phase 2 の完了条件（FR-001 / FR-007 / FR-008）には含まれない付随作業である。

## 3. 受け入れ条件

- AC-P2-1: Palette から 11 種すべてを追加でき、種別に応じた既定 title と初期 config が入る（R-1）
- AC-P2-2: Canvas 上のノードに icon / node type / title / short description が表示される（R-2）
- AC-P2-3: 次の接続が**作成されない**（R-3）
  - 自己接続 / Trigger への incoming / End からの outgoing / Note を端点に含む接続
- AC-P2-4: Condition ノードが `branches` の数だけ Source Handle を持ち、そこから引いた Edge の `label` に分岐名が入る（R-4）
- AC-P2-5: `npm run format:check` → `lint` → `test` → `build` がすべて通る

## 4. 制約事項

- **Cycle は禁止しない**（functional-design §5.2）。到達不能・終了経路欠如は Phase 6 の Flow Review が扱う
- Note の接続可否は functional-design §5.2 で「（要確認）」。同節の暫定方針「当面は接続不可（純粋な注釈）」を採用する
- mapper の 6 関数構成とシグネチャを変えない（functional-design §2.4 / repository-structure §4.3）。差し替えるのは `toReactFlow` の内部と `nodeTypes` 登録のみ
- `@xyflow/react` を canvas モジュール外へ出さない（NFR-010、依存方向 #5）
- Icon は Bundled Icons（NFR-004）。アイコンライブラリを新規追加せず、インライン SVG で持つ
- Zod スキーマ・migration レジストリ・永続化ユースケースは **Phase 4 のスコープ**。本作業では型のみ定義する
- Undo / Redo（zundo）は Phase 8。本作業では store に history を入れない
