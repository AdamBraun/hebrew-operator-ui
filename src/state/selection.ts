import { useCallback, useState } from 'react'

export type WordSelectionState = {
  selectedWordIndex?: number
}

export function useWordSelectionState(initialSelectedWordIndex?: number) {
  const [state, setState] = useState<WordSelectionState>({
    selectedWordIndex: initialSelectedWordIndex,
  })

  const selectWord = useCallback((wordIndex: number) => {
    setState({ selectedWordIndex: wordIndex })
  }, [])

  const clearWordSelection = useCallback(() => {
    setState({ selectedWordIndex: undefined })
  }, [])

  return {
    selectedWordIndex: state.selectedWordIndex,
    selectWord,
    clearWordSelection,
  }
}

