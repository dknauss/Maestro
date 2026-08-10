---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Per-User Visibility
status: in-progress
stopped_at: "v1.5.0 hold cleared — Gate 8 satisfied via ultrareview (3 findings, fixed in #128); ready to tag"
last_updated: "2026-08-09T00:00:00.000Z"
last_activity: "2026-08-08 — **Phase 21 (ROLE-02 per-user hiding) executed, 5/5 plans, awaiting the human-verify checkpoint.** Branch `phase/21-cosmetic-per-user-hiding`, PR #120, nothing merged. Delivered: `hidden_users` / `child_hidden_users` storage; the `is_hidden_for_current_user()` seam widened to independent OR'd terms (3rd term reserved for the deferred `hidden_profiles`); `resolved_hidden_roles()` GENERALIZED to a field-parameterized resolver rather than duplicated, so the user axis inherits the qualified-key, schema-v2 (#115) and Axis-1 guards from one implementation; a shared `Cascade` union; the §6 cosmetic-invariant guardrail made enforcing; editor model exposure as id+name pairs via one batched query; four-group visibility popover with an async person picker on core's `wp/v2/users`. Gate: unit 165/165 (218), integration 109/109 (257), JS 83/83, e2e 39 passed/28 capture-skipped/0 failed, WPCS clean, PHPStan 0, Plugin Check 0 errors on the ZIP (1 pre-existing readme warning). THREE bugs found by verification that no unit test would have caught: (1) the guardrail initially could NOT detect a broken seam — `current_user_can()` answers from a cached allcaps array, so `snapshot_caps()` now drops `$GLOBALS['current_user']` to force re-derivation; (2) the picker URL appended `?` unconditionally, 404ing on every PLAIN-PERMALINK site since `rest_url()` already carries a query string; (3) clicking a search result or chip closed the whole popover, because re-rendering detached the node before `placePopover()`'s outside-click handler ran. Ruling recorded 2026-08-08: the super-admin exemption covers the NEW user axis only, multisite-scoped (unscoped would make administrators un-hideable on single-site and contradict the locked self-target decision). Prior: 2026-08-05 — **v1.4.1 SHIPPED** (PR #116, tag on c6cdcbe; wp.org API confirms 1.4.1). Patch for the shared-slug propagation defect (#115): a bare top-level key no longer applies to a submenu row whose slug names a rendered top-level item. Two Codex P2 rounds on #115 — the first cut of the gate tested `$nk === $norm_parent` and missed submenus parked under an unrelated parent; widened to `isset( $top_rendered_matches[ $nk ] )`. Prior: 2026-08-04 — **v1.4.0 SHIPPED** (PR #113, tag on 482510c, GitHub Release + wp.org SVN trunk/tags/1.4.0/assets confirmed). Phase 24 release gates 8–11 run consolidated over the full v1.3.1..main diff; one defect found and fixed (multibyte truncation blanked labels) and one changelog overclaim corrected (shared-slug isolation is submenu-direction only). ROLE-02 (Phase 21) deferred to v1.5."
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-03)

**Core value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Current focus:** **v1.3.1 shipped** (Phase 23 editor UX restyle, live on WordPress.org). Back to milestone v1.4 (Compatibility, Roles & Showcase): Phases 19 + 20 + 23 done; remaining Phase 21 (ROLE-02, now unblocked), Phase 22 (DEMO-01), Phase 24 (v1.4.0 release).

## Current Position

Milestone: **v1.5 Per-User Visibility** (active) — Phase 21 ✅ MERGED 2026-08-09 + Phase 26 (release, created 2026-08-09); Phases 22/25 optional inclusions. v1.4 SHIPPED (v1.4.0 + v1.4.1).
Phase: Phase 19 ✅, Phase 20 ✅, Phase 23 ✅ (shipped as v1.3.1). **Phase 21 (Cosmetic Per-User Hiding) ✅ COMPLETE — 5/5 plans, merged to `main` 2026-08-09 via PR #120 (merge commit, history preserved). Task 5 accepted on automated evidence rather than a human browser pass — see the note below.**
Plan: Phase 21 delivered ROLE-02's **per-user half**: 21-01 storage → 21-02 seam + cascade → 21-03 guardrail → 21-04 editor + picker → 21-05 e2e + gate + docs, plus two rounds of Codex review fixes. The cloned-role **profiles** half stays deferred to the backlog todo. Next: **Phase 26 (Release v1.5.0)** — per-user hiding is on `main` but unreleased; Phase 22 (demo) and Phase 25 (toolbar polish) are optional inclusions that do not block the cut.
Status: Phase 20's COMPAT-10 was reworked mid-checkpoint 2026-08-02: the boolean `cascade_hide` + "rides the parent hide" model built in 20-05/20-06 was found **inert** — WordPress core's `_wp_menu_output()` never renders a hidden parent's `<ul class="wp-submenu">` at all, so hiding the parent already removes the whole subtree cosmetically; cascading on top of that produced no observable difference. Reworked (20-CONTEXT.md REVISION NOTE) into an **independent** per-parent `child_hidden_roles` role set: `Maestro\Cascade::effective_hidden_roles( $child_hidden_roles, $parent_child_hidden_roles )` is now a plain, unconditional role-list union (no flag). `Config::sanitize()` accepts `child_hidden_roles` on a top-level item with the same contract as `hidden_roles` (role-intersect, `MAX_HIDDEN_ROLES` cap, dropped on a qualified submenu key). `Replay::replay()`'s submenu loop unions each child's own `hidden_roles` with its parent's `child_hidden_roles`, fully independent of whether the parent's own `hidden_roles` currently hides the parent row — so a parent can stay visible while its children vanish, a genuinely observable effect the old model could never produce. `get_menu_model()` exposes `childHiddenRoles` (empty array, not merely absent, for an untouched parent). The editor popover now shows TWO independent role-checkbox groups — "Hide this item from:" (existing) and "Hide its sub-items from:" (new, shown only on parents with children) — via a shared `buildRoleGroup()` helper in `assets/maestro.js`. The e2e spec (`cascade-hide.spec.ts`) now asserts the effect DIRECTLY against the rendered sidebar (parent visible, child rows gone, role-mirrored) via a second authenticated browser context, replacing the inert model's wp-cli/`$submenu` dump workaround (`dump-cascade-submenu.php`, deleted). Cosmetic-only guardrail reconfirmed end-to-end. **Full zero-regression gate (final):** PHP unit 127/127 (158 assertions), PHP integration 72/72 (172 assertions), JS 58/58, e2e 35 passed/28 capture-gated skipped/0 failed, WPCS clean, PHPStan 0 errors, Plugin Check 0 errors on the built shippable ZIP (1 pre-existing readme.txt warning) and 0 NEW errors on the dev-tree (7 errors/7 warnings, all pre-existing, confirmed via `git log --diff-filter=A` to predate Phase 20). All three Phase 20 requirements (COMPAT-04/07/10) genuinely complete. 20-04 (prior) delivered COMPAT-07 badge/HTML preservation on rename via `Maestro\Title::replace_label()`'s text-node swap at both title-write seams. 20-03 (prior) closed out COMPAT-04 client-side with the qualified-key DOM-join and live WooCommerce verification. 20-02/20-01 (prior) built COMPAT-04's server-side qualified-key foundation and replay/editor-model wiring. Phase 19 ROLE-01 signed off — **partial-go** (per-user go + ship first; cloned-role go as an additive `profiles` registry compiling to the same inline `is_hidden_for_current_user()` seam); Phase 21 unblocked. Phase 23 delivered UX-09/UX-12/UX-13/BUG-08 (native wp-admin restyle; 5/5 plans; full-suite gate green) and shipped in v1.3.1. **NOTE for Phase 24:** Plugin Check flags 7 errors/7 warnings against pre-existing dev-tree root files — logged to `phases/23-editor-ux-polish/deferred-items.md` for the Phase 24 build-then-check pipeline.
Last activity: 2026-08-09 — Phase 21 merged to `main` (PR #120, merge commit). Two Codex review rounds landed first: round 1 caught a self-target undo trap, the `list_users` gap, and an unenforced 50-user cap; round 2 caught that the `list_users` fix was **client-side only** (an editor could POST guessed IDs and read display names back from the model), plus an unbounded all-users query on every save. Both rounds fixed and CI-green. Codex has NOT reviewed the round-2 fixes themselves.

## ✅ THE TAG HOLD IS CLEARED (2026-08-09)

Gate 8 ran. `/code-review ultra` against PR #127 (a review-only PR based on the
`v1.4.1` tag, so the diff was the whole release) returned **three findings, all
real**, fixed in #128 and merged as `707d9b6`.

