import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { graphviz, type GraphvizRenderer } from 'd3-graphviz'

type GraphViewerProps = {
  dot: string
  onNodeClick?: (nodeIdOrLabel: string) => void
  onEdgeClick?: (edgeIdOrLabel: string) => void
  className?: string
}

type GraphTransform = {
  scale: number
  translateX: number
  translateY: number
}

const INITIAL_TRANSFORM: GraphTransform = {
  scale: 1,
  translateX: 0,
  translateY: 0,
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Unknown render failure'
}

function getGraphIdentifier(element: Element): string {
  const title = element.querySelector('title')?.textContent?.trim()
  if (title) {
    return title
  }

  const textLabel = Array.from(element.querySelectorAll('text'))
    .map((textNode) => textNode.textContent?.trim() ?? '')
    .filter((chunk) => chunk.length > 0)
    .join(' ')
    .trim()
  if (textLabel) {
    return textLabel
  }

  const id = element.getAttribute('id')?.trim()
  return id && id.length > 0 ? id : 'unknown'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function ensureViewportGroup(svg: SVGSVGElement): SVGGElement {
  const existingViewport = svg.querySelector(':scope > g.graph-viewer-viewport')
  if (existingViewport instanceof SVGGElement) {
    return existingViewport
  }

  const directChildren = Array.from(svg.children)
  if (directChildren.length === 1 && directChildren[0] instanceof SVGGElement) {
    directChildren[0].classList.add('graph-viewer-viewport')
    return directChildren[0]
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

function bindDelegatedGraphClickHandler(
  container: HTMLDivElement,
  onNodeClickRef: MutableRefObject<GraphViewerProps['onNodeClick']>,
  onEdgeClickRef: MutableRefObject<GraphViewerProps['onEdgeClick']>
): () => void {
  function onContainerClick(event: MouseEvent) {
    const clickedElement = event.target
    if (!(clickedElement instanceof Element)) {
      return
    }

    const nodeGroup = clickedElement.closest('.node')
    if (nodeGroup && container.contains(nodeGroup)) {
      onNodeClickRef.current?.(getGraphIdentifier(nodeGroup))
      return
    }

    const edgeGroup = clickedElement.closest('.edge')
    if (edgeGroup && container.contains(edgeGroup)) {
      onEdgeClickRef.current?.(getGraphIdentifier(edgeGroup))
    }
  }

  container.addEventListener('click', onContainerClick)
  return () => {
    container.removeEventListener('click', onContainerClick)
  }
}

function bindPanZoomHandlers(
  container: HTMLDivElement,
  transformRef: MutableRefObject<GraphTransform>
): (() => void) | null {
  const svg = container.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) {
    return null
  }
  const svgElement = svg

  const viewport = ensureViewportGroup(svgElement)
  applyTransform(viewport, transformRef.current)

  svgElement.style.touchAction = 'none'
  svgElement.style.cursor = 'grab'

  let dragPointerId: number | null = null
  let lastX = 0
  let lastY = 0

  function onWheel(event: WheelEvent) {
    event.preventDefault()

    const rect = svgElement.getBoundingClientRect()
    const pointX = event.clientX - rect.left
    const pointY = event.clientY - rect.top

    const current = transformRef.current
    const nextScale = clamp(current.scale * Math.exp(-event.deltaY * 0.002), 0.25, 8)
    if (nextScale === current.scale) {
      return
    }

    const graphX = (pointX - current.translateX) / current.scale
    const graphY = (pointY - current.translateY) / current.scale
    transformRef.current = {
      scale: nextScale,
      translateX: pointX - graphX * nextScale,
      translateY: pointY - graphY * nextScale,
    }
    applyTransform(viewport, transformRef.current)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return
    }

    dragPointerId = event.pointerId
    lastX = event.clientX
    lastY = event.clientY
    svgElement.setPointerCapture(event.pointerId)
    svgElement.style.cursor = 'grabbing'
  }

  function onPointerMove(event: PointerEvent) {
    if (dragPointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - lastX
    const deltaY = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY

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
  }
}

function GraphViewer({ dot, onNodeClick, onEdgeClick, className }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphvizRef = useRef<GraphvizRenderer | null>(null)
  const panZoomCleanupRef = useRef<(() => void) | null>(null)
  const clickCleanupRef = useRef<(() => void) | null>(null)
  const renderSeqRef = useRef(0)
  const transformRef = useRef<GraphTransform>(INITIAL_TRANSFORM)
  const onNodeClickRef = useRef<GraphViewerProps['onNodeClick']>(onNodeClick)
  const onEdgeClickRef = useRef<GraphViewerProps['onEdgeClick']>(onEdgeClick)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [showRawDot, setShowRawDot] = useState(false)
  const hasDot = useMemo(() => dot.trim().length > 0, [dot])

  onNodeClickRef.current = onNodeClick
  onEdgeClickRef.current = onEdgeClick

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    panZoomCleanupRef.current?.()
    panZoomCleanupRef.current = null
    clickCleanupRef.current?.()
    clickCleanupRef.current = null

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
        clickCleanupRef.current = bindDelegatedGraphClickHandler(
          currentContainer,
          onNodeClickRef,
          onEdgeClickRef
        )
        panZoomCleanupRef.current = bindPanZoomHandlers(currentContainer, transformRef)
      }
      setIsRendering(false)
    })
    renderer.onerror((error) => {
      if (renderSeqRef.current === renderSeq) {
        setIsRendering(false)
        setRenderError(toErrorMessage(error))
      }
    })

    try {
      renderer.renderDot(dot)
    } catch (error) {
      if (renderSeqRef.current === renderSeq) {
        setIsRendering(false)
        setRenderError(toErrorMessage(error))
      }
    }

    return () => {
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

  return (
    <div className={className}>
      {!hasDot ? <p>No graph data available.</p> : null}
      {hasDot && isRendering ? <p>Rendering graph...</p> : null}
      {hasDot && renderError ? (
        <div role="alert">
          <p>Failed to render graph</p>
          <button type="button" onClick={() => setShowRawDot((open) => !open)}>
            {showRawDot ? 'Hide raw DOT' : 'Show raw DOT'}
          </button>
          {showRawDot ? <pre>{dot}</pre> : null}
        </div>
      ) : null}
      <div ref={containerRef} aria-busy={isRendering} />
    </div>
  )
}

export default GraphViewer
