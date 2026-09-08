# GOOYA Canvas 開発工程（Development Roadmap）

本書はフェーズ・実行順・完了条件・主要依存を定義する永続的ドキュメントである。個別タスクの進捗は書かない。

- 完了条件は `docs/product-requirements.md` の AC / FR の ID 参照で示し、文言を再記述しない。
- 用語は英語表記を正とする（`docs/glossary.md` 参照）。
- フェーズ骨格は初期要求メモ §43（Phase 0〜8）に基づき、セットアップ・デプロイタスク（AD-12 ほか）を織り込んでいる。
- 注意: 本書の「Phase 2」は**実装フェーズ**（Custom Nodes）を指す。MVP 後の拡張候補群（§4）は実装フェーズの Phase 2 とは別概念であり、混同しないこと。

---

## 1. フェーズ一覧と実行順

Phase 0 → 8 の順に実装する。並行可否は §2 を参照。

**現在地**: **Phase 0 〜 Phase 8 は完了**（Phase 0〜1: 2026-09-07、Phase 2〜8: 2026-09-08）。任意実装だった Crash Recovery（NFR-006）も実装済み。**§3 の MVP 完了条件を満たしている。** 以降は §4 の拡張候補から着手対象を選ぶ。

主要導線の E2E（`e2e/mainFlow.spec.ts`）は Phase 5 で整備済みであり、以降は **main マージの継続条件**である。

### Phase 0 — Project Setup（完了）

リポジトリ・パイプライン・依存ライブラリの整備。**初手の順序は次で確定**している（development-guidelines §6、architecture §4）。

1. `git init` → 初回コミット
2. GitHub リポジトリ `gooya-canvas` 作成・push
3. `.github/workflows/` 追加（GitHub Actions → GitHub Pages デプロイ、AD-12）
4. Vite `base: '/gooya-canvas/'` 設定

あわせて以下をセットアップタスクとして計上する（architecture §1.2）。

- ランタイム依存: @xyflow/react / Zustand / zundo / Zod / html-to-image / jsPDF
- 開発依存: Prettier + eslint-config-prettier / Vitest / Playwright / Tailwind CSS（v4 + `@tailwindcss/vite`、PostCSS 設定なし）/ eslint-plugin-import-x（`import-x/no-restricted-paths` zones — architecture §3.2）+ eslint-import-resolver-typescript（`@/` エイリアスと拡張子省略を解決できないと zones が発火しない）
- 依存方向は **zones と ESLint コアの `no-restricted-imports` の二重構成**で担保する。相対パス経由の違反は zones、`@/` エイリアス経由の違反と React Flow の封じ込めは `no-restricted-imports` が受け持つ（repository-structure §5.1）
- npm scripts: `dev` / `build` / `lint` / `preview` に加え、`format` / `format:check`（Prettier）と `test`（Vitest）/ `test:e2e`（Playwright）を整備する（development-guidelines §1）
- ディレクトリ骨格: 空ディレクトリを置かない方針（repository-structure）に従い、Phase 0〜1 で作るのは `src/app/` と `workflow` / `canvas` / `shared` の 3 モジュールのみ。残る 5 モジュール（inspector / project / export / prompt / review）は担当フェーズ（Phase 3 / 4 / 5 / 6 / 7）で作成する

**完了条件**: `npm run lint` / `npm run format:check` / `npm run test` / `npm run build` が通ること。依存方向の 5 制約（repository-structure §5.1 #1〜#5）が ESLint で有効であること（#1〜#4 は import-x の zones、#5 の React Flow 封じ込めは `no-restricted-imports`）。GitHub Pages（source = GitHub Actions）でビルド成果物が配信されること（AD-12）。

### Phase 1 — Canvas Foundation（完了）

React Flow 配置、Node 追加・移動・削除、Edge 接続・削除、Zoom / Pan、MiniMap。

接続ガードはこのフェーズでは**自己接続（self-loop）禁止の最小ガードのみ**を先行実装する（functional-design §5.2）。Node Type ごとの接続ルールは Phase 2 で扱う。

補足（実装済みの前提）:

- Node 表示は React Flow のデフォルトノードを使う。種別ごとの Custom Node は Phase 2 で `nodeTypes` を登録し、Domain Model → React Flow の写像だけを差し替える。
- 選択状態は canvas の presentation（React Flow 側の描画用フィールド）が保持する。Inspector が選択 Node を必要とする Phase 3 で shared の store へ移す。

