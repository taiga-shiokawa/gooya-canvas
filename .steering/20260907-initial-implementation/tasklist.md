# 初回実装 タスクリスト（Phase 0 + Phase 1）

要求は `requirements.md`、設計は `design.md` を参照（本書では繰り返さない）。タスクは上から順に依存する。本書は計画変更時と完了時にまとめて更新する（作業中の細かな進捗は実行時の計画で管理）。

**状態: 完了（2026-09-07）。** 実装中に確定した設計変更は §5 に記録する。

## 1. Phase 0 — Project Setup

順序は `docs/development-roadmap.md > Phase 0` の確定順序 + `design.md > §1.1` の 1〜8 に従う。

- [x] **P0-1: git 初期化と初回コミット**
  - 完了条件: スキャフォールド一式が初回コミットに含まれる（`.gitignore` は Vite 既定を維持）。
- [x] **P0-2: GitHub リポジトリ `gooya-canvas` 作成**
  - owner は `taiga-shiokawa`、可視性は Public で確定（Pages が無料プランで使えることを優先）。
  - 完了条件: リモート `gooya-canvas` へ push 済み → <https://github.com/taiga-shiokawa/gooya-canvas>
- [x] **P0-3: `.github/workflows/deploy.yml` 作成 + Pages 設定**
  - Node.js バージョンは **24**（ローカル v24.18.1 と一致）で確定。
  - Pages の source は GitHub Actions（`build_type=workflow`）で設定。
  - 完了条件: main への push で Actions が成功する（run 34110435224, success）。
- [x] **P0-4: `vite.config.ts` に `base: '/gooya-canvas/'` 設定 → Pages 配信確認**
  - 完了条件: <https://taiga-shiokawa.github.io/gooya-canvas/> で asset（js / css / favicon）が全て 200、Canvas / MiniMap / Controls が描画されることを確認。
- [x] **P0-5: 依存導入 + `docs/architecture.md > 1` へ確定バージョン追記**
  - Tailwind CSS は v4 系のため **Vite プラグイン方式（`@tailwindcss/vite`）** を採用し、`src/index.css` を `@import 'tailwindcss'` のエントリにした（PostCSS 設定は不要）。
  - 完了条件: `npm run build` 通過、`docs/architecture.md > 1` に全依存の確定バージョンを記載。
- [x] **P0-6: npm scripts 4 種追加（`test` / `test:e2e` / `format` / `format:check`）+ Prettier 最小構成**
  - `.prettierrc`（`semi: false` / `singleQuote: true` のみ）/ `.prettierignore`（`*.md` を除外）/ `playwright.config.ts` 作成、eslint-config-prettier を `eslint.config.js` 末尾へ適用。
  - 完了条件: `format` / `format:check` / `test` が実行可能。`test:e2e` は設定のみ（テスト本体は Phase 5、実行には `npx playwright install` が必要）。
- [x] **P0-7: ESLint zones 実装（`import-x/no-restricted-paths` #1〜#5）**
  - 完了条件: 意図的な違反 import を一時的に置いて `npm run lint` が落ちることを #1〜#5 すべてで確認し、違反を除去して lint 通過。
- [x] **P0-8: ディレクトリ骨格 5 箇所の作成 + `@/` エイリアス**
  - 完了条件: `@/` import で build / lint 通過。
- [x] **P0-9: スキャフォールド移設・削除**
  - `src/App.tsx` → `src/app/App.tsx`、`src/App.css` / `src/assets/` を削除。
  - 完了条件: `npm run build` / `npm run lint` 通過。

## 2. Phase 1 — Canvas Foundation

- [x] **P1-1: `src/modules/workflow/domain/types.ts` + `index.ts`**
- [x] **P1-2: `src/modules/shared/application/workflowStore.ts` + `index.ts`**
- [x] **P1-3: `src/modules/canvas/application/canvasUseCases.ts`**
  - 自己接続の禁止（`docs/functional-design.md > 5.2`）のみ最小ガードとして実装。種別ごとの接続ルールは Phase 2。
