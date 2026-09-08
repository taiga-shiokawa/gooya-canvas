# GOOYA Canvas リポジトリ構造定義書

本書は安定したディレクトリ責務・ファイル配置ルール・公開境界を定義する永続的ドキュメントである。
モジュール分割の責務定義は `docs/functional-design.md` §2 が、依存方向の原則と ESLint 制約の趣旨は `docs/architecture.md` §3 が所有する。本書はそれらを**配置規則（どこに何を置き、どこから import してよいか）**として具体化する。実ファイルの網羅列挙はせず、規則のみを書く。

---

## 1. ルートディレクトリ構成

```text
gooya-canvas/
├─ .claude/
│  └─ launch.json           # 開発サーバの起動定義（AI コーディングツールのプレビュー用。アプリの動作には無関係）
├─ .github/
│  └─ workflows/
│     └─ deploy.yml         # Pages デプロイ専用ワークフロー（1 本のみ。AD-12）
├─ .steering/               # ステアリングファイル（タスク単位の作業記録。永続文書に複製しない）
├─ docs/                    # 永続的ドキュメント（本書を含む 7 文書体系）
│  └─ ideas/                # 初期要求メモ等の一次情報
├─ e2e/                     # Playwright E2E テスト（§6.1。`mainFlow.spec.ts` の 1 本）
├─ public/                  # Vite の静的公開ファイル（`favicon.svg` のみ。加工なしで配信されるもののみ）
├─ src/                     # アプリケーション本体（§2）
├─ index.html               # SPA のエントリ HTML（画面は 1 つ。architecture §4）
├─ vite.config.ts           # base: '/gooya-canvas/' を設定する（GitHub Pages サブパス配信。AD-12）
├─ tsconfig*.json           # TypeScript 設定（`tsconfig.app.json` の paths で `@/` → `./src/` を定義。§4.4 / §8）
├─ eslint.config.js         # ESLint 設定（§5 の import zones をここに記述）
├─ playwright.config.ts     # Playwright 設定（テスト本体は `e2e/` に置く — §6.1。Phase 5）
├─ .gitattributes           # 改行コードを LF に統一する（development-guidelines §4.2）
├─ .prettierrc              # Prettier 設定（設定値は development-guidelines §4.2 が所有）
├─ .prettierignore          # Prettier 除外設定（除外対象と理由は development-guidelines §4.2 が所有）
├─ README.md                # リポジトリの入口（プロダクト概要・開発コマンド・docs 索引・アーキテクチャ要点）
└─ package.json
```

- **`.github/workflows/`**: ワークフローは `deploy.yml` の 1 本のみ。GitHub Pages デプロイ専用（build ジョブ → deploy ジョブ）であり、**lint / test は含まない**（AD-12、architecture §4）。lint / test をどう実行するかは development-guidelines.md が所有する。
- **`docs/images/`**: Mermaid で表現できない複雑な図が必要になった場合のみ作成する。独立した diagrams フォルダは作らない。
- **`.steering/`**: 作業単位ごとに `[YYYYMMDD]-[開発タイトル]/`（`requirements.md` / `design.md` / `tasklist.md`）が追加される。タスク単位の作業記録を置き、永続的な設計情報は置かない。
- **`public/`**: 現在は `favicon.svg` のみで、`index.html` から参照される。アプリ内で使うアイコンは `public/` に置かず、Bundled Icons として使用モジュールの `presentation/` 配下（または `shared/presentation/`）に置く（§8、NFR-004）。

## 2. `src/` の構成（モジュラモノリス）

ドメイン駆動 × レイヤードのモジュラモノリスを採用する（functional-design §2 で確定）。モジュールは 8 つで固定し、新モジュールの追加は本書と architecture.md の更新を伴う。

```text
src/
├─ main.tsx                 # エントリポイント = composition root（§5.3）
├─ app/                     # App シェル（レイアウト組み立て・ポート具象の注入）
├─ index.css                # グローバルスタイル（Tailwind エントリ）
└─ modules/
   ├─ workflow/             # コアドメイン（純 TypeScript。domain 層のみ）
   ├─ canvas/               # React Flow 描画・操作（@xyflow/react はここに封じ込める）
   ├─ inspector/            # Node / Edge 設定編集 UI
   ├─ project/              # 新規作成 / 保存 / 読込 / dirty / Crash Recovery
   ├─ export/               # PNG / PDF 出力
   ├─ prompt/               # Prompt 生成・Prompt Panel
   ├─ review/               # Flow Review・Review Panel
   └─ shared/               # 複数モジュール共有（Zustand store 基盤・共通 UI・ユーティリティ）
```

