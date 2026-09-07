# GOOYA Canvas リポジトリ構造定義書

本書は安定したディレクトリ責務・ファイル配置ルール・公開境界を定義する永続的ドキュメントである。
モジュール分割の責務定義は `docs/functional-design.md` §2 が、依存方向の原則と ESLint 制約の趣旨は `docs/architecture.md` §3 が所有する。本書はそれらを**配置規則（どこに何を置き、どこから import してよいか）**として具体化する。実ファイルの網羅列挙はせず、規則のみを書く。

---

## 1. ルートディレクトリ構成

```text
gooya-canvas/
├─ .github/
│  └─ workflows/            # GitHub Actions（Pages デプロイ用ワークフロー。AD-12）
├─ .steering/               # ステアリングファイル（タスク単位の作業記録。永続文書に複製しない）
├─ docs/                    # 永続的ドキュメント（本書を含む 7 文書体系）
│  └─ ideas/                # 初期要求メモ等の一次情報
├─ e2e/                     # Playwright E2E テスト（§6.1）
├─ public/                  # Vite の静的公開ファイル（favicon 等。加工なしで配信されるもののみ）
├─ src/                     # アプリケーション本体（§2）
├─ index.html               # SPA のエントリ HTML（画面は 1 つ。architecture §4）
├─ vite.config.ts           # base: '/gooya-canvas/' を設定する（GitHub Pages サブパス配信。AD-12）
├─ tsconfig*.json           # TypeScript 設定（`@/` → `src/` のパスエイリアスを定義。§4.4）
├─ eslint.config.js         # ESLint 設定（§5 の import zones をここに記述）
└─ package.json
```

- **`.github/workflows/`**: Pages デプロイ用ワークフロー（build → deploy）を置く。ワークフローファイル名・内容は実装時に確定する（要確認）。git 初期化・GitHub リポジトリ作成が先行する（architecture §4）。
- **`docs/images/`**: Mermaid で表現できない複雑な図が必要になった場合のみ作成する。独立した diagrams フォルダは作らない。
- **`.steering/`**: 現在は空。タスク単位の作業記録を置き、永続的な設計情報は置かない。

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

@xyflow/react の `Node` / `Edge` 型と Domain 型の相互変換（`toReactFlow` / `fromReactFlow`）は `src/modules/canvas/presentation/` 配下の mapper に置く（canvas モジュール外へ React Flow 型を出さない。NFR-010、architecture §3.3）。

### 4.4 import 経路

- パスエイリアス `@/` → `src/` を tsconfig / vite.config.ts に定義し、モジュール間 import は `@/modules/<module>`（= `index.ts`）経由とする。
- **同一モジュール内**は相対パス import を用いる（自モジュールの barrel を経由しない — 循環防止）。
- モジュール外から `@/modules/<module>/domain/...` のような**深い import は禁止**（§5.1 の zones で機械的に検出する）。

## 5. 依存方向と公開境界

### 5.1 ESLint zones の具体グロブ

architecture §3.2 の 5 制約を `eslint.config.js` の `import/no-restricted-paths`（zones）+ `no-restricted-imports` で表す。以下が配置規則としての正である（記述構文の細部は実装時の `eslint.config.js` に従う）。

| # | 制約 | target（保護対象） | from（禁止元）/ 禁止 import |
|---|---|---|---|
| 1 | domain 最内層 | `src/modules/*/domain/**` | `src/modules/*/application/**`・`src/modules/*/infrastructure/**`・`src/modules/*/presentation/**` からの import 禁止。加えて domain ファイルでは `react` / `react-dom` / `@xyflow/react` の import 禁止（`no-restricted-imports`） |
| 2 | application の DIP | `src/modules/*/application/**` | `src/modules/*/infrastructure/**`・`src/modules/*/presentation/**` からの import 禁止 |
| 3 | 逆流禁止 | `src/modules/*/{domain,application}/**` | `presentation` への import 禁止（#1・#2 に包含）。`src/modules/*/infrastructure/**` からも `presentation` への import 禁止 |
| 4 | モジュール間境界 | `src/modules/<A>/**` | 他モジュール `src/modules/<B>/**` の内部への import 禁止。例外は (a) `@/modules/workflow`（index.ts 公開 API）、(b) `@/modules/shared`（index.ts 公開 API）。モジュールごとに zone を列挙する（例: target `./src/modules/canvas`、from `./src/modules/!(canvas)/**`、except `workflow/index.ts` / `shared/index.ts` 相当） |
| 5 | React Flow の封じ込め | `src/modules/canvas/**` **以外**のすべて（`src/app/**`・`src/main.tsx` 含む） | `@xyflow/react` の import 禁止（`no-restricted-imports` を canvas 以外の files ブロックに適用） |