- [x] **P1-4: `src/modules/canvas/presentation/reactFlowMapper.ts`**
  - `toReactFlow` / `fromReactFlow*` に加え、`mergeReactFlowNodes` / `mergeReactFlowEdges` を追加（理由は §5）。
- [x] **P1-5: `WorkflowCanvas.tsx` / `NodePalette.tsx` + `canvas/index.ts`**
- [x] **P1-6: app 組み立て（`src/app/App.tsx` / `src/main.tsx`）**
  - 完了条件: **AC-001 / AC-002 / AC-003 / AC-004 / AC-005 / AC-007 / AC-008 / AC-009** をブラウザで確認済み（ローカル dev + Pages 配信の両方でノード追加・接続・MiniMap を確認）。`npm run build` / `lint` / `format:check` / `test` 通過。

## 3. 実装完了時 — 永続文書の更新（`design.md > §5`）

- [x] **D-1: `docs/architecture.md > 1`** — 導入ライブラリの確定バージョン、（要確認）解消
- [x] **D-2: `docs/architecture.md > 4`** — `deploy.yml` 確定内容、Pages URL 実値化
- [x] **D-3: `docs/architecture.md > 5`** — scripts を実装済みへ移動、フォーマッタ確定
- [x] **D-4: `docs/development-guidelines.md`** — フォーマット規約追記、Lint プラグイン名更新、（要確認）解消
- [x] **D-5: `docs/repository-structure.md > 1`** — ワークフローファイル名を `deploy.yml` で確定

## 4. 全体の完了条件

- [x] Phase 0: build / lint 通過、GitHub Pages 配信、ESLint zones 有効。
- [x] Phase 1: AC-001〜005・AC-007〜009 を満たす（AC-006 は Phase 8 のため対象外）。
- [x] D-1〜D-5 の永続文書更新と、対応する（要確認）の解消。

## 5. 実装中に確定した設計変更

`design.md` の計画に対する差分。永続文書側にも反映済み。

| 項目 | 計画 | 実際 | 理由 |
|---|---|---|---|
| Lint プラグイン | `eslint-plugin-import` | **`eslint-plugin-import-x`** + `eslint-import-resolver-typescript` | 前者の peer が ESLint ^9 までで ESLint 10 に非対応。resolver が無いと拡張子省略 import と `@/` エイリアスを解決できず zones が発火しない |
| zones のグロブ | `src/modules/*/domain` 等 | 末尾 `/**` が必須（`src/modules/*/domain/**`） | グロブを含む target / from は末尾 `/**` が無いとファイルパスに一致せず、ルールが無言で発火しない（実測で確認） |
| tsconfig | `baseUrl` + `paths` | **`paths` のみ** | TypeScript 6 で `baseUrl` が非推奨（TS5101 でビルドエラー） |
| Tailwind | 方式未定 | v4 + `@tailwindcss/vite` | v4 系の標準構成。PostCSS 設定が不要になる |
| `npm run test` | `vitest run` | `vitest run --passWithNoTests` | 重点テスト対象が後続フェーズのため、テストの無いフェーズでもスクリプトが成功する必要がある |
| Domain → React Flow の同期 | `useEffect` で store の値をマージ | **store を `subscribe` し、コールバックで setState** + `mergeReactFlowNodes` / `mergeReactFlowEdges` で既存要素の参照を維持 | ①React Flow は `measured` を渡したノードオブジェクト自身に保持するため、毎回作り直すと MiniMap が描画されない（実測で確認）。②`onNodesChange` の `dimensions` 変更を `applyNodeChanges` で適用しないと `measured` が付かない。③effect 内の同期 setState は React 19 の `react-hooks/set-state-in-effect` に抵触するため、購読コールバック形に変更 |
| Unit テスト | Phase 1 では作らない | **15 件を追加**（ユースケース 8 / mapper 7） | ブラウザの実マウス操作による検証が環境依存で不安定だったため、AC-002〜005 の振る舞いを決定論的に固定した。mapper のマージ規則は退行すると MiniMap が静かに壊れるため回帰テストが必要 |