**完了条件**: AC-001, AC-002, AC-003, AC-004, AC-005, AC-007, AC-008, AC-009（FR-002, FR-003）および FR-007 のうち自己接続禁止。FR-007 の残余は Phase 2。

### Phase 2 — Custom Nodes（完了）

11 種の Node Type（FR-001）の Custom Node 実装と、Node Type に応じた接続ルール（FR-007 の残余 — Trigger は incoming 0、End は outgoing 0 等）。

補足（実装済みの前提）:

- ノード種別カタログ（表示名・推奨 config キー・初期 config）と接続ルールは `workflow` の domain が所有する。canvas / inspector / review はこれを共有する
- functional-design §3.2 の型定義は本フェーズで全て揃えた（`WorkflowProject` ほか）。Zod スキーマと migration レジストリは Phase 4
- store は MVP 完成形の slice 構成（metadata / viewport / promptSettings / isDirty / 選択状態）まで拡張済み。選択状態を `canvas` から store へ publish するのは Phase 3

**完了条件**: FR-001, FR-007（残余）, FR-008 を満たすこと（初期要求メモ §43 は 8 種のみ列挙しているが、FR-001 の 11 種を正とする）

### Phase 3 — Inspector（完了）

Node Type ごとの設定 UI（Inspector）と Edge 設定。

**完了条件**: AC-010, AC-011（FR-009, FR-010）

### Phase 4 — Project Persistence（完了）

Save Project / Open Project、Zod validation、Schema Migration、New Project、サンプルプロジェクト（Interview Evaluation Reminder）。

**Crash Recovery（NFR-006 / functional-design §7.5）は本フェーズに含めなかった。** 完了条件に含まれず Phase 8 でも任意実装のためである。Phase 8 と並行して別途実装し、現在は `project` モジュールに実装済み。

**完了条件**: AC-012, AC-013, AC-014, AC-015（FR-011, FR-012, FR-013, FR-014, FR-015）

### Phase 5 — Prompt Generator（完了）

Workflow Domain Model → Markdown の決定論的生成、Prompt Panel、Implementation Target 選択。

**完了条件**: AC-020, AC-021, AC-022, AC-023（FR-019, FR-020, FR-021, FR-022）

**E2E 整備をこのフェーズに紐づける**: 主要導線 `New Project → Add Nodes → Connect → Edit → Save → Open → Generate Prompt` を構成する機能群が Phase 5 完了時点で揃うため、Playwright による E2E（`e2e/mainFlow.spec.ts`）をここで整備する。以降、この導線が通ることを **main マージの継続条件**とする（development-guidelines §5.2）。Playwright 自体の導入は Phase 0 で済ませておく。

### Phase 6 — Flow Review（完了）

Rule-based validation（ERROR / WARNING / INFO）と Review UI（該当 Node へのジャンプ）。

補足（実装済みの前提）:

- Review 結果は `shared` の store が保持する。ステータスバー（composition root）と共有する必要があり、feature モジュール間の直接 import は禁止のため
- 該当 Node へのジャンプも store 経由のフォーカス要求で行う（React Flow は canvas に封じ込められている）
- **Prompt の `## Open Questions` への転記は未連携**（理由は functional-design §9.2）。§4 の拡張候補へ送った

**完了条件**: AC-024, AC-025, AC-026, AC-027, AC-028（FR-023, FR-024）

### Phase 7 — Export（完了）

PNG / PDF 出力（html-to-image + jsPDF、AD-06）。

補足（実装済みの前提）:

- Export に必要な「全体の Bounding Box」と「Export 表示への切替」は canvas 側が提供し、composition root がポートとして export へ渡す（functional-design §8.4）
- ポートを 2 つ追加した（`CanvasSourcePort` / `ExportFilePort`。functional-design §2.3）

**完了条件**: AC-016, AC-017, AC-018, AC-019（FR-016, FR-017, FR-018）

### Phase 8 — UX Polish（完了）

Undo / Redo（zundo、AD-07）、Keyboard Shortcuts、Context Menu、Copy / Paste、Snap to Grid、Dirty Indicator。

Dirty Indicator は Phase 4 で実装済み。**localStorage による Crash Recovery（NFR-006）は本フェーズの完了条件に含めないが、Phase 8 と並行して実装した**（functional-design §7.5）。

**完了条件**: FR-004, FR-005, FR-006 を満たすこと（AC-006 の複製導線を含む）。

## 2. フェーズ間の主要依存

