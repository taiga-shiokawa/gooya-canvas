# GOOYA Canvas 開発ガイドライン

本書は反復可能な開発方法（コマンド運用・コーディング規約・命名・スタイリング・テスト・Git・レビュー）を定義する永続的ドキュメントである。
技術選択と横断的制約は `docs/architecture.md` が、配置規則と依存境界の詳細は `docs/repository-structure.md` が所有する。本書はそれらを**日々の作業手順・チェック観点**として運用に落とし込む（内容は重複させず参照する）。

---

## 1. 開発コマンドと日常ワークフロー

npm scripts の定義一覧は `architecture.md` §5.1（npm scripts）・§5.2（フォーマッタ）を参照する。本書は「いつ何を実行するか」を定める。

| タイミング | 実行するもの |
|---|---|
| 開発中 | `npm run dev` |
| コミット前（必須） | `npm run format:check`（または `npm run format` で整形）→ `npm run lint` → `npm run test` → `npm run build`（`tsc -b` の型検査を含む）をすべて通す |
| PR / main へのマージ前 | 上記に加え、E2E（`npm run build` → `npm run test:e2e`）の主要導線 1 本を通す（E2E はビルド成果物に対して走る。実行前提は §5.2。`e2e/` は Phase 5 で追加） |
| ビルド成果物の確認 | `npm run preview`（GitHub Pages のサブパス配信 `base: '/gooya-canvas/'` の確認を含む） |

- **品質ゲートはローカル実行が前提。** CI は `.github/workflows/deploy.yml`（Pages デプロイ専用）の 1 本のみで、lint / test / format:check を含まない（architecture §4.1）。デプロイ経路で機械的に検査されるのは `npm run build` に含まれる `tsc -b` の型検査だけなので、**push 前に上記 4 つを自分で回す**。
- lint / test / build / format:check が通らないコミットを main に入れない。
- デプロイは GitHub Actions → GitHub Pages の自動デプロイのみとする（§6.4）。**手動デプロイ（`dist/` の手動 push 等）は行わない。**
- 開発に使用する Node.js は **Node 24 系**とする（CI の `actions/setup-node` は `node-version: 24`、ローカルも v24 系。architecture §4.1）。`.nvmrc` / `engines` によるファイル上の固定は現時点で行っていない。

## 2. コーディング規約

### 2.1 TypeScript

- `tsc -b` が通ることを常に維持する（strict 設定は現行 tsconfig に従う）。
- `any` を使わない。外部から来る不定な値は `unknown` で受け、Zod parse または型ガードで絞り込む。
- 型アサーション（`as`）は境界（mapper・infrastructure）内での変換に限定し、domain / application では使わない。
- ID 採番は `crypto.randomUUID()` を用いる（AD-08。ID 生成ライブラリを追加しない）。
- ESLint の警告を抑制コメント（`eslint-disable`）で握りつぶさない。必要な場合は理由をコメントで併記する。

### 2.2 純粋性（domain 層）

- `domain/` のコードは React / `@xyflow/react` / ブラウザ API（`window` / `document` / `localStorage` 等）を import しない純粋 TypeScript とする（architecture §3.4）。
- Prompt 生成・Flow Review・migration は**決定論的純関数**として書く。`Date.now()` / `Math.random()` / `crypto.randomUUID()` 等の非決定的要素を純関数の内部で呼ばず、必要なら引数で受け取る。

### 2.3 エラーハンドリング

- infrastructure の具象はライブラリ固有の例外・型をポートの外へ漏らさない。境界内で catch し、ポートのシグネチャが定める型（成功値またはアプリ定義のエラー）へ変換して返す（architecture §3.3）。
- 読み込んだプロジェクト JSON は**必ず Zod validate を通してから** store へ入れる。validate 前のオブジェクトを state・domain へ渡さない（NFR-005）。サンプル・テンプレート JSON も同じ経路を通す（repository-structure §6.2）。

### 2.4 キーボードショートカット実装（メモ §31）

- ブラウザ標準動作と競合するショートカット（Ctrl+S / Ctrl+O / Ctrl+D / Ctrl+A 等）は `preventDefault()` を適切に呼ぶ。
- **Input / Textarea へのフォーカス中は Canvas ショートカットを無効化する**（Delete がノード削除ではなく文字削除として働くこと）。フォーカス判定はショートカットハンドラの共通前段で一元的に行い、各ハンドラへ分散させない。

