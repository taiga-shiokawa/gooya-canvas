# 初回実装 タスクリスト（Phase 0 + Phase 1）

要求は `requirements.md`、設計は `design.md` を参照（本書では繰り返さない）。タスクは上から順に依存する。本書は計画変更時と完了時にまとめて更新する（作業中の細かな進捗は実行時の計画で管理）。

## 1. Phase 0 — Project Setup

順序は `docs/development-roadmap.md > Phase 0` の確定順序 + `design.md > §1.1` の 1〜8 に従う。

- [ ] **P0-1: git 初期化と初回コミット**
  - 完了条件: スキャフォールド一式が初回コミットに含まれる（`.gitignore` は Vite 既定を維持）。
- [ ] **P0-2: GitHub リポジトリ `gooya-canvas` 作成**
  - **着手時にユーザー確認（要確認）**: リポジトリの owner / org（`requirements.md > 4`）。確認前に作成しない。
  - 完了条件: リモート `gooya-canvas` へ push 済み。
- [ ] **P0-3: `.github/workflows/deploy.yml` 作成 + Pages 設定**
  - 内容は `design.md > §1.1-1`（build → deploy の 2 ジョブ、Pages source = GitHub Actions、permissions、concurrency。lint / test は含めない）。
  - **着手時に確定（要確認）**: `setup-node` の Node.js バージョン — ローカルの Node メジャーバージョンと一致させて確定し、ユーザーに確認のうえワークフローへ記載（`design.md > §1.1-1`）。
  - 完了条件: main への push で Actions が成功する。
- [ ] **P0-4: `vite.config.ts` に `base: '/gooya-canvas/'` 設定 → Pages 配信確認**
  - 完了条件: `https://<owner>.github.io/gooya-canvas/` で asset パス崩れなく表示される（`design.md > §4` リスク対応）。
- [ ] **P0-5: 依存導入 + `docs/architecture.md > 1.2` へ確定バージョン追記**
  - 導入対象一覧は `docs/architecture.md > 1.2` が所有。各ライブラリは最新安定版（`design.md > §1.1-3`）。zundo・Zod・Playwright・Vitest は導入/設定のみで本作業では使用箇所を作らない。
  - Tailwind CSS は `src/index.css` をエントリ化し、導入方式（Vite プラグイン or PostCSS）を同表へ記録（`design.md > §1.1-8`）。
  - 完了条件: `npm run build` 通過、`docs/architecture.md > 1.2` の表にバージョン列が埋まる。
- [ ] **P0-6: npm scripts 4 種追加（`test` / `test:e2e` / `format` / `format:check`）+ Prettier 最小構成**
  - `.prettierrc` / `.prettierignore` / `playwright.config.ts` 作成、eslint-config-prettier を `eslint.config.js` 末尾へ適用（`design.md > §1.1-4`）。
  - 完了条件: 4 scripts が実行可能、`npm run format:check` 通過。
- [ ] **P0-7: ESLint zones 実装（`import/no-restricted-paths` #1〜#5）**
  - グロブは `docs/repository-structure.md > 5.1` が正。`src/main.tsx` / `src/app/**` を #2・#4 の from から除外（`design.md > §1.1-5`）。
  - 完了条件: **意図的な違反 import を一時的に書いて `npm run lint` が落ちることを確認**したうえで違反を除去し、lint 通過（`design.md > §4` リスク対応）。
- [ ] **P0-8: ディレクトリ骨格 5 箇所の作成 + `@/` エイリアス**
  - 作成するのは実ファイルを置く 5 ディレクトリのみ: `src/app/`・`src/modules/workflow/domain/`・`src/modules/canvas/application/`・`src/modules/canvas/presentation/`・`src/modules/shared/application/`（空ディレクトリ禁止 — `design.md > §1.1-6`）。
  - `vite.config.ts` へエイリアス、`tsconfig.app.json` へ paths（`docs/repository-structure.md > 8`）。
  - 完了条件: `@/` import で build / lint 通過。
- [ ] **P0-9: スキャフォールド移設・削除**
  - `src/App.tsx` → `src/app/App.tsx` へ移設、`src/App.css` / `src/assets/` 削除（`docs/repository-structure.md > 8`、`design.md > §2`）。
  - 完了条件: `npm run build` / `npm run lint` 通過（Phase 0 完了条件 — `docs/development-roadmap.md > Phase 0`）。

