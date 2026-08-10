# Phase 25 · Plan 01 — Audit Summary

**Completed:** 2026-08-09
**Status:** ✅ Complete (3/3 tasks)
**Verdict:** the phase **still justifies itself**, but on a materially different
scope than it was written with. One criterion struck, one downgraded to a choice,
one confirmed and measured, one already implemented.

## Criterion-by-criterion

| # | As scoped 2026-08-02 | Verdict |
|---|---|---|
| 1 | Glyphs are blue `#3858e9` (~2.8:1); recolour to `#c3c4c7` | ❌ **STRUCK — already satisfied** |
| 2 | Focus ring `#2271b1` too dark; replace with a light one | ⚠️ **Downgraded — it passes** |
| 3 | Save-status reflows the rename field | ✅ **CONFIRMED — 20px, measured** |
| 4 | Rename commit feedback inadequate | ⚠️ **Mechanism already exists** |
| 5 | Zero regression | unchanged |

## Task 1 — contrast, recomputed against `main` @ `11fa8a0`

| Surface | Ratio | Bar | |
|---|---:|---:|---|
| Button glyph / label `#c3c4c7` | **9.11:1** | 3.0 / 4.5 | ✅ |
| Status text `#c3c4c7` | 9.11:1 | 4.5 | ✅ |
| Reset All `#f86368` | 5.28:1 | 4.5 | ✅ |
| Focus ring `#2271b1` | **3.07:1** | 3.0 | ✅ by 0.07 |
| The reported blue `#3858e9` | 2.83:1 | 3.0 | **not present in the CSS** |

**Criterion 1 is struck.** `.maestro-toolbar .button` sets `color: #c3c4c7` and
the glyphs inherit it via `currentColor`. `#3858e9` appears nowhere in
`maestro.css`. v1.4.0's a11y gate reached this independently and recorded it as
"does not reproduce, closed as stale" — the roadmap was simply never updated, so
it has read as open work since.

**Criterion 2 is a choice, not a fix.** 3.07:1 clears the 3:1 bar. The premise
"replacing the dark ring" is therefore false as written. The honest case for
changing it anyway: 0.07 above the floor survives no rendering variance,
antialiasing, or future palette nudge, and `#72aee6` would give **6.74:1** for a
one-token change. *Recommendation: change it, on robustness grounds, and say so —
not as a defect fix.*

Noted in passing, not scope: a disabled button's glyph blends to `#5f6367`
(2.62:1). WCAG 1.4.3 exempts inactive controls, so this is correct as-is.

## Task 2 — measured in a running editor

The status indicator was sampled 25× across a save cycle triggered by an
Enter-committed rename.

**Criterion 3 is real, and now has a number:**

| | idle | showing |
|---|---:|---:|
| `.maestro-status` width | **4px** | **24px** |
| rename field `x` | **230** | **210** |

State sequence: `hidden → Saving… → Saved → hidden`. The status grows 20px and
**the rename field shifts 20px horizontally as a direct consequence** — the
element's own width is stable at 180px, so this is pure displacement, exactly the
reported symptom. `flex-shrink: 0` prevents compression but `min-width: 0` means
no slot is reserved.

**Criterion 4's stated remedy is already implemented.** It proposed "the
save-status fires on rename commit"; it does — Enter produced `Saving… → Saved`.
What remains is softer than scoped: the confirmation is *transient*, auto-hiding
back to nothing, so a moment later there is no evidence the rename saved.

*Recommendation: fold criterion 4 into criterion 3 rather than treating it as
separate work.* Reserving the slot fixes the shift AND lets the confirmation
appear without the toolbar jumping — which is most of what "feels unsaved" was
describing. A persistent post-save marker is a further design decision that
should be taken deliberately, not smuggled in under a layout fix.

## Task 3 — adjacent a11y items triaged IN

Both M2 and M3 from `todos/pending/2026-08-02-a11y-locked-checkbox-refinements.md`
survive. **The v1.5.0 axe-core scanning does NOT overlap them** — axe finds
violations, and neither of these is one:

- **M2** — the derived-locked checkbox sets both native `disabled` and
  `aria-disabled` (redundant), and folds the lock reason into the accessible
  NAME rather than exposing it via `aria-describedby`. Worse, being natively
  disabled it is skipped in screen-reader *focus* mode, so a user tabbing the
  popover never hears the reason at all.
- **M3** — `placePopover()`'s outside-click handler calls `pop.remove()` with no
  focus restore, dropping focus to `<body>`. Escape *does* restore it, so this is
  an inconsistency within one component (WCAG 2.4.3). Confirmed by reading the
  handler. The v1.5.0 a11y spec asserted the Escape path but never the
  outside-click path — which is why it passed.

## Surviving scope for 25-02

1. **Reserve a fixed slot for `.maestro-status`** so it no longer displaces the
   rename field (measured: 20px). Absorbs criterion 4's residue.
2. **Widen the focus ring margin** to `#72aee6` — a robustness choice, recorded
   as such, not a compliance fix.
3. **M2** — drop the redundant `aria-disabled`, move the lock reason to
   `aria-describedby`, and make the reason reachable in SR focus mode.
4. **M3** — restore focus to the anchor on outside-click dismissal, matching Escape.
5. Zero-regression gate, including the multisite lane.

Two of five original criteria survive intact, plus two adjacent a11y items with a
clear cause — comfortably past the "recommend closing the phase" threshold 25-01
was given. The phase is worth executing; it is simply not the phase that was
written.

## For the record

This audit cost roughly one session and removed one criterion that was already
done, downgraded another that was based on a false premise, and turned a vague
third into a 20px measurement. Had 25-02 run against the original list, the first
task would have been recolouring a glyph that is already the right colour.
