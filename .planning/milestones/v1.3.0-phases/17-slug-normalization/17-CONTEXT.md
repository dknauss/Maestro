# Phase 17: Slug Normalization - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Maestro overrides survive real-world slug variation so a saved config keeps
applying without a manual re-save. Three drift cases (the only actionable
slug-resolution items from R1):

- **FIX-01** absolute-URL submenu slugs that change per environment — host
  changes (Jetpack Settings) and `ver=` version bumps (Elementor Website
  Templates).
- **FIX-02** absolute external-URL slug whose UTM query params drift between
  plugin versions (WPForms "Upgrade to Pro").
- **FIX-03** entity-encoded `&amp;` taxonomy slugs (WooCommerce, Elementor,
  LifterLMS) — match whether the stored key used `&` or `&amp;`.

The fix is one `normalize()` pure function applied to **both** the stored
override key and the rendered slug before comparison — resolve-time and
non-destructive (stored configs are never rewritten).

**Out of this phase:** COMPAT-04 (level-qualified parent/submenu match),
COMPAT-07 (badge preservation on rename), COMPAT-10 (subtree-hide cascade), and
all documented-limitation items (COMPAT-05/06/08/09/11/12/13). Release work is
Phase 18.

</domain>

<decisions>
## Implementation Decisions

### Locked by REQUIREMENTS/ROADMAP (carried in, not re-litigated)
- One `normalize()` **pure function**, TDD'd against the six R1 survey fixtures
  *before* it is wired into the replay resolve path.
- Resolve-time + **non-destructive** — stored configs are never rewritten.
- `html_entity_decode()` applied to both sides (FIX-03).
- **Conservative collision safety** — distinct-in → distinct-out — with an
  explicit collision-guard test.
- **Zero-regression gate** — PHP unit + integration + Playwright e2e stay green,
  WPCS clean, Plugin Check 0 errors.

### Query-parameter policy
- **Targeted denylist**, not allowlist or base-path-only. Strip only known-
  volatile params: `ver` and any `utm_*`-prefixed param. Param-NAME matching is
  **case-insensitive**. Identity-bearing params (`page`, `post_type`,
  `taxonomy`, `tab`, `action`, …) are always kept.
- The denylist is the **smallest possible set** (`ver` + `utm_*`) to minimize
  collision surface. Expanding it is explicitly deferred (see Deferred Ideas).
- After stripping denylisted params, **sort the surviving params** into a
  canonical (alphabetical) order before comparison, so render-order drift
  (`a=1&b=2` vs `b=2&a=1`) compares equal.

### Match precedence (resolve-path integration)
- **Always normalize both sides** — build the lookup on normalized keys:
  normalize every stored key and every rendered slug, match on those. Single
  clean code path (not exact-first-then-fallback).
- Two load-bearing consequences the planner must honor:
  1. `normalize()` must be **idempotent** and a **no-op on already-simple
     slugs**, so items that already match stay byte-identical and the
     zero-regression suite holds.
  2. Because this changes the matching basis for *all* items at once, the
     zero-regression suite + collision-guard test are the safety net for the
     wider blast radius.

### Absolute-URL key shape
- **Internal wp-admin absolute URLs** reduce to **admin-relative** form: strip
  `scheme://host` (and the `wp-admin/` boundary) so
  `http://localhost/wp-admin/admin.php?page=jetpack` and
  `http://example.com/wp-admin/admin.php?page=jetpack` both reduce to
  `admin.php?page=jetpack`. This is what makes the override survive a host move.
- **External URLs keep their host** (e.g. `wpforms.com`) — the host is part of
  their identity.
- **Fragments are preserved** (`#/settings`) — in SPA-style admin pages the
  fragment can be the only thing distinguishing two submenu entries sharing the
  same `page=`; dropping it would risk collapsing distinct items.
- *Research flag:* detecting the `wp-admin/` boundary while keeping `normalize()`
  WP-free — likely pass the admin base in as an argument rather than calling
  `admin_url()` inside the pure function. The researcher/planner decides the
  exact mechanism.

