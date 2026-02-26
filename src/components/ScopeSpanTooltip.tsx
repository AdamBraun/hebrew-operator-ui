type ScopeSpanTooltipProps = {
  x: number
  text: string
  visible: boolean
}

function ScopeSpanTooltip({ x, text, visible }: ScopeSpanTooltipProps) {
  if (!visible) {
    return null
  }

  return (
    <div className="scope-span-tooltip" style={{ left: `${x}px` }} role="status" aria-live="polite">
      {text}
    </div>
  )
}

export default ScopeSpanTooltip
