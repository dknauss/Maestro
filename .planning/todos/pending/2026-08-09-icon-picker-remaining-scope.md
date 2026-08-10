---
created: 2026-08-09T00:00:00.000Z
title: Icon support — the remaining third of SPEC item 5
area: editor-ux
files:
  - includes/class-config.php (sanitize_icon(); already accepts all four native forms)
  - assets/maestro.js (the icon popover — dashicons + Bootstrap tabs, search, "No icon")
  - includes/icons-bootstrap.php (GENERATED — regenerate via bin/generate-bootstrap-icons.mjs)
---

## Problem

`SPEC.md` Roadmap item 5 is struck as **Done**, and mostly it is: the validator
accepts all four native WordPress icon forms (dashicon, `none`, data-URI, URL)
and the picker bundles dashicons plus curated Bootstrap Icons with search.

But its "Remaining:" clause lists work that is still genuinely open, buried
inside a struck-through item where nobody will find it. Split out here during the
2026-08-09 reconciliation.

**Already done, do not re-scope:** the heavier/solid bundled set (V2-11). Phase 7
shipped the fill-resolution policy in v1.1 — see the generated header of
`includes/icons-bootstrap.php`: *"*-fill variants preferred; 7 names use a solid
synonym; 22 names retained as outline (no solid form available)"*. The stale
"outline glyphs read thin" note has been corrected in SPEC.md.

## What is actually left

1. **Media-library / URL input in the UI.** The *validator* already accepts a URL
   or data-URI; there is no way to *enter* one. Today a custom icon requires
   editing the stored option by hand, which is not a feature anyone has.
2. **Arbitrary SVG upload with deep sanitisation.** The high-risk one. SVG is an
   XSS vector and WordPress deliberately does not allow SVG upload by default.
   This wants its own security pass, not a corner of an icon-picker plan — and
   "we sanitise it" is the claim that needs proving, not asserting.
3. **A `mask-image` path** so bundled SVGs recolour with the active admin colour
   scheme instead of being fixed-colour.

## Sequencing note

(1) and (3) are ordinary editor work. (2) is a security feature wearing a UI
feature's clothes and should be scoped separately — if it is ever done at all,
given that core's own position is not to allow it.
