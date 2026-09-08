# テンプレートの抽象化 と Node Reference タスク

## テンプレートの抽象化

- [x] `scheduled-report-teams`（16 → 8 ノード）
- [x] `overdue-reminder`（21 → 9 ノード）
- [x] `chat-search-bot`（14 → 8 ノード）
- [x] `llm-extract-approve`（16 → 9 ノード）
- [x] title / description / config から特定サービス名を外す（AB-2）
- [x] 各テンプレートに「決めておくこと」Note を 1 つ置く（AB-3）
- [x] `templateCatalog.ts` の name / description を新しい `metadata.name` に合わせる
- [x] 既存サンプルは内容を変えず、縦レイアウトへ揃えた（下記「判断の変更」参照）

## Node Reference

- [x] `workflow/domain/nodeReference.ts`（11 種の summary / usage / connection / configKeys）（RF-2, RF-6）
- [x] `CONNECTION_RULES`（共通の接続ルール）（RF-5）
- [x] `required` で Review が指摘する config キーを示す（RF-3）
- [x] `workflow/index.ts` の公開 API を更新
- [x] `canvas/presentation/NodeReferencePanel.tsx`（マスタ / ディテール。Palette と同じアイコン・色）（RF-1, RF-4）
- [x] `canvas/index.ts` の公開 API を更新
- [x] `AppHeader.tsx` の Edit の隣に `Reference` を追加（RF-1）

## 表示位置の修正（当初の設計に無かった対応）

テンプレート JSON の `viewport` は固定値なので、ペイン幅が変わるとノードが表示域の外へ出る。
実機で確認して発覚したため、以下を追加した。

- [x] `shared` の store に `ViewportFitRequest` と `requestViewportFit()` を追加
- [x] `projectUseCases.loadTemplate` が読込後に fit を要求する
- [x] `WorkflowCanvas` が要求を購読し、**全ノードの測定が揃ってから** `fitView()` する
      （`getNodes()` を毎フレーム見る。上限 30 フレーム）
- [x] 4 本のテンプレートの座標を主軸 x=40 / 分岐 x=340 に詰めた
- [x] 既存サンプルも同じ縦レイアウトへ揃えた（`e2e` のコメントも更新）

## テスト

- [x] `workflow/domain/nodeReference.test.ts`（網羅性 / 並び / `NODE_CONFIG_KEYS` との一致 / 説明が空でない）（RF-7）
- [x] `review/domain/reviewWorkflow.test.ts` に `REQUIRED_CONFIG_RULES` と `required` の一致検査を追加
- [x] `app/templateReview.test.ts` に SUGGESTION 0 件とノード数上限（10 以下）を追加（AB-1, AB-5）
- [x] `templateCatalog.test.ts` に BOM 検査を追加（下記「踏んだ罠」参照）

## 品質ゲート

- [x] `format:check` / `lint` / `test`（495 件）/ `build`
- [x] `playwright test`（主要導線 1 passed）
- [x] 実機確認（下記）

### 実機確認の結果

Playwright で 3 つのウィンドウサイズを実測した（調査用 spec は削除済み）。

| ウィンドウ | Canvas ペイン | 表示域外のノード |
|---|---|---|
| 1280 × 720 | 840 × 624 | 全テンプレート 0 |
| 900 × 700 | 420 × 624 | 全テンプレート 0 |
| 600 × 800 | 120 × 724 | 収まらない（下記） |

- 600 × 800 では Palette 192px と Inspector が固定幅のため Canvas が 120px しか残らず、
  React Flow の minZoom 0.5 では原理的に収まらない。ウィンドウ幅の制約であり本件では扱わない
- Reference は 11 種すべてが左の一覧から引ける。アイコン・色は Palette と一致。
  `system` などに「未設定だと Review が指摘」の印が付く。Note は「設定項目はありません」
- 全テンプレートで Flow Review が 0 Errors / 0 Warnings / 0 Suggestions

### 踏んだ罠

- **PowerShell の `Set-Content -Encoding UTF8` は BOM を付ける**。テンプレート JSON に BOM が
  入ると `JSON.parse` が落ち、実行時は「読み込めませんでした」ダイアログだけが出て原因が見えない。
  `templateCatalog.test.ts` に BOM 検査を追加した
- **Browser pane が描画されていないと `requestAnimationFrame` が発火せず、
  `node.measured` も埋まらない**。この状態で測ると「fit が動いていない」ように見えるため、
  測定に依存する検証は Playwright（実ブラウザ）で行う必要がある

## 判断の変更（design.md との差分）

- 既存サンプル `Interview Evaluation Reminder` は「変更しない」（AB-4）としていたが、
  **座標と viewport だけ縦レイアウトへ揃えた**。ギャラリーから選べるようにした結果、
  横 2400px のレイアウトでは表示域外になる不具合が出たため。ノード・Edge・名称・config は不変で、
  E2E が依存するのは名称とノード数（11）とズーム（< 1）のみなので影響しない

## 永続文書への反映（メインブランチ側）

- [ ] `docs/functional-design.md` に Node Reference（§4.2 の Header 構成）を追記
- [ ] `docs/development-roadmap.md` §4 の Template 行を実装済みへ更新
- [ ] `docs/repository-structure.md` §6.2 のサンプル配置を `assets/templates/` に更新
