// review モジュールの公開 API（docs/repository-structure.md §5.4）。
// composition root（src/app/）が組み立てに使うものだけを出す。他モジュールは import しない。
// Review 結果の型と store 経由の受け渡しは shared が所有する。
export {
  createReviewUseCases,
  type ReviewUseCases,
} from './application/reviewUseCases'
export { ReviewPanel } from './presentation/ReviewPanel'
