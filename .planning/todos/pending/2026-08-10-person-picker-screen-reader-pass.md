---
created: 2026-08-10T00:00:00.000Z
title: Human screen-reader pass on the visibility popover and person picker
area: a11y
files:
  - assets/maestro.js (buildRoleGroup + the person picker — four similarly-named groups in one dialog)
  - tests/e2e/specs/person-picker-a11y.spec.ts (the axe coverage this does NOT replace)
  - .planning/phases/25-edit-mode-toolbar-dark-surface-polish/25-VERIFICATION.md (the human pass that closed the other half)
---

## Problem

**Nobody has driven the person picker in a browser with a screen reader on.**

This merges two items that were tracked separately across v1.5.0 and v1.5.1 and
have turned out to be one task. Both were carried as prose in STATE.md rather
than as a todo, which is how they survived two releases without moving.

## What is actually covered, and what is not

**Covered — axe-core.** `person-picker-a11y.spec.ts` scans the popover in BOTH
empty and populated states (the chips, results list and live-region messages only
exist after interaction, so an empty-state scan would miss most of what the
feature renders). Zero violations against wcag2a/2aa/21a/21aa, scoped to the
popover so wp-admin's own pre-existing findings don't train people to ignore the
suite. This still passes.

**Covered — a human in a live editor, for the OTHER half.** Phase 25 was a real
human pass (`25-VERIFICATION.md`, 2026-08-09) and it deliberately records itself
as such because this project has one checkpoint recorded the other way. It
covered the toolbar and the locked-checkbox row. **It did not cover the person
picker or the four-group popover**, and it names no assistive technology.

**Not covered — anything about sequence or sense.** axe catches
machine-detectable violations. It cannot tell you whether the announcements make
sense in order, whether the live-region timing is usable, or whether four
similarly-named groups ("Hide this item from:", "Hide its sub-items from:", and
their two person equivalents) are actually distinguishable by ear. No automated
result should be read as having replaced that.

## Why this got slightly WORSE, not just older

Phase 25's M2 change altered this same popover **after** the v1.5.0 axe scan: the
derived-locked checkbox moved from natively `disabled` to `aria-disabled`, so a
control that screen-reader focus mode used to skip entirely is now reachable and
refuses its own toggle.

That was the right fix — the lock reason was written for assistive technology and
could never be heard while the row was skipped. But it changes tab order and
announcement sequence in exactly the component that has never had a human pass,
and "focusable control that declines to change" is a pattern automated tooling
cannot evaluate for comprehensibility. The axe suite passes over it either way.

## The task

One person, one sitting, roughly twenty minutes, with VoiceOver or NVDA actually
running:

- Open the visibility popover on an item WITH sub-items, so all four groups are
  present. Can you tell the four groups apart by ear alone?
- Tab to a derived-locked checkbox. Is the lock reason announced, and does it
  arrive as a description after the name rather than tangled into it?
- Try to toggle it. Is the refusal comprehensible, or does it read as broken?
- Use the person search: type, wait for results, pick someone. Is the live-region
  announcement timed usefully, or does it fire before or long after the results?
- Add and remove a chip. Is what happened announced?
- Dismiss by clicking outside. Does focus land somewhere sensible (Phase 25's M3
  fix should return it to the anchor)?

## Not automatable, and not a code change

The deliverable is a short findings note plus any defects it turns up — not a
patch. If it finds nothing, that is worth recording too: the claim "a human
listened to this" is one this project cannot currently make about its most
complex surface, and making it once is the point.

## Supersedes

- **21-05 Task 5** (human browser verification) — struck as superseded 2026-08-10.
  The plan marked it `autonomous: false` and it was never performed; Phase 21 was
  accepted on automated evidence, two Codex rounds, and Claude's own browser-driven
  round-trip during 21-04. Phase 25 has since done a genuine human pass over part
  of the editor. The residue that actually remains is this todo.
- The "screen-reader pass — narrowed, not closed" caveat carried in STATE.md
  since 2026-08-09.

Source: consolidated 2026-08-10 while reviewing the three carried v1.5.0 gaps.
