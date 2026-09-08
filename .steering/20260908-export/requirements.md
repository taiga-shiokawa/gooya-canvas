# Phase 7 — Export 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 7`。完了条件は **AC-016 / AC-017 / AC-018 / AC-019（FR-016〜FR-018）**。

## 1. 今回の要求内容

| # | 要求 | 出典 |
|---|---|---|
| R-1 | Canvas 全体を高解像度 PNG として出力できる | FR-016 / AC-016 / functional-design §8.1 |
| R-2 | Canvas 全体を 1 ページに Fit させた PDF として出力できる。Project Name と Generated Date を付記する | FR-017 / AC-017 / §8.2 |
| R-3 | 出力対象は **Viewport の可視範囲ではなく全 Node / Edge の Bounding Box**。Canvas の端が切れない | AC-019 / §8.1 |
| R-4 | Export 時に Editor UI（Handles / Selection Border / MiniMap / Controls / Inspector / Toolbar / Grid）を非表示にする | FR-018 / AC-018 / §8.3 |
| R-5 | File メニューへ Export PDF / Export PNG を追加する | §4.2 |

## 2. 受け入れ条件

- AC-P7-1: File > Export PNG で PNG がダウンロードされる（AC-016）
- AC-P7-2: File > Export PDF で 1 ページの PDF がダウンロードされ、Project Name と Generated Date が入る（AC-017）
- AC-P7-3: 画面外のノードを含む全体が出力される（AC-019）
- AC-P7-4: 出力画像に Handles / Selection Border / MiniMap / Controls / Grid が写らない（AC-018）
- AC-P7-5: Export 後に Canvas が元の表示（viewport・選択状態）へ戻り、**未保存インジケータが立たない**
- AC-P7-6: ノードが 1 つも無い状態では出力せず、その旨を伝える
- AC-P7-7: `npm run format:check` → `lint` → `test` → `build` がすべて通り、主要導線 E2E が壊れない

## 3. 制約事項

- **`@xyflow/react` の import は `src/modules/canvas/**` のみ**（repository-structure §5.1 #5）。`src/app/**` も禁止
- **feature モジュール相互の import 禁止**（同 #4）。export は canvas / project を import できない
- application は infrastructure / presentation を import しない（同 #2）。infrastructure も application を import できない
- infrastructure 具象を import してよいのは `src/main.tsx` と `src/app/**` のみ（同 §5.3 / AD-10）
- infrastructure はライブラリ固有の例外・型をポートの外へ漏らさない（development-guidelines §2.3）
- Workflow データを外部へ送信するコードを書かない（NFR-001）。外部フォントも読み込まない（NFR-004）
- Vitest は `environment: 'node'`。DOM・Canvas・html-to-image を要するテストは書かない
- PDF の複数ページ分割はスコープ外（MVP 後の拡張候補 — roadmap §4）

## 4. 触らないもの（並行フェーズとの分担）

- `src/modules/review/`（Phase 6 が作成中）、`src/modules/prompt/`、`src/modules/inspector/`、`src/modules/project/`
- `src/app/AppStatusBar.tsx`（Phase 6 が Review サマリを入れる）
- `src/modules/shared/`（Phase 6 が slice を追加する）
- `docs/` 配下（更新点は報告に留める）
- `e2e/mainFlow.spec.ts`
