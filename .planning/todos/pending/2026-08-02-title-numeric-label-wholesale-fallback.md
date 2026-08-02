---
created: 2026-08-02T00:00:00.000Z
title: A legitimately numeric menu label is treated as a badge (wholesale fallback)
area: compat
files:
  - includes/class-title.php (find_label_node() ~line 111 — /^\d+$/ badge rule)
  - includes/class-title.php (replace_label() fast path — mirrors the same numeric guard for markup-free titles)
---

## Problem

NOTE-ONLY. Extremely rare, documented behavior — not a bug to fix.

`find_label_node()` (`includes/class-title.php` ~line 111) treats any text node
whose trimmed value matches `^\d+$` as a count/badge, never the human-readable
label. This is the correct rule for the common case (a digit run in a menu
title is a WooCommerce/plugin count bubble).

Edge case: a plugin that legitimately names a menu with digits only (e.g. a
"2024" archive menu) yields no non-numeric text node, so `replace_label()`
returns null → the caller falls back to a WHOLESALE title set, discarding any
surrounding badge/wrapper markup the live title carried. The COMPAT-07 markup
preservation is lost for that one item.

(The S1 markup-free fast path added 2026-08-02 mirrors this rule exactly: a
markup-free purely-numeric title also returns null, so parity with the DOM path
is preserved — no behavior change from S1.)

## Impact

Vanishingly rare (a digit-only menu label AND surrounding markup to lose), and
the fallback is still a correct rename — only the badge/wrapper markup is
dropped. Documented as the chosen rule in the class docblock.

## Note

If ever revisited: the label-vs-badge decision could consider position (a
digit run that is the FIRST/only text node is more likely the label than a
trailing one) or an explicit opt-out. Not worth the complexity today.

Note only — no action planned.
