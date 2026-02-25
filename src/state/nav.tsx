import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCorpusIndex } from '../lib'
import { buildNavModel, type NavModel } from '../lib/navModel'

type NavState = {
  nav: NavModel | null
  loading: boolean
  error: string | null
}

const NavContext = createContext<NavState>({
  nav: null,
  loading: true,
  error: null,
})

type NavProviderProps = {
  children: ReactNode
}

export function NavProvider({ children }: NavProviderProps) {
  const [nav, setNav] = useState<NavModel | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false

    async function loadNav() {
      try {
        const indexJson = await fetchCorpusIndex()
        const model = buildNavModel(indexJson)

        if (canceled) {
          return
        }

        setNav(model)
        setError(null)
      } catch (loadError: unknown) {
        if (canceled) {
          return
        }

        const message =
          loadError instanceof Error ? loadError.message : 'Failed to load navigation'
        setError(message)
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void loadNav()

    return () => {
      canceled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      nav,
      loading,
      error,
    }),
    [nav, loading, error]
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNavState(): NavState {
  return useContext(NavContext)
}
