import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { graphviz, type GraphvizRenderer } from 'd3-graphviz'
import { select } from 'd3-selection'

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

function getGraphLabel(element: Element): string {
  const title = select(element).select('title').text().trim()
  if (title) {
    return title
  }

  const id = element.getAttribute('id')
  return id?.trim() ?? ''
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

function bindGraphClickHandlers(
  container: HTMLDivElement,
  onNodeClickRef: MutableRefObject<GraphViewerProps['onNodeClick']>,
  onEdgeClickRef: MutableRefObject<GraphViewerProps['onEdgeClick']>
) {
  const nodes = select(container).selectAll<SVGGElement, unknown>('g.node')
  const edges = select(container).selectAll<SVGGElement, unknown>('g.edge')

  nodes.on('click', function (this: SVGGElement) {
    onNodeClickRef.current?.(getGraphLabel(this))
  })

  edges.on('click', function (this: SVGGElement) {
    onEdgeClickRef.current?.(getGraphLabel(this))
  })
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
  const renderTokenRef = useRef(0)
  const transformRef = useRef<GraphTransform>(INITIAL_TRANSFORM)
  const onNodeClickRef = useRef<GraphViewerProps['onNodeClick']>(onNodeClick)
  const onEdgeClickRef = useRef<GraphViewerProps['onEdgeClick']>(onEdgeClick)
  const [isRendering, setIsRendering] = useState(false)
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

    if (!hasDot) {
      container.innerHTML = ''
      setIsRendering(false)
      return
    }

    transformRef.current = INITIAL_TRANSFORM
    container.innerHTML = ''
    if (!graphvizRef.current) {
      graphvizRef.current = graphviz(container, { useWorker: false }).zoom(false)
    }

    const token = renderTokenRef.current + 1
    renderTokenRef.current = token
    setIsRendering(true)

    const renderer = graphvizRef.current
    renderer.on('end.graph-viewer', () => {
      if (renderTokenRef.current !== token) {
        return
      }

      const currentContainer = containerRef.current
      if (currentContainer) {
        bindGraphClickHandlers(currentContainer, onNodeClickRef, onEdgeClickRef)
        panZoomCleanupRef.current = bindPanZoomHandlers(currentContainer, transformRef)
      }
      setIsRendering(false)
    })
    renderer.onerror(() => {
      if (renderTokenRef.current === token) {
        setIsRendering(false)
      }
    })
    renderer.renderDot(dot)

    return () => {
      renderer.on('end.graph-viewer', null)
      renderer.onerror(null)
    }
  }, [dot, hasDot])

  useEffect(() => {
    return () => {
      panZoomCleanupRef.current?.()
      graphvizRef.current?.destroy?.()
    }
  }, [])

  return (
    <div className={className}>
      {!hasDot ? <p>No graph data available.</p> : null}
      {hasDot && isRendering ? <p>Rendering graph...</p> : null}
      <div ref={containerRef} aria-busy={isRendering} />
    </div>
  )
}

export default GraphViewer
