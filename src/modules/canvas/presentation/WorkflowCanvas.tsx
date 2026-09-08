import { useWorkflowStore } from '@/modules/shared'
import { isWorkflowNodeKind, type WorkflowViewport } from '@/modules/workflow'
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowState,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { flushSync } from 'react-dom'
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  pasteClipboard,
  requestInspectorFocus,
} from '../application/canvasEditUseCases'
import {
  addNode,
  connectNodes,
  isConnectionAllowed,
  moveNodes,
  removeEdges,
  removeNodes,
  selectElements,
  subscribeNodeFocusRequests,
  updateViewport,
} from '../application/canvasUseCases'
import { NODE_KIND_DND_MIME } from './canvasDnd'
import {
  CanvasContextMenu,
  type CanvasContextMenuTarget,
} from './CanvasContextMenu'
import { registerCanvasEditCommands } from './canvasEditCommands'
import { CanvasExportModeContext } from './canvasExportMode'
import {
  registerCanvasExportSource,
  type CanvasExportBounds,
} from './canvasExportSource'
import { inlineSvgStylesForExport } from './exportSvgStyles'
import { workflowNodeTypes } from './nodes/workflowNodeTypes'
import {
  fromReactFlowConnection,
  fromReactFlowIds,
  fromReactFlowPosition,
  fromReactFlowViewport,
  mergeReactFlowEdges,
  mergeReactFlowNodes,
  sameViewport,
  toReactFlow,
  toReactFlowViewport,
} from './reactFlowMapper'

/**
 * 全ノードの実寸が確定したか。
 *
 * `useNodesInitialized` は使えない。あれは handleBounds も条件に含むため、
 * Handle を 1 つも持たない Note（functional-design §5.2）があると永久に false になる。
 * 測定そのものは React Flow の内部ストアが持っているので、そこを直接見る。
 */
function selectAllNodesMeasured(state: ReactFlowState): boolean {
  if (state.nodeLookup.size === 0) return false
  for (const node of state.nodeLookup.values()) {
    if (!node.measured?.width) return false
  }
  return true
}

/** Review 結果クリックでの移動アニメーション時間（ms）。一瞬で飛ぶと位置関係を見失うため。 */
const FOCUS_DURATION_MS = 300

/**
 * 指定 ID だけを選択した状態にする。`mergeReactFlow*` と同じく、変化が無ければ
 * 同一参照を返して React Flow の描画用フィールドを壊さない（§2.4 の controlled flow）。
 */
function withSelection<T extends { id: string; selected?: boolean }>(
  items: T[],
  selectedIds: readonly string[],
): T[] {
  const selectedSet = new Set(selectedIds)
  let changed = false
  const next = items.map((item) => {
    const selected = selectedSet.has(item.id)
    if ((item.selected ?? false) === selected) return item
    changed = true
    return { ...item, selected }
  })
  return changed ? next : items
}

/** 全件を選択した状態にする（Ctrl+A / §5.5）。変化が無ければ同一参照を返す。 */
function withAllSelected<T extends { id: string; selected?: boolean }>(
  items: T[],
): T[] {
  let changed = false
  const next = items.map((item) => {
    if (item.selected === true) return item
    changed = true
    return { ...item, selected: true }
  })
  return changed ? next : items
}

/** Snap to Grid のグリッド幅（§5.1）。`<Background />` の既定 gap と同じ 20px に揃える。 */
const SNAP_GRID: [number, number] = [20, 20]

/** 描画フレームを待つときの打ち切り時間（ms）。 */
const FRAME_TIMEOUT_MS = 50

/**
 * 次の描画フレームまで待つ。DOM への反映が済んでから画像化させるために使う。
 *
 * タイマーでも切り上げるのは、**タブが非表示のあいだ requestAnimationFrame が発火しない**ため。
 * rAF だけで待つと、裏に回した状態で Export した場合に解決せず、Canvas が
 * Export 用表示のまま固まる。
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    requestAnimationFrame(finish)
    setTimeout(finish, FRAME_TIMEOUT_MS)
  })
}

/**
 * Export 用表示のあいだ、選択中 Edge の色を通常色へ戻す（AC-018 の Selection Border）。
 *
 * React Flow は選択中 Edge の stroke を CSS 変数 `--xy-edge-stroke-selected` で決める。
 * Tailwind の任意プロパティで変数を上書きすれば、コンポーネント個別の CSS ファイルを
 * 増やさずに済む（development-guidelines §4.1）。値は未選択時と同じ解決順にする。
 */
const EXPORT_VIEW_CLASS =
  '[--xy-edge-stroke-selected:var(--xy-edge-stroke,var(--xy-edge-stroke-default))]'

