import type { WorkflowNodeKind } from '@/modules/workflow'
import type { ReactNode } from 'react'

// Bundled Icons（NFR-004）。外部フォント・アイコンライブラリを読み込まず、
// インライン SVG として同梱する。色は currentColor で親から受け取る。

const ICON_PATHS: Record<WorkflowNodeKind, ReactNode> = {
  trigger: <path d="M13 2 5 13h5l-1 9 8-12h-5z" />,
  dataSource: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" />
    </>
  ),
  action: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m10 8.5 5.5 3.5L10 15.5z" />
    </>
  ),
  condition: <path d="M12 3 21 12l-9 9-9-9z" />,
  wait: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  humanTask: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  notification: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.2 19.5a2.2 2.2 0 0 0 3.6 0" />
    </>
  ),
  ai: (
    <>
      <path d="m11 3 1.7 4.3L17 9l-4.3 1.7L11 15l-1.7-4.3L5 9l4.3-1.7z" />
      <path d="m18 14 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z" />
    </>
  ),
  integration: (
    <>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.5 2.5a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  end: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </>
  ),
  note: (
    <>
      <path d="M5 4h9l5 5v11H5z" />
      <path d="M14 4v5h5" />
    </>
  ),
}

type NodeKindIconProps = {
  kind: WorkflowNodeKind
  className?: string
}

export function NodeKindIcon({ kind, className }: NodeKindIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[kind]}
    </svg>
  )
}
