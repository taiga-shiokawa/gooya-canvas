# Phase 2 — Custom Nodes 設計

要求は `requirements.md`。永続文書の所有は `docs/functional-design.md`（振る舞い）/ `docs/repository-structure.md`（配置）。

## 1. 実装アプローチ

### 1.1 ノード種別カタログを workflow domain へ移す（R-1）

現在 `canvas/presentation/nodeKindLabels.ts` が持っている表示名テーブルは、functional-design §2.1 上
「ノード種別カタログ」として **workflow ドメインの所有物**である。Inspector（Phase 3）と Review（Phase 6）も同じ
カタログを参照するため、canvas に置いたままだとモジュール間境界（依存方向 #4）を破ることになる。

`workflow/domain/nodeCatalog.ts` を新設し、次を持たせる:

| エクスポート | 役割 |
|---|---|
| `nodeKindLabel(kind)` | 表示名（`'dataSource'` → `'Data Source'`） |
| `NODE_CONFIG_KEYS` | 種別ごとの推奨 config キー一覧（functional-design §3.3）。Inspector のフォーム定義と Review の欠落判定が共有する |
| `createDefaultNodeData(kind)` | 追加時の `data`（既定 title + 初期 config） |
| `conditionBranches(node)` | `config.branches` を安全に読む。未設定・不正型なら既定 `["Yes","No"]` |

`canvas/presentation/nodeKindLabels.ts` は削除し、参照元は `@/modules/workflow` 経由へ切り替える。

**初期 config は「構造的な既定値があるものだけ」置く**（`condition.branches` と `wait.unit`）。
推奨キーを空文字で埋めない。空文字は「未設定」と区別できず、Review の欠落判定（RV-W02〜W05）を
複雑にするうえ、保存 JSON が無意味な空キーで膨らむため。推奨キーの一覧は `NODE_CONFIG_KEYS` が持つ。

### 1.2 接続ルール（R-3）

`workflow/domain/connectionRules.ts` に純関数として置く。

```ts
type ConnectionCheck = { allowed: true } | { allowed: false; reason: string }
canConnect(input: { source?: WorkflowNode; target?: WorkflowNode }): ConnectionCheck
```

判定順（functional-design §5.2）: 端点欠落 → self-loop → Note を端点に含む → Trigger への incoming →
End からの outgoing → 許可。**Cycle・多重辺は禁止しない。**

`reason` を返すのは、Phase 3 以降で不許可理由を UI へ出せるようにするため。Phase 2 では
`connectNodes` が握りつぶす（無言で作成しない）。

### 1.3 Custom Node の描画（R-2 / R-4）

`canvas/presentation/nodes/` に置く。11 種それぞれにコンポーネントを作らず、**1 つの汎用カード**を
11 種に登録する。種別差は「アイコン・アクセント色・Handle 構成」の 3 点だけであり、
コンポーネントを 11 個に割ると同じ JSX を 11 回書くことになるため。

| ファイル | 役割 |
|---|---|
| `nodes/WorkflowNodeCard.tsx` | 汎用カード。icon / node type / title / short description と Handle を描く |
| `nodes/nodeKindIcon.tsx` | 種別ごとの Bundled Icon（インライン SVG、24x24、`currentColor`） |
| `nodes/nodeKindAccent.ts` | 種別ごとの Tailwind アクセントクラス |
| `nodes/workflowNodeTypes.ts` | React Flow へ渡す `nodeTypes`（11 種 → `WorkflowNodeCard`） |

Handle 構成（functional-design §5.2 の incoming / outgoing 表から機械的に決まる）:

| 種別 | Target Handle（上） | Source Handle（下） |
|---|---|---|
| trigger | なし | 1 個（`undefined` id） |
| end | 1 個 | なし |
| note | なし | なし |
| condition | 1 個 | `branches` の数（id = 分岐名） |
| その他 7 種 | 1 個 | 1 個 |

レイアウトは縦方向（Target = Top / Source = Bottom）とする。functional-design §7.6 のサンプルフローが
上から下へ書かれているため。Condition の複数 Handle は下辺を等分した位置（`left: (i+1)/(n+1)`）に置く。

`nodeTypes` は **モジュールスコープの定数**として定義する。React Flow は `nodeTypes` の参照が変わるたびに
全ノードを再マウントするため、コンポーネント内で作ってはならない。

### 1.4 mapper の変更（NFR-010 を守る）

`toReactFlow` の**内部だけ**を差し替える。6 関数の構成・シグネチャは変えない（repository-structure §4.3）。

- `type: node.type` を渡して `nodeTypes` の登録と対応づける
- `data` を `WorkflowNodeCardData`（`kind` / `title` / `description` / `branches`）へ広げる
- `mergeReactFlowNodes` の変更検出を新しい `data` の全フィールドへ拡張する。**ここを漏らすと
  Inspector の編集が Canvas へ反映されない**（AC-011 に直結）ため、回帰テストを置く

`branches` は `readonly string[]` を毎回生成すると参照が変わり、merge が常に「変化あり」と判定して
既存ノードの `measured` を落としてしまう。`mergeReactFlowNodes` では **配列の中身で比較**する。

### 1.5 Domain 型の完成（R-5）

`workflow/domain/types.ts` へ functional-design §3.2 の残りを追加する:
`WorkflowMetadata` / `WorkflowViewport` / `WorkflowPromptSettings` / `PromptTarget` / `PROMPT_TARGETS` /
`WorkflowProject` / `SCHEMA_VERSION` / `DEFAULT_VIEWPORT`。