**It found the two paths I had missed**, on the exact invariant the review
request asked it to attack:

1. **MAX_ITEMS starvation** — silent. A payload of 200 title-only junk entries
   filled every slot, so the restore had nowhere to land and every protected
   per-user rule died to one crafted POST.
2. **The DELETE endpoint** bypassed the gate entirely — every sanitize-side fix
   round lived on the POST path, while `Config::reset()` wiped unconditionally.

Plus two nits, both genuine: `resetItem()` had drifted behind `resetSelected()`
(and its round-trip test was passing *vacuously*, so it could never have caught
that), and the `.maestro-has-hidden` marker cleared on the wrong condition.

**The fix collapsed rather than patched.** Preserve-on-submit, restore-on-omit
and merge-on-equivalent-key were three mechanisms doing one job — which is
precisely why a fourth path kept getting through. They are now one normalized-key
map with reserved item-cap capacity, so starvation is impossible by construction,
and `reset()` shares the map so the two endpoints cannot drift apart again.

**The record this leaves:** four consecutive holes in one function, every one
found by review rather than by me, and after each fix I believed the path was
settled. The gate earned its place; the hold was correct.

### Caveats that survive into the milestone record

- The #128 fixes are themselves unreviewed — the ultrareview ran against
  `1a32f08`. Accepted deliberately: the collapse removed a class of seam rather
  than adding another guard.
- No human screen-reader pass on the person picker. axe is clean across empty and
  populated states, which is not the same thing.
- 21-05 Task 5 (human browser verification) was never performed.

### The two carried gaps — one closed, one only narrowed (2026-08-09)

**✅ Multisite super-admin exemption — CLOSED.** A `WP_MULTISITE=1` lane now runs
the whole integration suite under multisite (`npm run test:php:multisite`, wired
into CI beside the single-site run — same containers, one extra suite pass). Three
new cases assert every half of the rule: a super admin IS exempt from the person
axis, an ordinary user on the same network is NOT, and the role axis still applies
to super admins. Writing them immediately caught a bad test of my own — it
authored the rule as an editor, whom the Gate 10 server-side gate correctly
refuses, so it would have asserted against an empty config and "proved" the hide
by proving nothing was saved.

**⚠️ Screen-reader pass — NARROWED, NOT CLOSED.** Added axe-core scanning of the
popover in both empty and populated states (the chips, results list and live-region
messages only exist after interaction, so an empty-state scan would miss most of
what the feature renders). Zero violations against wcag2a/2aa/21a/21aa, scoped to
the popover so wp-admin's own pre-existing findings don't train people to ignore
the suite.

**This is still not a screen-reader pass.** axe catches machine-detectable
violations; it cannot tell you whether the announcements make sense in sequence,
whether the live-region timing is usable, or whether the four similarly-named
groups are actually distinguishable in practice. A human with NVDA or VoiceOver
remains worthwhile, and no automated result should be read as having replaced it.

**21-05 Task 5 (human verification) — NOT PERFORMED AS SPECIFIED.** The plan
marked it `autonomous: false` and called for a person driving the real editor in
a browser before the phase closed. That did not happen. The phase was accepted
and merged 2026-08-09 on: a green CI gate (unit 167/167, integration 115/115,
JS 83/83, e2e 40 passed/0 failed, WPCS, PHPStan, Plugin Check 0 errors on the
ZIP), two Codex review rounds whose findings were all addressed, and Claude's
own browser-driven round-trip check during 21-04.

That is real evidence, and it caught five genuine defects — but it is not the
same claim as "a human verified it", so the record says which. Anyone reading
this later should know the person-picker UX and the four-group popover have not
been looked at by a human on a real screen.

**Open item —** the multisite super-admin exempt branch has NO
direct test: the suite runs single-site, so `is_multisite() && is_super_admin()`
never evaluates true under test. Assessed 2026-08-08 as **low priority** — the
blast radius is cosmetic-only (the enforced invariant makes an access effect
impossible) and multisite is explicitly not the supported target (§12 flags it
as a known risk, not a solved case). Covering it properly needs a second CI lane
(`-c tests/phpunit/multisite.xml`), which is disproportionate today. Stated in
`readme.txt` as a known behaviour rather than carried silently. Revisit if
multisite becomes a supported target.

Progress: [███████░░░] 67% (v1.4 shipped; Phase 21 executed and awaiting verification). Remaining: **Phase 26 (Release v1.5.0, created 2026-08-09 — REL-11)**, plus Phase 22 (demo) and Phase 25 (toolbar polish) as optional inclusions that do not block the cut.

## Release Binding

### Active milestone — v1.5 Per-User Visibility (Phase 26)

**Target version `1.5.0`, tag `v1.5.0`**, SVN deploy to WordPress.org `trunk`
following the v1.2/v1.3/v1.4 pipeline. A **minor** bump, not a patch: per-user
hiding is a new user-facing capability with a new stored config shape
(`hidden_users` / `child_hidden_users`).

**Why this milestone exists:** to release work that already exists. Phase 21
built ROLE-02's per-user half on 2026-08-08 and it is unreleased — v1.4.0 was cut
before it landed, under the documented fallback. v1.5 is a release vehicle first
and a scope container second.

**Cut condition:** Phase 21 merged and verified. Phases 22 (demo) and 25
(toolbar polish) are **optional inclusions** — each ships if complete at cut
time, otherwise slips without blocking. This is the same fallback shape that let
v1.4.0 ship cleanly without Phase 21, and it worked.

**Carried forward into the Phase 26 checklist (all learned the hard way):**

1. **Diff `v1.4.1..main` for user-facing commits before tagging** — do not trust
   the phase list. v1.4.0's changelog carried an overclaim caught only at gate 8.
