# Crash Recovery 設計

## 1. 構成

```text
src/modules/project/
├─ application/
│  ├─ ports/RecoveryStoragePort.ts   # save / load / clear（§2.3）
│  ├─ recoverySerialization.ts       # 封筒の Zod スキーマと JSON ↔ Domain Model 変換
│  ├─ recoverySavedAtLabel.ts        # savedAt の表示整形（不正値は null）
│  ├─ recoveryUseCases.ts            # 自動保存の購読 / pendingRecovery / restore / discard
│  └─ startupUseCases.ts             # 起動時の判定順序（復旧 → サンプル → 自動保存開始）
├─ infrastructure/
│  └─ browserRecoveryStoragePort.ts  # localStorage 具象。例外はここで吸収
└─ presentation/
   ├─ ProjectDialog.tsx              # cancelLabel / onDismiss を追加（後方互換）
   └─ useRecoveryPrompt.ts           # 復旧ダイアログの状態を作る

src/app/ports.ts            # 具象・タイマー・現在時刻の注入（composition root）
src/app/AppRecoveryDialog.tsx # 復旧ダイアログの設置
src/main.tsx                # startupUseCases.start() を 1 回呼ぶだけ
```

## 2. 決めたこと

| 論点 | 決定 | 理由 |
|---|---|---|
| debounce 間隔 | **2 秒**（`RECOVERY_DEBOUNCE_MS`）+ **上限 10 秒**（`RECOVERY_MAX_DEBOUNCE_MS`） | localStorage 書き込みは同期でメインスレッドを止めるので 1 操作ごとは避ける。一方、純 debounce だけだと連続入力中に一度も書かれないため上限を設け、喪失しうる編集時間を 10 秒に閉じ込める |
| 購読の置き場所 | application（`createRecoveryUseCases(deps).startAutoSave()`）。`useWorkflowStore.subscribe` を使う | 既存の `createProjectUseCases(deps)` と同型。composition root には「具象の注入」だけを残す |
| タイマー | `delay: (cb, ms) => cancel` として composition root から注入 | application はブラウザ API へ直接依存しない（§2.2）。テストは仮想時計で実時間を待たない |
| 保存データの形 | `{ savedAt, project }` の封筒。`project` は正式なプロジェクトファイルと同じスキーマ | 「いつの復旧データか」をダイアログで示せる。schemaVersion / migration の扱いを §7.3 と揃えられる |
| 保存を起こす変更 | `nodes` / `edges` / `metadata` / `promptSettings` の参照変化のみ（dirty 判定と同じ 4 つ） | viewport を含めると Pan / Zoom のたびに debounce が延び、かえって保存が遅れる。書き出す内容には現在の viewport を含める |
| 起動時の判定順序 | `pendingRecovery()` → 無ければ `loadSampleProjectIfEmpty()` → `startAutoSave()` | §7.6 は「復旧データも既存プロジェクトもない場合」にサンプル。判定を application（`startupUseCases`）へ置き、DOM 無しで検証できるようにした |
| ダイアログのタイミング | マウント後（`AppRecoveryDialog`）。判定自体は render 前に済んでいるので初回 render から出る | 判定を render 前に置くことで、Canvas がサンプルで一瞬埋まる表示のちらつきを避ける |
| Esc の扱い | ダイアログを閉じるだけで**復旧データは残す**（`onDismiss`） | 副次ボタンが破壊的（破棄）なので、誤操作しやすい Esc に破壊的動作を割り当てない |
| Restore 後 | `replaceProject` で復元し、復旧データは削除する | §2.4 により復元で dirty は倒れる。残すと保存するまで毎回ダイアログが出る。次の編集で 2 秒後に書き直される |
| Discard 後 | Canvas は空のまま（サンプルは読み込まない） | 初回起動ではないため。File > New と同じ状態 |

## 3. 削除のタイミング（CR-3）

購読側で store の遷移を見て判断する。

- `isDirty` が true → false（`markSaved` / dirty からの `replaceProject`）: 保留中のタイマーを取り消して削除
- `isDirty` が false のまま保存対象の参照が変化（clean からの `replaceProject` = New / Open / Restore）: 削除
- viewport / 選択 / Review 結果の変更: **触らない**（ダイアログ表示中の復旧データを消さないため）

書き込んだかどうかを内部フラグで持ち、存在しないときは `clear()` を呼ばない。

## 4. 壊れた復旧データ（CR-6）

`deserializeRecovery` が JSON.parse → Zod（封筒 + `workflowProjectSchema`）→ migration の順に検査し、
どの段で失敗しても例外を投げずに `ok: false` を返す。呼び出し側は store を変更せず、
localStorage から削除して通常起動を続ける。エラーはユーザーへ見せない。