上表は 8 モジュールの**最終形**であり、ディレクトリを先に全部切ることはしない（空ディレクトリ禁止 — §2.1）。**MVP（Phase 0〜8）完了時点で 8 モジュールすべてが実在する**。各モジュールの層構成は次のとおり（フェーズ対応は development-roadmap.md）:

- `src/app/`（App シェル + ポート具象の組み立て + ショートカット配線）、`src/main.tsx`、`src/index.css`
- `src/modules/workflow/`: `domain/` + `index.ts`
- `src/modules/canvas/`: `application/` + `presentation/`（`presentation/nodes/` に Custom Node 一式）+ `index.ts`
- `src/modules/inspector/`: `application/` + `presentation/` + `index.ts`
- `src/modules/project/`: `application/`（+ `ports/`）+ `infrastructure/` + `presentation/` + `assets/samples/` + `index.ts`
- `src/modules/export/`: `application/`（+ `ports/`）+ `infrastructure/` + `presentation/` + `index.ts`
- `src/modules/prompt/`: `domain/` + `application/`（+ `ports/`）+ `infrastructure/` + `presentation/` + `index.ts`
- `src/modules/review/`: `domain/` + `application/` + `presentation/` + `index.ts`
- `src/modules/shared/`: `domain/` + `application/` + `index.ts`

新しい層・新しいモジュールを足す場合は本書と architecture.md の更新を伴う（§2 冒頭）。

`presentation/` 配下は、部品数が増えた層に限りサブディレクトリで分類してよい（`canvas/presentation/nodes/` が該当）。サブディレクトリはレイヤーではないため、依存方向の制約（§5.1）は親の `presentation` として扱われる。

### 2.1 モジュール内部の標準構成

各モジュールは次の 4 層 + 公開 API で構成する。**不要な層のディレクトリは作らない**（空ディレクトリ禁止）。

```text
src/modules/<module>/
├─ index.ts                 # 公開 API（barrel）。モジュール外はここからのみ import する
├─ domain/                  # 純 TS のドメインロジック（React / @xyflow/react / ブラウザ API 禁止）
├─ application/             # ユースケース・store slice
│  └─ ports/                # ポート（interface）定義（§5.2）
├─ infrastructure/          # ポートの具象実装（ブラウザ API・外部ライブラリはここだけ）
└─ presentation/            # React コンポーネント（store 購読とユースケース呼び出しのみ）
```

モジュールごとの実際の層構成（責務の根拠は functional-design §2.1〜2.3）:

| モジュール | domain | application (ports) | infrastructure | presentation |
|---|---|---|---|---|
| `workflow` | ○（型・Zod スキーマ・接続ルール・migration レジストリ） | — | — | — |
| `canvas` | — | ○（Canvas 操作ユースケース。ports なし） | — | ○（WorkflowCanvas / NodePalette / Custom Node / Context Menu）+ mapper（§4.3） |
| `inspector` | — | ○（config 更新ユースケース。ports なし） | — | ○（Inspector / 種別別フォーム） |
| `project` | — | ○（save / open / recover。ports: `ProjectFilePort` / `RecoveryStoragePort`） | ○（Blob download / File Picker / localStorage） | ○（確認・エラー・復旧ダイアログ） |
| `export` | — | ○（exportPng / exportPdf。ports: `CanvasImagePort` / `PdfComposerPort`） | ○（html-to-image / jsPDF） | ○（Export メニュー連携 UI があれば） |
| `prompt` | ○（generatePrompt — 決定論的純関数） | ○（生成実行・コピー。ports: `ClipboardPort`） | ○（Clipboard API） | ○（PromptPanel） |
| `review` | ○（reviewWorkflow — Rule-based 純関数） | ○（実行・結果保持） | — | ○（ReviewPanel / ステータスバー連携） |
| `shared` | ○（共通型・純ユーティリティ） | ○（Zustand store 本体 + zundo） | — | ○（共通 UI 部品） |

- `prompt` / `review` の純関数を domain に置くのは、決定論的純関数としてテストする方針（architecture §3.4、§6.1）を配置で担保するため。
- Zustand store 本体は `shared/application/` に置く。各モジュールは store の自モジュール関連 slice / selector を経由して読み書きする。store の公開シグネチャに React Flow 型を出さない（NFR-010）。

