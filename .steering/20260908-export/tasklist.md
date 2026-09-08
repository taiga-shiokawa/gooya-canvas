# Phase 7 — Export タスクリスト

## 1. export モジュール（新規）

- [x] `application/ports/CanvasImagePort.ts` — 画像化ポート（bounds + 出力ピクセルサイズ → Blob）
- [x] `application/ports/PdfComposerPort.ts` — PDF 合成ポート + `PdfPageLayout` 型
- [x] `application/ports/CanvasSourcePort.ts` — Bounding Box 取得と Export 用表示の切替（canvas 側が実装）
- [x] `application/ports/ExportFilePort.ts` — Blob のダウンロード
- [x] `application/exportImagePlan.ts` — 余白 / 解像度 / 上限クランプの純関数
- [x] `application/pdfPageLayout.ts` — A4 1 ページ Fit の純関数
- [x] `application/exportFileName.ts` — 出力ファイル名のサニタイズ
- [x] `application/exportDateFormat.ts` — Generated Date の整形（現在時刻は引数）
- [x] `application/exportUseCases.ts` — `exportPng` / `exportPdf`
- [x] `infrastructure/htmlToImageCanvasImagePort.ts`
- [x] `infrastructure/jsPdfComposerPort.ts`
- [x] `infrastructure/browserExportFilePort.ts`
- [x] `presentation/ExportDialog.tsx` — 出力対象なし / 失敗の通知
- [x] `presentation/useExportCommands.ts` — File メニュー用コマンド + 実行中状態
- [x] `index.ts` — 公開 API

## 2. canvas モジュール（変更）

- [x] `presentation/canvasExportSource.ts` — Export 側への受け渡し口（レジストリ）
- [x] `presentation/canvasExportMode.ts` — Export 用表示を配る context
- [x] `presentation/exportSvgStyles.ts` — SVG 子要素へ算出スタイルをインライン化 / 復帰
- [x] `presentation/WorkflowCanvas.tsx` — Bounding Box 取得・Export 用表示・レジストリ登録
- [x] `presentation/nodes/WorkflowNodeCard.tsx` — Export 中は Handle と選択枠と transition を外す
- [x] `index.ts` — `canvasExportSource` を公開

## 3. composition root

- [x] `src/app/ports.ts` — canvas の窓口と 3 つの具象を `createExportUseCases` へ束ねる
- [x] `src/app/AppHeader.tsx` — File メニューへ Export PDF / Export PNG、ExportDialog

## 4. テスト

- [x] `exportImagePlan.test.ts`（8 件）
- [x] `pdfPageLayout.test.ts`（9 件）
- [x] `exportFileName.test.ts`（9 件）
- [x] `exportDateFormat.test.ts`（4 件）
- 合計 4 ファイル / 30 件

## 5. 動作検証

- [x] サンプル（横 2324px）で Export PNG → 4808×1208px、画面外のノードも含む全体が出力される（AC-016 / AC-019）
- [x] Handles / Selection Border / MiniMap / Controls / Grid が写らない（AC-018）
- [x] Edge の線・矢印・ラベルが出力される（html-to-image の SVG 問題を修正）
- [x] Export PDF → 1 ページ / A4 landscape / Project Name / Generated Date（AC-017）
- [x] Export 後に viewport・選択状態が戻り、未保存インジケータが立たない
- [x] ノード 0 件では出力せずダイアログを出す
- [x] コンソールエラー・警告なし

## 6. 品質ゲート

- [x] `npm run format` / `format:check`
- [x] `npm run lint`
- [x] `npm test`（16 ファイル / 230 件）
- [x] `npm run build`
- [x] `npx playwright test`（主要導線 1 件。回帰なし）
