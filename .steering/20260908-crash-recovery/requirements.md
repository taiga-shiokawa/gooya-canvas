# Crash Recovery 要件（NFR-006）

対象: `docs/functional-design.md` §7.5（§2.3 / §4.4 / §7.1〜§7.3 / §7.6 と整合）

## 機能要件

| # | 要件 | 出典 |
|---|---|---|
| CR-1 | dirty 状態の間、Domain Model を debounce 付きで localStorage（`RecoveryStoragePort`）へ自動保存する | §7.5 |
| CR-2 | 起動時に復旧データが存在すればダイアログを表示し、Restore で store へ復元、Discard で削除する | §7.5 / §4.4 |
| CR-3 | 正式保存（§7.2）成功時と New / Open 確定時に復旧データを削除する | §7.2 / §7.5 |
| CR-4 | 復旧データがある場合はサンプルプロジェクトを読み込まない | §7.6 |
| CR-5 | `isDirty` が false の間は保存しない | §2.4 |

## 非機能要件

| # | 要件 | 出典 |
|---|---|---|
| CR-6 | 復旧データは **Zod validation を通してから** store へ入れる。壊れていたらアプリを壊さず静かに破棄する | NFR-005 / development-guidelines §2.5 |
| CR-7 | localStorage の例外（容量超過・参照不可）は infrastructure で吸収し、ポートの外へ漏らさない | development-guidelines §2.3 |
| CR-8 | localStorage を正式な保存先として扱わない（正式保存は JSON ファイル） | §7.5 |
| CR-9 | Workflow データを外部へ送信しない / 秘密情報を扱わない | NFR-001 / NFR-002 |

## 受け入れ確認（実機）

- 編集すると数秒後に localStorage へ入る / リロードで復旧ダイアログが出る / Restore で内容が戻る /
  Discard で消える / 正式保存で消える / 復旧データが無いときはサンプルが出る /
  localStorage を手で壊してもアプリが起動する / コンソールエラーが無い
- E2E の主要導線（`e2e/mainFlow.spec.ts`）に退行がない

## 未解決（要確認のまま残すもの）

- §7.5 の保存間隔「（要確認）」は本実装で **debounce 2 秒 / 上限 10 秒**として確定した（design.md 参照）。
  永続文書側への反映はメインブランチで行う。
