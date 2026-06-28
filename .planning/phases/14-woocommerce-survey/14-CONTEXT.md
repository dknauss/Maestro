# Phase 14: WooCommerce Survey - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce the filled **`.planning/compat/SURV-01-woocommerce.md`** survey: characterize how
WooCommerce (`10.9.1`, the locked first-priority and heaviest menu manipulator) registers and
manipulates the WordPress admin menu; classify every Maestro operation (rename / reorder / hide /
re-icon) against each affected WooCommerce menu item as safe / degraded / broken with observable
evidence; and assign every surfaced issue exactly one classified fix (slug-resolution tweak /
later `admin_menu` re-hook / special-casing / documented limitation). Because WooCommerce is the
hardest case, this phase also **stress-tests and refines SCHEMA.md**, committing it in final form
before Phase 15 (success criterion 4).

**Research-only (R1 boundary):** fixes are *classified*, never implemented. No production
menu-handling code is committed. This phase clarifies HOW to run the survey, not whether to
expand its scope.

</domain>

<decisions>
## Implementation Decisions

### Observation method
- **Hybrid: source + runtime dump.** Read WooCommerce's `admin_menu` registration code to
  explain HOW it manipulates the menu, then confirm WHAT happens at runtime via WP-CLI dumps of
  the `$menu` / `$submenu` globals — in both the natural (pre-override) state and after Maestro's
  replay. Evidence is grounded in observable runtime behavior, not inferred intent.
- **Applying Maestro operations — Claude's discretion.** Default approach: drive ops by setting
  Maestro's stored config (WP-CLI / option) and inspecting the replayed globals for deterministic
  full-matrix coverage, then spot-check notable items through the real in-place editor UI. Planner
  may adjust the mix for reliability.
- **Roles observed:** `admin` + `compat_editor` + `compat_shop_manager` (all three provisioned
  users). `shop_manager` is WooCommerce's own role and exercises Woo role-specific items; `editor`
  is the generic baseline. Matters specifically for the Hide operation's per-role behavior.