2. **The SVN deploy is NOT auto-triggered.** A GitHub Release created via
   `GITHUB_TOKEN` does not fire `release: published`, so `wp-deploy.yml` needs a
   manual `workflow_dispatch` (`gh workflow run wp-deploy.yml -f tag=v1.5.0`).
   True for v1.3.0, v1.4.0, and v1.4.1 — plan the step in rather than rediscover it.
3. **Screenshot 3 is now stale.** It shows the visibility picker with two groups;
   the shipping UI has four. Recapture is mandatory, not optional.
4. **The wp.org API `version` field lags the SVN commit** by up to ~an hour. SVN
   is the truth at deploy time; do not treat an unchanged API response as failure.
5. **Gates 8–11 (review, a11y, security, performance) run consolidated over the
   full release diff**, not per-phase. The person-picker surfaces have never had
   an independent a11y pass — they were written to the bar, not audited against it.

**Known limitation to carry into the release notes:** on multisite, network
super admins are exempt from the per-user axis only; role axes keep their v1.4.1
behaviour. That branch is untested (single-site suite). Already in `readme.txt`.



**Interim patch — v1.3.1 ✅ SHIPPED 2026-07-05 (PR #88).** Phase 23's editor UX
restyle shipped early as a `1.3.1` patch (the only user-facing code on `main`
since `v1.3.0`; Phase 19 is docs-only). Tag `v1.3.1` on `e77729d` → GitHub
Release published → WordPress.org SVN deploy succeeded (trunk + `tags/1.3.1` +
assets); wp.org API confirms `1.3.1` live. Did **not** consume the v1.4.0 version.

**Release-pipeline lesson (v1.3.1):** the tag → GitHub Release step is automatic
(`release.yml` on `push: tags: v*`), but the **SVN deploy is NOT auto-triggered**
— a Release created via `GITHUB_TOKEN` does not cascade to the `release:
published` event, so `wp-deploy.yml` must be run manually via `workflow_dispatch`
(`gh workflow run wp-deploy.yml -f tag=vX.Y.Z`). This matched v1.3.0 (also a
manual dispatch). Plan the manual deploy step into every release.

**Milestone release — v1.4.0.** Target version `1.4.0`, tag `v1.4.0`, SVN deploy to
WordPress.org `trunk` following the v1.2/v1.3 release pipeline. `vX.Y` numbering
is reserved for shipped plugin releases. ROLE-02 (Phase 21) ships only if
Phase 19's feasibility verdict clears the cosmetic-only bar; otherwise it defers
and REL-10 ships without it.

### Release Checklist (v1.4.0)

The milestone is the system of record for its release (see the
`release_checklist` frontmatter). Carrying forward the standing lesson below —
diff `vLAST..main` for user-facing commits before tagging.

**✅ v1.4.1 SHIPPED 2026-08-05** — patch release for the shared-slug
propagation defect. PR #116 squash-merged as `c6cdcbe`; tag `v1.4.1`; GitHub
Release published; SVN `trunk` Stable tag 1.4.1 + `tags/1.4.1/` verified; wp.org
API confirms `1.4.1`. Not a security release: the propagation could apply an
unintended rename or hide, but it can neither widen access (it only ever removes
rows, and the S-1 `current_user_can()` guard keeps core's `$_wp_menu_nopriv` 403
gate intact) nor revoke it (hiding is cosmetic — the page still loads by URL).

The fix took two Codex P2 rounds on #115. The first gate tested
`$nk === $norm_parent`, catching only WordPress's self-link shape; a plugin can
park a submenu under an unrelated parent whose slug matches a top-level row's.
Widened to `isset( $top_rendered_matches[ $nk ] )`. Both rounds reproduced with a
failing test before the fix.

**Migration caveat worth remembering:** the v1 → v2 bump deliberately KEEPS a
submenu label already renamed by propagation, so nothing changes under the user
unexpectedly — which means a user who considered that rename a bug must use
Reset Item on the child once. Stated in the 1.4.1 changelog and Upgrade Notice.

**✅ v1.4.0 SHIPPED 2026-08-04** — PR #113 squash-merged as `482510c`; tag
`v1.4.0`; GitHub Release published with `maestro-menu-editor.zip`; wp.org SVN
verified (`trunk` Stable tag 1.4.0, `tags/1.4.0/`, all 6 screenshots + banners +
icons in `assets/`). The wp.org API's `version` field lags the SVN commit by up
to ~an hour — SVN is the truth at deploy time. ROLE-02 (Phase 21) did NOT ship;
deferred to v1.5 per the Release Binding fallback.

| # | Item | Status |
|---|------|--------|
| 1 | Zero-regression gate green (CI on the release PR) | ✅ unit 140/140 (189 assertions), integration 75/75 (183), JS 64/64, e2e 36 pass/28 capture-skipped, capture 55/55, WPCS, PHPStan, doc-links |
| 2 | Version strings bumped via `prep-release.sh` | ✅ |
| 3 | **Changelog covers ALL user-facing changes since last tag** (diff `v1.3.1..main`) | ✅ (corrected once — see gate 8) |
| 4 | Upgrade Notice entry for 1.4.0 | ✅ 266 chars (Plugin Check limit 300) |
| 5 | **Directory + editor screenshots reflect shipping UI** | ✅ 1–6 + per-scheme surfaces recaptured; screenshot 3 now shows the two-group popover |
| 6 | Tag points at a `main` commit with all code + final readme | ✅ `482510c` |
| 7 | Tag + GitHub Release published; SVN trunk/tag/assets confirmed | ✅ |
| 8 | **Code review clean** | ✅ **2 findings, both fixed.** (a) Multibyte titles/slugs were truncated at a byte offset, and the new markup-free fast path's `htmlspecialchars()` returns `''` on invalid UTF-8 — a long CJK/emoji label rendered as a BLANK row. Fixed via `Config::truncate_bytes()` + `ENT_SUBSTITUTE`. (b) Codex P2: the changelog claimed shared-slug collisions were fixed in both directions; only the submenu direction isolates (bare top-level keys still match both scopes by the zero-regression contract). Wording narrowed; gap captured as a todo. |
| 9 | **A11y sweep passed** — WCAG 2.2 AA, Default/Modern/Midnight | ✅ S1 fix verified (`role=group` + uniquified `aria-labelledby`). Toolbar re-measured from release captures: glyphs `#c3c4c7` = **9.11:1** on `#1d2327`, Reset All 5.28:1 — the 2026-08-01 "2.8:1 blue icons" report does NOT reproduce and was closed as stale. M2/M3 remain deferred to Phase 25. |
| 10 | **Adversarial security pass clean** | ✅ S-1 capability guard correct + test-enforced; submenu site's unguarded `unset` sound (core registers `$_wp_submenu_nopriv` before this late pass). `Title::replace_label()` not XSS-exploitable (`DOMText::nodeValue` escapes on serialize; label `sanitize_text_field`'d); no XXE (`loadHTML` without `LIBXML_NOENT`/`DTDLOAD`). Config bounds complete. Known LOW: qualified-key entity collision (todo). |
| 11 | **Performance assessment acceptable** | ✅ `Title::replace_label` benchmarked at 20k iterations: **0.39 µs** markup-free fast path, **6.5–9.4 µs** DOM path. Only stored overrides invoke it; a pathological all-renamed 75-row menu is ~0.7 ms. |

