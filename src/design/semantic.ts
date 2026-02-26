import { SEMANTIC_TOKEN_CSS_VARS, type SemanticToken } from './semantic-tokens'

export type ThemeName = 'light' | 'dark'
export type SkinName = 'cool' | 'parchment'
export type CssVarRef = `var(--${string})`

const THEME_NAMES: readonly ThemeName[] = ['light', 'dark'] as const
const SKIN_NAMES: readonly SkinName[] = ['cool', 'parchment'] as const

function parseThemeName(value: string | undefined): ThemeName | undefined {
  if (!value) {
    return undefined
  }
  return THEME_NAMES.includes(value as ThemeName) ? (value as ThemeName) : undefined
}

function parseSkinName(value: string | undefined): SkinName | undefined {
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
  return parseThemeName(document.documentElement.dataset.theme)
}

export function getSkin(): SkinName | undefined {
  return parseSkinName(document.documentElement.dataset.skin)
}