// controlled flow: Domain Model（store）を唯一の Source of Truth とする（NFR-010）。
// React Flow へ渡す配列はローカル state として保持し、Domain の変更をマージして
// 反映する。毎回作り直すと React Flow の描画用フィールド（measured / selected）が
// 失われるため（MiniMap が描画されない等）、既存要素の参照を維持する。
// 選択状態は Domain Model ではないので、この配列側だけに存在する。
function WorkflowCanvasInner() {
  const {
    screenToFlowPosition,
    setViewport,
    getViewport,
    fitView,
    getNode,
    getNodes,
    getNodesBounds,
    getZoom,
    setCenter,
  } = useReactFlow()

  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>(
    () => toReactFlow(useWorkflowStore.getState()).nodes,
  )
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>(
    () => toReactFlow(useWorkflowStore.getState()).edges,
  )

  // Canvas 自身が publish した viewport を覚えておき、購読側で自分の Pan / Zoom を
  // 折り返し適用しないようにする。ここと一致しない変更＝Open / New による復元。
  //
  // 初期値は null ではなく**マウント時の store の値**にする。null にすると、
  // マウント後の最初の store 変更（種類を問わない）が「復元すべき変更」と誤判定される。
  const publishedViewport = useRef<WorkflowViewport>(
    useWorkflowStore.getState().viewport,
  )

  // 起動時の自動 fit を 1 度だけ行うためのフラグ。マウント時に内容が無ければ
  // 何も合わせない（最初のノードを置いた瞬間に画面が跳ねるのを避ける）。
  const shouldFitOnMount = useRef(reactFlowNodes.length > 0)

  // Export 用表示（§8.3 / AC-018）。Handle・選択枠・MiniMap・Controls・Grid を落とす。
  // viewport には触れないので、onMoveEnd 経由で store が汚れることはない。
  const [exportMode, setExportMode] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Node / Edge の Context Menu（FR-004 / §5.4）。null の間は出さない。
  const [contextMenu, setContextMenu] =
    useState<CanvasContextMenuTarget | null>(null)
  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Domain store を外部システムとして購読し、変更をコールバックでマージする
  useEffect(
    () =>
      useWorkflowStore.subscribe((state) => {
        const graph = toReactFlow(state)
        setReactFlowNodes((previous) =>
          mergeReactFlowNodes(previous, graph.nodes),
        )
        setReactFlowEdges((previous) =>
          mergeReactFlowEdges(previous, graph.edges),
        )

        // プロジェクト読込後の画面復元（docs/functional-design.md §7.3）。
        // @xyflow/react は canvas モジュール専用なので project 側から fitView は呼べない。
        // 代わりに store の viewport を購読し、保存時の見え方をそのまま復元する。
        if (!sameViewport(publishedViewport.current, state.viewport)) {
          publishedViewport.current = state.viewport
          // 以降は store の viewport が正。起動時の自動 fit は打ち切る
          shouldFitOnMount.current = false
          setViewport(toReactFlowViewport(state.viewport))
        }
      }),
    [setViewport],
  )

  // `fitView` prop だけでは足りない。あれはノードの測定が終わる前に一度走るため、
  // 実測 0 の矩形へ合わせて最大倍率までズームインした状態で止まる
  // （サンプルを読み込んだ状態で起動する初回に顕在化する）。
  // かといって prop を外すと React Flow の初期化シーケンスごと止まり、
  // マウント時点のノードが visibility: hidden のまま表示されない。
  // そこで prop は残したまま、測定が揃った時点で 1 度だけ合わせ直す。
  const allNodesMeasured = useStore(selectAllNodesMeasured)

  useEffect(() => {
    if (!shouldFitOnMount.current || !allNodesMeasured) return
    shouldFitOnMount.current = false

    void fitView().then(() => {
      // 合わせた結果を store にも反映し、保存内容と画面を一致させる
      const next = fromReactFlowViewport(getViewport())
      publishedViewport.current = next
      updateViewport(next)
    })
  }, [allNodesMeasured, fitView, getViewport])

  // --- Export（Phase 7）への受け渡し（./canvasExportSource.ts の説明を参照） ---

  /**
   * 全 Node / Edge の Bounding Box（AC-019）。
   * Viewport の可視範囲ではないので、画面外のノードも必ず出力対象に入る。
   * Edge は Node 間に引かれるため Node の外接矩形で足りる（余白は export 側が足す）。
   */
  const getContentBounds = useCallback((): CanvasExportBounds | null => {
    const nodes = getNodes()
    if (nodes.length === 0) return null

    const bounds = getNodesBounds(nodes)
    if (!(bounds.width > 0) || !(bounds.height > 0)) return null

    // React Flow の Rect 型を canvas の外へ出さない（NFR-010）
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    }
  }, [getNodes, getNodesBounds])

  /**
   * 画像化対象。`.react-flow__viewport` が全 Node / Edge を含む要素であり、
   * MiniMap / Controls / Grid はその外側にあるため、この要素を撮るだけで
   * それらは写り込まない（AC-018）。
   */
  const getCaptureTarget = useCallback(
    () =>
      wrapperRef.current?.querySelector<HTMLElement>('.react-flow__viewport') ??
      null,
    [],
  )

  const beginExportView = useCallback(async () => {
    // 画像化は live DOM を読むので、切替を同期的に確定させてから 1 フレーム待つ
    flushSync(() => setExportMode(true))
    await nextFrame()

    // Edge の線とラベルを画像へ持ち越すための前処理（./exportSvgStyles.ts）。
    // 切替後の算出値を写す必要があるので、Export 用表示にしてから行う
    const restoreSvgStyles = inlineSvgStylesForExport(
      wrapperRef.current ?? document,
    )

    return () => {
      restoreSvgStyles()
      setExportMode(false)
    }
  }, [])

  useEffect(
    () =>
      registerCanvasExportSource({
        getContentBounds,
        getCaptureTarget,
        beginExportView,
      }),
    [beginExportView, getCaptureTarget, getContentBounds],
  )

  // Review Panel の問題クリック → 該当 Node を選択して Canvas 中央へ（FR-024 / §10.3）。
  // 要求は store 経由で届く。React Flow を触れるのは canvas だけなので、選択の反映
  // （描画用の selected）とセンタリングはここで行う。
  useEffect(
    () =>
      subscribeNodeFocusRequests((nodeId) => {
        setReactFlowNodes((previous) => withSelection(previous, [nodeId]))
        setReactFlowEdges((previous) => withSelection(previous, []))
        if (!getNode(nodeId)) return

        // 中心座標は getNodesBounds から取る。getNode が返すノードには実測サイズ
        // （measured）が付いておらず、自前で中心を計算するとノード半個ぶんずれる。
        // zoom は現在値のままにし、倍率を変えずに位置だけ合わせる。
        const bounds = getNodesBounds([nodeId])
        void setCenter(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
          { zoom: getZoom(), duration: FOCUS_DURATION_MS },
        )
      }),
    [getNode, getNodesBounds, getZoom, setCenter],
  )

  const handleMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    // Pan / Zoom の途中経過ではなく確定値だけを store へ送る。
    // onViewportChange だとフレームごとに store が更新され購読が回り続ける。
    const next = fromReactFlowViewport(viewport)
    publishedViewport.current = next
    updateViewport(next)
  }, [])

  const handleNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    // 選択・測定（dimensions）・削除の反映は React Flow の標準ヘルパに任せる。
    // dimensions を取りこぼすとノードに measured が付かず MiniMap が描画されない。
    setReactFlowNodes((previous) => applyNodeChanges(changes, previous))

    for (const change of changes) {
      // ドラッグ中（dragging: true）の位置は store へ送らない。毎フレーム送ると
      // Undo 履歴がドラッグ 1 回で大量に積まれる（§11 の「1 ドラッグ = 履歴 1 件」）。
      // 確定値は onNodeDragStop / onSelectionDragStop でまとめて 1 回だけ書き込む。
      if (change.type === 'position' && change.position && !change.dragging) {
        moveNodes([
          { id: change.id, position: fromReactFlowPosition(change.position) },
        ])
      }
      // 'remove' は onNodesDelete で store へ反映する
    }
  }, [])

  /**
   * ドラッグ終了時に位置を 1 回だけ store へ反映する（§11）。
   *
   * React Flow の内部ノードから読むのは、Node ドラッグ・Selection ドラッグ・複数選択の
   * まとめ移動を 1 か所で扱えるため。位置が変わっていなければ `moveNodes` が何もしないので、
   * 動かさずにクリックしただけのときは履歴も dirty も発生しない。
   */
  const commitDraggedPositions = useCallback(() => {
    moveNodes(
      getNodes().map((node) => ({
        id: node.id,
        position: fromReactFlowPosition(node.position),
      })),
    )
  }, [getNodes])

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setReactFlowEdges((previous) => applyEdgeChanges(changes, previous))
  }, [])

  const handleConnect = useCallback((connection: Connection) => {
    connectNodes(fromReactFlowConnection(connection))
  }, [])

  // ドラッグ中に不許可の接続先をハイライトさせない（FR-007）。
  // 実際の作成可否は connectNodes 側の canConnect が最終判定する。
  const handleIsValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target } = fromReactFlowConnection(connection)
      return isConnectionAllowed(source, target)
    },
    [],
  )

  // 選択状態は Inspector が参照するため store へ publish する（Phase 3 / §2.4）。
  // React Flow が保持する配列上の selected はそのまま描画用に残し、store には ID だけを送る。
  const handleSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      selectElements({
        nodeIds: fromReactFlowIds(nodes),
        edgeIds: fromReactFlowIds(edges),
      })
    },
    [],
  )

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    removeNodes(fromReactFlowIds(deleted))
  }, [])

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    removeEdges(fromReactFlowIds(deleted))
  }, [])

  // --- Edit メニュー / ショートカット / Context Menu からの編集操作（./canvasEditCommands.ts） ---

  /**
   * 複製・Paste で作られたノードを選択状態にする。store 側でも選択 ID を publish して
   * いるが、React Flow へ渡す配列の `selected` は Canvas だけが触れる（§2.4）。
   */
  const selectCreatedNodes = useCallback((nodeIds: readonly string[]) => {
    if (nodeIds.length === 0) return
    setReactFlowNodes((previous) => withSelection(previous, nodeIds))
    setReactFlowEdges((previous) => withSelection(previous, []))
  }, [])

  useEffect(
    () =>
      registerCanvasEditCommands({
        deleteSelection,
        duplicateSelection: () => selectCreatedNodes(duplicateSelection()),
        copySelection: () => {
          copySelection()
        },
        paste: () => selectCreatedNodes(pasteClipboard()),
        selectAll: () => {
          // 選択の store への publish は onSelectionChange 経由で行われる
          setReactFlowNodes(withAllSelected)
          setReactFlowEdges(withAllSelected)
        },
        editSelection: requestInspectorFocus,
      }),
    [selectCreatedNodes],
  )

  // --- Context Menu（FR-004 / §5.4） ---

  /** ラッパー左上を原点にした座標へ直す（メニューを absolute で置くため）。 */
  const toMenuPosition = useCallback((event: ReactMouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    }
  }, [])

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      // ブラウザ標準のメニューは出さない（自前メニューと二重になるため）
      event.preventDefault()
      // 右クリックした要素を選択してから開く。Inspector の表示対象と、
      // Duplicate / Delete の対象を一致させる。
      setReactFlowNodes((previous) => withSelection(previous, [node.id]))
      setReactFlowEdges((previous) => withSelection(previous, []))
      selectElements({ nodeIds: [node.id], edgeIds: [] })
      setContextMenu({ kind: 'node', ...toMenuPosition(event) })
    },
    [toMenuPosition],
  )

  const handleEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      event.preventDefault()
      setReactFlowNodes((previous) => withSelection(previous, []))
      setReactFlowEdges((previous) => withSelection(previous, [edge.id]))
      selectElements({ nodeIds: [], edgeIds: [edge.id] })
      setContextMenu({ kind: 'edge', ...toMenuPosition(event) })
    },
    [toMenuPosition],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const kind = event.dataTransfer.getData(NODE_KIND_DND_MIME)
      if (!isWorkflowNodeKind(kind)) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode({ kind, position: fromReactFlowPosition(position) })
    },
    [screenToFlowPosition],
  )

  return (
    <CanvasExportModeContext.Provider value={exportMode}>
      <div
        ref={wrapperRef}
        className={`relative h-full w-full ${exportMode ? EXPORT_VIEW_CLASS : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          nodeTypes={workflowNodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
          onMoveEnd={handleMoveEnd}
          isValidConnection={handleIsValidConnection}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          onNodeDragStop={commitDraggedPositions}
          onSelectionDragStop={commitDraggedPositions}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneClick={closeContextMenu}
          onPaneContextMenu={closeContextMenu}
          onMoveStart={closeContextMenu}
          snapToGrid
          snapGrid={SNAP_GRID}
          /* Delete キーは composition root の統一ハンドラが処理する（FR-006 / §5.5）。
             React Flow に任せると Node と Edge が別々の handler で削除されて Undo 履歴が
             2 件になり、入力欄フォーカス中の無効化判定も二重管理になるため無効にする。 */
          deleteKeyCode={null}
          fitView
        >
          {/* Grid / MiniMap / Controls は Export 用表示では外す（§8.3 / AC-018）。
              いずれも viewport 要素の外にあるため画像には元から入らないが、
              「Export 時に非表示にする」要求どおりに描画自体を止める。 */}
          {exportMode ? null : (
            <>
              <Background />
              <MiniMap />
              <Controls />
            </>
          )}
        </ReactFlow>

        {contextMenu && !exportMode ? (
          <CanvasContextMenu
            target={contextMenu}
            onEdit={requestInspectorFocus}
            onDuplicate={() => selectCreatedNodes(duplicateSelection())}
            onDelete={deleteSelection}
            onClose={closeContextMenu}
          />
        ) : null}
      </div>
    </CanvasExportModeContext.Provider>
  )
}

export function WorkflowCanvas() {
  // Provider を canvas モジュール内に閉じ、app 側が React Flow を意識しないようにする
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  )
}
