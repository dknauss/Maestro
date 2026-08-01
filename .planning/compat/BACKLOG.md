# Admin Menu Maestro — R1 Compatibility Fix/Limitation Backlog (DELV-02)

**Purpose (DELV-02).** This backlog is the DELV-02 deliverable for Milestone R1 — Third-Party
Compatibility Research. It deduplicates every Part 3 issue surfaced across SURV-01 through SURV-06
into a single ranked backlog of `COMPAT-xx` items, classifies each using the four R1 fix categories
defined in [SCHEMA.md](SCHEMA.md), and maps every survey issue (`SURV-NN Ix`) to exactly one `COMPAT-xx`
item in a no-orphan traceability table. This is a research-only, documentation-only artifact — no
production menu-handling code is committed in R1. The COMPAT-xx IDs are **forward references** to be
cited (un-renumbered) by a later versioned milestone.

**Relationship to DELV-01.** The [COMPATIBILITY-NOTE.md](COMPATIBILITY-NOTE.md) (DELV-01)
consolidated the six per-plugin surveys into a single summary matrix and cross-plugin root-cause
analysis. This backlog takes those cross-plugin patterns and ranks them into an actionable priority
order, assigning stable COMPAT-xx forward IDs ready to seed a later versioned milestone's FIX-xx
requirements.

**Headline constraint.** Across all six surveys and every matrix row, **zero broken cells were
observed**. Maestro's sparse-delta replay never broke any plugin's menu structure or user access.
Every surfaced issue is `degraded` (cosmetic/recoverable) or a `documented limitation`. Severity is
therefore bounded at `degraded`; ranking is driven primarily by **actionability** (does R1 classify
it as actionable in a later milestone?) and **cross-plugin frequency** (how many of the six surveys
exhibit it?), then by user-visible impact.

---

## ID-Stability Contract

> **COMPAT-xx IDs are assigned once, in rank order, and MUST NOT be renumbered.** They are
> forward references that a later versioned milestone (FIX-xx in REQUIREMENTS.md) will cite by
> number. If a future backlog item is discovered, it is appended as the next highest number
> (e.g., COMPAT-14) without reordering any existing IDs. No existing COMPAT-xx ID may be
> reassigned to a different issue.

---

## Ranked Backlog

One row per deduplicated cross-plugin root cause, in rank order. COMPAT-01 is the
highest-priority item. Classification uses the exact SCHEMA.md category wording.

