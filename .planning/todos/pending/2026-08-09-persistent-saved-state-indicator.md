---
created: 2026-08-09T00:00:00.000Z
title: Make the save indicator reflect STATE, not a self-erasing event
area: editor-ux
files:
  - assets/maestro.js (~L1741-1755 — the 2s savedClearTimer that reverts 'saved' → 'idle')
  - assets/maestro.js (~L526-531 — statusEl construction; role=status, aria-live, SR-only text)
  - assets/maestro.js (~L1674-1682 — setStatus(); className + SR text + title + speak())
  - assets/maestro-logic.js (modeStatusLabel — returns '' for idle)
  - assets/maestro.css (.maestro-status, min-width:24px slot reserved in Phase 25)
---

## Problem

The save indicator is **event feedback that erases itself**. `maestro.js` ~L1748
sets a 2-second timer that flips `saved` back to `idle`, blanking both the glyph
and the screen-reader text. A few seconds after a rename commits, the toolbar
shows nothing — so "did that save?" has no answer on screen, and the user's only
recourse is to make another change and watch again.

Phase 25 reserved the status slot so the indicator no longer shoves the toolbar
sideways when it appears. That fixed the *jarring* half of the original
complaint. This is the other half, and it is a design change rather than a bug
fix, which is why it was deliberately NOT folded into 25-02 under cover of the
layout work.

## Why persistent is the WordPress-native answer

Core does not use the self-erasing toast. It shows save state as either
persistent document state, or as the changed content itself:

| Surface | Pattern |
|---|---|
| **Block editor** | "Save draft" → "Saving…" → **"Saved"**, persisting until the document is dirty again. State, not an event. |
| **Classic editor autosave** | "Draft saved at 3:15:45 pm." — persistent, timestamped, until superseded. |
| **Customizer** | Encoded in the action control: Publish → Publishing… → **Published (disabled)**. |
| **Settings API** | Persistent `.notice-success` for the page load. |
| **Quick Edit** | No status chip — the updated row *is* the feedback. |

The self-erasing toast is a web-app convention (and even Google Docs keeps "All
changes saved" permanently). **Gutenberg is the closest precedent for Maestro**
because both autosave: the user never presses Save, so they need standing
reassurance rather than a moment of it.

## Proposed change

- **Drop the 2s `savedClearTimer`.** Once something has saved in the session,
  leave a muted persistent check.
- **Keep it glyph-only.** The toolbar is icon-only at all widths by deliberate
  design (Phase 23) and the slot is 24px. A persistent text label costs width
  the toolbar does not have; the SR-only text already carries the meaning for AT.
- **Do NOT show "Saved" on entry.** Before any change, nothing has been saved and
  claiming otherwise is a small lie. Stay empty until the first save, then persist.
- **Skip a timestamp.** Classic editor has room in the publish box; 24px does not.

**Already correct, do not "fix":** the error state does NOT self-erase — the
timer is gated on `if ( ok )`. An error persists until the next change, which is
right.

## Caveat 1 — it collides with the existing modified dot

`refreshModifiedIndicator()` already renders a persistent per-row signal: a `•`
glyph plus `<span class="screen-reader-text">(modified)</span>`. Its meaning is
**"this item differs from the WordPress default"** — *not* "unsaved".

Adding a persistent toolbar check puts **two persistent indicators on screen
meaning different things**, and the difference is not self-evident: a user seeing
a dot on the row and a check in the toolbar could reasonably read them as
agreeing, disagreeing, or duplicating.

Decide this deliberately rather than discovering it. Options:
- keep them visually distinct by placement and shape (dot on the row, check in
  the toolbar) and rely on that — cheapest, probably sufficient
- give the toolbar check a hover/`title` that names what it means, as the status
  tile already does at other states
- reconsider whether the row dot should mean "unsaved" instead — **larger change,
  and it would break the WCAG 1.4.1 non-colour signal reasoning documented at
  `maestro.js` ~L136-146. Not recommended without a proper pass.**

## Caveat 2 — the live region needs a listen, not an assumption

`statusEl` carries `role="status"` + `aria-live="polite"` + `aria-atomic="true"`,
and `setStatus()` additionally calls `speak()` on `saved`/`error`.

Making the element permanent does not change *when* it announces — `aria-live`
fires on mutation, not on render — so idle → saving → saved still announces once
per transition, as today. **But `aria-atomic="true"` re-announces the whole
region on every change, and there is already both a live region AND an explicit
`speak()` on the same transition**, which risks double-announcement. That is
pre-existing, not introduced by this change, but a persistent element makes it
more noticeable and this is the natural moment to check it.

Verify with a real screen reader. The v1.5.0 gate established that axe and
structural assertions prove what AT *can* reach, not what it actually says —
this is squarely in the second category.

## Not urgent

The feature works and saves reliably; this is about whether the user can *tell*.
Worth doing next time the editor UX is open, ideally alongside the a11y listen
the v1.5.0 milestone already records as outstanding.
