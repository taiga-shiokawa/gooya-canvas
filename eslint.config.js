import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { defineConfig, globalIgnores } from 'eslint/config'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// 依存方向の担保。制約 #1〜#5 の正は docs/repository-structure.md §5.1。
// 相対パスの違反は import-x/no-restricted-paths（zones）、`@/` エイリアス経由の
// 違反は no-restricted-imports（patterns）で検出する。
const MODULES = [
  'workflow',
  'canvas',
  'inspector',
  'project',
  'export',
  'prompt',
  'review',
  'shared',
]

/** 他モジュールから import してよいのは workflow / shared の公開 API のみ（#4） */
const CROSS_MODULE_EXCEPTIONS = ['workflow/index.ts', 'shared/index.ts']

/** モジュール間で import してはいけない 6 モジュール（composition root 専用） */
const FEATURE_MODULES = MODULES.filter(
  (m) => m !== 'workflow' && m !== 'shared',
).map((m) => `@/modules/${m}`)

const restrictedPathZones = [
  // #1 domain 最内層
  // グロブを含む target / from は末尾 `/**` が無いとファイルパスに一致しない
  {
    target: './src/modules/*/domain/**',
    from: [
      './src/modules/*/application/**',
      './src/modules/*/infrastructure/**',
      './src/modules/*/presentation/**',
    ],
    message:
      'domain は最内層です。application / infrastructure / presentation を import できません（repository-structure §5.1 #1）',
  },
  // #2 application の DIP
  {
    target: './src/modules/*/application/**',
    from: [
      './src/modules/*/infrastructure/**',
      './src/modules/*/presentation/**',
    ],
    message:
      'application は infrastructure / presentation を import できません。ports の interface に依存してください（repository-structure §5.1 #2）',
  },
  // #3 逆流禁止（infrastructure → presentation）
  {
    target: './src/modules/*/infrastructure/**',
    from: './src/modules/*/presentation/**',
    message:
      'infrastructure は presentation を import できません（repository-structure §5.1 #3）',
  },
  // #4 モジュール間境界
  ...MODULES.map((module) => ({
    target: `./src/modules/${module}`,
    from: './src/modules',
    except: [module, ...CROSS_MODULE_EXCEPTIONS],
    message:
      'モジュール間の import は @/modules/workflow / @/modules/shared の公開 API 経由に限ります（repository-structure §5.1 #4）',
  })),
]

/** #4 をエイリアス経由の import specifier でも検出する */
const crossModulePatterns = [
  {
    group: ['@/modules/*/*', '@/modules/*/*/**'],
    message:
      'モジュール内部への深い import は禁止です。@/modules/<module> の公開 API を使ってください（repository-structure §4.4）',
  },
  {
    group: FEATURE_MODULES,
    message:
      'モジュール間の連携は workflow の Domain Model と shared の store 経由に限ります（repository-structure §5.4）',
  },
]

/** #5 React Flow の封じ込め */
const reactFlowPath = {
  name: '@xyflow/react',
  message:
    '@xyflow/react は canvas モジュール内に封じ込めます（repository-structure §5.1 #5）',
}

const reactPathsForDomain = [
  reactFlowPath,
  {
    name: 'react',
    message:
      'domain は純 TypeScript です。React を import できません（repository-structure §5.1 #1）',
  },
  {
    name: 'react-dom',
    message:
      'domain は純 TypeScript です。React DOM を import できません（repository-structure §5.1 #1）',
  },
]

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // 依存方向（zones）。target が src/modules/** のみなので composition root
  // （src/main.tsx / src/app/**）は対象外 = 特権を持つ（repository-structure §5.3）
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: {
      // 拡張子省略の import と `@/` エイリアスを解決できないと zones が発火しない
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
    },
    rules: {
      'import-x/no-restricted-paths': ['error', { zones: restrictedPathZones }],
    },
  },
  // no-restricted-imports は後続ブロックが前のブロックを上書きするため、
  // 各ファイルがちょうど 1 ブロックに一致するよう ignores で排他にする。
  {
    files: ['src/modules/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: reactPathsForDomain, patterns: crossModulePatterns },
      ],
    },
  },
  {
    files: ['src/modules/canvas/**/*.{ts,tsx}'],
    ignores: ['src/modules/canvas/domain/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: crossModulePatterns }],
    },
  },
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    ignores: ['src/modules/*/domain/**', 'src/modules/canvas/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [reactFlowPath], patterns: crossModulePatterns },
      ],
    },
  },
  {
    files: ['src/main.tsx', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [reactFlowPath] }],
    },
  },
  prettierConfig,
])
