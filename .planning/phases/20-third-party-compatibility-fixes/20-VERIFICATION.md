---
phase: 20-third-party-compatibility-fixes
verified: 2026-08-02T15:04:53Z
status: passed
score: 5/5 must-haves verified
---

# Phase 20: Third-Party Compatibility Fixes Verification Report

**Phase Goal:** Maestro's rename/hide overrides behave correctly against the remaining R1-identified compatibility gaps — same-slug top-level/submenu collisions, badge/HTML-bearing titles, and parent-hide cascade — without weakening the cosmetic-only guarantee.
**Verified:** 2026-08-02T15:04:53Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A rename/hide on a top-level slug does NOT also hit a same-slug submenu (and vice versa) — level-qualified `parent>child` keys | ✓ VERIFIED | `Slug::is_qualified()`/`split_qualified()`/`normalize_qualified()` (`includes/class-slug.php` L197-253); `Replay::replay()` submenu loop resolves `parent>child` first, legacy bare fallback second (`includes/class-replay.php` L164-277); both Axis-1/Axis-2 guards independently extended. `ReplayTest` shared-slug cases + `shared-slug.spec.ts` e2e both pass live (2/2 e2e, ran in this session). |
| 2 | Renaming an item with a trailing badge or wrapping HTML preserves that markup (text-node replacement), for 4/6 R1 plugins | ✓ VERIFIED | `Maestro\Title::replace_label()` (`includes/class-title.php`) — DOMDocument text-node swap, wired into both title-write seams in `class-replay.php` (L257-262 submenu, equivalent top-level seam). `TitleTest.php` fixtures cover WooCommerce trailing-bubble, Yoast notification span, WPForms wrapping span, and an upsell trailing badge (the required 4 shapes) plus plain-label and no-text-node-null edge cases. Ran live: unit suite green. |
| 3 | COMPAT-10 final design: independent per-parent `child_hidden_roles` role set (not the superseded boolean `cascade_hide`), union with child's own hidden_roles, parent stays visible, pure visibility, plus derived locked-checkbox affordance | ✓ VERIFIED | `cascade_hide`/`cascadeHide` fully absent from `includes/` and `assets/` (grep confirmed zero hits). `child_hidden_roles`/`childHiddenRoles` present in `class-cascade.php`, `class-config.php`, `class-replay.php`, `maestro.js`, `maestro-logic.js`. `Cascade::effective_hidden_roles($child_own, $parent_child_hidden_roles)` is a pure 2-arg unconditional union (no gating on parent's own hide). `class-replay.php` L175-276 computes `$parent_child_hidden_roles` independently of the parent's own `hidden_roles`/visibility. Editor UI: `buildRoleGroup()` renders two independent groups ("Hide this item from:" / "Hide its sub-items from:"), second gated to `!isSub && hasChildren`; derived-lock via `disabled` checkbox (structural payload purity, not convention). |
| 4 | Cosmetic-only guardrail: explicit test asserts child_hidden_roles never changes `current_user_can()`, hidden child still loads by direct URL for a capable user | ✓ VERIFIED | `ReplayTest::test_child_hidden_roles_is_cosmetic_only_current_user_can_and_page_capability_unchanged()` (L1255-1299) — asserts parent stays visible, child row gone, `get_role('editor')->capabilities` byte-for-byte identical before/after, `current_user_can('edit_posts')`/`current_user_can('manage_options')` unchanged. Ran live in this session: passes (part of 49/49 filtered `ReplayTest` run). `cascade-hide.spec.ts` e2e additionally proves the hidden child page (`post-new.php`) loads directly for the editor role without the "Sorry, you are not allowed" gate. Both re-ran live and passed in this session. |
| 5 | Zero-regression: PHP unit/integration/JS/e2e green; WPCS clean; PHPStan clean; Plugin Check 0 new errors | ✓ VERIFIED | Re-ran live in this session (not just trusted from SUMMARY): `composer test:unit` 127/127 (158 assertions) — exact match to TESTING.md claim; `phpunit-integration.xml.dist` full run 72/72 (172 assertions) — exact match; `npm run test:js` 64/64 — exact match; `composer lint` (WPCS) clean; `composer analyse:phpstan` 0 errors; targeted e2e re-run (`shared-slug` + `cascade-hide`, 5 tests incl. auth setup) all passed. Plugin Check was not re-run (requires a full ZIP build; SUMMARY documents 0 errors against the shippable build and pre-existing-only findings against the dev tree, consistent with the phase's established convention) — not re-verified live but no evidence contradicting it. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `includes/class-slug.php` | Qualified-key parse/normalize helper | ✓ VERIFIED | `QUALIFIED_SEPARATOR`, `is_qualified()`, `split_qualified()`, `normalize_qualified()` present and unit-tested (`SlugTest.php`, part of green 127/127). |
| `includes/class-config.php` | sanitize() qualified-key + child_hidden_roles acceptance, cascade_hide fully removed | ✓ VERIFIED | Qualified-key branch (icon-drop, per-half clean) present; `child_hidden_roles` block present (L215-229, top-level only, same caps as `hidden_roles`); no `cascade_hide` reference anywhere. |
| `includes/class-replay.php` | Qualified-first/bare-fallback submenu resolution; live-title text-node swap; independent child_hidden_roles union; get_menu_model() lockstep | ✓ VERIFIED | All four seams present and wired as described (L164-277 submenu/cascade, L257-262 title swap, L509-526/L574 model exposure). |
| `includes/class-title.php` | Pure text-node label-replacement helper | ✓ VERIFIED | `Title::replace_label()` — DOMDocument-based, WP-free, null fallback signal. Registered in `maestro-menu-editor.php` + `tests/bootstrap-unit.php`. |
| `includes/class-cascade.php` | Pure child_hidden_roles union computation | ✓ VERIFIED | `effective_hidden_roles($child_hidden_roles, $parent_child_hidden_roles)` — 2-arg unconditional union, no capability calls, matches the REVISION note exactly (not the superseded 3-arg flag-gated version). |
| `assets/maestro.js` | Qualified-key client model + stable submenu DOM binding + two independent visibility-popover role groups + derived lock | ✓ VERIFIED | `liForKey()`, `findSubmenuLi()`/`resolveSubmenuHref()`, `buildRoleGroup()` with `opts.isLocked`/`lockedHint`, `childHiddenRoles` model field, `buildConfig()` emits `child_hidden_roles`. |
| `tests/unit/SlugTest.php`, `TitleTest.php`, `CascadeTest.php`, `ConfigSanitizeTest.php` | Fixture-driven unit coverage | ✓ VERIFIED | All present; re-ran filtered (83 tests, 114 assertions) plus full suite (127/127) live, green. |
| `tests/integration/ReplayTest.php` | Shared-slug, badge, and child_hidden_roles + guardrail integration coverage | ✓ VERIFIED | Re-ran filtered (49/49, 80 assertions) and full (72/72, 172 assertions) live, green; guardrail test present and read in full. |
| `tests/e2e/specs/shared-slug.spec.ts`, `cascade-hide.spec.ts` | Live-editor proof of COMPAT-04 and COMPAT-10 (revised) | ✓ VERIFIED | Both files read in full; re-ran live in this session — 4 spec tests + auth setup, 5/5 passed. `cascade-hide.spec.ts` asserts the revised, visible parent-stays/child-hides behavior directly against the rendered sidebar, plus the derived-lock and its payload-purity round-trip. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Replay::replay()` submenu loop | `Slug::normalize_qualified()` | qualified-first candidate key, bare fallback | ✓ WIRED | Confirmed by code read (L242-252) and passing `ReplayTest` shared-slug cases. |
| `Replay::replay()` title-write seams | `Title::replace_label()` | live-title read, plain-label swap, wholesale fallback on null | ✓ WIRED | Confirmed by code read (L257-262) and passing badge-preservation `ReplayTest` cases. |
| `Replay::replay()` submenu child-hide | `Cascade::effective_hidden_roles()` | union of child's own hidden_roles + parent's child_hidden_roles, independent of parent's own hide | ✓ WIRED | Confirmed by code read (L265-276) and the passing guardrail + independence `ReplayTest` cases. |
| `assets/maestro.js` visibility popover | `child_hidden_roles` save payload | `buildRoleGroup()` Group 2 bound to `model[slug].childHiddenRoles`, `buildConfig()` emits `child_hidden_roles` | ✓ WIRED | Confirmed by code read and passing `cascade-hide.spec.ts` (asserts POST payload contains `child_hidden_roles`, never `hidden_roles`, for a children-only edit). |
| Group 1 toggle (`hiddenRoles`) | Group 2 derived lock | `onToggle` calls `childrenGroup.refresh()`; `isLocked`/`disabled` never calls `setSet()` | ✓ WIRED | Confirmed by code read (L1063-1139) and the passing derived-lock e2e case (live checked+disabled, round-trip purity). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COMPAT-04 | 20-01, 20-02, 20-03 | Level-qualified match keys for shared-slug top-level/submenu collisions | ✓ SATISFIED | Server (20-01/20-02) + client (20-03) fully wired; live e2e re-run passed. |
| COMPAT-07 | 20-04 | Badge/HTML preservation on rename | ✓ SATISFIED | `Title::replace_label()` wired at both seams; live unit/integration re-run passed. |
| COMPAT-10 | 20-05 (superseded), 20-06 (final) | Independent per-parent child-hiding, cosmetic-only | ✓ SATISFIED | Final `child_hidden_roles` design fully delivered per the REVISION NOTE; superseded `cascade_hide` fully removed; guardrail test + e2e re-run passed. |

No orphaned requirements: REQUIREMENTS.md maps only COMPAT-04/07/10 to Phase 20, and all three appear in plan frontmatter `requirements` fields.

### Anti-Patterns Found

None. Grep for `TODO|FIXME|XXX|HACK|placeholder` across `includes/class-title.php`, `class-cascade.php`, `class-slug.php`, `class-config.php`, `class-replay.php` returned zero hits. No stub returns, no empty handlers, no console-log-only implementations found in the reviewed diffs.

### Human Verification Required

None. Both required human-verify checkpoints (20-03 Task 3 shared-slug live check, 20-06 Task 4 cascade behavior + gate check) are documented as approved in their respective SUMMARY.md files, and this verification independently re-ran the automated proofs (unit, integration, JS, and the two relevant e2e specs) live rather than relying solely on those summaries.

### Gaps Summary

No gaps. All three requirement IDs (COMPAT-04, COMPAT-07, COMPAT-10) are genuinely delivered in the codebase, not merely claimed. The mid-phase COMPAT-10 revision (boolean `cascade_hide` → independent `child_hidden_roles`) was verified against the FINAL shipped design per the task's explicit instruction — the superseded model is completely absent from source (confirmed by grep), and the final model's pure-visibility/independence/derived-lock properties were verified by direct code reading plus live re-execution of the guardrail test and both COMPAT-04/COMPAT-10 e2e specs. All spot-checked test counts (unit 127/127, integration 72/72, JS 64/64) exactly matched TESTING.md's canonical claims when re-run in this session; WPCS and PHPStan both re-ran clean.

---

_Verified: 2026-08-02T15:04:53Z_
_Verifier: Claude (gsd-verifier)_