### Evidence capture format
- **Prose notes + selective dumps.** Matrix cells / Notes use short observable-evidence phrases in
  the SCHEMA.md style (e.g. "rename persists across reload", "icon restored on next `admin_menu`
  pass"), plus embedded `$menu` / `$submenu` snippets (fenced code) for the most revealing cases
  (late injection, count-badge-in-title, direct global surgery).
- **Repro/method header — required.** A short "Method / how evidence was gathered" section at the
  top of the survey records the exact WP-CLI dump commands and how ops were applied, so Phase 15
  surveys repeat the identical procedure (mechanical cross-survey consistency).
- **Artifact location — Claude's discretion.** Inline fenced blocks vs. a sibling
  `.planning/compat/SURV-01-assets/` folder for dumps/scripts decided during planning based on
  volume; keep the survey doc readable for Phase 16.

### Coverage depth
- **Full — every affected item.** One matrix row per affected WooCommerce item: top-level + all
  submenus + injected items present in the `10.9.1` default install. WooCommerce is the locked
  schema stress-test; exhaustive coverage here proves the template before Phase 15.
- **Injected/conditional item scope — Claude's discretion.** Scope WooCommerce's injected/gated
  items (Analytics, Marketing, count badges, etc.) at runtime based on what actually appears.
- **Interaction scenarios — included.** Beyond the per-op matrix, deliberately test a few likely
  operation interactions (e.g. hide-parent-with-visible-children, rename + reorder together) and
  record them as an additive sub-section. Candidate for promotion into the shared schema (see
  Schema refinement).

### Schema refinement workflow
- **Batched at phase end + changelog.** Collect proposed schema changes while surveying; apply
  them to SCHEMA.md once at the end under a "Schema changes (Phase 14)" note, then reconcile the
  SURV-01 copy. The template stays stable mid-survey and lands in final form before Phase 15.
- **Restructuring allowed if needed.** If WooCommerce proves the schema's shape wrong, reworking
  existing dimensions/columns is permitted (low cost now — SURV-01 is the only survey to
  reconcile). Document every change in the changelog.
- **Promote interaction scenarios if generally useful.** If the interaction scenarios prove
  broadly relevant, add an optional "Interaction notes" section to SCHEMA.md so Phase 15 plugins
  inherit it; otherwise keep them in SURV-01 only.
- **Autonomous + changelog (no mid-phase checkpoint).** Finalize the schema with a documented
  changelog; user reviews through the normal phase verification / UAT rather than a pause.

### Classification rubric (safe / degraded / broken)
- **Claude defines and documents the rubric in the survey** so it is applied uniformly across
  SURV-01..06. Working definition to document:
  - **safe** — operation works, persists across reload, no side effects.
  - **degraded** — partial / cosmetic / recoverable loss or caveat (e.g. count badge lost on
    rename; reorder reverts but the menu still works and access is intact).
  - **broken** — operation fails, or causes functional loss / access breakage (submenu 403s after
    hide, menu item disappears, plugin menu breaks).
  - **Deciding test:** recoverable/cosmetic → degraded; functional loss or access breakage →
    broken.

### WooCommerce setup state
- **Both states, note differences.** Survey both fresh-activated (wizard not completed) and
  completed-setup-with-core-features-on (e.g. Analytics enabled), flagging which menu items are
  setup/feature-state-dependent. Document the setup steps in the method header.

### Success-criterion traceability
- **Include a short traceability note** mapping survey sections to the 4 phase success criteria
  and the SURV-01 requirement, so the gsd-verifier and Phase 16 confirm coverage without
  inference.

### Persistence / timing evidence
- **Required per cell.** Each matrix cell's evidence states whether the result persists across
  reload; degraded/broken timing cases note the cause as WooCommerce's late `admin_menu` injection
  vs. Maestro's `PHP_INT_MAX` replay ordering — directly characterizing the late-replay risk that
  is the core of this research.

</decisions>

<specifics>
## Specific Ideas

- WooCommerce is explicitly the **hardest case / schema stress-test** — survey it exhaustively so
  the template is battle-tested before the five lighter Phase 15 surveys.
- Evidence must be **observable runtime behavior**, not inferred intent (e.g. "reorder reverts on
  next `admin_menu` pass" rather than "probably reverts because Woo re-registers").
- The central risk to probe: Maestro replays on `admin_menu @ PHP_INT_MAX` and reorders top-level
  via `custom_menu_order` / `menu_order`; WooCommerce's own late/conditional injection and any
  direct `$menu` / `$submenu` surgery are the behaviors most likely to produce degraded/broken
  cells.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`.planning/compat/SCHEMA.md`** — canonical template. Copy to `.planning/compat/SURV-01-woocommerce.md` and fill the copy; keep the template pristine until the batched end-of-phase refinement.
- **`tests/compat/.wp-env.json`** + `npm run compat:start` / `compat:stop` — boots WooCommerce `10.9.1` + Maestro at `http://localhost:8890`; `afterStart` provisions `admin` / `compat_editor` / `compat_shop_manager`.
- **`tests/compat/VERSIONS.md`** — pinned-version ledger (WooCommerce `10.9.1`); cite in the survey front fields.
- **`tests/e2e/global-setup.ts`** — admin auth pattern, reusable if browser spot-checks are scripted.
- **`tests/e2e/editor.spec.ts`, `tests/e2e/save-race.spec.ts`** — existing Playwright patterns for driving Maestro's in-place editor.

### Established Patterns (the survey's subject)
- **`includes/class-replay.php`** — replay engine. Rename / icon / visibility / submenu order mutate the `$menu`/`$submenu` globals on `admin_menu` at `PHP_INT_MAX` (after all other plugins register); top-level order goes through `custom_menu_order` + `menu_order`. This is the exact interaction surface the survey classifies.
- **`includes/class-ordering.php`** — `Ordering::top()` / `Ordering::submenu()` compute desired order from stored config.
- **`includes/class-config.php`** — stored overrides Maestro replays; the config-driven op-application path sets values here.

### Integration Points
- Survey output: `.planning/compat/SURV-01-woocommerce.md` (per-plugin copy of SCHEMA.md).
- Schema refinement target: `.planning/compat/SCHEMA.md` (batched end-of-phase edits + changelog).
- Boot/observe against the committed `tests/compat/` harness; no changes to the root `.wp-env.json`.

</code_context>

<deferred>
## Deferred Ideas

- **SURV-02..06** (Jetpack, Yoast SEO, Elementor, WPForms, LifterLMS) — Phase 15, using the schema proven and finalized here.
- **Production compatibility fixes** surfaced by the survey — out of scope for R1; the classified fixes seed DELV-02's prioritized backlog (Phase 16) and ship under a later versioned milestone.
- **Broad promotion of the interaction-scenarios section** into SCHEMA.md — only if it proves generally useful across plugins; otherwise stays WooCommerce-specific.

</deferred>

---

*Phase: 14-woocommerce-survey*
*Context gathered: 2026-06-28*