## 3. ディレクトリの役割（レイヤー別配置規則）

| 置く場所 | 置くもの | 置いてはいけないもの |
|---|---|---|
| `domain/` | 型・Zod スキーマ・純関数（接続判定・migration・Prompt 生成・Review ルール） | React import、`@xyflow/react`、`window` / `document` / `localStorage` 等のブラウザ API、他レイヤーへの import |
| `application/` | ユースケース関数、store slice、ポート定義（`ports/`） | infrastructure 具象の import、React コンポーネント、JSX |
| `application/ports/` | interface（型）のみ | 実装コード |
| `infrastructure/` | ポート具象実装。外部ライブラリ・ブラウザ API の呼び出しはここに限定 | ドメインロジック（判定・変換ルール）、React コンポーネント |
| `presentation/` | React コンポーネント・フック | ビジネスロジック（接続判定・Review・Prompt 生成）、infrastructure 具象の import |
| `src/app/` + `src/main.tsx` | composition root。infrastructure 具象の組み立てと注入、画面レイアウトの組み立て | ビジネスロジック |

## 4. ファイル配置ルール

### 4.1 新しいコードを置く場所の判定

1. どのモジュールの責務か（functional-design §2.1）→ `src/modules/<module>/` へ。
2. 純 TS で書けるロジックか → `domain/`。ユースケース・状態か → `application/`。ブラウザ / ライブラリ呼び出しか → `infrastructure/`。UI か → `presentation/`。
3. 2 つ以上のモジュールから使われる型・部品か → Domain Model なら `workflow`、それ以外は `shared` へ。**モジュール間で直接コピーや相互 import をしない。**
4. どのモジュールにも属さない配線（具象の組み立て）→ `src/app/`。

### 4.2 命名

- ディレクトリ・非コンポーネントファイル: camelCase（development-guidelines §3 参照。データ JSON のみ kebab-case）。
- React コンポーネントファイル: PascalCase（例: `WorkflowCanvas.tsx`、`PromptPanel.tsx`）。
- ポート: `<名詞>Port`（例: `ProjectFilePort`）。ファイルは `application/ports/` 配下に 1 ポート 1 ファイル。

### 4.3 React Flow mapper の配置

@xyflow/react の `Node` / `Edge` 型と Domain 型の相互変換は、**すべて `src/modules/canvas/presentation/` 配下の mapper に置く**（canvas モジュール外へ React Flow 型を出さない。NFR-010、architecture §3.3）。変換は単一の往復関数ペアではなく、次の 6 関数で構成する:

`toReactFlow` / `mergeReactFlowNodes` / `mergeReactFlowEdges` / `fromReactFlowConnection` / `fromReactFlowPosition` / `fromReactFlowIds`

- 各関数の役割・シグネチャは `docs/functional-design.md` §2.4 が所有する。本節は配置規則のみを定める。
- Domain → React Flow 方向は `toReactFlow`、React Flow → Domain 方向は `fromReactFlow*` の 3 関数が担う（`fromReactFlow` という単一の逆変換関数は置かない。React Flow 側の入力は Connection / Position / 選択 ID と粒度が異なるため）。
- 新しい変換が必要になった場合も、他レイヤー・他モジュールに変換ロジックを分散させず、この mapper に追加する。

### 4.4 import 経路

- パスエイリアス `@/` → `src/` を tsconfig / vite.config.ts に定義し、モジュール間 import は `@/modules/<module>`（= `index.ts`）経由とする。
- **同一モジュール内**は相対パス import を用いる（自モジュールの barrel を経由しない — 循環防止）。
- モジュール外から `@/modules/<module>/domain/...` のような**深い import は禁止**（§5.1 #4 の `no-restricted-imports` patterns、および相対パス経由の場合は zones で機械的に検出する）。

## 5. 依存方向と公開境界

### 5.1 ESLint zones の具体グロブ

architecture §3.2 の 5 制約は `eslint.config.js` に**導入済み**で、`npm run lint` により機械的に検出される。使用プラグインは `eslint-plugin-import-x`（ルール名 `import-x/no-restricted-paths`）で、これに `no-restricted-imports`（ESLint コア）を組み合わせる。以下が配置規則としての正である（記述構文の細部は `eslint.config.js` に従う）。

