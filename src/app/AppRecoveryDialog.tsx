import { ProjectDialog, useRecoveryPrompt } from '@/modules/project'
import { recoveryUseCases } from './ports'

// 起動時の復旧ダイアログ（docs/functional-design.md §7.5 / §4.4）。
// 復旧データの有無は src/main.tsx の起動時処理が判定済みで、ここはその結果を
// 受け取って表示するだけ。マウント後に出すので、Canvas は背後に描画される。
export function AppRecoveryDialog() {
  const dialog = useRecoveryPrompt(recoveryUseCases)

  return <ProjectDialog state={dialog} />
}