```mermaid
graph LR
    P0[Phase 0<br/>Setup] --> P1[Phase 1<br/>Canvas Foundation]
    P1 --> P2[Phase 2<br/>Custom Nodes]
    P2 --> P3[Phase 3<br/>Inspector]
    P2 --> P4[Phase 4<br/>Persistence]
    P3 --> P5[Phase 5<br/>Prompt Generator]
    P4 --> P5
    P5 --> P6[Phase 6<br/>Flow Review]
    P5 --> P7[Phase 7<br/>Export]
    P6 --> P8[Phase 8<br/>UX Polish]
    P7 --> P8
```

- Phase 4（Persistence）と Phase 3（Inspector）はいずれも Phase 2 の Domain Model（Node Type・config）に依存するが、相互には独立しており並行着手できる。
- Phase 6（Flow Review）と Phase 7（Export）は相互に独立しており、Phase 5 以降であれば順序を入れ替えてよい（メモ §43 の既定順は Review → Export）。
- Prompt Generator / Flow Review / Persistence はすべて Workflow Domain Model のみを入力とする（NFR-010、architecture §3.4）。UI フェーズの遅延がこれらの Unit テスト整備を妨げない構造を保つ。
- Unit テスト（Vitest）はフェーズ横断で随時追加する。重点対象と優先順は development-guidelines §5.1 に従う。

## 3. MVP 完了の定義

初期要求メモ §41（MVP Acceptance Criteria）に対応する **AC-001〜AC-028（product-requirements §7）をすべて満たした状態**を MVP 完了とする。あわせて次を満たすこと。

- 外部 LLM API なしで Prompt 生成・Review が成立している（NFR-003）
- 主要導線の E2E が main で継続的に通っている（§1 Phase 5）
- GitHub Pages 上で最新の main が配信されている（AD-12）

**達成状況（2026-09-08）**: Phase 0〜8 完了により上記をすべて満たした。以降は本書の「現在地」ではなく §4 の拡張候補が起点となる。

## 4. MVP 後の拡張候補

MVP 完了後の候補群。着手順序・採否は未確定（要確認）。名称は glossary の定義に従う。

| 候補 | 概要の所有 | 前提・依存 |
|---|---|---|
| AI Draft | glossary / メモ §28 | 外部 LLM 連携の方式決定（BYOK / 社内 API Gateway 等 — NFR-003）が先行 |
| AI Review | glossary / メモ §28 | 同上。Rule-based Review（Phase 6）の上に追加する |
| AI Enhance Prompt | glossary / メモ §28 | 同上。決定論的 Generator（Phase 5）を置き換えず補強する |
| Auto Layout（Tidy Flow） | glossary / メモ §34 | ELK.js 等の選定（要確認） |
| Swimlane | glossary / メモ §35 | schemaVersion migration（FR-014）を伴う可能性 |
| Template | glossary / メモ §36 | 通常の `.gooya-canvas.json` として管理。Persistence（Phase 4）の機構をそのまま使う |
| PDF 複数ページ分割 | glossary / メモ §21 | Export（Phase 7）の拡張。性能目標の確定（NFR-012）と併せて検討 |
| Prompt への Open Questions 転記 | functional-design §9.2 | Flow Review（Phase 6）の結果を Prompt へ載せる。**Review 結果の陳腐化ポリシー**と、Review メッセージの多言語化（Prompt は ja / en を切り替える — §9.3）の決着が先行 |
| Copy / Paste の OS クリップボード連携 | functional-design §5.1 | MVP はアプリ内メモリのみ。他アプリ・他タブとの受け渡しが必要になった時点で検討 |

SSO・組織認証・AI API proxy・Google Drive 直接保存・プロジェクト共有・共同編集・Audit Log に着手する時点で、フルスタック構成（Next.js 等）の再検討を行う（AD-01、product-requirements §5）。

## 5. 未確定事項

- 納期・リリース時期・マイルストーン日付: （要確認）— product-requirements §5 と同様、情報源に定義がない。本書は実行順のみを確定する。
- MVP 後の拡張候補の優先順位・採否: （要確認）
- 性能目標（NFR-012）確定時の対応フェーズ: （要確認）— 確定内容によっては Phase 7 の完了条件へ追記する。

---

## 付記: 本書の情報源

初期要求メモ `docs/ideas/initial-requirements.md` §4・§21・§28・§34〜36・§41〜43、`docs/product-requirements.md`（AC / FR / NFR）、`docs/architecture.md`（AD-01, AD-06, AD-07, AD-12、§1.2・§3・§6）、`docs/development-guidelines.md` §5〜§6、`docs/glossary.md` に基づく。
