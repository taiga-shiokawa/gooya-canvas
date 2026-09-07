# GOOYA Canvas

**業務を描く。実装につなぐ。**

業務フローを視覚的に設計し、そこから AI コーディングツールへ渡せる実装プロンプトを生成する Browser Only の SPA です。

ノードと線で業務フローを組み立てますが、単なる図ではなく、各ノードが「トリガー」「条件分岐」「待機」「人間による作業」「通知」「AI 処理」などの意味を持ちます。完成したフローは構造化データ（`*.gooya-canvas.json`）として保存され、そこから実装仕様が生成されます。

GOOYA Canvas 自身は Workflow を実行しません。業務要件を実装可能な形へ変換する Design Tool です。Power Automate・GAS・Cloudflare・Azure Functions などは、GOOYA Canvas が作った設計の実装先として扱います。

公開先: <https://taiga-shiokawa.github.io/gooya-canvas/>

## 開発

```bash
npm install
npm run dev
```

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run lint` | ESLint（依存方向の制約検査を含む品質ゲート） |
| `npm run test` | Unit テスト（Vitest） |
| `npm run test:e2e` | E2E テスト（Playwright）。`npm run build` と `npx playwright install` が前提 |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run preview` | ビルド結果のプレビュー |

Node.js は 24 系を前提とします。CI（`.github/workflows/deploy.yml`）は GitHub Pages へのデプロイ専用で lint / test を含まないため、品質チェックはローカルで実行します。

## ドキュメント

設計と規約はすべて `docs/` にあります。実装に入る前に目的に応じて参照してください。

| 文書 | 内容 |
| --- | --- |
| [docs/product-requirements.md](docs/product-requirements.md) | プロダクト要求（FR / NFR / US / AC） |
| [docs/functional-design.md](docs/functional-design.md) | 機能設計・画面設計・データモデル |
| [docs/architecture.md](docs/architecture.md) | 技術選定（AD）・レイヤー構成・テスト戦略 |
| [docs/repository-structure.md](docs/repository-structure.md) | ディレクトリ責務・配置規則・公開境界 |
| [docs/development-guidelines.md](docs/development-guidelines.md) | コーディング・命名・テスト・Git 規約 |
| [docs/glossary.md](docs/glossary.md) | 用語集・ID 体系 |
| [docs/development-roadmap.md](docs/development-roadmap.md) | Phase 0〜8 の実装計画と現在地 |

作業単位ごとの要件・設計・タスクは `.steering/[YYYYMMDD]-[開発タイトル]/` に置きます。

## アーキテクチャの要点

Canvas UI と Workflow Domain を分離します。React Flow（`@xyflow/react`）は Renderer / Interaction Engine として扱い、その型は `canvas` モジュール内の mapper に封じ込めます。JSON 保存・プロンプト生成・フローレビューはすべて Workflow Domain Model を入力とします。

```text
React Flow UI
      ↓
Workflow Domain Model
      ↓
 ┌────┼────────┐
 ↓    ↓        ↓
JSON Prompt   Review
```

この依存方向は ESLint（`import-x/no-restricted-paths` の zones と `no-restricted-imports`）で機械的に検査されます。詳細は [docs/repository-structure.md](docs/repository-structure.md) §5。

## セキュリティ

サーバーへ Workflow を送信しません。API Key・Password・Access Token・Webhook Secret といった実際の秘密情報は Workflow に保存せず、「Authentication: OAuth required」のような設計情報のみを保持します。
