import { useEffect, useMemo, useRef, useState } from 'react'
import { graphviz, type GraphvizRenderer } from 'd3-graphviz'
import { select } from 'd3-selection'

type GraphViewerProps = {
  dot: string
  onNodeClick?: (nodeIdOrLabel: string) => void
  onEdgeClick?: (edgeIdOrLabel: string) => void
  className?: string
}

function getGraphLabel(element: Element): string {
  const title = select(element).select('title').text().trim()
  if (title) {
    return title
  }

  const id = element.getAttribute('id')
  return id?.trim() ?? ''
}

function bindGraphClickHandlers(
  container: HTMLDivElement,
  onNodeClick?: (nodeIdOrLabel: string) => void,
  onEdgeClick?: (edgeIdOrLabel: string) => void
) {
  const nodes = select(container).selectAll<SVGGElement, unknown>('g.node')
  const edges = select(container).selectAll<SVGGElement, unknown>('g.edge')

  if (onNodeClick) {
    nodes.on('click', function (this: SVGGElement) {
      onNodeClick(getGraphLabel(this))
    })
  } else {
    nodes.on('click', null)
  }

  if (onEdgeClick) {
    edges.on('click', function (this: SVGGElement) {
      onEdgeClick(getGraphLabel(this))
    })
  } else {
    edges.on('click', null)
  }
}

function GraphViewer({ dot, onNodeClick, onEdgeClick, className }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphvizRef = useRef<GraphvizRenderer | null>(null)
  const renderTokenRef = useRef(0)
  const [isRendering, setIsRendering] = useState(false)
  const hasDot = useMemo(() => dot.trim().length > 0, [dot])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    if (!hasDot) {
      container.innerHTML = ''
      setIsRendering(false)
      return
    }

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
        bindGraphClickHandlers(currentContainer, onNodeClick, onEdgeClick)
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
  }, [dot, hasDot, onNodeClick, onEdgeClick])

  return (
    <div className={className}>
      {!hasDot ? <p>No graph data available.</p> : null}
      {hasDot && isRendering ? <p>Rendering graph...</p> : null}
      <div ref={containerRef} aria-busy={isRendering} />
    </div>
  )
}

export default GraphViewer
