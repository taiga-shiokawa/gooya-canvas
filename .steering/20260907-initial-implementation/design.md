# 初回実装 設計（Phase 0 + Phase 1）

要求・スコープ・受け入れ条件は同ディレクトリの `requirements.md` を参照（本書では繰り返さない）。設計の恒久的な根拠は `docs/architecture.md` / `docs/repository-structure.md` / `docs/functional-design.md` の該当セクションを参照で示し、転記しない。

---

## 1. 実装アプローチ

### 1.1 Phase 0 — Project Setup

実行順は `docs/development-roadmap.md > Phase 0 — Project Setup` の確定順序（git init → 初回コミット → GitHub リポジトリ作成 → Actions/Pages ワークフロー → `base: '/gooya-canvas/'`）に従う。本書での確定事項:

1. **GitHub Actions ワークフロー**（`docs/repository-structure.md > 1` の（要確認）を本書で解消）
   - ファイル名: **`.github/workflows/deploy.yml`** の 1 本のみ。
   - 構成: `main` への push をトリガーに、build ジョブ（`actions/checkout` → `actions/setup-node` + npm キャッシュ → `npm ci` → `npm run build` → `actions/upload-pages-artifact` で `dist/` をアップロード）→ deploy ジョブ（`actions/deploy-pages`）。GitHub 公式の Pages デプロイ方式（Pages source = GitHub Actions）を使い、`gh-pages` ブランチ方式は採らない。
   - permissions: `pages: write` / `id-token: write`（deploy ジョブ）。`concurrency` で Pages デプロイの同時実行を 1 に制限。
   - lint / test はこのワークフローに含めない（Phase 0 の完了条件はローカル `npm run build` / `npm run lint` 通過 + Pages 配信 — `docs/development-roadmap.md > Phase 0`。CI での lint/test 実行は別途の判断とし、本作業ではデプロイ専用に留める）。
   - Node.js バージョン: `setup-node` に指定する（要確認）— 実装時にローカルの Node メジャーバージョンと一致させて確定し、確定値をワークフローに記載する。
2. **GitHub リポジトリ**: 名称 `gooya-canvas`（確定）。owner / org は（要確認）— `requirements.md > 4` のとおり未確定。実装時にユーザーへ確認してから作成する。
3. **依存導入**: 対象一覧は `docs/architecture.md > 1.2` が所有。各ライブラリは導入時点の最新安定版を採用し、確定バージョンを同表へ追記する（→ §5）。zundo は**パッケージ導入のみ**とし、store への temporal middleware 適用は Phase 8（`docs/development-roadmap.md > Phase 8`）。Playwright / Vitest も導入・設定ファイル整備のみとし、E2E 本体は Phase 5。
4. **npm scripts の追加**: `docs/architecture.md > 5.2` の予定に従い `test`（Vitest）/ `test:e2e`（Playwright）を追加。加えて Prettier 導入に伴い `format`（`prettier --write .`）/ `format:check` を追加する。Prettier 設定は既定値ベースの最小構成（`.prettierrc` + `.prettierignore`）とし、ESLint との競合排除に eslint-config-prettier を `eslint.config.js` 末尾へ適用する。規約本文は `docs/development-guidelines.md` へ追記する（→ §5）。
5. **ESLint zones**: `docs/repository-structure.md > 5.1` の表 #1〜#5 を `eslint.config.js` に実装する。§5.3 のとおり `src/main.tsx` / `src/app/**` を #2・#4 の from から除外する。
6. **ディレクトリ骨格**: `docs/repository-structure.md > 2` の 8 モジュール構成。ただし空ディレクトリ禁止（同 > 2.1）のため、**Phase 0〜1 で実ファイルを置くディレクトリのみ作成**する（本作業で作るのは `workflow/domain`・`canvas/application`・`canvas/presentation`・`shared/application`・`src/app/`。他モジュールは各フェーズで作る）。
7. **スキャフォールド移行**: `docs/repository-structure.md > 8` に従う（App.tsx → `src/app/`、`src/assets/` 削除、`vite.config.ts` へ `base` + `@/` エイリアス、tsconfig へ paths）。
8. **Tailwind CSS**: `src/index.css` を Tailwind エントリとする（`docs/repository-structure.md > 2`）。導入方式（Vite プラグイン or PostCSS）は導入するメジャーバージョンに従い、確定内容を `docs/architecture.md > 1.2` へ記録する。

