# GOOYA Canvas 開発ガイドライン

本書は反復可能な開発方法（コマンド運用・コーディング規約・命名・スタイリング・テスト・Git・レビュー）を定義する永続的ドキュメントである。
技術選択と横断的制約は `docs/architecture.md` が、配置規則と依存境界の詳細は `docs/repository-structure.md` が所有する。本書はそれらを**日々の作業手順・チェック観点**として運用に落とし込む（内容は重複させず参照する）。

---

## 1. 開発コマンドと日常ワークフロー

npm scripts の定義一覧は `architecture.md` §5.1（現状）・§5.2（導入予定）を参照する。本書は「いつ何を実行するか」を定める。

| タイミング | 実行するもの |
|---|---|
| 開発中 | `npm run dev` |
| コミット前（必須） | `npm run lint` と `npm run build`（`tsc -b` の型検査を含む）を通す。Vitest 導入後は `npm run test` も必須に加える |
| PR / main へのマージ前 | 上記に加え、E2E（Playwright 導入後 `npm run test:e2e`）の主要導線 1 本を通す |
| ビルド成果物の確認 | `npm run preview`（GitHub Pages のサブパス配信 `base: '/gooya-canvas/'` の確認を含む） |

- lint / build が通らないコミットを main に入れない。
- デプロイは GitHub Actions → GitHub Pages の自動デプロイのみとする（§6.4）。**手動デプロイ（`dist/` の手動 push 等）は行わない。**
- 開発に使用する Node.js バージョンの固定（`.nvmrc` / `engines`）は（要確認）— 現時点で未定義。

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

## 4. スタイリング規約

- スタイリングは **Tailwind CSS のユーティリティクラス**を基本とする（AD-05）。CSS-in-JS ライブラリは導入しない。
- グローバル CSS は `src/index.css`（Tailwind エントリ）のみ。コンポーネント個別の `.css` ファイルを増やさない。
- Canvas 本体のノードは独自デザインとし、特定 UI フレームワークのビジュアルへ強依存しない（NFR-011）。Radix UI 等のヘッドレス部品の採用判断は（要確認）— architecture §1.2。
- 外部フォント・外部スクリプトを読み込まない。System Font と Bundled Icons を使う（NFR-004）。
- **フォーマッタは Prettier を採用する。** ESLint との競合回避に `eslint-config-prettier` を併用する。具体的な設定値（printWidth 等）と `prettier-plugin-tailwindcss`（クラス順序整列）の採否は導入時に確定する（要確認）。導入後は「フォーマット済みでないコードをコミットしない」を規約とする。

## 5. テスト規約

テスト戦略（何を重視するか）は `architecture.md` §6、配置規則は `repository-structure.md` §6.1 が所有する。本書は書き方の規約を定める。

### 5.1 Unit テスト（Vitest・導入予定）

- 配置は**ソース隣接（co-location）**: `<対象>.test.ts` / `<対象>.test.tsx`。`tests/` / `__tests__/` ディレクトリ方式は使わない。
- 重点対象（この順に優先）: **Workflow Schema（Zod の受理・拒否）→ serialization / deserialization → Schema migration（新しい schemaVersion の拒否含む）→ Prompt generation → Flow validation（RV ルール検出）**。Canvas UI のテストより Domain / Generator / Validator を優先する（メモ §42）。
- domain 純関数のテストは **DOM・ブラウザ API のモックなし**で書けること。モックが必要になったら、テストではなく実装（純粋性の破れ）を疑い修正する。
- Prompt generation は決定論的出力のスナップショットテストを基本とし、分岐（Condition / Loop）の反映を個別ケースで検証する。
- カバレッジの数値目標は設けない。上記の重点対象が網羅されていることをレビューで確認する。

### 5.2 E2E テスト（Playwright・導入予定）

- 配置はリポジトリ直下 `e2e/`、設定は `playwright.config.ts`（ルート）。
- 主要導線 1 本（New Project → Add Nodes → Connect → Edit → Save → Open → Generate Prompt）を最優先で維持する。この導線が通らない状態で main へマージしない。
- Canvas 操作の網羅的 E2E は書かない。追加するのはファイル入出力・Export・Prompt コピー等、ブラウザ統合が必要な受け入れ条件（AC）に限る。

## 6. Git 規約

### 6.1 リポジトリ初期化（現状 git 未初期化のため最初に実施）

次の順序で行う（architecture §4・repository-structure §8 の前提）:

1. `git init`（既定ブランチは `main`）。`.gitignore` に `node_modules/`・`dist/`・エディタ設定・`*.local` / `.env*` を含める（Vite スキャフォールドの `.gitignore` を基礎にする）。
2. 初回コミット（現状スキャフォールド + `docs/`）。
3. GitHub リポジトリ `gooya-canvas` を作成し、`main` を push。
4. その後に `.github/workflows/` へ Pages デプロイ用ワークフロー（build → deploy）を追加する。ワークフローの内容は実装時に確定する（要確認）。

秘密情報（API キー・トークン・`.env`）は**いかなる形でもコミットしない**（§2.5）。

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
- コミット前チェックは §1 に従う（lint + build、導入後は test）。

### 6.3 ブランチ運用

- `main` + feature ブランチ方式。`main` は常に `npm run build` が通る状態を保つ。
- ブランチ名: `feat/<topic>`・`fix/<topic>`・`docs/<topic>`（例: `feat/prompt-generator`）。
- 変更は feature ブランチで行い `main` へマージする。少人数開発のため self-merge 可。軽微なドキュメント修正のみ `main` 直コミットを許容する。

### 6.4 デプロイ

- デプロイは **GitHub Actions による build → GitHub Pages** のみ（AD-12）。`main` への push をトリガーとする。
- `dist/` の手動 push・`gh-pages` ブランチの手動操作は禁止する。

## 7. アーキテクチャ原則を守る運用規約（レビュー規則）

依存境界の正となる規則は `repository-structure.md` §4〜§5 が所有する。本書はそれをコード作成・レビュー時のチェックリストとして運用する。

### 7.1 import の書き方

- パスエイリアス `@/` → `src/` を使う。**モジュール間**の import は barrel `@/modules/<module>`（= `index.ts` 公開 API）経由のみ。
- **同一モジュール内**は相対パス import（自モジュールの barrel を経由しない — 循環防止）。
- `@/modules/<module>/domain/...` のような**深い import は禁止**。
- `@xyflow/react` の import は `src/modules/canvas/**` 内のみ。infrastructure 具象の import は `src/main.tsx` / `src/app/**`（composition root）と同一モジュール内のみ。

### 7.2 レビューチェックリスト

`eslint-plugin-import` 導入までは、**repository-structure §5.1 の zones 表（5 制約）を PR レビューの必須観点として手動適用する**。導入後も以下は人が確認する:

- [ ] domain に React / React Flow / ブラウザ API が入っていないか（純粋性）
- [ ] application が infrastructure 具象を直接 import していないか（DIP。ポート経由か）
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

`docs/architecture.md` §5（コマンド）・§6（テスト戦略）、`docs/repository-structure.md` §4（配置・命名の基礎）・§5（依存境界）・§6（テスト配置）、初期要求メモ `docs/ideas/initial-requirements.md` §31（ショートカット実装の注意）・§37（camelCase 命名例）・§39（セキュリティ）・§42（テスト重点）、およびリポジトリ実態（npm scripts、git 未初期化、テスト・フォーマッタ未設定）に基づく。