| # | 制約 | 実装手段 | target（保護対象） | from（禁止元）/ 禁止 import |
|---|---|---|---|---|
| 1 | domain 最内層 | zones + `no-restricted-imports.paths` | `./src/modules/*/domain/**` | `./src/modules/*/application/**`・`./src/modules/*/infrastructure/**`・`./src/modules/*/presentation/**` からの import 禁止。加えて domain ファイルでは `react` / `react-dom` / `@xyflow/react` の import 禁止（`no-restricted-imports`） |
| 2 | application の DIP | zones | `./src/modules/*/application/**` | `./src/modules/*/infrastructure/**`・`./src/modules/*/presentation/**` からの import 禁止 |
| 3 | 逆流禁止 | zones | `./src/modules/*/infrastructure/**` | `./src/modules/*/presentation/**` からの import 禁止 |
| 4 | モジュール間境界 | zones + `no-restricted-imports.patterns`（二重構成） | zones: 各モジュール `./src/modules/<module>`（8 モジュールを列挙） | zones: from `./src/modules`、except `[<自モジュール>, 'workflow/index.ts', 'shared/index.ts']`。patterns: `@/modules/*/*`・`@/modules/*/*/**`（深い import）と、feature 6 モジュール（`@/modules/canvas` 等 = workflow / shared 以外）への import を禁止 |
| 5 | React Flow の封じ込め | `no-restricted-imports.paths` のみ（zones ではない） | `src/modules/canvas/**` **以外**のすべて（`src/modules/canvas/domain/**`・他モジュール・`src/app/**`・`src/main.tsx`） | `@xyflow/react` の import 禁止 |

- **#3 の zone は `infrastructure` → `presentation` の 1 本のみ**とする。`domain` / `application` から `presentation` への禁止は #1 / #2 の zone に既に含まれるため、zone を重複させていない。
- **#5 は zones では表せない**（zones はファイル間パスの制約であり、`node_modules` のパッケージ名を対象にできない）。そのため `no-restricted-imports` の `paths` に `@xyflow/react` を置き、canvas モジュール（`domain/` を除く）にだけ適用しない形で担保する。`no-restricted-imports` は後続の config ブロックが前のブロックを上書きするため、各ファイルがちょうど 1 ブロックにのみ一致するよう `ignores` で排他にしている。
- **#4 を二重構成にする理由**: zones は解決後のファイルパスで判定するため相対パス経由の越境を検出できるが、`@/` エイリアス経由の深い import・feature モジュール間 import は import specifier のパターンで押さえる方が意図が明示される。両方を掛けることで経路に依存せず違反を検出する。
- **resolver は必須**: `eslint-import-resolver-typescript`（`createTypeScriptImportResolver({ project: './tsconfig.app.json' })`）を `settings['import-x/resolver-next']` に設定する。これが無いと拡張子省略 import と `@/` エイリアスを解決できず、zones が発火しない。
- **実装上の注意**: グロブを含む `target` / `from` は末尾に `/**` が必要（`./src/modules/*/domain/**`）。`/**` が無いとファイルパスに一致せず、ルールがエラーも出さずに無言で発火しなくなる（実測で確認）。
- 同一モジュール・同一レイヤー内の相互 import は制約しない。

### 5.2 ポート定義層 / 実装層の配置（DIP の担保）

| ポート | 定義（interface） | 実装（具象） |
|---|---|---|
| `ProjectFilePort` | `src/modules/project/application/ports/` | `src/modules/project/infrastructure/` |
| `RecoveryStoragePort` | `src/modules/project/application/ports/` | `src/modules/project/infrastructure/` |
| `CanvasImagePort` | `src/modules/export/application/ports/` | `src/modules/export/infrastructure/` |
| `PdfComposerPort` | `src/modules/export/application/ports/` | `src/modules/export/infrastructure/` |
| `ExportFilePort` | `src/modules/export/application/ports/` | `src/modules/export/infrastructure/` |
| `CanvasSourcePort` | `src/modules/export/application/ports/` | **`src/modules/canvas/presentation/`**（唯一の例外。下記参照） |
| `ClipboardPort` | `src/modules/prompt/application/ports/` | `src/modules/prompt/infrastructure/` |

**`CanvasSourcePort` だけは具象が infrastructure ではない。** 提供する情報（全 Node / Edge の Bounding Box）と操作（Export 表示への切替）が React Flow の実測状態に依存し、React Flow は canvas モジュールに封じ込められている（§5.1 #5）ため、canvas の presentation が実装する。canvas と export は互いを import せず（同 #4）、composition root が両者を繋ぐ（趣旨は functional-design §8.4）。

