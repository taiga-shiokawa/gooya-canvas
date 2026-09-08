# Phase 4 — Project Persistence 設計

要求は `requirements.md`。永続文書の所有は `docs/functional-design.md`（振る舞い）/ `docs/repository-structure.md`（配置）。

## 1. 実装アプローチ

### 1.1 Zod スキーマと migration（workflow domain）

| ファイル | 役割 |
|---|---|
| `workflow/domain/schemas.ts` | `docs/functional-design.md §3.2` と同形のスキーマ一式。ルートは `workflowProjectSchema` |
| `workflow/domain/migrations.ts` | `SCHEMA_MIGRATIONS`（MVP は空）と `migrateProject`（純関数の連鎖） |

- `config` は `Record<string, unknown>` として受け、種別ごとのキーを強制しない。未知キーを持つファイルも読める後方互換のため（§3.2 末尾）
- **スキーマと型定義が乖離しないことをテストで担保する**（`z.infer` と `types.ts` の相互代入で検査。片方だけ変えると `tsc -b` が落ちる）
- 現行版より新しい `schemaVersion` は開かず、異常ファイルと同じエラー処理にする（§7.4）

### 1.2 `project` モジュールの構成

repository-structure §2.1 の表どおり **application（+ ports）+ infrastructure + presentation + assets**。domain は作らない。

| ファイル | 役割 |
|---|---|
| `application/ports/ProjectFilePort.ts` | `download` / `pickAndRead` |
| `application/projectFileName.ts` | ファイル名生成とサニタイズ |
| `application/projectSerialization.ts` | `serializeProject` / `deserializeProject`（JSON.parse → Zod → migration） |
| `application/projectUseCases.ts` | New / Save / Open / サンプル読込。`createProjectUseCases(deps)` で依存を注入 |
| `infrastructure/browserProjectFilePort.ts` | Blob + `<a download>` / `<input type="file">` |
| `presentation/ProjectDialog.tsx` | 確認・エラーダイアログ |
| `presentation/useProjectCommands.ts` | File メニュー用コマンドとダイアログ状態 |
| `assets/samples/interview-evaluation-reminder.gooya-canvas.json` | サンプル |

`now` / `newId` はユースケースへ注入する。`updatedAt` 生成と ID 採番を純粋な部分に埋め込まないため（development-guidelines §2.2 / AD-08）。

### 1.3 ダイアログはネイティブ `<dialog>`

Radix 等のヘッドレス UI は未導入（architecture §1.3）。自前でフォーカストラップを書くより、`<dialog>` + `showModal()` で Esc・フォーカストラップ・`:modal`・backdrop をブラウザに委ねるほうが a11y を確実に担保できる。初期フォーカスは「キャンセル」に置き、破壊的な選択を既定にしない。

### 1.4 エラー表示の責務分離

ユースケースは `'saved' | 'invalid'` / `'opened' | 'cancelled' | 'failed'` を返すだけで UI を知らない。§7.3 の固定文言をダイアログに出すのは presentation（`useProjectCommands`）の責務とする。

### 1.5 `pickAndRead` の戻り値を `Promise<string | null>` にする

functional-design §2.3 は `Promise<string>` と定義しているが、**File Picker のキャンセル時に promise が永久に未解決になる**。`null` を「キャンセル / 読み取り不能」として返す。永続文書側の修正が必要（§2）。

### 1.6 サンプルプロジェクト（R-5）

§7.6 の図のとおり End を 3 つ持つ構成 + 説明用の note 1 個（11 ノード / 9 エッジ）。x 300 / y 160 グリッドでノード幅 224px と重ならないよう配置する。Condition の `sourceHandle` は `WorkflowNodeCard` の Handle id 規約（分岐名そのもの）に合わせて `Yes` / `No` とし、`label` も同値にする。

`?raw` で文字列として import し、**通常の Open と同じ JSON.parse → Zod → migration を通す**（repository-structure §6.2 / NFR-005）。

### 1.7 fitView は見送る（要判断事項）

§7.3 は読込後に `fitView()` するとしているが、`@xyflow/react` は canvas モジュール専用のため project / app から呼べない（依存方向 #5）。

**代案**: `replaceProject` がファイルの `viewport` を store に復元するので、**canvas が `store.viewport` を controlled viewport として購読すれば Open 時の画面復元は成立する**。fitView より「保存時の見え方」を再現できるためこちらが望ましい。canvas モジュールの変更が必要なため本作業では実装せず、永続文書の更新とあわせてメイン側へ申し送る。

初回サンプル読込は render 前に済ませるため、既存の `fitView` prop がサンプル全体に効く。

## 2. 影響範囲の分析 / `docs/` の更新方針

| 文書 | 更新要否 | 内容 |
|---|---|---|
| `docs/functional-design.md` | **更新する** | §2.3 の `pickAndRead` を `Promise<string \| null>` へ（§1.5）。§7.3 にキャンセル分岐を追記。§7.3 の fitView を「store の viewport を canvas が購読して復元する」へ（§1.7）。**§7.3 / §7.4 の検証順序の限界**（後述）を注記 |
| `docs/repository-structure.md` | **更新する** | §2 の未作成リストから `project` を外す。§5.4 に「composition root が注入するため infrastructure のファクトリも公開してよい」例外を明記。§6.1 の実績を更新 |
| `docs/development-roadmap.md` | **更新する** | 現在地に Phase 4 完了を反映 |
| `docs/development-guidelines.md` | **更新する** | Windows（`core.autocrlf=true`）では fresh checkout 直後に `format:check` が落ちる。`.gitattributes` に `* text=auto eol=lf` を置くのが根治策 |

### 検証順序の限界（重要な申し送り）

§7.3 のフローは「Zod validation → Migration」の順である。この順序では**現行スキーマに適合しない旧版は migration に到達できない**ため、キー追加のような後方互換な変更にしか対応できない。将来 breaking な版を作るなら「`schemaVersion` だけを読む envelope 検証 → migration → 現行スキーマで本検証」へ改める必要がある。MVP はレジストリが空なので実害はない。

## 3. 後続フェーズへの申し送り

- **Phase 5**: 入力の `WorkflowProject` は `workflowProjectSchema` を通った値であることが保証される。ただし `config` は `Record<string, unknown>` のままなので、Prompt 生成側は値の型を自前で絞ってから使うこと（`config.recipient` が文字列とは限らない）。`promptSettings` はファイルに保存され `store.promptSettings` に入る
- Save 時に `updatedAt` を store へも書き戻している。Phase 8 で zundo が metadata を追跡し始めると「保存が Undo できる」形になるため、履歴対象は `nodes` / `edges` のみという §11 の方針を維持すること
- サンプルの `metadata.id` は固定 UUID。Crash Recovery や複数タブ同期が入ると衝突しうるので、その時点で読込時の再採番を検討する
- Ctrl+S / Ctrl+O（§5.5）は Phase 8。`projectUseCases` は UI 非依存なのでショートカット層から同じコマンドを呼べる
