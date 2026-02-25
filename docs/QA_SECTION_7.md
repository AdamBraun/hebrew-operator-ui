# QA Section 7 (Manual Verification)

## Scope
Verify graph-click token extraction, trace highlighting, and auto-scroll behavior on verse pages.

## Environment
- App: local dev/prod build of `hebrew-operator-ui`
- Browsers to verify:
  - Chrome
  - Firefox or Safari

## Checklist

### Genesis/001/001
- [ ] Click 5 different graph nodes; each click updates the highlighted token and highlights at least one trace line.
- [ ] Confirm each click auto-scrolls trace to the first matching highlighted line.
- [ ] Click graph background/canvas (non-node/edge); no highlight change should occur.
- [ ] Click `Clear highlight`; all line highlights are removed.

### Larger Graph Verse
- [ ] Navigate to a verse with a larger graph.
- [ ] Click several nodes and confirm auto-scroll still lands near the first highlighted line.
- [ ] Confirm no UI freezes or delayed interaction beyond expected render time.

### Stress
- [ ] Rapidly navigate next/prev verses and click nodes between transitions.
- [ ] Confirm no runtime crashes.
- [ ] Confirm browser console has no unhandled errors.

### Cross-Browser
- [ ] Repeat key flow in Chrome.
- [ ] Repeat key flow in Firefox/Safari.
- [ ] Confirm highlight + auto-scroll behavior is consistent.

## Known Limitations
- Matching is currently string-based against `trace.txt`. Some graph node tokens may not appear verbatim in trace text, so some clicks may produce no highlighted lines.
- Matching uses bounded normalization heuristics to reduce false negatives while avoiding broad over-highlighting.

## Pass Criteria
- No crashes.
- Click-to-highlight and scroll behavior is consistent for nodes with matching trace text.
- Limitations are documented.