### 1.2 Phase 1 — Canvas Foundation

@xyflow/react を `canvas` モジュールへ封じ込め（`docs/architecture.md > 3.2 #5`）、Source of Truth を Zustand store の Domain Model とする（同 > 3.3）。

- **データフロー（一方向同期）**: store の `WorkflowNode[]` / `WorkflowEdge[]` を mapper `toReactFlow` で React Flow の `nodes` / `edges` props へ変換して渡す（controlled flow）。React Flow のイベント（`onNodesChange` / `onConnect` / `onNodesDelete` / `onEdgesDelete`）は presentation で受け、`fromReactFlow`（変更差分 → ドメイン値）で変換してから `canvas/application` のユースケース経由で store を更新する。React Flow の内部 state を Source of Truth にしない（NFR-010）。
- **Node 暫定表示の方式（本書で決定）**: Custom Node は Phase 2 のため、Phase 1 は **React Flow デフォルトノード**を使う。`toReactFlow` で `data.label = node.data.title` に写像し、`type` は指定しない（デフォルトノード）。`nodeTypes` 登録・icon・種別別デザイン（`docs/functional-design.md > 5` のノード表示仕様）は Phase 2 で置き換える。mapper のシグネチャは Phase 2 でも変えない（差し替えは `toReactFlow` の内部と `nodeTypes` 登録のみ）。
- **Palette からの追加**: NodePalette は `WorkflowNodeKind` 11 種（`docs/functional-design.md > 3.2`）を列挙し、ドラッグ&ドロップで Canvas 上の drop 座標（`screenToFlowPosition`）に追加する。追加時の Domain Model は `type` = 選択種別、`data.title` = 種別の表示名（例: "Trigger"）を既定値、`data.config` = 空オブジェクト `{}` とする。**種別ごとの初期 config（Condition の `branches` 等 — 同 > 3.3）の投入は Phase 2〜3 スコープ**とし、本作業では行わない。
- **Zoom / Pan / MiniMap / Fit View**: React Flow 標準機能（`<MiniMap>` / `<Controls>` または fitView アクション）で実現し、自前実装しない（AD-02）。viewport は Phase 1 では React Flow の内部状態のままとし、store には持たない（保存対象になる Phase 4 で `WorkflowProject.viewport` への取り込み方を設計する）。
- **削除**: React Flow の選択 + Delete キー既定動作を使い、`onNodesDelete` / `onEdgesDelete` で store から削除する。Node 削除時は接続 Edge も store 側で併せて削除する（孤立 Edge を残さない）。
- **CSS**: `@xyflow/react/dist/style.css` の import は `canvas/presentation/WorkflowCanvas.tsx` に置く（zones #5 に適合）。

## 2. 変更するコンポーネント

すべて新規（既存はスキャフォールドのみ）。配置判定は `docs/repository-structure.md > 3 / 4` に従う。

| 配置 | 新規ファイル（主なもの） | 責務 |
|---|---|---|
| ルート | `.github/workflows/deploy.yml`、`.prettierrc`、`.prettierignore`、`playwright.config.ts`、`.gitignore`（Vite 既定を維持） | §1.1 |
| ルート（変更） | `vite.config.ts`（base / エイリアス / Vitest 設定）、`tsconfig.app.json`（paths）、`eslint.config.js`（zones + prettier）、`package.json`（依存・scripts） | §1.1 |
| `src/main.tsx` / `src/app/App.tsx` | composition root。Phase 1 はポート具象が存在しないため注入はなく、レイアウト（Palette + Canvas）の組み立てのみ | `docs/repository-structure.md > 5.3` |
| `src/modules/workflow/domain/` | `types.ts`（`WorkflowNodeKind` / `WorkflowNode` / `WorkflowEdge` — `docs/functional-design.md > 3.2` の型をそのまま実装）+ `index.ts`（公開 API） | §3 |
| `src/modules/shared/application/` | `workflowStore.ts`（Zustand store: `nodes` / `edges` と更新アクション）+ `index.ts`（フック / selector を公開） | §3 |
| `src/modules/canvas/application/` | `canvasUseCases.ts`（addNode / moveNode / connectNodes / removeNodes / removeEdges。ID 採番 `crypto.randomUUID()` はここで実施 — AD-08） | store 更新の唯一の入口 |
| `src/modules/canvas/presentation/` | `WorkflowCanvas.tsx`（ReactFlow + MiniMap + Controls + イベント接続）、`NodePalette.tsx`、`reactFlowMapper.ts`（`toReactFlow` / `fromReactFlow` — `docs/repository-structure.md > 4.3`） | §1.2 |
| `src/modules/canvas/index.ts` | `WorkflowCanvas` / `NodePalette` のみ公開（`docs/repository-structure.md > 5.4`） | 公開境界 |

