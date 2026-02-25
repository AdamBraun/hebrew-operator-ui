import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { graphviz, type GraphvizRenderer } from 'd3-graphviz'
import { extractGraphMatchTokensFromEvent, extractGraphTokenFromEvent } from '../lib/graphToken'
import './GraphViewer.css'

type GraphViewerProps = {
  dot: string
  onNodeClick?: (handleId: string) => void
  onTokenClick?: (token: string, matchTokens?: string[]) => void
  className?: string
}

type GraphTransform = {
  scale: number
  translateX: number
  translateY: number
}

type CanvasPoint = {
  x: number
  y: number
}

const INITIAL_TRANSFORM: GraphTransform = {
  scale: 1,
  translateX: 0,
  translateY: 0,
}
const RENDER_DEBOUNCE_MS = 150
const LARGE_DOT_WARNING_THRESHOLD = 500_000
const MIN_SCALE = 0.25
const MAX_SCALE = 8

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Unknown render failure'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function fallbackClientPointToCanvasPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): CanvasPoint {
  const rect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal

  if (rect.width > 0 && rect.height > 0 && viewBox.width > 0 && viewBox.height > 0) {
    const relativeX = (clientX - rect.left) / rect.width
    const relativeY = (clientY - rect.top) / rect.height
    return {
      x: viewBox.x + relativeX * viewBox.width,
      y: viewBox.y + relativeY * viewBox.height,
    }
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

function clientPointToCanvasPoint(svg: SVGSVGElement, clientX: number, clientY: number): CanvasPoint {
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return fallbackClientPointToCanvasPoint(svg, clientX, clientY)
  }

  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const canvasPoint = point.matrixTransform(ctm.inverse())

  return {
    x: canvasPoint.x,
    y: canvasPoint.y,
  }
}

function getCanvasCenter(svg: SVGSVGElement): CanvasPoint {
  const viewBox = svg.viewBox.baseVal
  if (viewBox.width > 0 && viewBox.height > 0) {
    return {
      x: viewBox.x + viewBox.width / 2,
      y: viewBox.y + viewBox.height / 2,
    }
  }

  return {
    x: svg.clientWidth / 2,
    y: svg.clientHeight / 2,
  }
}

function ensureViewportGroup(svg: SVGSVGElement): SVGGElement {
  const existingViewport = svg.querySelector(':scope > g.graph-viewer-viewport')
  if (existingViewport instanceof SVGGElement) {
    return existingViewport
  }

  const viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  viewport.classList.add('graph-viewer-viewport')
  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild)
  }
  svg.appendChild(viewport)

  return viewport
}

function applyTransform(viewport: SVGGElement, transform: GraphTransform) {
  viewport.setAttribute(
    'transform',
    `translate(${transform.translateX} ${transform.translateY}) scale(${transform.scale})`
  )
}

function computeFitTransform(svg: SVGSVGElement, viewport: SVGGElement): GraphTransform {
  const currentTransform = viewport.getAttribute('transform')
  viewport.removeAttribute('transform')
  const graphBounds = viewport.getBBox()
  if (currentTransform) {
    viewport.setAttribute('transform', currentTransform)
  }

  const viewBox = svg.viewBox.baseVal
  const canvasWidth = viewBox && viewBox.width > 0 ? viewBox.width : svg.clientWidth
  const canvasHeight = viewBox && viewBox.height > 0 ? viewBox.height : svg.clientHeight

  if (
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    graphBounds.width <= 0 ||
    graphBounds.height <= 0
  ) {
    return INITIAL_TRANSFORM
  }

  const padding = 0
  const scaleX = (canvasWidth - padding * 2) / graphBounds.width
  const scaleY = (canvasHeight - padding * 2) / graphBounds.height
  const fittedScale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, MAX_SCALE)
  const scale = fittedScale > 0.98 && fittedScale < 1 ? 1 : fittedScale
  const graphCenterX = graphBounds.x + graphBounds.width / 2
  const graphCenterY = graphBounds.y + graphBounds.height / 2

  return {
    scale,
    translateX: canvasWidth / 2 - graphCenterX * scale,
    translateY: canvasHeight / 2 - graphCenterY * scale,
  }
}

function bindDelegatedGraphClickHandler(
  container: HTMLDivElement,
  onNodeClickRef: MutableRefObject<GraphViewerProps['onNodeClick']>,
  onTokenClickRef: MutableRefObject<GraphViewerProps['onTokenClick']>
): () => void {
  function onContainerClick(event: MouseEvent) {
    const tokenResult = extractGraphTokenFromEvent(event)
    if (!tokenResult) {
      return
    }
    const matchTokens = extractGraphMatchTokensFromEvent(event)
    onNodeClickRef.current?.(tokenResult.token)
    onTokenClickRef.current?.(
      tokenResult.token,
      matchTokens.length > 0 ? matchTokens : [tokenResult.token]
    )
  }

  container.addEventListener('click', onContainerClick)
  return () => {
    container.removeEventListener('click', onContainerClick)
  }
}