### 2.5 セキュリティ実装規約（メモ §39、NFR-001〜003）

- **Browser Only**: Workflow データを外部へ送信するコード（fetch / XHR / beacon）を書かない。MVP に外部通信は存在しない。
- **秘密情報の排除**: Workflow（Node config 含む）へ実際の API Key・Password・Access Token・Webhook Secret を保存する実装・UI を作らない。保持してよいのは「Authentication: OAuth required」等の設計情報のみ。
- **LLM API キーのハードコード禁止**: ソースコード・設定ファイル・ビルド成果物に API キーを含めない（NFR-003）。
- **XSS 対策**: ユーザー入力（ノード名・config・読込 JSON の文字列）の描画は React の標準エスケープに任せる。`dangerouslySetInnerHTML` と `eval` / `new Function` は使用禁止。
- **入力バリデーション**: 外部から来るデータ（ファイル読込・localStorage の Crash Recovery データ）はすべて Zod validate を通す。

## 3. 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| React コンポーネントファイル | PascalCase | `WorkflowCanvas.tsx`、`PromptPanel.tsx` |
| 非コンポーネントファイル（ts） | **camelCase** | `promptGenerator.ts`、`workflowStore.ts`、`schemas.ts` |
| テストファイル（Unit） | 対象名 + `.test.ts(x)` | `promptGenerator.test.ts` |
| E2E テストファイル | `<導線名>.spec.ts`（`e2e/` 配下） | `mainFlow.spec.ts` |
| ディレクトリ | 小文字 1 単語を基本、複数語は camelCase | `modules/`、`ports/` |
| データファイル（JSON アセット） | kebab-case（プロジェクトファイル命名に合わせる） | `interview-evaluation-reminder.gooya-canvas.json` |
| 型・interface・enum | PascalCase | `WorkflowProject`、`NodeConfig` |
| ポート | `<名詞>Port`、1 ポート 1 ファイル | `ProjectFilePort` |
| Zod スキーマ変数 | `<名詞>Schema`（camelCase） | `workflowProjectSchema` |
| 変数・関数 | camelCase。関数は動詞始まり | `generatePrompt`、`toReactFlow` |
| React フック | `use` 始まり | `useWorkflowStore` |
| 定数（真にグローバルな不変値） | UPPER_SNAKE_CASE | `SCHEMA_VERSION` |

- コンポーネント名・型名・ポート名はファイル名と一致させる（1 ファイル 1 主エクスポート）。
- `utils.ts` / `helpers.ts` のような**責務の曖昧な「utils 溜まり」ファイル・ディレクトリを作らない**。共有ロジックは責務名で命名し、Domain Model なら `workflow`、それ以外は `shared` へ置く（repository-structure §4.1）。

## 4. スタイリング・フォーマット規約

### 4.1 Tailwind CSS の前提

- スタイリングは **Tailwind CSS v4 のユーティリティクラス**を基本とする（AD-05）。適用は Vite プラグイン方式（`@tailwindcss/vite`）で、**PostCSS 設定ファイル（`postcss.config.*`）は作らない**（architecture §1.3）。
- スタイルのエントリは `src/index.css`。**Tailwind の読込はここの `@import 'tailwindcss'` の 1 行のみ**とし、ほかに置くのは最小限のベース指定（ルート要素 `html` / `body` / `#root` の高さ、`body` の `margin` と System Font 指定）に限る。`tailwind.config.*` を前提とした記述を書かず、テーマ拡張が必要になった場合は v4 の CSS 側（`@theme`）で行う。
- グローバル CSS は `src/index.css` のみ。コンポーネント個別の `.css` ファイルを増やさない。
  - **例外: ライブラリが提供する CSS** は `src/index.css` へ集約せず、**それを使用するコンポーネント内で import する**（使用箇所とスタイルの依存を同じファイルに閉じ込め、モジュール境界を越えないため）。実装例は `canvas/presentation/WorkflowCanvas.tsx` の `import '@xyflow/react/dist/style.css'`。この例外は「ライブラリ同梱 CSS の import」に限り、自作のコンポーネント個別 CSS を書く根拠にはしない。
