---
phase: 17-slug-normalization
verified: 2026-06-29T23:00:00Z
status: passed
score: 13/13 must-haves verified
gaps: []
human_verification:
  - test: "Run full Docker integration + Playwright e2e suite"
    expected: "45/45 integration (incl. 8 FIX acceptance methods), 32 e2e pass / 10 skipped, Plugin Check 0 errors"
    why_human: "Docker/wp-env requires network sockets unavailable in this sandbox; gate results are attested in 17-03-SUMMARY.md rather than re-run here"
---

# Phase 17: Slug Normalization Verification Report

**Phase Goal:** Maestro overrides survive real-world slug variation — absolute-URL slugs on any host, slugs with `ver=` or UTM query params that drift on update, and entity-encoded `&amp;` taxonomy slugs — so a saved config keeps applying without manual re-save.
**Verified:** 2026-06-29
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `normalize()` reduces internal wp-admin absolute URLs to admin-relative form, surviving host moves | VERIFIED | `strip_host()` in class-slug.php:97 strips `$admin_base` prefix (fast path) or locates last `/wp-admin/` boundary via `strrpos` (host-move path); SlugTest fixtures 1 and 1b assert both; 88/88 unit green |
| 2 | `normalize()` strips `ver=` and `utm_*` params (case-insensitive name match) and sorts survivors | VERIFIED | `normalize_query()` in class-slug.php:139 uses manual `explode('&')` tokenizer, `strtolower($name)` comparison against `'ver'` and `strpos($name_lower, 'utm_')`, then `sort($filtered, SORT_STRING)`; SlugTest fixtures 2/2b and 3/3b confirm |
| 3 | `normalize()` html_entity_decodes FIRST so `&amp;` and `&` taxonomy slugs produce the same output | VERIFIED | class-slug.php:55 applies `html_entity_decode($slug, ENT_QUOTES|ENT_HTML5, 'UTF-8')` before any `&` is parsed as a query separator; SlugTest fixtures 4/4b, 5, 6 confirm |
| 4 | `normalize()` is idempotent and a no-op on plain slugs | VERIFIED | SlugTest::test_idempotent() (dataProvider-driven) and test_plain_slug_unchanged() assert `normalize('woocommerce') === 'woocommerce'` and `normalize('edit.php') === 'edit.php'`; 88/88 unit green |
| 5 | Collision-guard: four-case test asserts both must-NOT-collapse (distinct taxonomy, internal vs external host) and MUST-merge (ver= drift, &amp; vs &) | VERIFIED | SlugTest::test_collision_guard() at line 157 has all four labelled cases (a)–(d); passes in unit suite |
| 6 | `normalize()` never throws on empty, non-string, or malformed input | VERIFIED | class-slug.php:50-51 returns `''` for non-string or empty before any processing; SlugTest edge tests (empty, null, int, duplicate params, empty-value param, double-hash) all pass |
| 7 | Replay resolves top-level items[] overrides via normalized keys (seam at ~line 92/137) | VERIFIED | class-replay.php:88-106 builds `$norm_items` map; line 137: `$nk = Slug::normalize((string)$row[2], $base)` → `$norm_items[$nk]`; no exact `$items[$slug]` lookup remains in the items mutation path |
| 8 | Replay resolves submenu items[] overrides via normalized keys (seam at ~line 128/194) | VERIFIED | class-replay.php:194: `$nk = Slug::normalize((string)$row[2], $base)` in submenu loop; `$norm_items[$nk]` used for lookup; ReplayTest FIX-03 tests cover both encoding directions |
| 9 | Replay normalizes the `sub_order` parent key and child slug comparison in the reorder seam (~line 140/212) | VERIFIED | class-replay.php:212 `$norm_parent = Slug::normalize((string)$parent, $base)`; line 216 compares via `Slug::normalize((string)$sp, $base) === $norm_parent`; lines 226-237 build `$norm_desired` and `$norm_children` copies; `Ordering::submenu` operates on normalized copies; line 253-258 maps back to original rows via `$orig_by_norm` |
| 10 | Dual-axis collision guard: Axis-1 (two stored keys → same normalized key) and Axis-2 (one normalized key → 2+ distinct rendered items) both apply nothing | VERIFIED | class-replay.php:93-106 (Axis-1): sets `$norm_skip[$nk]` when collision detected, removes from `$norm_items`; lines 112-129 (Axis-2 top-level pre-scan) and 171-187 (Axis-2 submenu pre-scan): tracks `$top_skip_rendered`/`$sub_skip_rendered`; ReplayTest::test_collision_noop_ambiguous_stored_keys_apply_nothing asserts fail-safe |
| 11 | `get_menu_model()` and `capture_pristine()` stay RAW (no normalization in those paths) | VERIFIED | class-replay.php lines 316-358 (`capture_pristine`) and 361-404 (`get_menu_model`): zero references to `Slug::normalize`, `norm_items`, or `norm_skip`; raw `$row[2]` values used throughout |
| 12 | `class-slug.php` is required in `maestro-menu-editor.php` before `class-replay.php` | VERIFIED | maestro-menu-editor.php line 30: `require_once MAESTRO_DIR . 'includes/class-slug.php'` appears immediately after `class-config.php` and before `class-ordering.php` and `class-replay.php` |
| 13 | User-facing v1.3.0 changelog note drafted in readme.txt; no premature version bump in plugin header | VERIFIED | readme.txt line 128-129: `= 1.3.0 =` section with plain-language note covering host moves, ver= bumps, UTM drift, and &amp; encoding; plugin header still reads `Version: 1.2.0` (line 9 of maestro-menu-editor.php) |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `includes/class-slug.php` | `Maestro\Slug::normalize()` pure WP-free static method | VERIFIED | 181 lines; `class Slug`; single public static `normalize()` + two private helpers; only WP call is `wp_parse_url()` which is WPCS-required and stubbed in the unit bootstrap |
| `tests/unit/SlugTest.php` | 10-fixture data provider + collision-guard (4 cases) + idempotency + edge rows | VERIFIED | 253 lines; `class SlugTest`; `fixtures()` provider with 10 labelled rows; `test_collision_guard()` with 4 labelled cases (a)–(d); 5 edge-case methods |
| `tests/bootstrap-unit.php` | `class-slug.php` registered in WP-free unit harness | VERIFIED | Line 124: `require_once $amm_inc . 'class-slug.php'`; `wp_parse_url` stub added at lines 107-118 |
| `includes/class-replay.php` | Normalized-key resolution at both items[] seams + reorder seam, with collision skip | VERIFIED | 9 occurrences of `Slug::normalize`; dual-axis collision guards; non-destructive; 419 lines |
| `tests/integration/ReplayTest.php` | 8 FIX acceptance methods covering FIX-01/02/03 + collision no-op | VERIFIED | Lines 264-523; 8 methods: `test_fix01_host_move_*`, `test_fix01_ver_bump_*`, `test_fix02_utm_drift_*`, `test_fix03_ampamp_rendered_plain_stored_*`, `test_fix03_plain_rendered_ampamp_stored_*`, `test_sub_order_reorder_on_encoded_child_slugs`, `test_collision_noop_*`, `test_simple_slug_override_still_renames_*` |
| `readme.txt` | Draft 1.3.0 changelog note | VERIFIED | Line 128-129: `= 1.3.0 =` with user-facing note |
| `maestro-menu-editor.php` | `require_once` for `class-slug.php` | VERIFIED | Line 30: correct position before `class-ordering.php` and `class-replay.php` |
| `includes/class-ordering.php` | Untouched — no Slug references | VERIFIED | grep confirms zero `Slug` or `normalize` references |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/bootstrap-unit.php` | `includes/class-slug.php` | `require_once $amm_inc . 'class-slug.php'` at line 124 | WIRED | Confirmed by source read |
| `tests/unit/SlugTest.php` | `Maestro\Slug::normalize` | `use Maestro\Slug` + 15+ direct `Slug::normalize()` calls | WIRED | Confirmed by source read |
| `includes/class-replay.php` | `Maestro\Slug::normalize` | 9 calls to `Slug::normalize()` spanning all three seams | WIRED | Confirmed by source read + grep count |
| `includes/class-replay.php` top-level loop | normalized `$items` lookup | `Slug::normalize($row[2], $base)` → `$norm_items[$nk]` at lines 121, 137, 141, 144 | WIRED | Pre-scan + mutation loop both use normalized key |
| `includes/class-replay.php` submenu loop | normalized `$items` lookup | `Slug::normalize($row[2], $base)` → `$norm_items[$nk]` at lines 178, 194, 198 | WIRED | Axis-2 pre-scan + mutation loop |
| `includes/class-replay.php` reorder seam | normalized `sub_order` + `Ordering::submenu` | `Slug::normalize` at lines 212, 216, 227, 237; `$orig_by_norm` map restores raw rows | WIRED | Full threading confirmed |
| `maestro-menu-editor.php` | `includes/class-slug.php` | `require_once MAESTRO_DIR . 'includes/class-slug.php'` at line 30 | WIRED | Fixed in 17-03 (commit 3d6964e); loads before class-replay.php |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| FIX-01 | 17-01, 17-02, 17-03 | Override on absolute-URL slug survives host change and `ver=` bump | SATISFIED | `strip_host()` handles host move via `/wp-admin/` boundary; `normalize_query()` drops `ver=`; SlugTest fixtures 1/1b/2/2b; ReplayTest `test_fix01_host_move_*` and `test_fix01_ver_bump_*` |
| FIX-02 | 17-01, 17-02, 17-03 | Override on external upgrade-link slug survives UTM param drift | SATISFIED | `normalize_query()` drops all `utm_*` params; WPForms external host kept as `host/path`; SlugTest fixtures 3/3b; ReplayTest `test_fix02_utm_drift_*` |
| FIX-03 | 17-01, 17-02, 17-03 | Override on `&amp;` taxonomy slug applies with `&` or `&amp;` stored key | SATISFIED | `html_entity_decode()` applied first (before `&` parsed as separator); SlugTest fixtures 4/4b/5/6; ReplayTest `test_fix03_ampamp_rendered_plain_stored_*` and `test_fix03_plain_rendered_ampamp_stored_*` |

All three requirements are SATISFIED. No orphaned requirements for Phase 17.

---

### Pipeline Order Verification (Locked Contract)

The PLAN contracts a specific pipeline order. Verified against class-slug.php:

| Step | Contract | Code Location | Verdict |
|------|----------|---------------|---------|
| 1 | `html_entity_decode` FIRST, whole input | Lines 50-58 | CORRECT — applied before fragment split or any `&` parsing |
| 2 | Fragment split on FIRST `#` only | Lines 62-67 | CORRECT — `strpos` (not `strrpos`) finds first `#` |
| 3 | Strip scheme+host: admin-relative for `/wp-admin/`, keep lowercased host+path for external | Lines 70-123 | CORRECT — `strip_host()` private method; external URL: `strtolower($host)` applied |
| 4 | Drop `ver` + `utm_*` (case-insensitive name), sort survivors, recompose | Lines 139-178 | CORRECT — `strtolower($name)` for denylist check; `sort($filtered, SORT_STRING)` |

