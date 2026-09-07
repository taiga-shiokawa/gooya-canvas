# 初回実装 要求内容（Phase 0: Project Setup + Phase 1: Canvas Foundation）

本作業の要求を定義する。フェーズ計画の根拠は `docs/development-roadmap.md > 1. フェーズ一覧と実行順` を参照し、内容を転記しない。設計は `design.md`、タスク分解は `tasklist.md` を参照。

## 1. 変更・追加する機能の説明

### 1.1 Phase 0 — Project Setup（開発基盤の確立）

- git 初期化 → 初回コミット → GitHub リポジトリ `gooya-canvas` 作成 → GitHub Actions による GitHub Pages デプロイ → Vite `base: '/gooya-canvas/'` 設定。**この順序は確定済み**（`docs/development-roadmap.md > Phase 0 — Project Setup`）。
- ランタイム依存・開発依存の導入。導入対象の一覧は `docs/architecture.md > 1.2 導入予定（選定確定・未導入）` が所有する（@xyflow/react / Zustand / zundo / Zod / Tailwind CSS / html-to-image / jsPDF / Prettier + eslint-config-prettier / Vitest / Playwright / eslint-plugin-import）。
- ディレクトリ骨格の作成: `src/app/` + `src/modules/` 8 モジュール、パスエイリアス `@/` → `src/`。配置規則は `docs/repository-structure.md > 2. src/ の構成` および `> 4.4 import 経路` に従う。空ディレクトリは作らない（`docs/repository-structure.md > 2.1`）。
- ESLint 依存方向 zones（`import/no-restricted-paths`）の有効化。具体グロブは `docs/repository-structure.md > 5.1 ESLint zones の具体グロブ` が正。
- 既存 Vite スキャフォールドの移設・破棄は `docs/repository-structure.md > 8. 現状スキャフォールドからの移行` に従う。

### 1.2 Phase 1 — Canvas Foundation（Canvas 基盤機能）

React Flow（@xyflow/react）を配置し、以下を実現する（`docs/development-roadmap.md > Phase 1 — Canvas Foundation`）。

- Node の追加（Palette から）・移動・削除
- Edge の接続・削除
- Zoom / Pan
- MiniMap
- Fit View

@xyflow/react は `canvas` モジュールに封じ込め、Source of Truth は Zustand store の Domain Model とする（`docs/architecture.md > 3.2 / 3.3`、`docs/repository-structure.md > 4.3`）。

## 2. ユーザーストーリー

- 開発者として、main へ push すると GitHub Pages に最新ビルドが自動配信される状態が欲しい。以降の全フェーズの動作確認基盤になるため（AD-12）。
- 開発者として、レイヤー・モジュール境界違反が `npm run lint` で機械的に検出される状態が欲しい。以降の実装で設計が崩れないため。
- Workflow 設計者（利用者）として、Canvas に Node を置き、動かし、繋ぎ、不要なものを消したい（AC-001〜AC-005）。
- Workflow 設計者として、Zoom / Pan / MiniMap / Fit View で Workflow 全体を見渡したい（AC-007〜AC-009）。

## 3. 受け入れ条件

- **Phase 0**: `docs/development-roadmap.md > Phase 0 — Project Setup` の完了条件（build / lint 通過、GitHub Pages 配信、ESLint zones 有効）を満たすこと。
- **Phase 1**: AC-001, AC-002, AC-003, AC-004, AC-005, AC-007, AC-008, AC-009（`docs/product-requirements.md > 7`。FR-002, FR-003 に対応）。
  - **AC-006（Node 複製）は対象外**（Phase 8 — `docs/development-roadmap.md > Phase 8`）。

## 4. 制約事項

- **スコープ外**: Phase 2 以降のすべて（11 種の Custom Node・接続ルール・Inspector・Persistence・Prompt Generator・Review・Export・Undo/Redo）。本作業の Node 表示は Custom Node 実装（Phase 2）前の暫定表示でよい。ただし store 上の Domain Model は React Flow 型を漏らさない構造を最初から守る（NFR-010、`docs/architecture.md > 3.3`）。
- **順序制約**: git 初期化と GitHub リポジトリ作成が Pages デプロイ・ワークフロー追加に先行する（`docs/architecture.md > 4. 実行・配備構成`）。
- **配置制約**: 新規コードの配置は `docs/repository-structure.md > 3 / 4` の判定に従う。`@xyflow/react` の import は `src/modules/canvas/**` に限定する。
- **導入ライブラリのバージョン**: 導入時に確定し、`docs/architecture.md > 1.2` の表へ追記すること（同節の（要確認）を解消する）。
- **GitHub リポジトリの owner / org**: （要確認）— `docs/architecture.md > 4` は `https://<org>.github.io/gooya-canvas/` 想定とのみ記載。リポジトリ名は `gooya-canvas` で確定。
- **GitHub Actions ワークフローのファイル名・内容**: 実装時に確定する（`docs/repository-structure.md > 1` の（要確認）を本作業で解消する）。
- **フォーマッタ**: Prettier + eslint-config-prettier を導入する（本作業スコープ指定による）。導入後、規約の所有元 `docs/development-guidelines.md` の（要確認）解消を「永続文書の更新対象」として design.md に計上する。
