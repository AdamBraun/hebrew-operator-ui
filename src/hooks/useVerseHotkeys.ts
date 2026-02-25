import { useEffect } from 'react'

type UseVerseHotkeysArgs = {
  onPrev: (() => void) | null
  onNext: (() => void) | null
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'select' || tag === 'textarea'
}

export function useVerseHotkeys({ onPrev, onNext }: UseVerseHotkeysArgs): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (event.key === 'j' || event.key === 'ArrowLeft') {
        if (!onPrev) {
          return
        }
        event.preventDefault()
        onPrev()
        return
      }

      if (event.key === 'k' || event.key === 'ArrowRight') {
        if (!onNext) {
          return
        }
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onPrev, onNext])
}