（ポートのシグネチャ・用途は functional-design §2.3 が所有。）

### 5.3 エントリポイント（composition root）だけの特権

- **infrastructure 具象を import してよいのは `src/main.tsx` と `src/app/**` のみ**（同一モジュールの infrastructure 内部を除く）。具象をここで生成し、application service へ引数または生成時注入で束ねる（DI コンテナ不採用。AD-10）。
- ESLint 上は、zones の `target` / `from` がいずれも `./src/modules` 配下に限られる結果として `src/main.tsx` / `src/app/**` が対象外になり、この特権が表現されている（除外の明示指定は不要）。ただし #5（`@xyflow/react` 禁止）は composition root にも適用される。

### 5.4 各モジュールの公開 API（`index.ts` に出してよいもの）

| モジュール | 公開してよいもの |
|---|---|
| `workflow` | Domain Model 型・Zod スキーマ・接続ルール・migration 適用関数（他モジュールが自由に import できる唯一のドメイン） |
| `shared` | store のフック / selector、共通 UI 部品、純ユーティリティ |
| 上記以外の 6 モジュール | composition root（`src/app/`）が組み立てに使う presentation コンポーネントと application service のみ。**他モジュールはこれらを import しない**（連携は workflow の Domain Model と shared の store を経由する） |

**infrastructure 具象のファクトリは例外として公開してよい。** composition root が具象を生成して application service へ注入する構成（§5.3、AD-10）である以上、公開しないと組み立てられないため。深い import（`@/modules/<module>/infrastructure/...`）は禁止のままとし、`index.ts` からファクトリ関数だけを出す。公開してよいのはファクトリであり、ライブラリ固有の型を公開 API へ出さない点は変わらない。

公開 API に React Flow 型・infrastructure 具象・ライブラリ固有型を含めない（architecture §3.3）。

## 6. テスト・サンプル・テンプレートの配置

### 6.1 テスト

| 種別 | 配置 | 規則 |
|---|---|---|
| Unit（Vitest） | **ソース隣接（co-location）**: `<対象>.test.ts` / `<対象>.test.tsx` | 重点対象（Zod validation / serialization / migration / Prompt 生成 / Review ルール — architecture §6.1）は `domain/` の純関数隣接に置き、DOM モックなしで動くことを維持する |
| E2E（Playwright） | リポジトリ直下 `e2e/` | 主要導線（New → Add → Connect → Edit → Save → Open → Generate Prompt）を最優先。Playwright 設定は `playwright.config.ts`（ルート） |

MVP（Phase 0〜8）完了時点の実績: Unit テストは co-location で 26 ファイル / 384 件。E2E は `e2e/mainFlow.spec.ts` の 1 本で、主要導線（New → Add → Connect → Edit → Save → Open → Generate Prompt）を通す。

Vitest は `environment: 'node'`（jsdom を入れていない）ため、**DOM を要する振る舞い**（Context Menu の開閉、Inspector へのフォーカス移動、ショートカットの実配線、Export の画像化）は Unit テストでは担保できない。これらは実装時のブラウザ検証と E2E で確認している。恒久的な回帰検知が必要になった時点で、E2E を足すか jsdom 環境を追加するかを判断する。

`tests/` / `__tests__/` ディレクトリ方式は採用しない。テスト用フィクスチャが複数テストで共有される場合のみ `e2e/fixtures/`（E2E 用）または対象モジュール内 `__fixtures__/`（Unit 用）を置く。

### 6.2 サンプルプロジェクトと Templates

- サンプル「Interview Evaluation Reminder」（functional-design §7.6）は、通常の `WorkflowProject` JSON として
  `src/modules/project/assets/samples/interview-evaluation-reminder.gooya-canvas.json` に置き、アプリにバンドルする（NFR-004。`public/` には置かない — Zod validation を通してから store へ入れるため import 対象とする）。
- 将来の Templates（スコープ外・MVP 後の拡張候補 — development-roadmap §4）は `src/modules/project/assets/templates/*.gooya-canvas.json` に置く。配置規則のみ本書で確定し、実装はしない。
- `assets/` はデータ（JSON）専用であり、レイヤーではない。import してよいのは `project` モジュールの application 層のみ。読込時は通常の Open と同じ Zod validation / migration を通す。

## 7. 初期要求メモ §37（平坦構成）を不採用とした経緯