- `prettier-plugin-tailwindcss`（クラス順序の自動整列）は**未導入**。クラス順序は機械的に整列されないため、レイアウト → サイズ → 色 → 状態（`hover:` / `focus:`）の順を目安に手で揃える。
- Canvas 本体のノードは独自デザインとし、特定 UI フレームワークのビジュアルへ強依存しない（NFR-011）。**Radix UI 等のヘッドレス UI ライブラリは未導入**のため、Modal / Drawer / Dropdown 等の UI プリミティブは自前実装を前提とする（architecture §1.3）。自前実装ではフォーカストラップ・Esc クローズ・`aria-*` 属性を自分で担保する。
- 外部フォント・外部スクリプトを読み込まない。System Font と Bundled Icons を使う（NFR-004）。

### 4.2 フォーマッタ（Prettier）

- **Prettier ^3.9.6 を採用済み**。ESLint との競合回避に `eslint-config-prettier` を併用する（整形は Prettier、規約違反の検出は ESLint）。
- 設定は `.prettierrc` の 2 項目のみ（`semi: false` / `singleQuote: true`）。他はすべて Prettier 既定値に従い、**設定を増やさない**（printWidth 等を個別に調整しない）。
- 実行は `npm run format`（適用）/ `npm run format:check`（差分検出）。**フォーマット済みでないコードをコミットしない**（§1）。
- `.prettierignore` で `node_modules` / `dist` / `package-lock.json` / `playwright-report` / `test-results` に加え **`*.md` を除外**する。`docs/` の表・Mermaid 図の手書きレイアウトを保つため、Markdown は整形対象外であり手で整える。
- **Windows で `core.autocrlf=true` の場合の注意**: Prettier は改行を LF に揃えるため、clone 直後（作業ツリーが CRLF）に `npm run format:check` が全ファイルで落ちる。`npm run format` を一度かけると解消するが、その直後は `git status` に無関係なファイルが並ぶ（`git diff` の実体は空なので commit には入らない）。恒久的に避けるなら `.gitattributes` に `* text=auto eol=lf` を置く。（未対応 — 対応時は本項を更新する）

## 5. テスト規約

テスト戦略（何を重視するか）は `architecture.md` §6、配置規則は `repository-structure.md` §6.1 が所有する。本書は書き方の規約を定める。

### 5.1 Unit テスト（Vitest）

- 実行は `npm run test`（`vitest run --passWithNoTests`）。**`--passWithNoTests` が付いているため、テストが 1 件も無いフェーズでも `test` は成功する**（architecture §5.1）。成功は「重点対象が網羅されている」ことを意味しないので、テスト有無の確認は §7.2 のレビューチェックリストで行う。
- 配置は**ソース隣接（co-location）**: `<対象>.test.ts` / `<対象>.test.tsx`。`tests/` / `__tests__/` ディレクトリ方式は使わない。
- 重点対象（この順に優先）: **Workflow Schema（Zod の受理・拒否）→ serialization / deserialization → Schema migration（新しい schemaVersion の拒否含む）→ Prompt generation → Flow validation（RV ルール検出）**。Canvas UI のテストより Domain / Generator / Validator を優先する（メモ §42）。
- domain 純関数のテストは **DOM・ブラウザ API のモックなし**で書けること。モックが必要になったら、テストではなく実装（純粋性の破れ）を疑い修正する。
- Prompt generation は決定論的出力のスナップショットテストを基本とし、分岐（Condition / Loop）の反映を個別ケースで検証する。
- カバレッジの数値目標は設けない。上記の重点対象が網羅されていることをレビューで確認する。

### 5.2 E2E テスト（Playwright）

- `@playwright/test` と `playwright.config.ts` は導入済みだが、**`e2e/` ディレクトリとテスト本体は Phase 5 で追加する**（architecture §6.2）。それまで `npm run test:e2e` は実行対象を持たない。
- 配置はリポジトリ直下 `e2e/`、設定は `playwright.config.ts`（ルート）。
- **実行手順（前提込み）**:
  1. `npx playwright install` — ブラウザバイナリの取得。**環境ごとに 1 回**必要で、これを行わずに実行すると失敗する。
  2. `npm run build` — **必須の前提**。`playwright.config.ts` の `webServer` が `npm run preview`（= `vite preview`）を起動し、`baseURL` を `http://localhost:4173/gooya-canvas/` としているため、`dist/` が無い（または古い）状態では preview が対象を配信できず E2E が失敗する。
  3. `npm run test:e2e` — 実行。
  - つまり E2E は**開発サーバー（`npm run dev`）ではなくビルド成果物**に対して走る。ソースを変更したら `npm run build` を再実行してから `npm run test:e2e` を回す。
  - `webServer.reuseExistingServer` は CI 以外で有効なため、手元で `npm run preview` を起動済みならそのサーバーが再利用される（この場合も配信されるのはビルド済みの `dist/`）。