### Collision-time behavior (runtime side of the guard)
- On an **ambiguous collision** (a normalized key that maps from 2+ distinct
  stored keys, or would apply to 2+ distinct rendered items): **skip — apply
  nothing**, leave those items at their natural state. Fail-safe: a missed
  override is recoverable (re-save); a wrong override silently applied to the
  wrong item is corruption, and contradicts the "zero risk to access" core
  value. The collision-guard test asserts this no-op.

### normalize() internal pipeline
- Canonical step order: **(1) `html_entity_decode` first** (so `&amp;` becomes
  `&` before any `&` is treated as a query separator) → **(2) strip scheme+host**
  to admin-relative → **(3) split query, drop denylisted params** (`ver`/`utm_*`)
  → **(4) sort surviving params**, recompose. Decode-first is mandatory — it
  prevents the param splitter from mis-reading entity-encoded ampersands.
- **Entity decode = full `html_entity_decode`, single pass**, applied
  identically to both sides. Single pass is sufficient because both the stored
  key and rendered slug decode symmetrically (`&amp;amp;` → `&amp;` on both, so
  they still match each other). Not ampersand-only; not looped-to-fixpoint.

### Scope across operations
- normalize() is applied **wherever a slug is matched**, not just the items[]
  rename/hide/icon lookup at `class-replay.php:92`/`:128`. It also covers the
  **submenu reorder/ordering seams** — the `sub_order` parent key and the
  `Ordering::submenu` child-slug comparison — because COMPAT-01/02 list Reorder
  among affected operations and child slugs can themselves be absolute URLs. A
  saved override of *any* kind on a drifting slug should survive.

### normalize() placement
- A **new WP-free class** (working name `Maestro\Slug`) mirroring
  `Maestro\Ordering` — no WordPress calls, unit-tested standalone, `normalize()`
  as a static method. Replay delegates to it. (Not a method on `Config`, which
  is WP-coupled and about payload sanitization.)

### Test corpus & collision-guard
- The six R1 fixture slugs become a **shared PHPUnit data provider**: each case
  carries rendered-slug + stored-key variant + expected-normalized output + a
  comment citing its `SURV-NN Ix` source. Drives both the
  `expect(normalize(in)).toBe(out)` cases and the collision-guard pairs from one
  traceable table.
- The **collision-guard test asserts four cases** (so it can't pass vacuously —
  it proves both lenience and conservatism):
  - **Distinct (must NOT collapse):** two taxonomy submenus differing only by
    `taxonomy=product_cat` vs `taxonomy=product_tag`.
  - **Distinct (must NOT collapse):** an internal admin upgrade slug vs the
    external `wpforms.com` upgrade URL (different hosts stay distinct).
  - **Collapse (MUST merge):** two renderings of the same item differing only by
    `ver=`/`utm_*` values (proves denylist stripping works).
  - **Collapse (MUST merge):** the `&amp;` vs `&` encodings of one taxonomy slug
    (FIX-03 positive case).

### Edge / malformed input
- **Total & defensive** behavior, all as explicit data-provider rows:
  - empty/non-string input → `''` (or unchanged for `''`);
  - plain non-URL slug (e.g. `woocommerce`) → returned **unchanged** (no-op,
    satisfies idempotency);
  - duplicate params (`?page=a&page=b`) → **keep all**, sorted (do not dedupe —
    dedup could collapse distinct intent);
  - empty-value params (`?foo=`) → preserved as `foo=`;
  - only the **first `#`** splits the fragment; the rest is fragment text.
  - Never throws; every input maps to some string.

### Case sensitivity
- Lowercase **only** the stripped host (external URLs) and the denylist
  param-NAME match. **Do NOT** lowercase `page=` values, paths, or fragments —
  those can be case-significant and lowercasing them risks collapsing distinct
  items.

