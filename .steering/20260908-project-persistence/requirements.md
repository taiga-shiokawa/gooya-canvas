# Phase 4 — Project Persistence 要求

対象フェーズ: `docs/development-roadmap.md > §1 Phase 4`。完了条件は **AC-012 / AC-013 / AC-014 / AC-015（FR-011〜FR-015）**。

## 1. 今回の要求内容

| # | 要求 | 出典 |
|---|---|---|
| R-1 | 新規プロジェクトを作成できる。dirty なら確認ダイアログを挟む | FR-011 / functional-design §7.1 |
| R-2 | `{project-name}.gooya-canvas.json` としてダウンロード保存する。**保存前に Zod validation** | FR-012 / AC-012 / §7.2 |
| R-3 | プロジェクトファイルを開ける。validation + migration を通す | FR-013 / AC-013 / §7.3 |
| R-4 | `schemaVersion` を必ず持ち migration 可能。現行版より新しい版は開かない | FR-014 / §7.4 |
| R-5 | 初回起動時にサンプル「Interview Evaluation Reminder」を読み込んだ状態で開始する | FR-015 / §7.6 |
| R-6 | 読込前後で Node 位置・Edge・設定が一致する | AC-014 / §7.3 |
| R-7 | 不正なファイルを読み込んでも**既存 Canvas を一切変更せず**、アプリが壊れない | AC-015 / NFR-005 / §7.3 |
| R-8 | Header に File メニュー、Status Bar に dirty インジケータを置く | functional-design §4.2 / §4.3 |

## 2. 受け入れ条件

- AC-P4-1: File > Save Project で `.gooya-canvas.json` がダウンロードされる（AC-012）
- AC-P4-2: 保存したファイルを File > Open Project で再読込できる（AC-013）
- AC-P4-3: 読込前後で Node 位置・Edge・config が一致する（AC-014）
- AC-P4-4: 壊れた JSON / 型不一致 / 未知の schemaVersion を読み込んでもエラーダイアログが出るだけで Canvas は変わらない（AC-015）
- AC-P4-5: 初回起動時にサンプルが表示される（FR-015）
- AC-P4-6: 未保存変更があるとき Status Bar に dirty が表示され、保存すると消える
- AC-P4-7: `npm run format:check` → `lint` → `test` → `build` がすべて通る

## 3. 制約事項

- **Crash Recovery（NFR-006 / §7.5）はスコープ外**。roadmap 上 Phase 4 の完了条件に含まれず Phase 8 でも任意実装のため、`RecoveryStoragePort` を作らない
- 読み込んだ JSON は**必ず Zod validate を通してから** store へ入れる。validate 前のオブジェクトを state / domain へ渡さない（NFR-005）
- Zod スキーマと migration は `workflow` の domain に置く。`project` モジュールに domain 層を作らない（repository-structure §2.1）
- **ポート具象の組み立ては composition root（`src/main.tsx` / `src/app/**`）だけの特権**（AD-10。DI コンテナ不採用）
- `config` は種別ごとのキーを強制しない。未知キーを持つファイルも読める後方互換を保つ（§3.2）
- migration は決定論的純関数。`Date.now()` / `crypto.randomUUID()` を内部で呼ばない
- **Workflow データを外部へ送信するコードを書かない**（NFR-001）
- **`@xyflow/react` を project / app から import しない**（依存方向 #5）
- サンプルは `public/` に置かず、`project/assets/samples/` へ置いて import する（repository-structure §6.2）
- Ctrl+S / Ctrl+O（FR-006 / §5.5）は Phase 8 のスコープ