## 2. Phase 1 — Canvas Foundation

ファイル単位で `design.md > §2 / §3` に従い、下記の順に実装する（後のファイルが前のファイルに依存）。

- [ ] **P1-1: `src/modules/workflow/domain/types.ts` + `index.ts`**
  - `WorkflowNodeKind` / `WorkflowNode` / `WorkflowEdge` を `docs/functional-design.md > 3.2` の定義どおり実装（サブセット化しない — `design.md > §3`）。
  - 完了条件: lint / build 通過。
- [ ] **P1-2: `src/modules/shared/application/workflowStore.ts` + `index.ts`**
  - state は `{ nodes; edges }` と更新アクション。公開シグネチャに React Flow 型を出さない（NFR-010 — `design.md > §3`）。
  - 完了条件: lint / build 通過、store の公開 API に `@xyflow/react` 由来の型が現れない。
- [ ] **P1-3: `src/modules/canvas/application/canvasUseCases.ts`**
  - addNode / moveNode / connectNodes / removeNodes / removeEdges。ID 採番 `crypto.randomUUID()` はここで実施（AD-08）。removeNodes は接続 Edge を必ず同時削除（`design.md > §1.2 / §4`）。
  - 完了条件: lint / build 通過、store 更新の入口がユースケースに一本化されている。
- [ ] **P1-4: `src/modules/canvas/presentation/reactFlowMapper.ts`**
  - `toReactFlow` / `fromReactFlow`。デフォルトノード方式（`data.label = node.data.title`、`type` 未指定 — `design.md > §1.2`）。シグネチャは Phase 2 で変えない前提で確定する。
  - 完了条件: lint / build 通過。
- [ ] **P1-5: `src/modules/canvas/presentation/WorkflowCanvas.tsx` / `NodePalette.tsx` + `src/modules/canvas/index.ts`**
  - controlled flow（`design.md > §1.2` のデータフロー）。`<MiniMap>` / `<Controls>` / fitView は React Flow 標準機能（AD-02）。Palette は `WorkflowNodeKind` 11 種を列挙し drop 座標へ追加（`data.config = {}`）。`@xyflow/react/dist/style.css` の import は `WorkflowCanvas.tsx` に置く。`index.ts` は `WorkflowCanvas` / `NodePalette` のみ公開。
  - 完了条件: lint 通過（zones #5 に適合、`@xyflow/react` の import が `src/modules/canvas/**` に閉じている）。
- [ ] **P1-6: app 組み立て（`src/app/App.tsx` / `src/main.tsx`）**
  - Palette + Canvas のレイアウト組み立てのみ（ポート注入なし — `design.md > §2`）。
  - 完了条件: **AC-001 / AC-002 / AC-003 / AC-004 / AC-005 / AC-007 / AC-008 / AC-009**（`docs/product-requirements.md > 7`）をローカルで手動確認。AC-006（複製）は対象外（Phase 8）。`npm run build` / `npm run lint` / `npm run format:check` 通過。main へ push し Pages 配信上でも Canvas が動作する。

## 3. 実装完了時 — 永続文書の更新（`design.md > §5`）

作業中に確定した時点で先行更新してよい。

- [ ] **D-1: `docs/architecture.md > 1.2`** — 導入ライブラリの確定バージョン追記、（要確認）解消（P0-5 と同時でよい）
- [ ] **D-2: `docs/architecture.md > 4`** — `deploy.yml` 確定内容で置換、Pages URL の `<org>` を実値化
- [ ] **D-3: `docs/architecture.md > 5.1 / 5.2`** — `test` / `test:e2e` / `format` を実装済みへ移動、フォーマッタ（要確認）解消
- [ ] **D-4: `docs/development-guidelines.md`** — フォーマット規約（Prettier 既定値ベース・実行コマンド・eslint-config-prettier 併用）追記、（要確認）解消
- [ ] **D-5: `docs/repository-structure.md > 1`** — ワークフローファイル名を `deploy.yml` で確定、（要確認）解消

## 4. 全体の完了条件

- Phase 0: `docs/development-roadmap.md > Phase 0` の完了条件（build / lint 通過、GitHub Pages 配信、ESLint zones 有効）。
- Phase 1: AC-001〜AC-005・AC-007〜AC-009 を満たす（AC-006 は対象外）。
- 上記 D-1〜D-5 の永続文書更新が完了し、対応する（要確認）が解消されている。