| COMPAT-xx | Issue Summary | Affected Plugins | Affected Operations | R1 Classification | Frequency | Rank Rationale |
|---|---|---|---|---|---|---|
| **COMPAT-01** | **Absolute-URL slugs that change per environment** — submenu slugs stored as full `http://[host]/wp-admin/...` URLs make overrides environment-specific: a config generated on one host (e.g., `localhost`) fails on another (e.g., `example.com`) because the hostname differs; the `ver=` version param in Elementor's URL also makes it version-specific | Jetpack, Elementor | Rename, Reorder (sub_order), Hide | **slug-resolution tweak** | 2/6 | Highest-priority slug-resolution item: actionable in a later milestone, and the environment portability break means a user's saved config silently fails on any host migration; Jetpack's case is pure hostname-only (any install), Elementor compounds with version string |
| **COMPAT-02** | **Absolute-URL slug with stable external hostname + exact UTM params required** — the "Upgrade to Pro" submenu slug is `https://wpforms.com/lite-upgrade/?utm_campaign=...`; the hostname is stable across installs but the full URL (including UTM params) must match exactly; slight UTM parameter changes break the match | WPForms Lite | Rename, Reorder (sub_order), Hide | **slug-resolution tweak** | 1/6 | Actionable slug-resolution tweak like COMPAT-01, but lower priority because the URL is stable across installs (no hostname change); ranked directly after COMPAT-01 as the same slug-resolution fix path applies |
| **COMPAT-03** | **Entity-encoded `&amp;` taxonomy slugs** — taxonomy submenus (WooCommerce Products taxonomy, Elementor library categories, LifterLMS Courses/Memberships taxonomy) render with `&amp;`-encoded ampersands in their slugs (e.g., `edit-tags.php?taxonomy=product_cat&amp;post_type=product`); a stored override only lands if the key matches the rendered, entity-encoded form exactly | WooCommerce, Elementor, LifterLMS | Rename, Reorder (sub_order), Hide | **slug-resolution tweak** | 3/6 | Most-frequent slug-resolution tweak (3 plugins); the same encoding normalization fix in Maestro's resolve path would address all three in one change — ranked at COMPAT-03 (behind absolute-URL items because those have a broader portability failure mode, but above shared-slug items which are safe by design) |
| **COMPAT-04** | **Shared slug: CPT top-level and first submenu share the same slug** — WordPress's standard CPT menu shape gives the top-level parent and its first submenu the same slug (e.g., `edit.php?post_type=product` for WooCommerce Products); a rename or hide keyed on that slug lands on both simultaneously; consistent targeting of only one requires a level-aware (parent vs. submenu) match key | WooCommerce, Yoast SEO, LifterLMS | Rename, Hide | **documented limitation** | 3/6 (multiple item pairs per plugin) | Most-frequent orphan-risk item; ranked first among documented limitations because it is a candidate slug-resolution tweak (level-qualified match) in a later milestone — currently documented limitation because the behavior is safe and correct by WordPress's menu model, but level-qualified match is a natural future direction |
| **COMPAT-05** | **Separator re-clustering / de-grouping on top-level reorder** — WooCommerce's `menu_order` filter (prio 10) re-anchors `separator-woocommerce` immediately before the `woocommerce` item after every reorder; LifterLMS's `llms-separator` uses a fixed `$menu[51]` array position and de-groups from `lifterlms` when that item is moved (LifterLMS has no `menu_order` re-anchor) | WooCommerce, LifterLMS | Reorder | **documented limitation** | 2/6 | Both plugins exhibit separator co-existence degradation; a `later admin_menu re-hook` would NOT fix WooCommerce's (render-time `menu_order` collision); ranks above badge-loss and universal limitations because it affects the reorder operation result, not just cosmetic titling |
| **COMPAT-06** | **Submenu reorder overridden by render-time `custom_menu_order`** — LifterLMS's `submenu_order()` method hooks `custom_menu_order` and rewrites `$submenu['lifterlms']` at render time, after Maestro's `admin_menu @ PHP_INT_MAX` replay; Maestro's `sub_order` for the `lifterlms` parent applies in replay state but the rendered sidebar shows LifterLMS's priority order | LifterLMS | Reorder (submenu) | **documented limitation** | 1/6 | Plugin-specific render-time filter override of submenu order; a `later admin_menu re-hook` does NOT fix this (the collision is in `custom_menu_order`, not `admin_menu`); ranked after COMPAT-05 as it is single-plugin and affects only the submenu reorder path |
| **COMPAT-07** | **Badge/HTML-in-title loss on rename** — Maestro's `Replay::replay()` sets the title index wholesale (`$menu[pos][0]`/`$submenu[parent][pos][0] = override['title']`), dropping any baked-in HTML: count-badge spans (WooCommerce Payments/Extensions/Home/Orders, Yoast notification span), premium-upsell HTML (Yoast Workouts/Redirects/Upgrade/AI Brand Insights, Elementor "Sale!" injection), and visual marker spans (WPForms NEW! badge on Payments, color-span on Addons) | WooCommerce, Yoast SEO, Elementor, WPForms Lite | Rename | **documented limitation** | 4/6 | Highest-frequency degraded rename pattern (4 plugins, multiple items each); loss is cosmetic/recoverable (reset restores the badge); wholesale title overwrite is the correct safe behavior for a menu rename; **forward candidacy for `special-casing` in a later milestone if badge-preservation is prioritized** — noted without changing R1 classification |
| **COMPAT-08** | **Submenu re-icon is a silent no-op** — `Replay::replay()` writes the icon only to `$menu[pos][6]`; submenu rows have no icon index in WordPress's menu model; applying `{"icon":...}` to a submenu slug is silently ignored across all six plugins | WooCommerce, Jetpack, Yoast SEO, Elementor, WPForms Lite, LifterLMS | Re-icon | **documented limitation** | 6/6 | Universal across all six surveys; pure design boundary of WordPress's menu model (submenu rows carry no icon slot); correct and safe by design — never breaks anything |
| **COMPAT-09** | **Cosmetic per-role Hide; hidden pages still load by direct URL** — Maestro's `is_hidden_for_current_user()` only `unset()`s the `$menu`/`$submenu` row in replay state, never stripping a capability; a role that holds the page cap can always reach the hidden page by direct URL (page loads 200); the 403 a user gets is WordPress's own render-time cap gate, not Maestro | WooCommerce, Jetpack, Yoast SEO, Elementor, WPForms Lite, LifterLMS | Hide | **documented limitation** | 6/6 | Universal across all six surveys; this is the intended, safe Maestro semantic ("zero risk to access" core value); documented to prevent misreading Hide as an access-control boundary |
| **COMPAT-10** | **Parent-hide does not cascade to children** — hiding a top-level parent item removes only the parent anchor from the replay-state `$menu`; the entire `$submenu[parent]` array remains populated; every child page remains reachable by direct URL for any role that holds the page cap; the subtree is cosmetically orphaned (no sidebar anchor) but access-intact | WooCommerce, Jetpack, Yoast SEO, Elementor, WPForms Lite, LifterLMS | Hide | **documented limitation** | 6/6 | Universal across all six surveys; non-cascading is the safe default (children remain reachable); **forward candidacy for `special-casing` in a later milestone as an optional subtree-hide** — noted without changing R1 classification |
| **COMPAT-11** | **Hide is a moot no-op for cap-gated non-admin roles** — where WordPress's own render-time cap gate already removes an item for a role, Maestro's hide is a no-op (the item was never in that role's sidebar); observed across Jetpack (admin-only in disconnected state), Elementor (manage_options-capped submenus), and WPForms (all items manage_options-only, editor/shop_manager never see them) | Jetpack, Elementor, WPForms Lite | Hide | **documented limitation** | 3/6 | Cross-plugin pattern of "moot hide" for capped-out roles; the WPForms case is the most complete (non-admin roles have zero WPForms surface); documented so it is never mistaken for a Maestro defect |
| **COMPAT-12** | **Dual-slug role-conditional registration** — Yoast SEO registers two different top-level slugs (`wpseo_dashboard` for admin; `wpseo_page_academy` for editor/shop_manager); an override on one slug does not apply to the other; consistent cross-role customization requires two separate Maestro overrides | Yoast SEO | Rename, Reorder, Hide, Re-icon | **documented limitation** | 1/6 | Yoast-specific architectural choice (two independent `add_menu_page` registrations with different caps); no R1 implementation fix exists without special-casing Yoast's role-conditional logic; documented for user guidance (two overrides needed) |
| **COMPAT-13** | **CSS-hidden top-levels: Elementor hides two of its three top-level items via `admin_head` CSS** — `#toplevel_page_elementor` and `#menu-posts-elementor_library` are hidden with `display: none !important`; Maestro operations land correctly in replay state for all three tops, but a user testing via sidebar visual inspection would not observe changes on the two hidden tops | Elementor | Rename, Reorder, Hide, Re-icon | **documented limitation** | 1/6 | Elementor-specific observational limitation (Elementor's own UX design); Maestro's replay is correct; the issue is purely that two tops are invisible in the sidebar regardless of Maestro; documented for awareness |
| **COMPAT-14** | **`custom_menu_order` pass-through clobber** — `Replay::has_top_order()`, the `custom_menu_order` filter callback, ignored the incoming filter value and returned a hardcoded `! empty(top_order)`; with no stored top-order it forced `false`, overriding an earlier plugin/theme that returned `true` to enable core's custom menu ordering — contradicting its own "pass through" docblock. Surfaced by the [PRIOR-ART-admin-menu-editor.md](PRIOR-ART-admin-menu-editor.md) review, **not** by SURV-01–06 | Any plugin/theme hooking `custom_menu_order` / `menu_order` (general coexistence; no specific survey plugin) | Reorder (top-level) / coexistence | **defect — ✅ fixed** (real bug, not a limitation) | n/a (review-discovered; not survey-observed) | **✅ Fixed in [PR #106](https://github.com/dknauss/Maestro/pull/106) (squash `65f85f5`).** `has_top_order( $enabled = false )` now claims the filter only when a `top_order` is stored and otherwise returns the incoming value unchanged; covered by four integration tests in `tests/integration/ReplayTest.php`. Appended per the ID-Stability Contract as the next number after COMPAT-13; sits outside the 42 survey-issue traceability set (no `SURV-NN Ix` mapping) because it was found in code review, adjacent to the COMPAT-05/06 `custom_menu_order` collisions |

---

## Per-Item Detail: Actionable Items (COMPAT-01 through COMPAT-03)

Brief fix-direction notes for the three actionable `slug-resolution tweak` items, to scope a future
milestone.

### COMPAT-01: Absolute-URL slugs (environment-specific)

**Affected items:** Jetpack Settings submenu (`http://[host]/wp-admin/admin.php?page=jetpack#/settings`);
Elementor Website Templates submenu (`http://[host]/wp-admin/admin.php?page=elementor-app&ver=4.1.4...`).

**Proposed fix direction:** Normalize absolute-URL slugs in Maestro's resolve path. Two sub-variants
need handling:

1. **Hostname normalization:** Strip the scheme+host prefix and compare only the path+query+fragment
   (e.g., `admin.php?page=jetpack#/settings`). Override keys could be stored in path-relative form.
2. **Version-param stripping (Elementor):** Additionally strip or wildcard the `ver=` query parameter
   when matching, since the version changes with plugin updates.

Alternatively, the editor UI could detect absolute-URL slugs and auto-normalize them to a
host-relative or page-slug form when the user saves an override.

### COMPAT-02: Absolute-URL slug with external hostname + UTM params

**Affected items:** WPForms Lite "Upgrade to Pro" submenu
(`https://wpforms.com/lite-upgrade/?utm_campaign=...&utm_source=...`).

**Proposed fix direction:** The URL is stable across installs (always wpforms.com), so the main risk
is UTM parameter drift between WPForms Lite versions. Options: (a) store the full URL and rely on
exact-match (accept brittleness on UTM changes), or (b) normalize the resolution to match on the
base URL + page path, ignoring UTM query parameters. Lower risk than COMPAT-01 (no hostname
variability) but same slug-resolution tweak fix category.

### COMPAT-03: Entity-encoded `&amp;` taxonomy slugs

**Affected items:** WooCommerce Products taxonomy submenus (Brands, Categories, Tags);
Elementor library categories; LifterLMS Courses and Memberships taxonomy submenus.

**Proposed fix direction:** Add decode/encode-insensitive slug matching in Maestro's resolve path
so that both `&` (unencoded form) and `&amp;` (entity-encoded form) stored keys match the rendered
slug. The simplest approach: normalize both the stored key and the rendered slug through
`html_entity_decode()` before comparison. This single change covers all three plugins' taxonomy
slugs without per-plugin special-casing.

---

## Traceability Table

Every Part 3 issue from every survey (`SURV-NN Ix`) mapped to exactly one `COMPAT-xx` item.
Deduplicated issues (the same root cause across multiple surveys) map multiple rows to one COMPAT-xx.

| Survey | Issue | COMPAT-xx | Category |
|---|---|---|---|
| SURV-01 WooCommerce | I1 — Badge-in-title lost on rename (Payments, Extensions, Home, Orders) | COMPAT-07 | documented limitation |
| SURV-01 WooCommerce | I2 — `separator-woocommerce` re-clustering on reorder (WC `menu_order` filter) | COMPAT-05 | documented limitation |
| SURV-01 WooCommerce | I3 — Entity-encoded Products-taxonomy slugs (`&amp;`) | COMPAT-03 | slug-resolution tweak |
| SURV-01 WooCommerce | I4 — Submenu re-icon is a silent no-op | COMPAT-08 | documented limitation |
| SURV-01 WooCommerce | I5 — Cosmetic per-role Hide; page still loads by URL | COMPAT-09 | documented limitation |
| SURV-01 WooCommerce | I6 — Parent-hide non-cascading | COMPAT-10 | documented limitation |
| SURV-01 WooCommerce | I7 — Shared-slug collision: Products top-level + All Products submenu | COMPAT-04 | documented limitation |
| SURV-02 Jetpack | I1 — Submenu re-icon is a silent no-op | COMPAT-08 | documented limitation |
| SURV-02 Jetpack | I2 — Settings submenu slug is an absolute env-specific URL | COMPAT-01 | slug-resolution tweak |
| SURV-02 Jetpack | I3 — Cosmetic per-role Hide; page still loads by URL | COMPAT-09 | documented limitation |
| SURV-02 Jetpack | I4 — Parent-hide non-cascading | COMPAT-10 | documented limitation |
| SURV-02 Jetpack | I5 — Hide moot for editor/shop_manager (cap-gated in disconnected state) | COMPAT-11 | documented limitation |
| SURV-03 Yoast SEO | I1 — Dual-slug role-conditional registration (`wpseo_dashboard` / `wpseo_page_academy`) | COMPAT-12 | documented limitation |
| SURV-03 Yoast SEO | I2 — Shared slug: `wpseo_dashboard` parent + General submenu | COMPAT-04 | documented limitation |
| SURV-03 Yoast SEO | I3 — Shared slug: `wpseo_page_academy` top-level + Academy submenu | COMPAT-04 | documented limitation |
| SURV-03 Yoast SEO | I4 — Notification badge span lost on rename (wpseo_dashboard, wpseo_page_academy) | COMPAT-07 | documented limitation |
| SURV-03 Yoast SEO | I5 — Upsell/decoration HTML spans lost on rename (Workouts, Redirects, Upgrade, AI Brand Insights) | COMPAT-07 | documented limitation |
| SURV-03 Yoast SEO | I6 — Submenu re-icon is a silent no-op | COMPAT-08 | documented limitation |
| SURV-03 Yoast SEO | I7 — Cosmetic per-role Hide; page still loads by URL | COMPAT-09 | documented limitation |
| SURV-03 Yoast SEO | I8 — Parent-hide non-cascading | COMPAT-10 | documented limitation |
| SURV-04 Elementor | I1 — Website Templates submenu slug is an absolute env+version-specific URL | COMPAT-01 | slug-resolution tweak |
| SURV-04 Elementor | I2 — Categories submenu slug is entity-encoded (`&amp;`) | COMPAT-03 | slug-resolution tweak |
| SURV-04 Elementor | I3 — Upgrade upsell dynamic HTML lost on rename | COMPAT-07 | documented limitation |
| SURV-04 Elementor | I4 — Submenu re-icon is a silent no-op | COMPAT-08 | documented limitation |
| SURV-04 Elementor | I5 — Cosmetic per-role Hide; page still loads by URL | COMPAT-09 | documented limitation |
| SURV-04 Elementor | I6 — Parent-hide non-cascading | COMPAT-10 | documented limitation |
| SURV-04 Elementor | I7 — CSS-hidden top-levels mask visual confirmation of Maestro ops | COMPAT-13 | documented limitation |
| SURV-04 Elementor | I8 — Hide moot for editor/shop_manager on manage_options-capped items | COMPAT-11 | documented limitation |
| SURV-05 WPForms | I1 — Submenu re-icon is a silent no-op | COMPAT-08 | documented limitation |
| SURV-05 WPForms | I2 — NEW! badge lost on rename (Payments) | COMPAT-07 | documented limitation |
| SURV-05 WPForms | I3 — Addons color-span lost on rename | COMPAT-07 | documented limitation |
| SURV-05 WPForms | I4 — Upgrade to Pro submenu slug is absolute external URL + UTM params | COMPAT-02 | slug-resolution tweak |
| SURV-05 WPForms | I5 — Cosmetic per-role Hide; page still loads by URL | COMPAT-09 | documented limitation |
| SURV-05 WPForms | I6 — Hide moot for editor/shop_manager (manage_options-gated) | COMPAT-11 | documented limitation |
| SURV-05 WPForms | I7 — Parent-hide non-cascading | COMPAT-10 | documented limitation |
| SURV-06 LifterLMS | I1 — `llms-separator` de-grouping on top-level reorder | COMPAT-05 | documented limitation |
| SURV-06 LifterLMS | I2 — lifterlms submenu reorder overridden by `submenu_order()` at render time | COMPAT-06 | documented limitation |
| SURV-06 LifterLMS | I3 — Entity-encoded taxonomy slugs (`&amp;`) | COMPAT-03 | slug-resolution tweak |
| SURV-06 LifterLMS | I4 — Shared-slug CPT collision (Courses, Memberships, Engagements, Orders) | COMPAT-04 | documented limitation |
| SURV-06 LifterLMS | I5 — Submenu re-icon is a silent no-op | COMPAT-08 | documented limitation |
| SURV-06 LifterLMS | I6 — Cosmetic per-role Hide; page still loads by URL | COMPAT-09 | documented limitation |
| SURV-06 LifterLMS | I7 — Parent-hide non-cascading | COMPAT-10 | documented limitation |

**Coverage assertion:** 42 survey Part 3 issues (SURV-01 I1–I7 + SURV-02 I1–I5 + SURV-03 I1–I8 +
SURV-04 I1–I8 + SURV-05 I1–I7 + SURV-06 I1–I7) are each mapped to exactly one COMPAT-xx item
above. **0 orphans.** COMPAT-01 through COMPAT-13 each carry exactly one of the four R1 fix
categories and are sequential with no gaps, assigned in rank order.

**COMPAT-14** was added after the survey research, from the [PRIOR-ART-admin-menu-editor.md](PRIOR-ART-admin-menu-editor.md)
review, and is intentionally **not** part of the 42-issue survey traceability set above (it has no
`SURV-NN Ix` origin). It is a real coexistence defect — now **fixed in [PR #106](https://github.com/dknauss/Maestro/pull/106)** —
rather than a research limitation, so it carries a `defect — fixed` status instead of one of the four
R1 fix categories. It is appended per the ID-Stability Contract without renumbering COMPAT-01–13.

---

## DELV-02 Traceability

| Requirement / success criterion | Where satisfied |
|---|---|
| **DELV-02** — Ranked, classified fix/limitation backlog with stable COMPAT-xx forward IDs | This entire file: Ranked Backlog table (COMPAT-01 through COMPAT-13) |
| ROADMAP Phase 16 SC-2: ranked backlog by severity/frequency | Ranked Backlog table (rank rationale column) |
| ROADMAP Phase 16 SC-3: COMPAT-xx forward IDs stable and not renumbered | ID-Stability Contract section |
| ROADMAP Phase 16 SC-4: complete SURV-NN-Ix → COMPAT-xx traceability, 0 orphans | Traceability Table + coverage assertion |
| REQUIREMENTS.md FIX-xx seed | Named in REQUIREMENTS.md FIX-xx bullet; see that file for linkage |

---

*Created: 2026-06-29 — Phase 16-02 (Synthesis — DELV-02 Backlog)*
*R1 boundary held: COMPAT-xx IDs classify and rank only; no fixes implemented.*
