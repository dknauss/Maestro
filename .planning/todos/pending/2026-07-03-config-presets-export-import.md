---
created: 2026-07-03T18:00:00.000Z
title: Named config presets + JSON export/import
area: config
files:
  - includes/class-config.php (schema + sanitize() — reusable as import validation; no schema_version key yet)
  - includes/class-rest.php (maestro/v1 namespace — presets/import routes would live here, reusing can_edit() + nonce pattern)
  - SPEC.md:199 (Roadmap item 6 — "Import/export config as JSON", already-deferred precursor)
---

## Problem

Maestro configs can't be named, saved as alternatives, shared between sites, or
version-controlled. Import/export has been on the backlog since v1.2 (V2-06,
SPEC.md Roadmap item 6) and is explicitly out of scope for v1.4. Named,
switchable presets are a superset of that item — and a genuine market gap:
Admin Menu Editor (300k+ installs) gates JSON import/export behind Pro
($49–179) and has **no** named/switchable preset system even in Pro (confirmed
2026-07-03 against their Permissions/CLI/changelog docs).

## Solution (research done 2026-07-03, not yet scoped)

The config is already preset-shaped: a sparse delta `{items, top_order,
sub_order}`, never a menu snapshot, and `Ordering`'s resilience contract +
v1.3.0 `Slug::normalize()` mean a preset applied on a site missing some slugs
degrades gracefully (orphans dropped at replay, stored config untouched).
Maestro is unusually well positioned for portable presets.

Build items:
- Add a `schema_version` key to the config/export envelope **before** shipping
  any export (theme.json's `version` int is the WP-native precedent; exported
  JSON outlives plugin versions).
- New `maestro_presets` option (autoload=false — Site Health flags autoload
  >800KB) holding named preset payloads; apply = existing full-replace
  `Config::save()`.
- New REST routes (`maestro/v1/presets`, `maestro/v1/config/import`) reusing
  `can_edit()` capability + `wp_rest` nonce. Import pipeline: capability →
  nonce → JSON parse → structural validation → `Config::sanitize()` per-field.
  (Cautionary precedent: Widget Settings Importer/Exporter was pulled from
  wp.org for an unauthenticated-JSON stored-XSS import path.)
- UI decision: Maestro has no settings page at all (everything in-place in
  #adminmenu). Preset manager either lives in the editor toolbar/panel or
  becomes the plugin's first admin page.
- Differentiators nobody in the ecosystem does: per-item reconciliation UI /
  warnings for slugs missing on the import target (Customizer Export/Import
  just hard-fails); explicit schema versioning.
- Bundled starter presets become nearly free once apply-a-preset exists
  (ship JSON files: e.g. "Minimal", "Content-editor focus", "Declutter" —
  ties into the declutter-switch todo).

Candidate for v1.5. Pure-logic cores (preset schema validation, envelope
versioning) fit the existing PHPUnit-unit TDD seam alongside
ConfigSanitizeTest.

Source: Dan's idea 2026-07-03; prior-art + codebase research in-session.
See also [[2026-07-03-declutter-switch-non-core-menu-items]].