### Extra normalization axes
- **Stay minimal.** Do **not** percent-decode (`%20`) — no fixture needs it and
  it widens collision surface. Do **not** normalize trailing/leading slashes
  beyond what host-stripping produces. Revisit only if a real case appears.

### User-facing changelog note
- v1.3.0 gets a short user-facing changelog/readme note: saved overrides now
  survive host moves, plugin-version (`ver=`) bumps, UTM drift, and `&amp;`
  taxonomy slugs. Copy may be drafted in Phase 17 and finalized in the Phase 18
  release.

### Claude's Discretion
- Exact mechanism for the WP-free `wp-admin/` boundary detection (pass-in arg vs
  heuristic) — within the research flag above.
- PHP function choice and flags (`parse_url`/`parse_str`, `html_entity_decode`
  flags), PHPStan typing, and exact file naming for the new class.
- How `normalize()` is threaded into the `Ordering::submenu` comparison.

</decisions>

<specifics>
## Specific Ideas

- The new class should read like `Maestro\Ordering`: pure, WP-free, a small
  static surface, unit-tested without bootstrapping WordPress. Ordering is the
  template for both code shape and test shape.
- Fixtures are sourced from the canonical rendered slugs already captured in
  `.planning/compat/SURV-0{1..6}-*.md` — cite the `SURV-NN Ix` origin in each
  data-provider row.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Maestro\Ordering` ([includes/class-ordering.php](includes/class-ordering.php)):
  the exact pattern for the new pure `Slug` class — WP-free static methods with a
  documented resilience contract, unit-tested in
  [tests/unit/OrderingTest.php](tests/unit/OrderingTest.php).
- Existing unit-test harness (`tests/unit/`, `tests/bootstrap-unit.php`,
  Yoast PHPUnit Polyfills `TestCase`) — WP-free, ready for a `SlugTest` with a
  data provider.

### Established Patterns
- Replay resolves overrides with exact-match `isset( $items[ $slug ] )` at
  [class-replay.php:92](includes/class-replay.php:92) (top-level) and
  [:128](includes/class-replay.php:128) (submenu). These are the two items[]
  seams to convert to normalized matching.
- Submenu reorder runs through `Ordering::submenu( $submenu[$parent],
  $cfg['sub_order'][$parent] )` at
  [class-replay.php:140](includes/class-replay.php:140) — the additional
  ordering seam now in scope.
- Pure-vs-WP boundary is already a deliberate convention (Ordering pure; Replay
  holds all `$menu`/`$submenu` global mutation). The new `Slug` class extends
  that boundary; Replay keeps delegating.
- `get_menu_model()` ([class-replay.php:246](includes/class-replay.php:246))
  exposes **raw** slugs to the editor JS — stays raw (resolve-only
  normalization; non-destructive).

### Integration Points
- New `includes/class-slug.php` (`Maestro\Slug::normalize()`), loaded alongside
  the other `includes/` classes.
- Wired into Replay's two items[] lookups and the `Ordering::submenu` child-slug
  comparison; stored keys normalized into the lookup view at resolve time.

</code_context>

<deferred>
## Deferred Ideas

- **Extensibility filter hook** (`maestro_slug_volatile_params` or similar) to
  let advanced users extend the denylist beyond `ver`/`utm_*` — deferred to a
  later milestone to avoid a supported public-API surface in v1.3.0. Denylist
  stays closed.
- **Collision debug logging** (WP_DEBUG line when a collision is skipped) —
  deferred; collisions stay a silent no-op. Add observability later only if a
  real diagnostic need appears.
- **Editor save-time auto-normalization** — explicitly rejected for this phase
  (REQUIREMENTS locks resolve-time + non-destructive); revisit only if portable
  stored keys become desirable.
- **COMPAT-04** level-qualified (parent vs submenu) match keys — separate
  milestone (changes match semantics more invasively).

</deferred>

---

*Phase: 17-slug-normalization*
*Context gathered: 2026-06-29*
