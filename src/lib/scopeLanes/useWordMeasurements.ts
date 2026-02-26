import { useCallback, useEffect, useState, type RefObject } from 'react'
import { getWordRects, type WordRect } from '../../components/VerseLine'

type FontFaceSetWithEvents = FontFaceSet & {
  addEventListener?: (type: string, listener: EventListener) => void
  removeEventListener?: (type: string, listener: EventListener) => void
}

export function useWordMeasurements(
  containerRef: RefObject<HTMLElement | null>,
  wordSpanRefs?: Array<RefObject<HTMLElement | null>>
) {
  const [rects, setRects] = useState<WordRect[]>([])
  const [contentWidth, setContentWidth] = useState(1)

  const recalc = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      setRects([])
      setContentWidth(1)
      return
    }

    const spanNodes =
      wordSpanRefs && wordSpanRefs.length > 0
        ? wordSpanRefs
            .map((ref) => ref.current)
            .filter((node): node is HTMLElement => node instanceof HTMLElement)
        : [...container.querySelectorAll<HTMLElement>('[data-word-index]')]

    setRects(getWordRects(container, spanNodes))
    setContentWidth(Math.max(container.scrollWidth, 1))
  }, [containerRef, wordSpanRefs])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let animationFrame = 0

    const requestRecalc = () => {
      if (animationFrame !== 0) {
        return
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0
        recalc()
      })
    }

    recalc()

    const resizeObserver = new ResizeObserver(() => requestRecalc())
    resizeObserver.observe(container)
    container.addEventListener('scroll', requestRecalc, { passive: true })

    const fonts = (document as Document & { fonts?: FontFaceSetWithEvents }).fonts
    if (fonts?.ready) {
      void fonts.ready.then(() => requestRecalc()).catch(() => {
        // Ignore font subsystem errors and keep baseline measurements.
      })
    }

    const onFontsLoaded: EventListener = () => requestRecalc()
    fonts?.addEventListener?.('loadingdone', onFontsLoaded)

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('scroll', requestRecalc)
      fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [containerRef, recalc])

  return {
    rects,
    contentWidth,
    recalc,
  }
}

