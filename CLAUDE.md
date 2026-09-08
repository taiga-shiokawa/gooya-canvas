# CLAUDE.md — GOOYA Canvas

## 1. ステアリング規則

作業単位ごとに `.steering/[YYYYMMDD]-[開発タイトル]/` を作成し、次の3ファイルを置く:

- `requirements.md` / `design.md` / `tasklist.md`

## 2. プロジェクト固有情報

### プロダクト概要

GOOYA Canvas は、業務フローを視覚的に設計し実装プロンプトを生成する Browser Only SPA。Workflow を実行しない Design Tool である。

### 技術スタック

React 19 + TypeScript + Vite / @xyflow/react / Zustand + zundo / Zod / Tailwind CSS v4（`@tailwindcss/vite` プラグイン方式）/ html-to-image + jsPDF / Vitest + Playwright

### 実行コマンド

- `npm run dev` — 開発サーバー
- `npm run build` — ビルド（tsc -b && vite build）
- `npm run lint` — Lint
- `npm run preview` — ビルド結果のプレビュー
- `npm run test` — 単体テスト（Vitest。`environment: 'node'` で jsdom は入れていないため DOM を要するテストは書かない）
- `npm run test:e2e` — E2E（Playwright。`e2e/mainFlow.spec.ts` の主要導線 1 本。**初回実行前に `npx playwright install`**、実行前に `npm run build` が必要）
- `npm run format` / `npm run format:check` — Prettier

Node.js は 24 系。CI（`.github/workflows/deploy.yml`）は Pages デプロイ専用で lint / test を含まないため、コミット前に `format:check` → `lint` → `test` → `build` をローカルで実行する。

### 重要規則の要点（詳細は docs/ 参照）

- Canvas UI と Workflow Domain を分離する。React Flow 型の使用は canvas モジュール内の mapper に限定する
- モジュラモノリス 8 モジュール構成に従う（docs/repository-structure.md）
- 読み込んだ JSON は必ず Zod で validate する
- Workflow へ秘密情報を保存しない
- 依存方向は ESLint（`import-x` の zones + `no-restricted-imports`）で機械的に担保される。`npm run lint` が品質ゲート
- デプロイは GitHub Actions → GitHub Pages（AD-12）。公開 URL: <https://taiga-shiokawa.github.io/gooya-canvas/>

### 開発順序

- **MVP（docs/development-roadmap.md の Phase 0〜8）は完了済み**（2026-09-08）。以降の着手対象は roadmap §4「MVP 後の拡張候補」から選ぶ
- 完了判定は AC/FR ID を参照する
- 「Phase 2」という語は多義のため、MVP 後の機能群は「MVP 後の拡張候補（roadmap §4）」と表現する

### 永続文書の所在

`docs/product-requirements.md` / `functional-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md` / `development-roadmap.md`

## 3. 開発プロセス

開発プロセスの詳細ルール（ドキュメント構成・承認手順・図表規約など）は `/dev-docs` に従う。