function bindPanZoomHandlers(
  container: HTMLDivElement,
  transformRef: MutableRefObject<GraphTransform>,
  svgRef: MutableRefObject<SVGSVGElement | null>,
  viewportRef: MutableRefObject<SVGGElement | null>
): (() => void) | null {
  const svg = container.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) {
    return null
  }
  const svgElement = svg

  svgElement.setAttribute('width', '100%')
  svgElement.setAttribute('height', '100%')
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svgElement.style.display = 'block'
  svgElement.style.width = '100%'
  svgElement.style.height = '100%'
  svgElement.style.maxWidth = '100%'
  svgElement.style.maxHeight = '100%'
  svgElement.style.overflow = 'hidden'

  const viewport = ensureViewportGroup(svgElement)
  svgRef.current = svgElement
  viewportRef.current = viewport
  applyTransform(viewport, transformRef.current)

  svgElement.style.touchAction = 'none'
  svgElement.style.cursor = 'grab'

  let dragPointerId: number | null = null
  let lastPanPoint: CanvasPoint | null = null
  let lastCursorPoint: CanvasPoint | null = null

  function onWheel(event: WheelEvent) {
    event.preventDefault()

    const hasReliableClientPoint = !(event.ctrlKey && event.clientX === 0 && event.clientY === 0)
    const interactionPoint = hasReliableClientPoint
      ? clientPointToCanvasPoint(svgElement, event.clientX, event.clientY)
      : lastCursorPoint ?? getCanvasCenter(svgElement)
    if (hasReliableClientPoint) {
      lastCursorPoint = interactionPoint
    }

    const current = transformRef.current
    const nextScale = clamp(current.scale * Math.exp(-event.deltaY * 0.002), MIN_SCALE, MAX_SCALE)
    if (nextScale === current.scale) {
      return
    }

    const graphX = (interactionPoint.x - current.translateX) / current.scale
    const graphY = (interactionPoint.y - current.translateY) / current.scale
    transformRef.current = {
      scale: nextScale,
      translateX: interactionPoint.x - graphX * nextScale,
      translateY: interactionPoint.y - graphY * nextScale,
    }
    applyTransform(viewport, transformRef.current)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return
    }

    dragPointerId = event.pointerId
    lastPanPoint = clientPointToCanvasPoint(svgElement, event.clientX, event.clientY)
    lastCursorPoint = lastPanPoint
    svgElement.setPointerCapture(event.pointerId)
    svgElement.style.cursor = 'grabbing'
  }

  function onPointerMove(event: PointerEvent) {
    lastCursorPoint = clientPointToCanvasPoint(svgElement, event.clientX, event.clientY)

    if (dragPointerId !== event.pointerId) {
      return
    }

    const currentPanPoint = lastCursorPoint
    const previousPanPoint = lastPanPoint
    if (!previousPanPoint) {
      lastPanPoint = currentPanPoint
      return
    }

    const deltaX = currentPanPoint.x - previousPanPoint.x
    const deltaY = currentPanPoint.y - previousPanPoint.y
    lastPanPoint = currentPanPoint

    transformRef.current = {
      ...transformRef.current,
      translateX: transformRef.current.translateX + deltaX,
      translateY: transformRef.current.translateY + deltaY,
    }
    applyTransform(viewport, transformRef.current)
  }

  function finishDrag(event: PointerEvent) {
    if (dragPointerId !== event.pointerId) {
      return
    }

    dragPointerId = null
    lastPanPoint = null
    svgElement.style.cursor = 'grab'
    if (svgElement.hasPointerCapture(event.pointerId)) {
      svgElement.releasePointerCapture(event.pointerId)
    }
  }

  svgElement.addEventListener('wheel', onWheel, { passive: false })
  svgElement.addEventListener('pointerdown', onPointerDown)
  svgElement.addEventListener('pointermove', onPointerMove)
  svgElement.addEventListener('pointerup', finishDrag)
  svgElement.addEventListener('pointercancel', finishDrag)

  return () => {
    svgElement.removeEventListener('wheel', onWheel)
    svgElement.removeEventListener('pointerdown', onPointerDown)
    svgElement.removeEventListener('pointermove', onPointerMove)
    svgElement.removeEventListener('pointerup', finishDrag)
    svgElement.removeEventListener('pointercancel', finishDrag)
    svgElement.style.cursor = ''
    svgElement.style.touchAction = ''
    svgElement.style.overflow = ''
    if (svgRef.current === svgElement) {
      svgRef.current = null
    }
    if (viewportRef.current === viewport) {
      viewportRef.current = null
    }
  }
}

