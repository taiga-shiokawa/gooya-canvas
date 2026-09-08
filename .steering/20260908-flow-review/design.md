# Phase 6 — Flow Review 設計

要求は `requirements.md`。永続文書の所有は `docs/functional-design.md`（振る舞い）/ `docs/repository-structure.md`（配置）。

## 1. 実装アプローチ

### 1.1 `review` モジュールの構成

repository-structure §2.1 の表どおり **domain + application + presentation**（infrastructure なし、ports なし）。

| ファイル | 役割 |
|---|---|
| `domain/reviewWorkflow.ts` | 13 ルールの決定論的純関数。入力は Domain Model のみ |
| `application/reviewUseCases.ts` | 実行 / クリア / ノードへのフォーカス要求 |
| `presentation/ReviewPanel.tsx` | 件数サマリとレベル別一覧 |

### 1.2 結果の受け渡し（R-5 の制約）

ステータスバーは `src/app/` にあり、feature モジュール（review）を import できない（依存方向 #4）。
そこで **結果の型を `shared/domain/` に置き、slice を `shared/application/` の store に持たせる**。
`review` は `@/modules/shared` から型を import して結果を生成し、store へ入れる。app 側は store を購読する。

Review 結果は Domain Model ではないので **保存対象にせず dirty も立てない**。`replaceProject`（New / Open）ではクリアする。

### 1.3 センタリング（R-4 の制約）

`@xyflow/react` は canvas 専用（依存方向 #5）なので review から Canvas を動かせない。
**store に「このノードへフォーカスしてほしい」という要求（`nodeFocusRequest`）を置き、canvas が購読して `setCenter` する。**
同じノードを続けてクリックしても再センタリングされるよう、要求には store 側で単調増加させるトークンを持たせる。

中心座標は React Flow の `getNodesBounds([nodeId])` から取る。`getNode()` の戻り値には `measured` が乗らず、
自前計算するとノード半個ぶんずれる（ブラウザで実測確認済み）。

### 1.4 RV-I01〜I03 の判定条件（§10.2 の「（要確認）」を確定）

§10.2 は「MVP では integration / action ノードや notes に該当記述がない場合に一律で表示する簡易判定」を暫定方針としている。これを次で確定する。

- **適用条件**: integration または action ノードが 1 つ以上あること。外部呼び出しも処理も持たない Workflow に非機能指摘を常時 3 件出すのはノイズにしかならないため
- **検索対象**: integration / action / note ノードの `title` / `description` / `notes` / `config` の文字列値をすべて連結したもの
- **判定**: ルールごとのキーワードが 1 つも現れなければ 1 件出す。ノードに紐づかない指摘なので `nodeId` は持たない（クリック不可）
- **照合**: ASCII キーワードは単語境界で照合する（`log` が `logic` に誤ヒットしない）。活用形は明示列挙。日本語は部分一致

| ルール | キーワード |
|---|---|
| RV-I01（API 失敗時） | error / fail(ure) / retry / exception / fallback / timeout / 失敗 / エラー / リトライ / 再試行 / 例外 |
| RV-I02（重複実行対策） | idempotent / duplicate / dedup 系 / 重複 / 二重 / 冪等 |
| RV-I03（Logging） | log(s\|ging\|ged) / audit / trace / monitoring / ログ / 監査 / 記録 |

### 1.5 RV-W06 の解釈

「Trigger から辿って End へ到達しない経路がある」を **「その Trigger を起点にどの End にも到達できない」** と解釈し、Trigger 単位で 1 件出す（デッドエンドの列挙ではない）。RV-W07 も同じ到達可能性ヘルパを使う。
探索は訪問済み集合で打ち切るため Cycle があっても停止する。

### 1.6 Panel は非モーダル

`PromptPanel` と違い、問題をクリックすると背後の Canvas が動くのを見せる必要がある。したがってモーダル `<dialog>` ではなく `fixed` の非モーダルパネルとする。Esc クローズ・`role="dialog"` + `aria-label`・開いたときのフォーカス移動は自前で用意し、フォーカストラップは張らない（非モーダルのため）。

パネル内に「再実行」を置き、編集後にその場で解析し直せるようにする。

## 2. Prompt との連携を見送る判断（§9.2）

`docs/functional-design.md §9.2` は `## Open Questions` に「Flow Review の WARNING / INFO を転記」と定めるが、**本フェーズでは実装しない**。

1. Phase 6 の完了条件（AC-024〜028）に含まれず、Open Questions は Prompt の外部契約（§12）側の項目である
2. **結果の陳腐化を解決できない。** Review は手動実行なので、指摘を直した後に Prompt を出すと解決済みの指摘が Open Questions に残る。編集で結果を捨てる方式にすると、ノードをドラッグしただけで Panel の一覧が消えて使い物にならない
3. **言語が揃わない。** Review メッセージは日本語固定だが Prompt は ja / en の切替を契約している（§9.3）。転記すると en の Prompt に日本語が混ざる

実装する場合に必要な変更（今回 `prompt` は未変更）:

- `generatePrompt(project, findings = [])` へ拡張（既定値ありなら既存のインラインスナップショットは変更不要）
- `promptLabels` に Open Questions の見出しとレベル表記を追加
- 上記 2・3 の方針決着

## 3. 影響範囲の分析 / `docs/` の更新方針

| 文書 | 内容 |
|---|---|
| `docs/functional-design.md` | §2.4 store の UI 状態へ `reviewFindings` / `nodeFocusRequest` を追加（保存対象外・dirty を立てない・Undo 対象外）/ §4.3 未実行時はサマリを出さない / §4.4 遷移図の「問題クリック」の矢印を実装に合わせる / §10.2 の「（要確認）」を §1.4 で確定・RV-W06 の解釈を明記 / §10.3 Panel は非モーダル・結果は store が保持 / §9.2 Open Questions は未連携である旨と理由 |
| `docs/repository-structure.md` | §2 / §2.1 に `review` と `shared/domain/` の実在、§6.1 のテスト実績 |
| `docs/development-roadmap.md` | 現在地を Phase 6 完了へ |

## 4. 後続フェーズへの申し送り

- **Phase 8（zundo）**: `reviewFindings` / `nodeFocusRequest` は Domain Model ではないので temporal の追跡対象（`partialize`）から必ず除外する。§11 のとおり追跡は `nodes` / `edges` のみ
- **RV-W06 と RV-W07 の重複**: Notification が End へ到達できない場合、その Notification に至る Trigger も W06 になり 2 件出る。仕様どおりだが集約するなら §10.2 で方針を決める
- **Review 結果の陳腐化**: 実行後に編集しても結果は残る（Panel の「再実行」で更新）。無効化ポリシーは未定
- **デッドエンド検出は未実装**: 「End 以外で outgoing が無いノード」は 13 ルールに無い。別ルールとして足すかは要判断
- **`configText` の重複**: config 値の読み方（空文字＝未設定）が `prompt/domain` と `review/domain` に各 1 実装ある。`workflow/domain/nodeCatalog` へ引き上げれば共有できる
- **E2E**: `page.getByRole('dialog')` が ReviewPanel とも一致し得る。Review を E2E に足すときは名前で絞ること
