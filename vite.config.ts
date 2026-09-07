import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages のサブパス配信（AD-12 / docs/architecture.md §4）
  base: '/gooya-canvas/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // パスエイリアス（docs/repository-structure.md §4.4）
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Unit の重点対象は domain の純関数（docs/architecture.md §6.1）
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
