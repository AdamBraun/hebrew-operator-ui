type ScopeSpanTooltipProps = {
  text: string
  visible: boolean
  copyValue?: string
  onCopy?: (value: string) => void
}

function ScopeSpanTooltip({ text, visible, copyValue, onCopy }: ScopeSpanTooltipProps) {
  if (!visible) {
    return null
  }

  return (
    <div className="scope-span-tooltip">
      <span className="scope-span-tooltip__text" role="status" aria-live="polite">
        {text}
      </span>
      {copyValue && onCopy ? (
        <button
          type="button"
          className="scope-span-tooltip__copy"
          onClick={() => onCopy(copyValue)}
        >
          Copy span ref
        </button>
      ) : null}
    </div>
  )
}

export default ScopeSpanTooltip
