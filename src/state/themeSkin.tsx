import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_SKIN,
  DEFAULT_THEME,
  normalizeSkinName,
  normalizeThemeName,
  setSkin as applySkinAttribute,
  setTheme as applyThemeAttribute,
  type SkinName,
  type ThemeName,
} from '../design/semantic'

const THEME_STORAGE_KEY = 'hoc-ui.theme'
const SKIN_STORAGE_KEY = 'hoc-ui.skin'

type ThemeSkinState = {
  theme: ThemeName
  skin: SkinName
  setTheme: (theme: ThemeName) => void
  toggleTheme: () => void
  setSkin: (skin: SkinName) => void
}

type ThemeSkinProviderProps = {
  children: ReactNode
}

type ThemeSkinPreferences = {
  theme: ThemeName
  skin: SkinName
}

const ThemeSkinContext = createContext<ThemeSkinState | undefined>(undefined)

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function readStorageValue(key: string): string | null {
  if (!canUseDom()) {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorageValue(key: string, value: string): void {
  if (!canUseDom()) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore persistence failures; UI should still function.
  }
}

function detectSystemTheme(): ThemeName {
  if (!canUseDom() || typeof window.matchMedia !== 'function') {
    return DEFAULT_THEME
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyRootAttributes(theme: ThemeName, skin: SkinName): void {
  if (!canUseDom()) {
    return
  }

  applyThemeAttribute(theme)
  applySkinAttribute(skin)
}

function resolveInitialPreferences(): ThemeSkinPreferences {
  const storedTheme = normalizeThemeName(readStorageValue(THEME_STORAGE_KEY))
  const storedSkin = normalizeSkinName(readStorageValue(SKIN_STORAGE_KEY))

  const theme = storedTheme ?? detectSystemTheme()
  const skin = storedSkin ?? DEFAULT_SKIN

  if (!storedTheme) {
    writeStorageValue(THEME_STORAGE_KEY, theme)
  }
  if (!storedSkin) {
    writeStorageValue(SKIN_STORAGE_KEY, skin)
  }

  applyRootAttributes(theme, skin)

  return { theme, skin }
}

const INITIAL_PREFERENCES = resolveInitialPreferences()

export function ThemeSkinProvider({ children }: ThemeSkinProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(INITIAL_PREFERENCES.theme)
  const [skin, setSkinState] = useState<SkinName>(INITIAL_PREFERENCES.skin)

  useLayoutEffect(() => {
    applyRootAttributes(theme, skin)
    writeStorageValue(THEME_STORAGE_KEY, theme)
    writeStorageValue(SKIN_STORAGE_KEY, skin)
  }, [theme, skin])

  const setTheme = useCallback((nextTheme: ThemeName) => {
    setThemeState(nextTheme)
  }, [])

  const setSkin = useCallback((nextSkin: SkinName) => {
    setSkinState(nextSkin)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      skin,
      setTheme,
      toggleTheme,
      setSkin,
    }),
    [theme, skin, setTheme, toggleTheme, setSkin]
  )

  return <ThemeSkinContext.Provider value={value}>{children}</ThemeSkinContext.Provider>
}

export function useThemeSkin(): ThemeSkinState {
  const context = useContext(ThemeSkinContext)
  if (!context) {
    throw new Error('useThemeSkin must be used within ThemeSkinProvider')
  }
  return context
}
