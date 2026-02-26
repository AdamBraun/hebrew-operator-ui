# A11Y Pasuk Header Checklist

Accessibility and i18n checklist for `PasukHeader`.

## Semantics

- [x] Word chips are interactive buttons.
- [x] Word chips expose `aria-pressed` for selected state.
- [x] Seam markers expose `aria-label` with boundary meaning.
- [x] Each focused chip references its seam marker via `aria-describedby` so SR users hear seam meaning.

## Keyboard

- [x] Tab navigation reaches every chip.
- [x] Enter/Space activate selection.
- [x] RTL-aware arrow navigation:
  - `ArrowLeft` selects next word index
  - `ArrowRight` selects previous word index
- [x] `Escape` clears selection.

## Focus + Selection Visibility

- [x] Focus ring is visible and high-contrast in both themes.
- [x] Selected state uses more than color:
  - thicker/double border
  - stronger weight treatment
  - `aria-pressed` semantic state

## Seam Marker Announcements

Expected speech pattern in screen readers:

- chip focus: `Word 4: אֵת, toggle button, pressed/not pressed`
- described seam: `Boundary after word: glue` (or cut/hard/maqqef)

Inspect mode seam tooltip should include additional metadata when available:

- seam kind
- rank
- trope name

## Contrast Checks

Run in both light and dark themes:

1. Verify focus outline remains clearly visible on chip backgrounds.
2. Verify selected chip border state is visible without relying only on hue.
3. Verify seam glyphs remain legible against header surfaces.
4. Validate text/chrome against project thresholds from `docs/ACCESSIBILITY_RULES.md`:
   - primary text >= `7:1`
   - UI controls/chrome >= `4.5:1`

## RTL + Browser Matrix

Manual checks required (RTL behavior differs by engine):

- [ ] Chrome (macOS): horizontal scroll direction and arrow-key behavior.
- [ ] Safari (macOS): horizontal scroll direction and arrow-key behavior.

Verify:

1. No chip wrapping on narrow viewports.
2. Selected word scrolls into view.
3. Index badges remain logically placed in RTL.
4. Mixed RTL/LTR text (`#index`, debug numbers) remains stable.

