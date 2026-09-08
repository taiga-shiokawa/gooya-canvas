// inspector モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使う presentation のみを出す。
// 編集ユースケースは自モジュールの presentation からしか呼ばないため公開しない。
export { Inspector } from './presentation/Inspector'
