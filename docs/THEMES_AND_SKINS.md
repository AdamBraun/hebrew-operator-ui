# Themes and Skins

This project exposes appearance controls through HTML data attributes:

- `data-theme="dark|light"`
- `data-skin="cool|parchment"`

These attributes are applied on `<html>` and drive CSS variables globally.

## Defaults and first visit behavior

- Default skin: `cool`
- Default theme fallback: `dark`
- On first visit (no stored theme), OS theme preference is used (`prefers-color-scheme`).
- After first resolution, theme and skin are stored in `localStorage`, so future visits use saved values.

## Persistence keys

- Theme key: `hoc-ui.theme`
- Skin key: `hoc-ui.skin`

## Runtime architecture

- Provider: `/Users/adambraun/projects/hebrew-operator-ui/src/state/themeSkin.tsx`
  - Sets and persists preferences
  - Applies `data-theme` and `data-skin` on `<html>`
- Settings UI: `/Users/adambraun/projects/hebrew-operator-ui/src/components/ThemeSkinSettings.tsx`
  - Theme toggle (`Dark`/`Light`)
  - Skin dropdown (`Cool`/`Parchment`)

## Developer API

- Typed helper module: `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic.ts`
  - `getVar("seam.glue")` -> `var(--seam-glue)`
  - `setTheme("dark" | "light")`
  - `setSkin("cool" | "parchment")`
  - `getTheme()`, `getSkin()`

## UX guarantees

- Preferences survive refresh and deep links because attributes are global and persisted.
- Theme and skin changes are instant because CSS variables update at the root level.
- No component-specific rerender wiring is required for visual updates.
