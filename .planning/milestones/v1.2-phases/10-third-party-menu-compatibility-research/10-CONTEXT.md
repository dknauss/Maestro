# Phase 10: Third-Party Menu Compatibility Research - Context

**Gathered:** 2026-06-19 (SCAFFOLD — research spike)
**Status:** ⚠️ Scaffold — needs `/gsd:plan-phase 10` (with research) before execution.
**Source:** V2-16, pulled forward into v1.2 on 2026-06-19. **Independent of the release path** (9 → 11 → 12) — this is a research deliverable, not shippable code, and does NOT gate 1.2.0.

<domain>
## Phase Boundary

A **research spike**: document how Maestro's sparse-delta replay behaves against the highest-install plugins that build the admin menu in non-standard ways. Deliverable = a compatibility note + prioritized fix/limitation list. **No production menu-handling code is committed** in this phase (optional test-harness scaffolding only). Full scope in [REQUIREMENTS.md → V2-16] and [ROADMAP.md → Phase 10].
</domain>

<decisions>
## Implementation Decisions

### Survey set (LOCKED priority order, from V2-16)
- **WooCommerce first** (reorders/injects heavily; own top-level + submenus), then Jetpack, Yoast SEO / Rank Math, Elementor (or another page builder), WPForms, and an LMS/membership plugin.
- For each: how it registers/manipulates the menu (custom positions, conditional/late injection, re-registered menus, count badges baked into titles, custom separators, direct `$menu`/`$submenu` surgery); what breaks under Maestro's rename/reorder/hide/re-icon; classify the fix (slug-resolution tweak / later-again `admin_menu` hook / special-casing / documented limitation) and prioritize.

### Test environment
- Specify a reproducible env that actually LOADS the offenders — the current `.wp-env.json` loads `"plugins": []` and exercises Maestro alone. Deliver a committed harness variant and/or a clear recommendation.

### Relation to other work
- Feeds the prioritized backlog; relates to V2-01 (reparenting), V2-02 (separators). **BUG-06** (separator-preservation on keyboard reorder, Phase 11) shares the separator-bearing-menu repro need — Phase 10's Woo env is a good bed for it, but BUG-06 is fixed in Phase 11, not here.

### Claude's Discretion
- Exact survey depth per plugin; whether to commit the multi-plugin `.wp-env.json` harness or just recommend it.

</decisions>

<specifics>
## Specific Ideas

- No build commitment — the output is a note + ranked list, per V2-16.

</specifics>

<deferred>
## Deferred Ideas

None — scope is exactly the V2-16 compatibility survey.

</deferred>

---

*Phase: 10-third-party-menu-compatibility-research*
*Context scaffolded: 2026-06-19 — research spike; run /gsd:plan-phase 10 (with research)*