**Gate status note (2026-08-02):** a first a11y + adversarial-security pass ran against the **Phase 20 diff** (not the full release). Security: **safe-to-merge** (Title::replace_label not XSS-exploitable — label double-escaped, preserved markup = WP's own raw-render model; cosmetic-only invariant intact & test-enforced; REST authz/CSRF correct; one optional LOW hardening L1 = entity-smuggled `&gt;` key self-collision, admin-only cosmetic). A11y: **pass-with-issues** — S1 (WCAG 1.3.1 A, serious): the two visibility-popover role groups lack a programmatic group name (no fieldset/legend or role=group+aria-labelledby) so a SR user can't distinguish "hide item" vs "hide sub-items"; M2/M3 minor. Gates 8-11 remain Pending — they re-run consolidated across the full release diff at Phase 24.

**Standing lesson for future milestones:** before any release tag, diff
`vLAST..main` for user-facing commits and confirm (a) every user-facing change
is in the changelog and (b) the directory assets still match the shipping UI —
don't rely on a per-milestone assets phase to surface these.

## Performance Metrics

Automated velocity capture was never reliable for this project; the prior table
held placeholder/garbage values (removed 2026-07-02). Per-plan task/file counts
live in each phase's SUMMARY.md if needed.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [GSD tooling]: Milestones are pinned to release artifacts in STATE.md (`release_target`, `release_tag`, release status, cut condition, pipeline, and checklist) so milestone completion cannot drift from the version tag/publish step.
- [Phase 07]: Non-color status via ::before glyphs replaced with dashicons; idle dot de-emphasised (BUG-04/BUG-05)
- [Phase 07]: First-run cue as fixed bar above toolbar, localStorage-gated — same gate pattern applies to UX-03
- [Phase 07]: BUG-03 toolbar wrap/stack at narrow widths landed — UX-07 continues from this base for denser mobile sizing
- [Phase 09]: Single phase for all three v1.2 requirements — UX-03/UX-04/UX-07 are independent CSS/JS changes to one surface (assets/maestro.js, assets/maestro.css, includes/class-assets.php); no split needed at coarse granularity
- [Phase 09]: Behavioral JS (first-run cue gate, indicator state transitions) is test-eligible via node:test; CSS-only sizing is TDD-exempt per project CLAUDE.md
- [Phase 09-editor-ux-polish]: modeStatusLabel returns '' for idle; 'Edit Mode' label is DOM-built in Plan 02
- [Phase 09-editor-ux-polish]: firstRunSeen returns true on storage.getItem throws to safely suppress cue
- [Phase 09-editor-ux-polish]: modeLabel key + LocalizationTest update shipped in one commit (never red mid-plan)
- [Phase 09-editor-ux-polish]: idle dashicon is real DOM span (aria-hidden), not ::before, avoiding BUG-04 regression
- [Phase 09-editor-ux-polish]: setStatus uses textContent='' at idle (not hidden attr); live region always present, only content varies
- [Phase 09-editor-ux-polish]: Dual-path pulse cleanup: animationend (motion) + dismiss() (reduced-motion/early-dismiss) — animationend never fires under prefers-reduced-motion:reduce
- [Phase 09-editor-ux-polish]: firstRunSeen gate seam now consumed by buildFirstRunCue() — inline try/catch replaced by window.maestroLogic.firstRunSeen()
- [Phase 09-editor-ux-polish]: renamePlaceholder key + LocalizationTest in same commit — integration never red between commits
- [Phase 09-editor-ux-polish]: rename key retained in payload as SR label textContent; visually-hidden label provides accessible name; placeholder is NOT an accessible name
- [Phase 09-editor-ux-polish]: placeholder colour #8c8f94 (WP muted-text token, AA non-text contrast); opacity:1 overrides Firefox default 0.54
- [Phase 09-editor-ux-polish]: 700px density screenshot approved (no restructure) — flex-wrap (BUG-03) + denser padding/font is sufficient; 44px min-height floor fixed at WCAG 2.5.5 AAA
- [Phase 09-editor-ux-polish]: specificity rule for media-query overrides — use parent scoping (.maestro-toolbar .child) not !important
- [Phase 09-editor-ux-polish]: wave-boundary e2e gate pattern — when Docker/sandbox blocks per-task e2e, run full Playwright suite once at wave boundary before the regression-gate plan
- [Phase 09-editor-ux-polish P06 sign-off]: "Edit Mode" (not the literal "Menu Edit Mode") is the LOCKED idle indicator text — user's refinement; satisfies UX-03's intent (short, glanceable, non-colour-signalled); reconciliation recorded in ROADMAP Phase 9 success criteria. Same pattern as Phase 8 / REL-06.
- [Phase 09-editor-ux-polish P06 sign-off]: Full suite green at sign-off — JS logic 53/53, PHP unit 44/44, integration 29/29, e2e 24/24, phpcs clean, Plugin Check 0 errors on shippable source. 3 e2e regressions caught and fixed by the orchestrator's full-suite gate (commits 38323c4, 927b682); 2 dead-surface items removed in code review (commit 1ef7fae).
- [Phase 11.1-p1-review-hardening]: has_top_order() is public (not private): WP filter dispatch requires public visibility for array-style callbacks — private raises TypeError at call_user_func_array
- [Phase 11.1-p1-review-hardening]: custom_menu_order gate reads config at filter-call time so WP's per-load invocation gets the live stored value; menu_order/reorder_top stays unconditional (harmless when gate is off, no-ops on empty order)
- [Phase 11.1-p1-review-hardening]: HARD-02: Config::MAX_* constants pattern — all six size caps are named public class constants; tests reference Config::MAX_* never literals; data-URI over-limit dropped to '' (not substr'd — truncated base64 is corrupt)
- [Phase 11.1-p1-review-hardening]: HARD-02: WP function stubs added to bootstrap-unit.php (not test file) — allows Config::sanitize() pure-unit calls including hidden_roles cap (wp_roles stub returns 60 roles); stubs use if(\!function_exists()) guards
- [Phase 11.1-p1-review-hardening P03]: HARD-03: Race (a) exit detection via maestro_edit=1 URL presence/absence — avoids coupling test to server-computed D.exitUrl
- [Phase 11.1-p1-review-hardening P03]: HARD-03: Race (b) uses page.on('request') counter (deterministic) not negative waitForResponse timeout (non-deterministic)
- [Phase 11.1-p1-review-hardening P03]: HARD-03: Race (c) uses response-order array (responses.push inside waitForResponse callbacks) to assert POST before DELETE without sleeps
- [Phase 11.1-p1-review-hardening P03]: HARD-03: E2E run deferred to Wave 2 boundary (Plan 04 gate, Docker, sandbox-disabled) — spec authored only; not marked green until boundary run passes
- [Phase 11.1-p1-review-hardening]: Phase 11.1 signed off 2026-06-20: zero-regression bar held (PHP unit 61/61, JS 53/53, integration 33/33, e2e 28/28, phpcs clean, PHPStan 0 errors, Plugin Check 0 errors); HARD-01/02/03 Complete
- [Phase 11-editor-entry-reorder-fixes]: AdminBarTest.php placed in tests/integration/ not unit: Admin_Bar::node() needs WP runtime; unit bootstrap is WP-free by design
- [Phase 11-editor-entry-reorder-fixes]: BUG-06 Wave 0 test probes separator count and test.skip()s if none present — never passes vacuously; fixture added in 11-03
- [Phase 11-editor-entry-reorder-fixes]: UX-08a icon-only assertion uses .ab-icon visible + bounding-width proxy (selector-agnostic) to avoid coupling to label-wrapper class chosen in 11-02
- [Phase 11-editor-entry-reorder-fixes]: maestro-ab-label wrapper added in class-admin-bar.php so CSS icon-only rule has stable plugin-scoped hook; meta.title is state-conditional (Edit Admin Menu / Exit Editor); display:block override uses specificity (0,2,1) matching WP core whitelist pattern — no \!important
- [Phase 11-editor-entry-reorder-fixes]: BUG-06: single-node insertBefore keyed off dir and maestroChildren index; no new helper (pure DOM glue, not unit-testable as expect(fn).toBe(out))
- [Phase 11-editor-entry-reorder-fixes]: BUG-07: removal code stays li.querySelector() — badge is still descendant of <li> after target change; no CSS edit (maestro.css owned by 11-02)
- [Phase 11-editor-entry-reorder-fixes 11-05 gap-closure]: UX-08a enter-state guard navigates /wp-admin/index.php (no maestro_edit) at 782px/600px — RED because class-assets.php early-returns before enqueuing maestro.css in non-edit state; 11-06 turns it GREEN
- [Phase 11-editor-entry-reorder-fixes 11-05 gap-closure]: Reorder test renamed to control-driven, OS-independent; L373-374 re-focus cheat removed; Alt+ArrowDown replaced by button.maestro-move-down clicks; rename-input focus asserted after selectItem — RED because button absent; 11-07 turns it GREEN
- [Phase 11-editor-entry-reorder-fixes]: 11-06 removes maestro.css duplicate toggle override; 11-07 adds to the same file in a separate commit in dependency order — no conflict
- [Phase 11-editor-entry-reorder-fixes]: Always-loaded micro-stylesheet pattern: maestro-admin-bar.css holds only the always-needed admin-bar CSS; heavy editor bundle stays edit-mode-gated
- [Phase 11-editor-entry-reorder-fixes]: 11-07: moveSelected(dir,opts) shared function: opts.restoreFocusToAnchor for keyboard path; button path omits (not detached by insertBefore)
- [Phase 11-editor-entry-reorder-fixes]: 11-07: aria-keyshortcuts dropped entirely — Alt+Arrow retained but undiscoverable; ▲/▼ buttons are OS-independent discoverable affordance
- [Phase 11-editor-entry-reorder-fixes]: 11-07: iconButton() helper routes all five secondary panel buttons through one code path to prevent icon/label drift
- [Phase 11-editor-entry-reorder-fixes]: 11-08: WP_ENV_TESTS_PORT honored in BOTH playwright.config baseURL AND global-setup login URL — lets e2e run on an alternate tests port when 8889 is taken by another wp-env project (gate ran on 8899)
- [Phase 11-editor-entry-reorder-fixes]: 11-08: race(b) HARD-03 failure root-caused to e2e click-delivery — 11-07's extra panel buttons enlarged the position:fixed flex-wrap toolbar so the live rename preview reflowed it mid-click; product is correct (genuine Reset-All click cancels the queued autosave, DELETE wins, no persist). Hardened by committing the rename first (settle layout, keep queued autosave) and asserting reset-wins/no-persist; postCount===0 dropped (it only held for a sub-500ms click). No-persist reload assertion retained as anti-masking guard
- [Phase 12-release-assets-refresh]: Tagline auto-fit loop uses >ww (wordmark width) not >maxw (full column); full tagline string retained — ww constraint produced legible font size without fallback
- [Phase 12-release-assets-refresh]: E2E regression gate deferred to orchestrator: Docker/wp-env required; deterministic gate (banners + screenshot sizes + caption count) runs fully sandbox-OK
- [Phase 12-release-assets-refresh]: 12-03 caption copy reflects v1.2 UX changes: auto-clearing Saved state, unified icon-only toolbar, sortable group drag, accessible ▲/▼ sub-item move controls
- [Phase 13-compatibility-harness-classification-schema]: SCHEMA.md remains pristine; future surveys copy it to SURV-NN files and fill in the copies.
- [Phase 13-compatibility-harness-classification-schema]: Fix-category labels include the requirement wording and the automated-verification plain-text alias for later admin_menu re-hook.
- [Phase 14-woocommerce-survey]: SURV-01 dump method hooks admin_menu @ PHP_INT_MAX (Maestro's replay priority) and exits before WP priv-filtering; WP_ADMIN must be force-defined via --exec or WC_Admin_Menus never loads and the dump silently omits the top-level WooCommerce item
- [Phase 14-woocommerce-survey]: WooCommerce exhibits all six manipulation dimensions; key collision surface for Maestro is top-level reorder (both hook custom_menu_order/menu_order) and badge-in-title loss on rename (degraded)
- [Phase 14-woocommerce-survey]: SURV-01 Part 2: top-level Reorder is degraded not broken — item order honored+persists, but WC's menu_order filter (prio 10, after Maestro) re-clusters separator-woocommerce against the woocommerce item (cosmetic separator override)
- [Phase 14-woocommerce-survey]: SURV-01 Part 2: Hide is always degraded (cosmetic per-role unset, never strips a cap; page LOADS by URL); hide-parent does NOT cascade to children; submenu re-icon is N/A. No broken cells across 34 rows
- [Phase 14-woocommerce-survey]: SURV-01 Part 3: all 6 surfaced issues classified (5 documented-limitation + 1 slug-resolution tweak for entity-encoded Products slugs); 0 broken cells so no later-admin_menu-re-hook fix warranted in R1
- [Phase 14-woocommerce-survey]: SCHEMA.md finalized with 6 batched additive refinements + promoted Interaction Scenarios section under a Phase 14 changelog; no restructuring needed; SURV-01 reconciled. Template now in final form for Phase 15 (no longer pristine by design)
- [Phase 15-remaining-survey-set]: SURV-02: WP_ADMIN=true required for Jetpack dump too; jetpack_admin_page grants admin-only in disconnected state; Settings submenu slug is absolute URL requiring slug-resolution tweak; 0 broken cells across all rows; S2/S3 interaction scenarios safe
- [Phase Phase 15-remaining-survey-set]: SURV-03: Yoast SEO dual-slug role-conditional registration (wpseo_dashboard for admin / wpseo_page_academy for editor+shop_manager) — documented as limitation; Rank Math out-of-scope/deferred (Yoast is locked SEO choice); 0 broken cells across 13 rows
- [Phase 15-remaining-survey-set]: SURV-04: Elementor registers three top-level menus (elementor-home, Templates CPT, elementor); only elementor-home is visible — other two are CSS-hidden by admin_head; all three are valid Maestro replay-state targets
- [Phase 15-remaining-survey-set]: SURV-04: 0 broken cells across 18 matrix rows (3 tops + 15 submenus); Website Templates has absolute URL slug with ver= version param (I1, slug-resolution tweak); Categories slug entity-encoded &amp; (I2, same as SURV-01 I3)
- [Phase 15-remaining-survey-set]: SURV-05: WPForms Lite uses manage_options for all items — editor/shop_manager have no WPForms surface; submenus not even registered for those roles; 0 broken cells across 14 rows; Payments NEW\! badge + Addons color span = degraded rename (convention 3); Upgrade to Pro absolute URL slug = slug-resolution tweak
- [Phase 15-remaining-survey-set]: SURV-06: lms_manager not provisioned — three baseline roles suffice for Hide coverage (lms_manager would only replicate admin pattern for submenus already cap-gated from editor/shop_manager)
- [Phase 15-remaining-survey-set]: SURV-06: llms-separator does NOT re-cluster on reorder (LifterLMS has no menu_order filter, unlike WooCommerce separator) — documented limitation I1
- [Phase 15-remaining-survey-set]: SURV-06: lifterlms submenu Reorder degraded — submenu_order() via custom_menu_order overrides Maestro sub_order at render time (F6); documented limitation I2
- [Phase 16-synthesis]: LifterLMS rename classification: source survey (SURV-06) governs over synthesis_inputs pre-extraction — taxonomy rename = safe when &amp;-encoded slug used; slug-resolution is a documented limitation, not a degraded classification
- [Phase 16-synthesis]: COMPATIBILITY-NOTE.md cross-plugin cross-cut section names recurring patterns (badge-in-title loss, slug-resolution, render-time filter override, cosmetic hide, submenu N/A re-icon) without assigning COMPAT-xx IDs — those belong in DELV-02 (Plan 16-02)
- [Phase 16-synthesis]: COMPAT-01..03 are actionable slug-resolution tweaks (highest FIX-xx priority); COMPAT-04..13 are documented limitations; 42 survey issues collapse to 13 COMPAT-xx items with 0 orphans
- [Phase 16-synthesis]: FIX-xx in REQUIREMENTS.md now links BACKLOG.md (COMPAT-xx backlog) as its seed without renaming; COMPAT-07 (badge-loss) and COMPAT-10 (parent-hide non-cascading) carry forward candidacy notes for special-casing in a later milestone
- [v1.3.0 roadmap]: FIX-01/02/03 grouped into ONE implementation phase (Phase 17) — all three are normalization rules on the same `normalize()` pure function applied at the same two resolve seams in class-replay.php; splitting into three thin phases would create artificial boundaries around a single coherent unit of work
- [v1.3.0 roadmap]: Phase 18 is a pure release phase (REL-09 only) following the v1.2 pipeline — build, Plugin Check, full-suite regression gate, tag v1.3.0, SVN deploy
- [Phase 17-slug-normalization]: wp_parse_url() used over parse_url() for WPCS compliance; stubbed in bootstrap-unit.php; manual explode('&') tokenizer preserves duplicate params without deduplication
- [Phase 17-slug-normalization]: strrpos('/wp-admin/') boundary detection enables host-move survival without exact admin_base match; TDD gate rule: RED in working tree, test+impl GREEN commit together
- [Phase 17-slug-normalization]: Single normalized-key code path in Replay (NOT exact-first-then-fallback): always normalize BOTH stored override key and rendered slug via Slug::normalize($key, admin_url(''))
- [Phase 17-slug-normalization]: Ordering::submenu kept pure/untouched: reorder threading via normalized copies of children with orig_by_norm map to restore raw slugs (non-destructive)
- [Phase 17-slug-normalization]: Dual-axis collision fail-safe: Axis-1 (two stored keys same normalized key → apply nothing) + Axis-2 (one normalized key matches 2+ distinct rendered items → skip)
- [Phase 17-03]: Bug found in gate: class-slug.php missing from require_once list in maestro-menu-editor.php — fixed as Rule 1 (all 16 integration normalization tests failed with 'Class Maestro\Slug not found'); committed as fix(17-03)
- [Phase 17-03]: Plugin Check run with --exclude-directories excluding tests,bin,docs,build,vendor,node_modules,playground,.planning,.claude,.github,test-results — shippable-source gate invocation for this project's dev-tree mapping pattern
- [Phase 17-03]: wp-env started on alternate ports 8890/8899 (dev/tests) — 8888 and 8889 both held by other projects; established port-contention pattern (STATE.md note)
- [Phase 23-editor-ux-polish]: 23-01: modeStatusLabel copy already matched CONTEXT's locked Gutenberg-muted wording — no i18n reword needed; Task 1 verification-only, no commit
- [Phase 23-editor-ux-polish]: 23-01: kept dashicons-update spin (font-based, zero added payload) over core .spinner (background-image asset) for the saving-state glyph
- [Phase 23-editor-ux-polish]: 23-01: kept the existing bullet-dot modified-row badge, only recoloured amber to neutral #c3c4c7 — already matched the Gutenberg unsaved-changes idiom, no new glyph needed
- [Phase 23-editor-ux-polish]: 23-02 Task 2: admin-bar toggle relabelled 'Exit Menu Editor' is the single entry/exit; save-flush-on-exit re-homed onto its click intercept (bindAdminBarExit); Reset All underline bug fixed to match core .button-link-delete exactly (no underline at rest or hover)
- [Phase 23-editor-ux-polish]: 23-03: popover/tab/cell tokens were already at core values from prior plans; the only gap was missing focus-visible rings on icon-search, icon-none, icon-tab, vis-row checkboxes, and the rename input — added the consistent core-blue ring (#2271b1) to all; panel divider/label/field text stay hardcoded (no WP admin-colour-scheme CSS variable exists for a custom-drawn toolbar/panel surface to inherit)
- [Phase 23-editor-ux-polish]: 23-04: wp-pointer adaptation REPLICATE-LOCALLY confirmed (locked default held, not escalated to enqueue) — coachmark reads as a native core wp-pointer via a locally-styled card/footer-button-band/directional-arrow, .maestro-tour* DOM/classes and class-assets.php untouched; BUG-08 fixed via centered footer band + balanced content; in-menu selection/modified-dot reconfirmed token-aligned (dot not reverted); checkpoint verified on Default admin colour scheme only, Modern/Midnight deferred to 23-05
- [Phase 23-editor-ux-polish]: 23-05 (phase close): e2e reconciliation deliberately isolated to one final-wave plan — every drifted selector/colour assertion updated with reasoning visible in the commit, none silently deleted; tour.spec.ts needed zero changes (already matched 23-04's classes); Plugin Check's 4 dev-tree findings verified (git diff main...HEAD) as pre-existing and untouched by any Phase 23 commit, deferred to Phase 24's build-then-check pipeline against the release ZIP rather than fixed out-of-scope here; Phase 23 complete (5/5 plans), UX-09/UX-12/UX-13/BUG-08 all delivered
- [Phase 20-third-party-compatibility-fixes]: 20-01: Slug gained qualified-key (parent>child) parse/normalize helper; Config::sanitize() accepts qualified items keys, cleans each half independently, drops icon on submenu keys
- [Phase 20-third-party-compatibility-fixes]: 20-02: Replay::replay()'s submenu loop resolves qualified parent>child keys FIRST, with a legacy bare-key fallback that keeps every pre-existing config's both-scope behavior unchanged until re-saved; both Axis-1 (normalized_items() via Slug::normalize_qualified()) and Axis-2 (independent per-path pre-scans) collision guards extended, not replaced
- [Phase 20-third-party-compatibility-fixes]: 20-02: A qualified key's parent-half-miss needs no explicit skip branch — the qualified candidate key is only ever built from the loop's own rendered parent, so an orphaned qualified override never produces a matching lookup key and degrades silently by construction
- [Phase 20-third-party-compatibility-fixes]: 20-02: get_menu_model() submenu nodes gained a qualifiedKey field (alongside slug); resolved_hidden_roles() takes an optional $parent_slug (null = top-level bare-only, non-null = submenu qualified-first/bare-fallback) so editor display and replay() apply stay in lockstep
- [Phase 20]: 20-03: assets/maestro.js keys each submenu child by its qualified parent>child identity (model[key], not model[bare_slug]); selectedSlug/liForSlug renamed selectedKey/liForKey since both now hold a generic key that can be qualified
- [Phase 20]: 20-03: submenu <li> bound to its model key by resolved anchor href/slug (findSubmenuLi/resolveSubmenuHref), not .wp-submenu array position, with a positional fallback if no href match is found — the minimal A1b fix; full A1b hardening stays deferred
- [Phase 20]: 20-03: buildConfig() drops the topSlugs early-return and emits the shared-slug submenu override under its qualified key, matching the server's qualified-first/legacy-bare-fallback resolution from 20-02; COMPAT-04 live-verified against real WooCommerce in the compat wp-env checkpoint
- [Phase 20]: 20-04: Title::replace_label()'s candidate-node rule is depth-first/document-order, first text node whose trimmed value is non-empty AND not purely numeric — a bare digit run (badge/count inner text) is never mistaken for the label, so icon+count-only titles correctly signal no-text-node (null) instead of swapping the count
- [Phase 20]: 20-04: Title kept entirely WP-free (DOMDocument/libxml only, no wp_* calls) so it lives in the fast pure-unit suite; registered in maestro-menu-editor.php's require list and tests/bootstrap-unit.php's unit bootstrap alongside Ordering/Slug/Config
- [Phase 20]: 20-04: the wholesale-fallback decision stays in the WP-coupled caller (Replay::replay()), not inside Title::replace_label() — the pure helper only returns null on no-text-node; storage never changes shape, badge HTML is re-extracted from the live title every request and never stored
- [Phase 20]: 20-05: Cascade::effective_hidden_roles() is a single unconditional role-list union gated only by the cascade_hide bool — no separate "rides the parent hide" or "role-mirror" branches needed, since merging with an empty/absent parent hidden_roles set is naturally a no-op and only the parent's OWN hidden_roles ever enter the union; the function never calls current_user_can() or any capability API
- [Phase 20]: 20-05: cascade's parent lookup in Replay::replay()'s submenu loop reuses the exact same norm_items/norm_skip (Axis-1) and top_skip_rendered (Axis-2) guards already computed for the top-level pass — an ambiguous parent resolves to no override, so cascade never fires for it, consistent with the "when resolution is ambiguous, apply nothing" collision philosophy
- [Phase 20]: 20-05: a child with no override of its own is no longer skipped outright in the submenu loop — the parent's cascade may still hide it; is_hidden_for_current_user() now always runs against the unioned effective list, collapsing to exactly the child's own rule when cascade is off (zero regression by construction)
- [Phase 20]: 20-05: cosmetic-only guardrail proven two ways in one integration test — the editor role's entire capabilities map is byte-for-byte identical before/after a cascade rule, and the exact capability the hidden child's own page gates direct access on (edit_posts) still resolves true, i.e. the page remains directly loadable by URL despite its sidebar row being unset()
- [Phase 20]: **SUPERSEDED 2026-08-02** — the four 20-05 decisions above describe the boolean `cascade_hide` + "rides the parent hide" model, found INERT during the 20-06 checkpoint (WordPress core already hides a hidden parent's whole rendered subtree, so cascading on top of it produced no observable difference). Reworked into an independent `child_hidden_roles` model — see the 20-06 (revised) entries below.
- [Phase 20]: 20-06 (revised): `Cascade::effective_hidden_roles()` simplified from a 3-arg flag-gated computation to a 2-arg unconditional union (child's own `hidden_roles`, parent's `child_hidden_roles`) — no flag, no gating on the parent's own hide at all; the two role sets are fully independent by construction, which is what makes a parent stay visible while its children vanish (a genuinely observable effect the superseded model could never produce)
- [Phase 20]: 20-06 (revised): the visibility popover's two role groups ("Hide this item from:" / "Hide its sub-items from:") share one `buildRoleGroup()` closure in `assets/maestro.js` keyed by `getSet()`/`setSet()` accessors — a toggle in one group never touches the other's model field or the `maestro-has-hidden` class (which reflects only the item's own `hiddenRoles`)
- [Phase 20]: 20-06 (revised): e2e verification pattern changed with the model — because the revised effect is genuinely visible in the sidebar (parent stays, children vanish), `cascade-hide.spec.ts` asserts it DIRECTLY via a second authenticated browser context instead of the superseded model's wp-cli/`$submenu`-dump workaround (`dump-cascade-submenu.php`, deleted as no longer needed)
- [Phase 20]: 20-06 (revised): Plugin Check against a differently-named scratch folder (to avoid colliding with the live bind-mounted plugin path) trips `TextDomainMismatch` false positives — `wp plugin check <folder> --slug=<canonical-slug>` tells Plugin Check the correct slug independent of the scratch folder's name; established pattern for any future dev-tree-vs-shippable-ZIP Plugin Check run that can't check the real installed path directly

### Roadmap Evolution

- GSD milestone release binding added to STATE.md: v1.2 now carries explicit target release `1.2.0`, tag `v1.2.0`, cut condition, pipeline, and release checklist.
- Phase 11.1 inserted after Phase 11: P1 review hardening — scope `custom_menu_order`, bound config payload, save-race E2E coverage (from the 2026-06-20 code-review follow-up). Lands inside the 9 → 11 → 12 cut path, before the 1.2.0 tag.
- R1 roadmap created 2026-06-22: 4 phases (13–16), 11 requirements mapped; non-versioned research track, no release.
- v1.3.0 roadmap created 2026-06-29: 2 phases (17–18), 4 requirements mapped; FIX-01/02/03 in Phase 17, REL-09 in Phase 18.
- v1.4 roadmap created 2026-07-03: 6 phases (19–24), 10 requirements mapped. Phase 19 (ROLE-01 feasibility gate) precedes Phase 21 (ROLE-02, conditional). Phase 20 groups the three R1 COMPAT-xx fixes (COMPAT-04/07/10). Phase 22 (DEMO-01) depends on Phase 20 so the showcased fixes actually exist. Phase 23 groups the three small UX/BUG polish items (UX-09, UX-12, BUG-08). Phase 24 (REL-10) depends on all five feature phases.
- Phase 23 widened + pulled forward 2026-07-03 (`/gsd:discuss-phase 23`): UX-13 added (native wp-admin restyle of all edit-mode surfaces; requirements now 11); UX-12 discuss-and-refine resolved to remove the semantic-colour borders; Phase 23 executes next (depends only on Phase 18). Decisions in `phases/23-editor-ux-polish/23-CONTEXT.md`.
- Phase 19 context gathered 2026-07-04 (`/gsd:discuss-phase 19`): ROLE-01 feasibility-note decisions locked — evaluate both per-user + cloned-role (recommend simpler first, partial-go allowed); "cloned role" = Maestro-internal hiding profile (never `add_role()`); go bar = `current_user_can()` provably unchanged, anchored to the shipped per-role proof; storage recommended among bounded options under the sparse contract; resolution widens `is_hidden_for_current_user()`; enforcement is out of scope with **no wp-sudo dependency assumed** (reframed V2-17 in PROJECT.md/REQUIREMENTS.md to match). Decisions in `phases/19-cosmetic-hiding-feasibility/19-CONTEXT.md`.
- Ordering decision 2026-07-04: plan Phase 19 next (small research deliverable, unblocks the ROLE-01→Phase 21 gate), then execute the already-planned Phase 23 (5 plans). Phase 19 has no dependents on its *plan*, only on its verdict before Phase 21.
- Phase 20 complete 2026-08-02 (COMPAT-04/07/10; 6/6 plans; verified 5/5). COMPAT-10 was **redesigned mid-execution**: the boolean `cascade_hide` "rides-the-parent-hide" model (20-05) was found inert (WP core drops a hidden parent's whole subtree; cosmetic-only forbids URL blocking), so it was replaced with an **independent per-parent `child_hidden_roles`** role set (second "Hide its sub-items from:" popover group; parent stays visible; union with child's own hidden_roles; pure visibility) plus a derived locked-checkbox affordance. Decision recorded in the 20-CONTEXT.md REVISION NOTE.
- Phase 25 added 2026-08-02: Edit-Mode Toolbar Dark-Surface Polish (dark-toolbar icon/focus WCAG contrast, save-indicator layout shift, rename commit feedback) — pre-existing v1.3.1 toolbar surfaces surfaced during Phase 20 browser verification; **non-blocking for v1.4.0**. Appended after Phase 24; placement (before release vs later) is the user's call. Seed: `todos/pending/2026-08-01-editor-toolbar-icon-contrast.md`.

### Pending Todos

- **Named config presets + JSON export/import** — v1.5 candidate; supersedes/extends V2-06 (SPEC.md Roadmap item 6). Research captured in `todos/pending/2026-07-03-config-presets-export-import.md`
- **Declutter switch (non-core menu items → bottom section)** — v1.5 candidate; needs discuss/feasibility pass (top_order precedence, CPT handling). Research captured in `todos/pending/2026-07-03-declutter-switch-non-core-menu-items.md`
- ~~**Research Admin Menu Editor (Jānis Elsts) prior art**~~ — ✅ DONE 2026-08-01 (pulled forward from v1.5 to feed Phase 20). Findings note: `compat/PRIOR-ART-admin-menu-editor.md` (adopt/avoid/differentiate; AME 1.15.1 source read). Key inputs to Phase 20: COMPAT-04 → adopt AME's parent-scoped `parent>child` submenu identity; COMPAT-07 → split editable label from preserved title markup; COMPAT-10 → no prior art, Maestro-original. Cosmetic-only stays Maestro's differentiator (AME conflates hide with access). Todo moved to `todos/completed/`.
- **V2-15 (backlog)** — role cloning for per-user menu hiding: superseded by ROLE-01/ROLE-02 in the v1.4 roadmap (Phases 19/21); no longer separately deferred
- **COMPAT-04, COMPAT-07, COMPAT-10, DEMO-01** — no longer deferred; mapped to v1.4 Phases 20 and 22

<!-- REL-07/REL-08 removed 2026-07-02: completed in v1.2 Phase 12 (Release Assets Refresh), not deferred — verified in milestones/v1.2-MILESTONE-AUDIT.md. -->

### Follow-ups (non-blocking)

- (none currently)

<!-- Capture-spec output-path follow-up removed 2026-07-04: resolved in 7abe7d1 — all three capture specs (capture-screenshots, capture-directory-screenshots, editor) now write to tests/e2e/screenshots/… instead of archived phase dirs; MAESTRO_CAPTURE gating unchanged. -->
<!-- Dependabot alert #14 (js-yaml < 3.15.0, GHSA-h67p-54hq-rp68, dev-only via @wordpress/env) resolved 2026-07-04: in-range lockfile bump to 3.15.0. -->
<!-- js-yaml < 3.15.1 (GHSA-5p4m-2wfm-xmqj / CVE-2026-59870, quadratic CPU in !!omap, high; dev-only via @wordpress/env) resolved 2026-08-08 in #118: in-range lockfile bump to 3.15.1, same shape as the 3.15.0 fix above. Surfaced as a CI failure in "Dependency metadata + audits", not a Dependabot alert. bin/audit-npm.mjs `allowed` set stays empty — no allowlist entry. -->

### Blockers/Concerns

- **RESOLVED (2026-06-22) — 11-08 Wave 2 gate:** Ran sandbox-disabled on this project's wp-env. Port 8889 was held by another wp-env project, so this stack was started on **dev 8898 / tests 8899** and the gate run via `WP_ENV_TESTS_PORT=8899` (the alternate-port path the 11-08 config change enables); the other project's stack was left untouched. Gate GREEN: JS 53/53, PHP integration 37/37, e2e 32 pass/0 fail, screenshots 4/4. Tear down with `npx wp-env stop` when done.
- **RESOLVED (2026-07-02) — Phase-07 screenshot churn:** the Phase-07 captures (`editor.spec.ts`) are now `MAESTRO_CAPTURE`-gated like the Phase-11/12 capture specs, so a normal e2e run no longer overwrites committed PNGs. Remaining follow-up is only the output-path relocation (see Follow-ups above).
- **RESOLVED (2026-06-26) — Phase 13 Docker boot checkpoint:** compat wp-env booted once Docker was available; `wp plugin list` confirmed all six survey plugins + Maestro active (Rank Math absent) and `wp user list` confirmed admin/`compat_editor`/`compat_shop_manager`. Phase 13 verified 4/4. **Boot notes for Phases 14-16:** cold boot ~15 min; a transient Elementor ZIP CRC error self-heals on wp-env retry; a leftover partial `WordPress-PHPUnit/` from an interrupted run can block the shallow clone (move it aside); `testsEnvironment: false` is set but wp-env 11.8.1 still provisions the tests env (harmless deprecation warning).

## Session Continuity

Last session: 2026-08-02T15:43:40.067Z
Stopped at: Phase 21 context gathered
Resume file: .planning/phases/21-cosmetic-per-user-cloned-role-hiding/21-CONTEXT.md
