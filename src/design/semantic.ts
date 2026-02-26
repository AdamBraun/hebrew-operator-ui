import { SEMANTIC_TOKEN_CSS_VARS, type SemanticToken } from './semantic-tokens'

export type ThemeName = 'light' | 'dark'
export type SkinName = 'cool' | 'parchment'
export type CssVarRef = `var(--${string})`

export const THEME_NAMES: readonly ThemeName[] = ['light', 'dark'] as const
export const SKIN_NAMES: readonly SkinName[] = ['cool', 'parchment'] as const
export const DEFAULT_THEME: ThemeName = 'dark'
export const DEFAULT_SKIN: SkinName = 'cool'

export function normalizeThemeName(value: string | null | undefined): ThemeName | undefined {
  if (!value) {
    return undefined
  }
  return THEME_NAMES.includes(value as ThemeName) ? (value as ThemeName) : undefined
}

export function normalizeSkinName(value: string | null | undefined): SkinName | undefined {
  if (!value) {
    return undefined
  }
  return SKIN_NAMES.includes(value as SkinName) ? (value as SkinName) : undefined
}

export function getVar(token: SemanticToken): CssVarRef {
  return `var(${SEMANTIC_TOKEN_CSS_VARS[token]})`
}

export function setTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
}

export function setSkin(skin: SkinName): void {
  document.documentElement.dataset.skin = skin
}

export function getTheme(): ThemeName | undefined {
  return normalizeThemeName(document.documentElement.dataset.theme)
}

export function getSkin(): SkinName | undefined {
  return normalizeSkinName(document.documentElement.dataset.skin)
}
