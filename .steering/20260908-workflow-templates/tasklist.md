# Workflow Template タスク

## テンプレート実体

- [x] `assets/samples/` → `assets/templates/` へ既存サンプルを移動（TP-1）
- [x] `scheduled-report-teams.gooya-canvas.json`（T1。design.md §3）
- [x] `overdue-reminder.gooya-canvas.json`（T2）
- [x] `chat-search-bot.gooya-canvas.json`（T3）
- [x] `llm-extract-approve.gooya-canvas.json`（T4）

## application

- [x] `templateCatalog.ts`（`WorkflowTemplate` / `WORKFLOW_TEMPLATES` / `TEMPLATE_CATEGORY_LABELS` / `REFERENCE_TEMPLATE_ID`）（TP-1, TP-5）
- [x] `projectUseCases.loadTemplate(templateId)` を追加（TP-3, TP-8）
- [x] `loadSampleProjectIfEmpty` をカタログ経由へ書き換え（挙動は不変）

## presentation

- [x] `TemplateGallery.tsx`（category 別グルーピング / target バッジ / 空のプロジェクト）（TP-2, TP-5, TP-6）
- [x] `useProjectCommands` に `newFromTemplate` と `templateGallery` を追加（TP-3）
- [x] `project/index.ts` の公開 API を更新（TP-11）

## composition root

- [x] `AppHeader.tsx` の File メニューへ `New from Template` を追加し `TemplateGallery` を設置（TP-2）

## テスト

- [x] `templateCatalog.test.ts`（deserialize 可 / target・name 一致 / id 重複なし / 参照 id の存在 / Edge 端点の存在 / 実 URL を含まない）
- [x] `src/app/templateReview.test.ts`（Flow Review の ERROR・WARNING が 0 件 / dirty を立てない / そのまま保存できる）（TP-10, TP-12）
- [x] `e2e/mainFlow.spec.ts` の `New` セレクタへ `exact: true`（`New from Template` との名前衝突を解消）

## 品質ゲート

- [x] `format:check` / `lint` / `test`（445 件）/ `build`
- [x] `playwright test`（主要導線 1 passed）
- [x] 実機確認（下記）

### 実機確認の結果

- File > New from Template でギャラリーが開く。category 3 区分・テンプレート 5 本・target バッジ・該当案件数が表示される
- T1 を選ぶと 16 Node / 14 Edge が読み込まれ、ステータスバーが「定期バッチ集計 → Teams カード通知 / 変更はありません」になる（TP-12）
- Review Flow が **0 Errors / 0 Warnings / 0 Suggestions**（13 ルール全クリア）
- Generate Prompt の Implementation target が `Google Apps Script` に初期選択される（TP-4）
- dirty な状態では「未保存の変更があります。破棄して続行しますか？」→「破棄して選択」で確認が挟まる（TP-3）。キャンセルで編集が残る
- 「空のプロジェクト」で 0 Node / `Untitled Workflow` になる（TP-6）
- コンソールエラーなし
- 初期フォーカスがスクロールコンテナに当たってフォーカスリングが出る問題を `tabIndex={-1}` で解消（Tab で最初のカードへ入る）

## 永続文書への反映（メインブランチ側）

- [ ] `docs/development-roadmap.md` §4 の Template 行を実装済みへ更新し、残り 7 パターンを追記
- [ ] `docs/functional-design.md` §7.6 のサンプル読込をテンプレートカタログ経由として記述
- [ ] `docs/glossary.md` の Template 定義を実装に合わせて確認
