# CLAUDE.md — GOOYA Canvas

## 1. ステアリング規則

作業単位ごとに `.steering/[YYYYMMDD]-[開発タイトル]/` を作成し、次の3ファイルを置く:

- `requirements.md` / `design.md` / `tasklist.md`

## 2. プロジェクト固有情報

### プロダクト概要

GOOYA Canvas は、業務フローを視覚的に設計し実装プロンプトを生成する Browser Only SPA。Workflow を実行しない Design Tool である。

### 技術スタック

React 19 + TypeScript + Vite / @xyflow/react / Zustand + zundo / Zod / Tailwind CSS / html-to-image + jsPDF / Vitest + Playwright

### 実行コマンド

- `npm run dev` — 開発サーバー
- `npm run build` — ビルド（tsc -b && vite build）
- `npm run lint` — Lint
- `npm run preview` — ビルド結果のプレビュー
- テストは導入予定: `npm run test`（Vitest）/ `npm run test:e2e`（Playwright）

### 重要規則の要点（詳細は docs/ 参照）

- Canvas UI と Workflow Domain を分離する。React Flow 型の使用は canvas モジュール内の mapper に限定する
- モジュラモノリス 8 モジュール構成に従う（docs/repository-structure.md）
- 読み込んだ JSON は必ず Zod で validate する
- Workflow へ秘密情報を保存しない
- デプロイは GitHub Actions → GitHub Pages（AD-12）

### 開発順序

- docs/development-roadmap.md の Phase 0〜8 に従う。完了判定は AC/FR ID を参照する
- 「Phase 2」という語は多義のため、MVP 後の機能群は「MVP 後の拡張候補（roadmap §4）」と表現する

### 永続文書の所在

`docs/product-requirements.md` / `functional-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md` / `development-roadmap.md`

## 3. 開発プロセス

開発プロセスの詳細ルール（ドキュメント構成・承認手順・図表規約など）は `/dev-docs` に従う。