Zod スキーマ（`schemas.ts`）と migration レジストリ（`migrations.ts`）は **Phase 4 で追加**する。
本作業は型のみを置き、実行時 validation は導入しない。

### 1.6 store の slice 拡張（R-6）

```ts
type WorkflowStoreState = {
  // Domain Model（保存対象）
  metadata, viewport, nodes, edges, promptSettings
  // UI 状態（保存対象外）
  isDirty, selectedNodeIds, selectedEdgeId
  // 更新
  setNodes, setEdges, setMetadata, setViewport, setPromptSettings,
  setSelection, replaceProject, markSaved
}
```

**dirty の立て方**: `setNodes` / `setEdges` / `setMetadata` / `setPromptSettings` が `isDirty: true` を立てる。
`setViewport` と `setSelection` は立てない。`replaceProject`（New / Open / 復旧）と `markSaved`（保存成功）が倒す。

viewport を dirty 対象から外すのは、Pan / Zoom のたびに未保存インジケータが点いてしまい実用に耐えないため
（functional-design §11 も Viewport を Undo 履歴の対象外としており、方針が一貫する）。この判断は
永続文書に無い決定のため、後述 §4 のとおり `docs/functional-design.md` へ追記する。

選択状態は functional-design §2.4 の「Phase 3 で shared の store へ移す」に従い、ID のみを保持する。
移送自体（`WorkflowCanvas` からの publish）は Phase 3 のスコープであり、本作業では slice を置くだけとする。

### 1.7 App シェルの分割（R-7）

`src/app/` を 3 ファイルへ分ける。

| ファイル | 役割 | 埋めるフェーズ |
|---|---|---|
| `App.tsx` | 4 スロットのレイアウト組み立て + Inspector ペイン | Phase 3 |
| `AppHeader.tsx` | ブランド + File メニュー + Main Actions | Phase 4（File）/ Phase 5（Prompt） |
| `AppStatusBar.tsx` | dirty インジケータ + Review サマリ | Phase 4（dirty）/ Phase 6（Review） |

## 2. 変更するコンポーネント

| ファイル | 変更 |
|---|---|
| `workflow/domain/types.ts` | 型追加（§1.5） |
| `workflow/domain/nodeCatalog.ts` | 新規（§1.1） |
| `workflow/domain/connectionRules.ts` | 新規（§1.2） |
| `workflow/index.ts` | 上記の公開 |
| `shared/application/workflowStore.ts` | slice 拡張（§1.6） |
| `canvas/application/canvasUseCases.ts` | `createDefaultNodeData` / `canConnect` の適用、Condition Edge の label 初期化 |
| `canvas/presentation/reactFlowMapper.ts` | `toReactFlow` / `mergeReactFlowNodes` の変更（§1.4） |
| `canvas/presentation/nodes/*` | 新規 4 ファイル（§1.3） |
| `canvas/presentation/WorkflowCanvas.tsx` | `nodeTypes` の登録 |
| `canvas/presentation/NodePalette.tsx` | `nodeKindLabel` の import 元変更、アイコン表示 |
| `canvas/presentation/nodeKindLabels.ts` | **削除**（workflow domain へ移設） |
| `src/app/*` | シェル分割（§1.7） |

## 3. データ構造の変更

`WorkflowNode` / `WorkflowEdge` の構造は**変更しない**。追加するのは上位構造（`WorkflowProject` とその構成要素）
のみであり、Phase 1 で保存されたデータは存在しないため migration は不要。

React Flow 側の `node.data` は Phase 1 の `{ label }` から `{ kind, title, description, branches }` へ変わるが、
これは canvas モジュール内に閉じた表現であり外部契約ではない。

## 4. 影響範囲の分析 / `docs/` の更新方針

| 文書 | 更新要否 | 内容 |
|---|---|---|
| `docs/functional-design.md` | **更新する** | §2.4 の store 記述へ dirty 判定規則（§1.6）を追記し、`isDirty` の対象を確定させる。§5.2 の note 接続可否「（要確認）」を「接続不可」で確定させる |
| `docs/repository-structure.md` | **更新する** | §2 の「実在するディレクトリ」記述を更新（`canvas/presentation/nodes/` の追加）。§2.1 の表で `workflow` domain がノード種別カタログ・接続ルールを持つことは既に記載済みのため変更不要 |
| `docs/development-roadmap.md` | **更新する** | §1 の「現在地」を Phase 2 完了へ更新 |
| `docs/architecture.md` | 更新しない | 技術選択・依存方向に変更なし |
| `docs/product-requirements.md` | 更新しない | FR / AC の変更なし |
| `docs/development-guidelines.md` | 更新しない | 規約に変更なし |
| `docs/glossary.md` | 更新しない | 用語の追加・変更なし |

## 5. 後続フェーズへの申し送り

- Phase 3: Condition の分岐名変更時、該当 Edge の `sourceHandle` / `label` を追随させること（functional-design §5.3）。
  分岐を減らした場合に取り残される Edge の扱いも Phase 3 で決める
- Phase 4: `SCHEMA_VERSION` / `WorkflowProject` は本作業で確定済み。Zod スキーマと migration レジストリを追加する
- Phase 5: `generatePrompt` の入力は `WorkflowProject`。`conditionBranches()` を分岐記述の生成に再利用できる