- 同一モジュール・同一レイヤー内の相互 import は制約しない。
- `eslint-plugin-import` は導入予定（architecture §1.2）。導入までの間もレビューで本表を適用する。

### 5.2 ポート定義層 / 実装層の配置（DIP の担保）

| ポート | 定義（interface） | 実装（具象） |
|---|---|---|
| `ProjectFilePort` | `src/modules/project/application/ports/` | `src/modules/project/infrastructure/` |
| `RecoveryStoragePort` | `src/modules/project/application/ports/` | `src/modules/project/infrastructure/` |
| `CanvasImagePort` | `src/modules/export/application/ports/` | `src/modules/export/infrastructure/` |
| `PdfComposerPort` | `src/modules/export/application/ports/` | `src/modules/export/infrastructure/` |
| `ClipboardPort` | `src/modules/prompt/application/ports/` | `src/modules/prompt/infrastructure/` |

（ポートのシグネチャ・用途は functional-design §2.3 が所有。）

### 5.3 エントリポイント（composition root）だけの特権

- **infrastructure 具象を import してよいのは `src/main.tsx` と `src/app/**` のみ**（同一モジュールの infrastructure 内部を除く）。具象をここで生成し、application service へ引数または生成時注入で束ねる（DI コンテナ不採用。AD-10）。
- ESLint 上は #2・#4 の zones から `src/main.tsx` / `src/app/**` を除外することで表現する。

### 5.4 各モジュールの公開 API（`index.ts` に出してよいもの）

| モジュール | 公開してよいもの |
|---|---|
| `workflow` | Domain Model 型・Zod スキーマ・接続ルール・migration 適用関数（他モジュールが自由に import できる唯一のドメイン） |
| `shared` | store のフック / selector、共通 UI 部品、純ユーティリティ |
| 上記以外の 6 モジュール | composition root（`src/app/`）が組み立てに使う presentation コンポーネントと application service のみ。**他モジュールはこれらを import しない**（連携は workflow の Domain Model と shared の store を経由する） |

公開 API に React Flow 型・infrastructure 具象・ライブラリ固有型を含めない（architecture §3.3）。

## 6. テスト・サンプル・テンプレートの配置

### 6.1 テスト

| 種別 | 配置 | 規則 |
|---|---|---|
| Unit（Vitest） | **ソース隣接（co-location）**: `<対象>.test.ts` / `<対象>.test.tsx` | 重点対象（Zod validation / serialization / migration / Prompt 生成 / Review ルール — architecture §6.1）は `domain/` の純関数隣接に置き、DOM モックなしで動くことを維持する |
| E2E（Playwright） | リポジトリ直下 `e2e/` | 主要導線（New → Add → Connect → Edit → Save → Open → Generate Prompt）を最優先。Playwright 設定は `playwright.config.ts`（ルート） |

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

## 8. 現状スキャフォールドからの移行

現状は Vite 初期スキャフォールド（`src/App.tsx` / `src/main.tsx` / `src/App.css` / `src/index.css` / `src/assets/`）のままである。実装開始時に次を適用する:

- `src/App.tsx` / `src/App.css` → `src/app/` へ移設・置換（スキャフォールドのデモ内容は破棄）。
- `src/assets/`（Vite デモ用）→ 削除。アプリのアイコン等は Bundled Icons として使用モジュールの `presentation/` 配下または `shared/presentation/` に置く（NFR-004）。
- `vite.config.ts` へ `base: '/gooya-canvas/'` とパスエイリアス `@/` を追加。
- git 初期化 → `.github/workflows/` の追加（デプロイは git 初期化・GitHub リポジトリ作成後）。

---

## 付記: 本書の情報源

`docs/architecture.md` §3（モジュール境界・ESLint 制約・SDK 型規約）・§4（GitHub Pages）・§6（テスト戦略）、`docs/functional-design.md` §2（モジュール分割・ポート）・§7.6（サンプル）、初期要求メモ §37〜§38（不採用の記録として）、およびリポジトリ実態（Vite スキャフォールド、git 未初期化）に基づく。
