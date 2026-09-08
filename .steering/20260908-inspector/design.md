# Phase 3 — Inspector 設計

要求は `requirements.md`。永続文書の所有は `docs/functional-design.md`（振る舞い）/ `docs/repository-structure.md`（配置）。

## 1. 実装アプローチ

### 1.1 選択状態の移送（R-7）

store には Phase 2 で `selectedNodeIds` / `selectedEdgeId` / `setSelection` を用意済み。本作業では publish 側だけを実装する。

- `WorkflowCanvas` に React Flow の `onSelectionChange` を追加し、`canvas/application/canvasUseCases.ts` の `selectElements` 経由で store へ流す
- React Flow 型は `fromReactFlowIds` で ID へ落としてから渡す（NFR-010）
- Inspector は store を購読するだけで、canvas とは直接連携しない（feature モジュール間の相互 import 禁止 — 依存方向 #4）

### 1.2 分岐編集は workflow domain の純関数（R-5）

分岐のリネーム・追加・削除は「Condition ノードの `config.branches` と、そこから出る Edge 群」を**同時に整合させる**操作であり、片方だけ更新すると Canvas から Edge が消える。inspector には domain 層を作らない方針（repository-structure §2.1）のため、`workflow/domain/conditionBranchEditing.ts` に純関数として置く。

| 関数 | 役割 |
|---|---|
| リネーム | 該当 Condition から出て `sourceHandle` が旧名の Edge を新名へ。`label` は**旧名と一致していた場合のみ**追随（ユーザーが独自 label を付けていたら壊さない） |
| 追加 | `branches` に追加。Edge は変化なし |
| 削除 | `branches` から除き、**その分岐に紐づく Edge も削除**する |
| ガード | `branches` を 2 つ未満にできない（`MIN_CONDITION_BRANCHES`）。分岐名の重複も禁止（Handle id が衝突するため） |

**削除時に Edge も消す理由**: 孤立した `sourceHandle` を持つ Edge は React Flow が描画できず、Canvas から見えないまま Domain Model に残る。保存 JSON・Prompt・Review に紛れ込むため、Node 削除時に接続 Edge を消すのと同じ方針を採る。

### 1.3 Inspector の構成（R-1 / R-2 / R-4 / R-6）

| ファイル | 役割 |
|---|---|
| `presentation/Inspector.tsx` | 選択状態を購読し、空 / 複数 / Node / Edge を出し分ける |
| `presentation/NodeInspector.tsx` | 共通 4 項目 + 種別別フォーム + 秘密情報の注意書き |
| `presentation/EdgeInspector.tsx` | Label / Description |
| `presentation/NodeConfigForm.tsx` | 種別別フォームの組み立てと専用部品への振り分け |
| `presentation/nodeConfigFields.ts` | `NODE_CONFIG_KEYS` から作るフィールド定義表 |
| `presentation/ConditionBranchesField.tsx` | 分岐の追加 / 削除 / リネーム |
| `presentation/WaitDurationField.tsx` | duration + unit |
| `presentation/InspectorTextField.tsx` | ラベル付き入力の唯一のプリミティブ |
| `application/inspectorUseCases.ts` | store 更新の唯一の入口 |

**フォームはデータ駆動で組み立てる。** 11 種それぞれにフォームコンポーネントを書くと同じ JSX が 11 回並ぶため、`workflow` domain の `NODE_CONFIG_KEYS` を正とし、キー → 表示情報（ラベル / 入力形式 / 入力候補）の表から生成する。同名キーで候補が異なるもの（trigger と integration の `system` など）は種別ごとの上書き表で解決する。

入力候補は `<datalist>` で提示する。functional-design §3.3 の値は「等」付きの例示であり、`<select>` で選択肢を閉じると設計ツールとして不便なため。

単純なテキスト入力に収まらない Condition の `branches` と Wait の `duration` + `unit` のみ専用部品へ分ける。

### 1.4 入力の確定タイミング（R-3）

- 原則 `onChange` で即反映する（AC-011）
- **分岐名だけは blur / Enter で確定**する。分岐名は Edge の `sourceHandle` でもあり、1 打鍵ごとに確定させると入力途中の空文字・重複で Edge が壊れるため。Escape で破棄。Phase 8 の Undo 確定単位（§6）ともそのまま一致する
- 空文字は「未設定」として扱い、キーごと削除する。空文字で保存すると Flow Review の欠落判定（RV-W02〜W05）が「設定済み」と誤認するため。Name（`title`）のみ必須なので空でも保持する

### 1.5 複数選択時（functional-design に定義なし）

件数だけを表示し、編集フォームは出さない。一括編集は要求に無く、どの要素を編集しているか曖昧なまま値を書き換えるほうが危険なため。

### 1.6 Handle 再計算（実装中に判明した必須対応）

React Flow は `handleBounds` を type / handle position の変更とリサイズでしか再計算しない。Inspector から分岐を増減・改名すると Handle の id と位置が変わるため、canvas 側で `useUpdateNodeInternals` を明示的に呼ばないと Edge が旧位置のまま描画される。`WorkflowNodeCard` 内に閉じて対応する。

## 2. 影響範囲の分析 / `docs/` の更新方針

| 文書 | 更新要否 | 内容 |
|---|---|---|
| `docs/functional-design.md` | **更新する** | §2.4 の選択状態を「Phase 3 で移管済み」へ。controlled flow の要点に Handle 再計算（§1.6）を追加。§5.3 に分岐リネーム時の label 追随条件・削除時の Edge 削除・追加/削除の可否と最低数を追記。§6 に複数選択時の規則・Edge Inspector の分岐名表示・秘密情報の注意書きを追記 |
| `docs/repository-structure.md` | **更新する** | §2 の未作成リストから `inspector` を外す。§4.1 に「Node と Edge をまたぐ整合処理は workflow の domain へ」を追記。§5.4 と §6.1 の実績を更新 |
| `docs/development-roadmap.md` | **更新する** | 現在地に Phase 3 完了を反映 |
| その他 | 更新しない | 技術選択・要求・規約・用語に変更なし |

## 3. 後続フェーズへの申し送り

- store の `selectedEdgeId` は単数のため、複数 Edge 選択を表現できない。現状は「単一選択でない」として `null` を publish している
- Undo 履歴の確定単位は Phase 8。分岐名は既に blur 単位、その他は onChange 単位なので、zundo 導入時は debounce / partialize でまとめる想定
- Context Menu の Edit（§5.4）は Context Menu 本体とあわせて Phase 8