削除: `src/App.tsx` / `src/App.css` / `src/assets/`（`docs/repository-structure.md > 8`）。

## 3. データ構造の変更

- **Phase 1 で実装する Domain Model**: `WorkflowNodeKind` / `WorkflowNode` / `WorkflowEdge`。型は `docs/functional-design.md > 3.2` の定義をそのまま採用する（サブセット化して独自型を作らない。将来の差分移行を避けるため）。`data.config` は Phase 1 では常に `{}`。
- **Phase 1 で実装しないもの**: `WorkflowProject` / `PromptTarget` / Zod スキーマ / migration レジストリ（Phase 4 — `docs/development-roadmap.md > Phase 4`）。Zod はパッケージ導入のみ。
- **store の形**（`shared/application/workflowStore.ts`）: state は `{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }` と更新アクション。公開シグネチャに React Flow 型を出さない（NFR-010、`docs/repository-structure.md > 2.1`）。metadata / 選択状態 / dirty 等の slice は各該当フェーズで追加する。
- 永続化フォーマットの変更はなし（Persistence 自体が Phase 4 のため互換性影響なし）。

## 4. 影響範囲の分析

- **既存コードへの影響**: スキャフォールドの移設・破棄のみ（`docs/repository-structure.md > 8`）。既存の利用者・データは存在しない。
- **後続フェーズへの影響（本設計が固定するもの）**: mapper のシグネチャ、store の nodes/edges slice、ESLint zones、`@/` エイリアス、`deploy.yml`。Phase 2 は `toReactFlow` の内部差し替えと `nodeTypes` 追加で成立する構造にしてある（§1.2）。
- **リスク**:
  - GitHub Pages のサブパス配信で asset パスが崩れる → `base: '/gooya-canvas/'` を Phase 0 完了条件（Pages 配信確認）で検証する。
  - React Flow の uncontrolled 機能（内部 state 保持）に依存すると NFR-010 が崩れる → controlled flow（§1.2 のデータフロー）を徹底し、zones #5 とレビューで担保する。
  - ESLint zones のグロブ誤りで検出漏れ → 意図的な違反 import を一時的に書いて lint が落ちることを確認してから完了とする（tasklist に計上）。
  - Node 削除時の孤立 Edge → application ユースケース側で必ず同時削除する（§1.2）。
- **ドキュメントへの影響**: §5 のとおり。

## 5. 永続文書の更新対象

実装完了時に以下を更新する（作業中に確定した時点で更新してよい）。

| 文書 > セクション | 更新内容 |
|---|---|
| `docs/architecture.md > 1.2` | 導入した全ライブラリの確定バージョンを表へ追記し、（要確認）を解消。導入済みへの記載移動（1.1 との統合方針は更新時に判断） |
| `docs/architecture.md > 4` | 「ワークフロー定義は実装時に確定する」を `deploy.yml` の確定内容（§1.1）で置換。owner / org 確定後、Pages URL の `<org>` を実値化 |
| `docs/architecture.md > 5.1 / 5.2` | `test` / `test:e2e` / `format` を実装済み scripts として 5.1 へ移動。フォーマッタ（要確認）を「Prettier + eslint-config-prettier」で解消 |
| `docs/development-guidelines.md` | フォーマット規約（Prettier 既定値ベース・実行コマンド・eslint-config-prettier 併用）を追記し、（要確認）を解消 |
| `docs/repository-structure.md > 1` | ワークフローファイル名を `deploy.yml` で確定し、（要確認）を解消 |

（Node 暫定表示は一時的な実装であり永続文書に書かない。Custom Node 確定時に `docs/functional-design.md > 5` がそのまま正となる。）