初期要求メモ `docs/ideas/initial-requirements.md` §37 は `src/components/`・`src/domain/`・`src/store/`・`src/generators/`・`src/validators/`・`src/persistence/`・`src/utils/` という**技術役割別の平坦構成**を推奨していたが、これを**不採用**とし、本書のモジュラモノリス構成を採用した。

- 確定の経緯: functional-design §2 で 8 モジュール構成（境界づけられたコンテキスト単位）が確定し、architecture.md の矛盾検知でメモ §37 との食い違いが記録済み。本書はその決定に従う。
- 不採用の理由: 平坦構成では機能（project / export / prompt / review）のコードが components / generators / persistence へ横断分散し、モジュール間境界・DIP を ESLint zones（§5.1）で機械的に担保できない。メモ §38 自身が要求する「Canvas UI と Workflow Domain の分離」は、モジュール境界として表現する方が強く担保できる。
- メモ §37 のファイル粒度は参考として引き継ぐ。主な対応:

| メモ §37 | 本書での配置 |
|---|---|
| `components/canvas/`・`components/nodes/` | `src/modules/canvas/presentation/` |
| `components/inspector/` | `src/modules/inspector/presentation/` |
| `components/prompt/`・`components/review/` | `src/modules/prompt/presentation/`・`src/modules/review/presentation/` |
| `domain/`（workflow.ts / node-types.ts / schemas.ts） | `src/modules/workflow/domain/` |
| `store/workflowStore.ts` | `src/modules/shared/application/` |
| `generators/promptGenerator.ts` | `src/modules/prompt/domain/` |
| `generators/pdfExporter.ts`・`imageExporter.ts` | `src/modules/export/`（application + infrastructure） |
| `validators/workflowValidator.ts` | `src/modules/review/domain/` |
| `persistence/`（reader / writer / migrations） | reader / writer → `src/modules/project/`（application + infrastructure）、migrations → `src/modules/workflow/domain/` |
| `utils/` | `src/modules/shared/`（責務の明確な置き場が決まらない「utils 溜まり」を作らない） |

## 8. スキャフォールドからの移行（Phase 0 で完了）

Vite 初期スキャフォールドから本書の構成への移行は Phase 0 で完了している。以下は完了記録であり、再実施の手順ではない。

- `src/App.tsx` → `src/app/App.tsx` へ移設し、スキャフォールドのデモ内容は破棄した。
- `src/App.css` を削除した（スタイルは Tailwind + `src/index.css` に統一。development-guidelines §4.1）。
- `src/assets/`（Vite デモ用）を削除した。アプリのアイコン等は Bundled Icons として使用モジュールの `presentation/` 配下または `shared/presentation/` に置く（NFR-004）。
- スキャフォールド残骸の `public/icons.svg` を削除した。`public/` に残すのは `index.html` が参照する `favicon.svg` のみとする（§1）。
- `vite.config.ts` に `base: '/gooya-canvas/'`（AD-12）とパスエイリアス `@` → `./src` を設定した。
- `tsconfig.app.json` に `paths: { "@/*": ["./src/*"] }` を設定した。**`baseUrl` は TypeScript 6 で非推奨のため使用せず、`paths` のみを置き tsconfig からの相対で解決させる**。
- git を初期化し、GitHub リポジトリ https://github.com/taiga-shiokawa/gooya-canvas （Public）を作成した。`.github/workflows/deploy.yml`（§1）はこの上で動作する。
- `README.md` を整備した。プロダクト概要・開発コマンド・`docs/` 7 文書の索引・アーキテクチャ要点を載せ、リポジトリの入口とする（各項目の詳細は所有文書へのリンクに委ね、README に設計情報を複製しない）。

**移行の残課題は無い。** スキャフォールド由来のファイル・ディレクトリはすべて削除または本書の構成へ移設済みであり、本節は以後、記録としてのみ参照する。

---

## 付記: 本書の情報源

`docs/architecture.md` §3（モジュール境界・ESLint 制約・SDK 型規約）・§4（GitHub Pages）・§6（テスト戦略）、`docs/functional-design.md` §2（モジュール分割・ポート）・§7.6（サンプル）、初期要求メモ §37〜§38（不採用の記録として）、およびリポジトリ実態（Phase 0〜1 実装済みの `eslint.config.js` / `vite.config.ts` / `tsconfig.app.json` / `.github/workflows/deploy.yml` / `package.json` / `src/` 構成）に基づく。
