# Requirements: Maestro — v1.3.0 Slug-Resolution Hardening

**Defined:** 2026-06-29
**Core Value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access — changes are cosmetic deltas, never a rebuilt menu, and never a security boundary.

**Milestone framing:** R1 (Third-Party Compatibility Research) found Maestro's
sparse-delta replay never broke any plugin's menu (0 broken cells), but surfaced
three *actionable* slug-resolution defects where a stored override silently
no-ops because the rendered slug doesn't match the stored key byte-for-byte.
v1.3.0 fixes those three. Every requirement below cites its `COMPAT-xx` backlog
seed (`.planning/compat/BACKLOG.md`) without renumbering.

---

## v1.3.0 Requirements

### Slug Resolution (FIX)

The root cause for all three: replay resolves overrides with an exact-match
`isset( $items[ $slug ] )` lookup at `includes/class-replay.php:92` (top-level)
and `:128` (submenu). The fix is one normalization seam applied to **both** the
stored override key and the rendered slug before comparison — resolve-time and
non-destructive (stored configs are never rewritten).

- [x] **FIX-01**: A saved override on an absolute-URL submenu slug keeps applying after the site moves to a different host, and after the plugin's `ver=` query param changes on update — verified against the Jetpack Settings and Elementor Website Templates fixtures. *(seeds COMPAT-01)*
- [x] **FIX-02**: A saved override on an external upgrade-link slug (WPForms "Upgrade to Pro") keeps applying when the slug's UTM query parameters drift between plugin versions — match resolves on the base URL + path, ignoring UTM params. *(seeds COMPAT-02)*
- [x] **FIX-03**: A saved override on a taxonomy submenu whose rendered slug contains an entity-encoded `&amp;` applies whether the stored key uses `&` or `&amp;` — both sides normalized through `html_entity_decode()` before compare (WooCommerce, Elementor, LifterLMS fixtures). *(seeds COMPAT-03)*

### Release (REL)

- [x] **REL-09**: v1.3.0 is cut and shipped — runtime zip builds clean, Plugin Check reports 0 errors, full PHP/JS/e2e suites green, tagged `v1.3.0`, and deployed to WordPress.org SVN `trunk` following the v1.2 release pipeline. *(shipped 2026-06-30: GitHub Release v1.3.0 + wp.org SVN trunk/tags 1.3.0; verified in v1.3.0-MILESTONE-AUDIT.md)*

### Cross-cutting (non-functional — applies to FIX-01/02/03)

These are not separate phases; they are correctness/safety properties every FIX
phase must satisfy and the roadmapper should fold into per-phase success criteria:

- **Collision safety**: normalization is conservative — two genuinely distinct rendered slugs must never resolve to the same stored override. Verified by an explicit collision-guard test.
- **Zero regression**: existing PHP unit + integration + Playwright e2e suites stay green; Plugin Check stays at 0 errors; WPCS clean.
- **TDD**: `normalize()` is a pure function tested `expect(normalize(in)).toBe(out)` with the six R1 survey fixtures as the corpus before it is wired into the replay resolve path.

---

## Deferred (future milestone)

Same code area or backlog, intentionally not in v1.3.0 (per scope decision):

- **COMPAT-04** — level-qualified (parent vs submenu) match keys so shared-slug renames/hides don't hit both. Same resolve path, but changes match semantics more invasively; revisit after FIX-01/02/03 land.
- **COMPAT-07** — preserve badge/HTML-in-title on rename (4/6 plugins). Feature-sized, separate code path (`Replay::replay()` title write).
- **COMPAT-10** — optional subtree-hide (cascade parent-hide to children). Feature-sized, distinct from slug resolution.
- **DEMO-01** — slug-resolution showcase demo (Playground). Demonstrates FIX-01/02/03 via a pre-seeded `maestro_config` whose keys differ in slug form from the rendered menu (host-move / `ver=` / `&amp;` / UTM), against a busy menu. Prefer a lightweight fixture mu-plugin over heavy real plugins; optional WooCommerce-only opt-in blueprint for name recognition. Demo/marketing enhancement, not menu-handling code — its own small phase in a future milestone. See PROJECT.md backlog.

## Out of Scope

Documented WordPress menu-model limitations from R1 — safe and correct by design;
no code, carried as user-guidance docs only.

| Item | Reason |
|------|--------|
| COMPAT-05 (separator re-clustering on reorder) | Render-time `menu_order`/array-position collision; a later `admin_menu` re-hook can't fix it; cosmetic |
| COMPAT-06 (submenu reorder overridden by render-time `custom_menu_order`) | Plugin-specific render-time filter override; documented limitation |
| COMPAT-08 (submenu re-icon silent no-op) | WordPress menu model has no submenu icon slot — design boundary, never breaks anything |
| COMPAT-09 (cosmetic per-role Hide; page still loads by URL) | Intended Maestro semantic ("zero risk to access" core value); visibility is not authorization |
| COMPAT-11 (Hide moot for cap-gated roles) | WordPress's own cap gate already removed the item; Maestro hide is a correct no-op |
| COMPAT-12 (Yoast dual-slug role-conditional registration) | Plugin architecture choice; no fix without Yoast special-casing; documented (two overrides needed) |
| COMPAT-13 (Elementor CSS-hidden top-levels) | Elementor's own UX; Maestro replay is correct; purely observational |

---

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 17 | Complete |
| FIX-02 | Phase 17 | Complete |
| FIX-03 | Phase 17 | Complete |
| REL-09 | Phase 18 | Complete |

**Coverage:**
- v1.3.0 requirements: 4 total (FIX-01, FIX-02, FIX-03, REL-09)
- Mapped to phases: 4 (Phase 17: FIX-01, FIX-02, FIX-03 / Phase 18: REL-09)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-29*
*Last updated: 2026-06-29 after roadmap creation (traceability populated)*
