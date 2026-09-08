import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { projectUseCases } from './app/ports'
import './index.css'

// 初回起動時（store が空）はサンプルを読み込んだ状態で開始する（FR-015 / §7.6）。
// render 前に済ませるので、Canvas の初期 fitView がサンプル全体に掛かる。
projectUseCases.loadSampleProjectIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
