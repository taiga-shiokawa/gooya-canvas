import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { startupUseCases } from './app/ports'
import './index.css'

// 起動時処理（§7.5 / §7.6）: 復旧データが無ければサンプルを読み込み（FR-015）、
// dirty の間だけ localStorage へ自動保存する購読を開始する（NFR-006）。
// render 前に済ませるので、Canvas の初期 fitView がサンプル全体に掛かる。
// 復旧データがある場合はサンプルを読み込まず、復旧ダイアログ（AppRecoveryDialog）が
// Restore / Discard を尋ねる。
startupUseCases.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
