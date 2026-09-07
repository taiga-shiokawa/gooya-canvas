import { defineConfig, devices } from '@playwright/test'

// E2E は主要導線を検証する（docs/architecture.md §6.2）。
// テスト本体は Phase 5 で e2e/ に追加する（docs/repository-structure.md §6.1）。
const baseURL = 'http://localhost:4173/gooya-canvas/'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