function GraphViewer({ dot, onNodeClick, onTokenClick, className }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphvizRef = useRef<GraphvizRenderer | null>(null)
  const panZoomCleanupRef = useRef<(() => void) | null>(null)
  const clickCleanupRef = useRef<(() => void) | null>(null)
  const renderSeqRef = useRef(0)
  const transformRef = useRef<GraphTransform>(INITIAL_TRANSFORM)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const viewportRef = useRef<SVGGElement | null>(null)
  const onNodeClickRef = useRef<GraphViewerProps['onNodeClick']>(onNodeClick)
  const onTokenClickRef = useRef<GraphViewerProps['onTokenClick']>(onTokenClick)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [showRawDot, setShowRawDot] = useState(false)
  const hasDot = useMemo(() => dot.trim().length > 0, [dot])
  const showLargeDotWarning = useMemo(
    () => dot.length > LARGE_DOT_WARNING_THRESHOLD,
    [dot]
  )

  onNodeClickRef.current = onNodeClick
  onTokenClickRef.current = onTokenClick

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    clickCleanupRef.current = bindDelegatedGraphClickHandler(
      container,
      onNodeClickRef,
      onTokenClickRef
    )
    return () => {
      clickCleanupRef.current?.()
      clickCleanupRef.current = null
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    panZoomCleanupRef.current?.()
    panZoomCleanupRef.current = null
    svgRef.current = null
    viewportRef.current = null

    if (!hasDot) {
      container.innerHTML = ''
      setIsRendering(false)
      setRenderError(null)
      setShowRawDot(false)
      return
    }

    transformRef.current = INITIAL_TRANSFORM
    setRenderError(null)
    setShowRawDot(false)
    container.innerHTML = ''
    if (!graphvizRef.current) {
      graphvizRef.current = graphviz(container, { useWorker: false }).zoom(false)
    }

    const renderSeq = renderSeqRef.current + 1
    renderSeqRef.current = renderSeq
    setIsRendering(true)

    const renderer = graphvizRef.current
    renderer.on('end.graph-viewer', () => {
      if (renderSeqRef.current !== renderSeq) {
        return
      }

      const currentContainer = containerRef.current
      if (currentContainer) {
        panZoomCleanupRef.current = bindPanZoomHandlers(
          currentContainer,
          transformRef,
          svgRef,
          viewportRef
        )
      }
      setIsRendering(false)
    })
    renderer.onerror((error) => {
      if (renderSeqRef.current === renderSeq) {
        setIsRendering(false)
        setRenderError(toErrorMessage(error))
      }
    })

    const debounceTimer = window.setTimeout(() => {
      if (renderSeqRef.current !== renderSeq) {
        return
      }

      try {
        renderer.renderDot(dot)
      } catch (error) {
        if (renderSeqRef.current === renderSeq) {
          setIsRendering(false)
          setRenderError(toErrorMessage(error))
        }
      }
    }, RENDER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(debounceTimer)
      renderSeqRef.current += 1
      renderer.on('end.graph-viewer', null)
      renderer.onerror(null)
    }
  }, [dot, hasDot])

  useEffect(() => {
    return () => {
      renderSeqRef.current += 1
      clickCleanupRef.current?.()
      panZoomCleanupRef.current?.()
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      graphvizRef.current?.destroy?.()
    }
  }, [])

  function resetView() {
    transformRef.current = INITIAL_TRANSFORM
    const viewport = viewportRef.current
    if (viewport) {
      applyTransform(viewport, transformRef.current)
    }
  }

  function fitToScreen() {
    const svg = svgRef.current
    const viewport = viewportRef.current
    if (!svg || !viewport) {
      return
    }

    transformRef.current = computeFitTransform(svg, viewport)
    applyTransform(viewport, transformRef.current)
  }

  return (
    <div className={['graph-viewer', className].filter(Boolean).join(' ')}>
      <div className="graph-viewer__toolbar">
        <button type="button" onClick={resetView} disabled={!hasDot || isRendering}>
          Reset view
        </button>
        <button type="button" onClick={fitToScreen} disabled={!hasDot || isRendering}>
          Fit to screen
        </button>
      </div>

      {!hasDot ? <p className="graph-viewer__notice">No graph data available.</p> : null}
      {hasDot && showLargeDotWarning ? (
        <p className="graph-viewer__notice">Large graph; rendering may be slow.</p>
      ) : null}
      {hasDot && renderError ? (
        <div role="alert" className="graph-viewer__error">
          <p>Failed to render graph</p>
          <button type="button" onClick={() => setShowRawDot((open) => !open)}>
            {showRawDot ? 'Hide raw DOT' : 'Show raw DOT'}
          </button>
          {showRawDot ? <pre className="graph-viewer__dot">{dot}</pre> : null}
        </div>
      ) : null}

      <div className="graph-viewer__canvas-wrap">
        <div ref={containerRef} className="graph-viewer__canvas" aria-busy={isRendering} />
        {hasDot && isRendering ? <div className="graph-viewer__overlay">Rendering...</div> : null}
      </div>
    </div>
  )
}

export default GraphViewer
