---
phase: 17-slug-normalization
plan: "01"
subsystem: slug-normalization
tags: [tdd, pure-function, normalization, phpunit, phpcs, phpstan]
dependency_graph:
  requires: []
  provides: [Maestro\Slug::normalize, SlugTest-data-provider]
  affects: [Wave-2-replay-wiring-17-02]
tech_stack:
  added: [includes/class-slug.php]
  patterns: [decode-first pipeline, manual tokenize for duplicate-param safety, wp_parse_url WPCS compliance]
key_files:
  created:
    - includes/class-slug.php
    - tests/unit/SlugTest.php
  modified:
    - tests/bootstrap-unit.php
decisions:
  - "wp_parse_url() used over parse_url() for WPCS compliance; stubbed in bootstrap-unit.php"
  - "Manual explode('&') tokenizer used (not parse_str) to preserve duplicate params without deduplication"
  - "strrpos('/wp-admin/') boundary detection enables host-move survival without exact admin_base match"
  - "TDD gate rule applied: RED proven in working tree (bootstrap fatal); test+impl committed together as one GREEN"
metrics:
  duration_minutes: 11
  completed_date: "2026-06-29"
  tasks_completed: 3
  files_changed: 3
---

# Phase 17 Plan 01: Maestro\Slug::normalize() — Pure Slug Resolver Summary

**One-liner:** WP-free `Slug::normalize()` using decode→host-strip→denylist→sort pipeline with 10-fixture SURV-cited data provider, 4-case collision guard, and full unit/lint/PHPStan gate.

## What Was Built

`Maestro\Slug::normalize( $slug, $admin_base = '' )` — a pure static function with four mandatory pipeline steps:

1. **html_entity_decode** (`ENT_QUOTES|ENT_HTML5`, `UTF-8`) over the full input. Non-string or empty → `''` immediately.
2. **Fragment split** on the FIRST `#` only; remainder preserved verbatim.
3. **Host strip:**
   - If slug starts with `$admin_base`, strip it (exact match, fast path).
   - Else if slug contains `/wp-admin/`, strip to the tail after the last `/wp-admin/` (survives host move).
   - Otherwise (external URL): `wp_parse_url()` → lowercase host + path (no scheme), query reattached for step 4.
   - Non-URL slugs pass through step 3 untouched.
4. **Query filter + sort:** manual `explode('&')` tokenizer; drop params whose name (case-insensitive) is `ver` or starts with `utm_`; sort survivors alphabetically by raw `name=value` token; recompose with `?` only when params survive.

## Normalized Form of Each Fixture

| # | SURV source | Input (rendered) | Normalized output |
|---|-------------|-----------------|-------------------|
| 1 | SURV-02 I2 (Jetpack Settings) | `http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings` | `admin.php?page=jetpack#/settings` |
| 1b | SURV-02 I2 host-moved twin | `https://example.com/wp-admin/admin.php?page=jetpack#/settings` | `admin.php?page=jetpack#/settings` |
| 2 | SURV-04 I230 (Elementor Website Templates) | `http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library` | `admin.php?page=elementor-app&return_to&source=wp_db_templates_menu#/kit-library` |
| 2b | SURV-04 I230 ver-bumped twin | `…&ver=4.2.0&…` | `admin.php?page=elementor-app&return_to&source=wp_db_templates_menu#/kit-library` |
| 3 | SURV-05 I4 (WPForms Upgrade) | `https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US` | `wpforms.com/lite-upgrade/` |
| 3b | SURV-05 I4 UTM-drift twin | `…?utm_campaign=other&utm_source=elsewhere` | `wpforms.com/lite-upgrade/` |
| 4 | SURV-04 I229 (Elementor Categories) | `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` | `edit-tags.php?post_type=elementor_library&taxonomy=elementor_library_category` |
| 4b | SURV-04 I229 `&` twin | `…&post_type=…` | `edit-tags.php?post_type=elementor_library&taxonomy=elementor_library_category` |
| 5 | SURV-01 I3 (WooCommerce Categories) | `edit-tags.php?taxonomy=product_cat&amp;post_type=product` | `edit-tags.php?post_type=product&taxonomy=product_cat` |
| 6 | SURV-06 F5 (LifterLMS Categories) | `edit-tags.php?taxonomy=course_cat&amp;post_type=course` | `edit-tags.php?post_type=course&taxonomy=course_cat` |

## PHP Function Choices

- **`wp_parse_url()`** over `parse_url()` — WPCS `WordPress.WP.AlternativeFunctions.parse_url_parse_url` enforced; stubbed in `tests/bootstrap-unit.php` so the WP-free harness works.
- **Manual `explode('&')` tokenizer** instead of `parse_str()` — `parse_str()` silently deduplicates params (last value wins); the contract requires keeping all duplicates.
- **`html_entity_decode()` whole-input pass** — applied before any `&` is read as a query separator, so `&amp;` entities in stored slugs are handled uniformly.

## TDD Execution

RED step proven in working tree: adding `require_once 'class-slug.php'` to the bootstrap with the file absent produced a fatal `Failed opening required` error (confirmed by running `composer test:unit -- --filter SlugTest`). Per the project's TDD-gate rule, test+impl were committed together as one GREEN commit.

## Gates

- `composer test:unit -- --filter SlugTest`: 27/27 green (all ten fixtures, idempotency, plain-slug no-op, 4-case collision guard, edge/malformed rows)
- `composer test:unit` (full suite): 88/88 green — zero regressions to OrderingTest, ConfigSanitizeTest, IconValidationTest
- `composer lint`: clean (0 errors, 0 warnings after phpcbf alignment fix)
- `composer analyse:phpstan`: 0 errors
- WP-call check: `normalize()` makes zero direct WordPress calls (only `wp_parse_url()` for WPCS compliance, stubbed in unit harness)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - WPCS Compliance] Replace parse_url() with wp_parse_url()**
- **Found during:** Task 3 (composer lint)
- **Issue:** WPCS flags raw `parse_url()` as `WordPress.WP.AlternativeFunctions.parse_url_parse_url`; the `includes/` directory is linted against WPCS
- **Fix:** Replaced `parse_url()` with `wp_parse_url()` in `class-slug.php`; added `wp_parse_url` stub to `tests/bootstrap-unit.php`
- **Files modified:** `includes/class-slug.php`, `tests/bootstrap-unit.php`
- **Commit:** `ee6dd00`

**2. [Rule 2 - WPCS Compliance] 4 alignment warnings auto-fixed by phpcbf**
- **Found during:** Task 3 (composer lint)
- **Issue:** `Generic.Formatting.MultipleStatementAlignment.NotSameWarning` on 4 assignment lines
- **Fix:** Ran `vendor/bin/phpcbf` to auto-fix alignment
- **Commit:** `ee6dd00`

## Self-Check: PASSED

Files created/modified:
- FOUND: includes/class-slug.php
- FOUND: tests/unit/SlugTest.php
- FOUND: tests/bootstrap-unit.php

Commits:
- FOUND: 47d4a20 (feat(17-01): add Maestro\Slug::normalize() pure slug resolver)
- FOUND: ee6dd00 (chore(17-01): fix WPCS lint warnings and add wp_parse_url stub)
