---
created: 2026-08-01T00:00:00.000Z
title: Edit-mode toolbar icons fail WCAG non-text contrast (dark-blue on dark bar)
area: editor-ux
files:
  - assets/maestro.js (iconButton() helper + buildToolbar(); icon glyph colour)
  - assets/maestro.css (edit-mode bottom toolbar styling — .maestro-toolbar, icon buttons, .maestro-reset-all)
  - includes/class-assets.php (enqueue seam if a colour token needs localizing per admin scheme)
---

## RESOLVED — not reproducible (re-measured 2026-08-04, Phase 24 a11y gate)

The contrast failure described below **does not reproduce on `main`**. Measured
from the v1.4.0 release captures (`.wordpress-org/screenshot-1.png` icon-button
zone and `tests/e2e/screenshots/surfaces/toolbar-{fresh,modern,midnight}.png`),
sampling actual glyph pixels against the bar:

| Element | Measured | Ratio vs `#1d2327` | SC 1.4.11 (3:1) |
|---|---|---|---|
| Toolbar icon glyphs | `#c3c4c7` (195,196,199) | **9.11:1** | pass |
| "Reset All" | `#f86368` (248,99,104) | 5.28:1 | pass |

No `#3858e9` pixel appears anywhere in the toolbar on Default, Modern, or
Midnight. The icons inherit `.maestro-toolbar .button { color: #c3c4c7 }`
(`assets/maestro.css:133`) via `currentColor`, so they already match the labels
— which is exactly the fix this todo proposed.

The original 2026-08-01 reading was taken live in the *compat* wp-env with
WooCommerce active, and appears to have sampled a focus/active state or a WP
core accent rather than the resting glyph colour. **No code change needed.**

The "Related observation" below (rename commits only on Enter/blur, no
as-you-type preview) is unaffected and still open — it stays a Phase 25
candidate.

## Problem (original report — see RESOLVED above)

Measured live in the running editor (compat wp-env, WooCommerce active,
2026-08-01), the edit-mode bottom toolbar has a dark background
`#1d2327` (rgb 29,35,39), and the interface **icon glyphs render in blue
`#3858e9`** (rgb 56,88,233). Contrast of the blue icons against the bar is
**~2.8:1 — fails WCAG 2.2 SC 1.4.11 Non-text Contrast (3:1 minimum for UI
components/icons).**

Inconsistency: the button **labels** already use WP light gray `#c3c4c7`
(rgb 195,196,199), which is **~9.1:1** against the same bar. So the toolbar is
half light-gray (labels), half low-contrast blue (icons). User flagged the blue
as hard to see (2026-08-01) and suggested standard WP light gray for the icons.

The "Reset All" control is a lightened destructive red `#f86368`
(rgb 248,99,104) at **~5.3:1** — passes, and its colour is *semantic*
(destructive/irreversible action, the one place Phase 23 deliberately kept
colour). Leave it red; do NOT gray it out. (User read it as "orange" — it's a
lightened delete-red raised to read on the dark bar. Could nudge toward a truer
red if the orange cast is unwanted, but that's cosmetic, not a contrast fix.)

## Solution (proposed, not yet scoped)

Recolour the edit-mode toolbar **icon glyphs** from `#3858e9` to the WP light
gray `#c3c4c7` already used by the labels (→ ~9.1:1), unifying icon+label
treatment. Keep the destructive-red Reset All.

Guardrails / caveats:
- This is a **Phase 23 (Editor UX Polish) surface, shipped in v1.3.1** — not
  Phase 20 (COMPAT). Treat as its own small UX item, not a Phase 20 change.
- Phase 23 spot-checked toolbar colours across **Default / Modern / Midnight**
  admin colour schemes; the blue may be reading from a scheme accent. Any
  recolour must be re-verified across those three schemes.
- Re-run the accessibility check (WCAG 1.4.11) and the e2e colour assertions
  that Phase 23 established (23-05 reconciled selector/colour assertions).
- Consider whether a hover/focus-visible state on the icons also needs a
  contrast pass at the same time.

## Related observation (separate, not yet captured as its own todo)

Menu-label **renames commit only on Enter or blur**, then a 500ms debounced
autosave (`assets/maestro.js` rename keydown/blur → `commitRename()` →
`scheduleAutosave()` at :1202). There is no as-you-type live preview on the
rename field, unlike reorder/icon/visibility/reset which autosave immediately on
action. Behavior is correct and non-lossy (selecting another item blurs →
commits), but the lack of live feedback makes renames *feel* like they don't
save until Enter. If desired, a debounced as-you-type preview on the rename
field is a small editor-UX enhancement — also Phase 23 territory, not Phase 20.