- 主要導線 1 本（New Project → Add Nodes → Connect → Edit → Save → Open → Generate Prompt）を最優先で維持する。この導線が通らない状態で main へマージしない。
- Canvas 操作の網羅的 E2E は書かない。追加するのはファイル入出力・Export・Prompt コピー等、ブラウザ統合が必要な受け入れ条件（AC）に限る。

## 6. Git 規約

### 6.1 リポジトリの前提（初期化は Phase 0 で完了）

- リポジトリは作成済み: `https://github.com/taiga-shiokawa/gooya-canvas`（Public、既定ブランチ `main`）。公開 URL は `https://taiga-shiokawa.github.io/gooya-canvas/`。
- `.gitignore` は Vite スキャフォールド由来のものを基礎に、`node_modules` / `dist` / `dist-ssr` / `*.local` / ログ / エディタ設定を無視する。これに加えて次を追加済み:
  - **秘密情報**: `.env` / `.env.*` を無視し、`!.env.example` で **`.env.example` のみ追跡**する（NFR-002、§2.5）。実値を持つ `.env` 系ファイルは追跡されない前提。MVP は Browser Only で環境変数を使わないため **`.env.example` は現時点で未作成**であり、環境変数を導入した時点でキー名だけを記載した `.env.example` を作成・追跡する。
  - **テスト出力**: `coverage` / `playwright-report` / `test-results` / `/blob-report` / `/playwright/.cache` を無視する（Vitest のカバレッジと Playwright のレポート・トレースをコミットしない）。
- CI は `.github/workflows/deploy.yml`（Pages デプロイ専用）の 1 本のみ。**lint / test / format:check を含まないため、品質ゲートはローカル実行が前提**（§1、architecture §4.1）。品質ゲート用の CI ワークフローを追加する場合は architecture §4.1 と本書 §1 を同じ変更で更新する。
- 秘密情報（API キー・トークン・`.env`）は**いかなる形でもコミットしない**（§2.5）。

### 6.2 コミットメッセージ（Conventional Commits）

`<type>: <説明>` 形式とする。type は英語、説明は日本語可。

| type | 用途 |
|---|---|
| `feat` | 機能追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `refactor` | 挙動を変えない内部変更 |
| `test` | テストの追加・修正 |
| `chore` | 依存更新・設定変更など |
| `build` / `ci` | ビルド設定 / GitHub Actions の変更 |

- 1 コミット 1 関心事。機能追加とリファクタリングを混ぜない。
- コミット前チェックは §1 に従う（format:check + lint + test + build）。

### 6.3 ブランチ運用

- `main` + feature ブランチ方式。`main` は常に `npm run build` が通る状態を保つ。
- ブランチ名: `feat/<topic>`・`fix/<topic>`・`docs/<topic>`（例: `feat/prompt-generator`）。
- 変更は feature ブランチで行い `main` へマージする。少人数開発のため self-merge 可。軽微なドキュメント修正のみ `main` 直コミットを許容する。

### 6.4 デプロイ

- デプロイは **GitHub Actions による build → GitHub Pages** のみ（AD-12）。`.github/workflows/deploy.yml` が `main` への push（および `workflow_dispatch`）で走る（内容は architecture §4.1）。
- `dist/` の手動 push・`gh-pages` ブランチの手動操作は禁止する。

## 7. アーキテクチャ原則を守る運用規約（レビュー規則）

依存境界の正となる規則は `repository-structure.md` §4〜§5 が所有する。本書はそれをコード作成・レビュー時のチェックリストとして運用する。

### 7.1 import の書き方

