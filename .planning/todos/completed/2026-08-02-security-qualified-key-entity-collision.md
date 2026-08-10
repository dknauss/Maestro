---
created: 2026-08-02T00:00:00.000Z
title: Qualified-key detection uses raw key while normalize decodes entities (collision)
area: security/hardening
files:
  - includes/class-config.php (Config::sanitize() ~line 168, is_qualified decision)
  - includes/class-slug.php (Slug::normalize() ~line 56, html_entity_decode)
---

## Problem

LOW severity, optional (not a merge blocker).

In `Config::sanitize()` (`includes/class-config.php` ~line 168) the
`is_qualified` decision is made against the RAW incoming key (a literal `>`
character). But `Slug::normalize()` later html-entity-decodes the key
(`includes/class-slug.php` ~line 56).

Consequence: a stored bare key like `foo&gt;bar` is NOT treated as qualified at
save time (its raw form contains no literal `>`), yet `normalize_qualified()`
decodes it at replay to `foo>bar` — which is the SAME normalized key that a
genuine `foo>bar` qualified override yields. If both a bare `foo&gt;bar` entry
and a real `foo>bar` qualified override exist, the Axis-1 guard treats them as a
collision and drops BOTH.

## Impact

Admin-only, cosmetic self-DoS: an admin's own override no-ops. It:

- cannot cross a privilege boundary,
- cannot map a submenu override onto a top-level row,
- requires the admin to craft the entity-encoded key themselves.

So this is defense-in-depth, not an exploitable vulnerability.

## Recommended fix

In `Config::sanitize()`, make raw and normalized qualification agree — either:

- run the `is_qualified()` check against the entity-DECODED key (so detection
  matches what `normalize_qualified()` will later produce), or
- strip `&gt;` / `&#62;` from bare keys before storage.

Not a merge blocker; defense-in-depth.
