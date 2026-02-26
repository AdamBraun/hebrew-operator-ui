import { useThemeSkin } from '../state/themeSkin'
import type { SkinName } from '../design/semantic'
import './ThemeSkinSettings.css'

const SKIN_OPTIONS: Array<{ value: SkinName; label: string }> = [
  { value: 'cool', label: 'Cool' },
  { value: 'parchment', label: 'Parchment' },
]

function ThemeSkinSettings() {
  const { theme, skin, toggleTheme, setSkin } = useThemeSkin()

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const themeLabel = theme === 'dark' ? 'Dark' : 'Light'

  return (
    <section aria-label="Appearance settings" className="theme-skin-settings">
      <h2 className="theme-skin-settings__title">Appearance</h2>

      <div className="theme-skin-settings__row">
        <span className="theme-skin-settings__label">Theme</span>
        <button
          type="button"
          className="theme-skin-settings__toggle"
          onClick={toggleTheme}
          aria-label={`Switch theme to ${nextTheme}`}
        >
          {themeLabel}
        </button>
      </div>

      <label className="theme-skin-settings__row theme-skin-settings__row--select">
        <span className="theme-skin-settings__label">Skin</span>
        <select
          className="theme-skin-settings__select"
          value={skin}
          onChange={(event) => setSkin(event.target.value as SkinName)}
          aria-label="Skin"
        >
          {SKIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

export default ThemeSkinSettings