- パスエイリアス `@/` → `src/` を使う。**モジュール間**の import は barrel `@/modules/<module>`（= `index.ts` 公開 API）経由のみ。
- **同一モジュール内**は相対パス import（自モジュールの barrel を経由しない — 循環防止）。
- `@/modules/<module>/domain/...` のような**深い import は禁止**。
- `@xyflow/react` の import は `src/modules/canvas/**` 内のみ。infrastructure 具象の import は `src/main.tsx` / `src/app/**`（composition root）と同一モジュール内のみ。

**依存方向の担保は ESLint の二重構成**である（architecture §3.2）。`eslint-plugin-import-x` の `import-x/no-restricted-paths`（zones）が**相対パス**の違反を、`no-restricted-imports`（paths / patterns）が **`@/` エイリアス経由**の違反を検出する。zones は import の解決に依存するため resolver に `eslint-import-resolver-typescript` を設定している。また **`@xyflow/react` のようなパッケージ import は zones の対象外**なので、React Flow の封じ込め（#5）は `no-restricted-imports` の `paths` のみで担保する。どちらか一方だけでは抜けが出るため、制約を追加・変更するときは**該当する両方に反映する**（制約ごとの対応は §7.2）。

### 7.2 レビューチェックリスト

repository-structure §5.1 の 5 制約はいずれも**機械的に検出される（導入済み）**ため、`npm run lint` を通すことがそのままチェックになる。担保するルールは制約ごとに異なる（§7.1 の二重構成に対応）:

- **#1〜#4（レイヤー間の依存方向・モジュール間境界）**: `eslint-plugin-import-x` の `import-x/no-restricted-paths`（zones）。
- **#5（React Flow の封じ込め）**: ESLint コアの `no-restricted-imports`（`paths` に `@xyflow/react` を指定）。zones はパッケージ import を対象にできないため、こちらが正となる。
- 補助として、#4 の `@/` エイリアス経由・深い import は `no-restricted-imports` の `patterns` でも検出する（§7.1）。制約を追加・変更するときは**該当する両方のルールに反映する**。

一方、以下は機械的に検出できないので人が確認する:

- [ ] domain に**ブラウザ API**（`window` / `document` / `localStorage` / `crypto` 等のグローバル）が入っていないか（純粋性。import ではないため ESLint の import 制約では検出されない）
- [ ] 純関数の中で `Date.now()` / `Math.random()` / `crypto.randomUUID()` を呼んでいないか（決定論性。§2.2）
- [ ] `eslint-disable` で依存方向の制約を回避していないか（§2.1）
- [ ] ポートの公開シグネチャにライブラリ固有型・例外が漏れていないか（SDK 型境界。React Flow 型は canvas mapper 内限定）
- [ ] store・公開 API に React Flow 型が出ていないか（NFR-010）
- [ ] ビジネスロジック（接続判定・Review・Prompt 生成）が presentation に書かれていないか（SRP）
- [ ] 「utils 溜まり」・責務の曖昧なファイルを作っていないか（§3）
- [ ] 新しい配置規則・モジュール境界の変更を伴う場合、`repository-structure.md` / `architecture.md` の更新が同じ変更に含まれているか
- [ ] domain / generator / validator の変更に対応する Unit テストがあるか（§5.1）
- [ ] 秘密情報・外部送信コードが混入していないか（§2.5）

### 7.3 ドキュメント更新のトリガー

技術・境界・依存の変更は `architecture.md`、配置規則の変更は `repository-structure.md`、開発方法の変更は本書を更新する。既存仕様どおりのバグ修正・内部リファクタリング・テスト追加では永続文書を更新しない（章立て定義の「更新しない例」に従う）。

---

## 付記: 本書の情報源

`docs/architecture.md` §1.3（Tailwind / ESLint プラグイン選定）・§3.2（依存方向の機械的担保）・§4.1（デプロイワークフロー）・§5（コマンド・フォーマッタ）・§6（テスト戦略）、`docs/repository-structure.md` §4（配置・命名の基礎）・§5（依存境界）・§6（テスト配置）、初期要求メモ `docs/ideas/initial-requirements.md` §31（ショートカット実装の注意）・§37（camelCase 命名例）・§39（セキュリティ）・§42（テスト重点）、およびリポジトリ実態（`package.json` の npm scripts、`eslint.config.js`、`.prettierrc` / `.prettierignore`、`.github/workflows/deploy.yml`）に基づく。§1・§4・§5・§6・§7 は Phase 0 + Phase 1 の実装で確定した内容を反映済み。