Denylist width: only `ver` and `utm_*` — no silent widening found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

Checked for: TODO/FIXME/placeholder comments, `return null`/`return []`, stub-only handlers, empty implementations, console.log-only bodies. All clear on the new files.

Out-of-scope items NOT implemented (confirmed absent):
- `maestro_slug_volatile_params` filter hook — not present in class-slug.php
- Collision debug logging — not present
- Editor save-time normalization — `get_menu_model()` and `capture_pristine()` stay raw; no `Slug::normalize` in those paths
- COMPAT-04/07/10 — not referenced in any modified file

---

### Human Verification Required

#### 1. Full Docker integration + e2e gate re-run

**Test:** Start wp-env (alternate ports if needed), run `npm run test:php && npm run test:e2e` and Plugin Check
**Expected:** 45/45 integration (all 8 FIX acceptance methods pass), 32 e2e pass / 10 skipped, Plugin Check 0 errors
**Why human:** Docker/wp-env requires network sockets; sandbox blocks TCP bind (EPERM). The 17-03-SUMMARY.md attests this gate passed (88 unit, 45 integration, 53 JS, 32 e2e, WPCS clean, PHPStan 0, Plugin Check 0) at the wave-3 boundary. Source code is consistent with those results. A re-run requires a developer machine with Docker.

---

### Gaps Summary

No automated gaps found. All 13 must-have truths verified from source. The one human-verification item (Docker gate re-run) is noted for auditability, not as a blocker — the gate was executed and attested in 17-03-SUMMARY.md, and the unit suite (88/88) is confirmed runnable and green in this environment.

The critical production bug found during 17-03 (missing `require_once MAESTRO_DIR . 'includes/class-slug.php'` in maestro-menu-editor.php) is confirmed fixed at line 30 of maestro-menu-editor.php.

---

_Verified: 2026-06-29_
_Verifier: Claude (gsd-verifier)_
