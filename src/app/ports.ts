import {
  createBrowserProjectFilePort,
  createProjectUseCases,
  type ProjectUseCases,
} from '@/modules/project'

// composition root の配線（docs/repository-structure.md §5.3、AD-10）。
// ポート具象を生成して application service へ束ねるのはここだけの特権であり、
// DI コンテナは導入しない。非決定的な値（現在時刻・ID）もここで注入する。

export const projectUseCases: ProjectUseCases = createProjectUseCases({
  filePort: createBrowserProjectFilePort(),
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
})
