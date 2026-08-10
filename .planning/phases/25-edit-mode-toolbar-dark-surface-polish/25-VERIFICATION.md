# Phase 25 — Verification

**Verified:** 2026-08-09
**Verified by:** human, manually, in a running editor
**Status:** ✅ COMPLETE (2/2 plans)

## Checkpoint outcome

Confirmed manually: the changes and the resulting UX behaviour were exercised in
a live editor and accepted.

Worth stating precisely, because this project has one checkpoint recorded the
other way: **this was an actual human pass**, unlike 21-05 Task 5, which was
accepted on automated evidence and is recorded as such in the v1.5.0 milestone.
The distinction is the whole reason both are written down.

## What shipped

| # | Change | Evidence |
|---|---|---|
| 1 | Status slot reserved (`min-width: 24px`) | Rename field held ONE x position across idle → saving → saved; previously shifted 20px (x: 230 → 210) on every save |
| 2 | Focus ring `#2271b1` → `#72aee6` | 3.07:1 → **6.74:1** on `#1d2327` |
| 3 | M2 — locked checkbox `aria-disabled` + `aria-describedby` | Reachable in focus mode; reason announced as a description; toggle refused |
| 4 | M3 — outside-click restores focus to the anchor | Matches the Escape handler |

Six e2e assertions in
[`tests/e2e/specs/toolbar-dark-surface.spec.ts`](../../../tests/e2e/specs/toolbar-dark-surface.spec.ts),
each written to fail against the pre-fix code.

## What 25-01's audit struck, and why that mattered

The phase was scoped 2026-08-02 from a defect report. The audit measured every
criterion against the current code first:

- **Criterion 1 (glyph contrast) — STRUCK.** Already satisfied: `#c3c4c7` at
  **9.11:1**. The reported blue `#3858e9` (2.83:1) was not in the CSS at all.
  v1.4.0's a11y gate had reached the same conclusion independently and recorded
  it as "does not reproduce"; the roadmap was never updated to match.
- **Criterion 2 — DOWNGRADED** from a fix to a choice. The old ring **passed**
  its 3:1 bar, by 0.07.
- **Criterion 4 (rename feedback) — ABSORBED.** Its stated remedy already
  existed; the real residue was that confirmation arrived by shoving the toolbar
  sideways, which criterion 3's fix resolves.

Had the phase been implemented as written, it would have opened by "fixing" a
colour that was already correct. That is the concrete cost of a stale planning
entry, and it is why the backlog reconciliation (2026-08-09) cites this phase.

## Deliberately NOT done

**A persistent saved-state marker.** After a save the indicator still clears
after 2s, so seconds later there is no on-screen answer to "did that save?".
Reserving the slot fixed the *jarring* half; persistence is a design change and
was kept out rather than smuggled in under a layout fix. Logged with its two
caveats — the collision with the per-row "modified" dot, and the live-region
double-announcement risk — in
`todos/pending/2026-08-09-persistent-saved-state-indicator.md`.

## Gate

| Check | Result |
|---|---|
| `composer test:unit` | ✅ 167/167 |
| `npm run test:php` | ✅ 126/126 single-site |
| `npm run test:php:multisite` | ✅ 126/126 |
| `npm run test:js` | ✅ 83/83 |
| `npm run test:e2e` | ✅ 52 passed, 0 failed |
| WPCS / PHPStan / doc-links | ✅ clean / 0 / clean |

`cascade-hide.spec.ts` passes **unmodified** with the M2 change in place — the
one older spec most likely to have been disturbed, since M2 alters the component
it asserts against.

Two full-suite runs were needed: the first showed two unrelated failures that
moved and vanished on the second — the known load-flakiness pattern, not a
regression.

## Still open on these surfaces

- No human **screen-reader** pass. axe is clean and the structural assertions
  prove what AT can *reach*, which is not what it *says*.
- The persistent saved-marker question above.
