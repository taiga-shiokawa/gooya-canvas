import { WORKFLOW_NODE_KINDS, type WorkflowNodeKind } from '@/modules/workflow'
import type { DragEvent } from 'react'
import { NODE_KIND_DND_MIME } from './canvasDnd'
import { nodeKindLabel } from './nodeKindLabels'

export function NodePalette() {
  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    kind: WorkflowNodeKind,
  ) => {
    event.dataTransfer.setData(NODE_KIND_DND_MIME, kind)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Nodes
      </h2>
      {WORKFLOW_NODE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          draggable
          onDragStart={(event) => handleDragStart(event, kind)}
          className="cursor-grab rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-slate-400 hover:bg-slate-100 active:cursor-grabbing"
        >
          {nodeKindLabel(kind)}
        </button>
      ))}
    </aside>
  )
}
