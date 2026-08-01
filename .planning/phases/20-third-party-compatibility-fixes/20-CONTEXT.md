# Phase 20: Third-Party Compatibility Fixes - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Correct Maestro's rename/hide replay against three R1-identified compatibility gaps,
**without weakening the cosmetic-only guarantee**:

- **COMPAT-04** — shared-slug top-level/submenu collision: a rename or hide on a slug
  that a top-level item and a submenu both render must be independently targetable.
- **COMPAT-07** — badge/HTML-in-title loss on rename: a rename must preserve baked-in
  markup (count bubbles, upsell/decoration spans) instead of stripping it.
- **COMPAT-10** — optional per-parent "cascade hide to children" (default off), hiding
  the subtree cosmetically with no capability change.

Plus a **minimal A1b** client fix (bind submenu edit controls to their DOM `<li>` by
resolved slug/href, not array index) — scoped only to what makes COMPAT-04 usable in
the live inline editor.

Out of scope: reparenting, full A1b hardening, per-plugin compat shims, any access-control
behavior. New capabilities belong in other phases.

</domain>

<decisions>
## Implementation Decisions

### COMPAT-04 — level-qualified match keys
- **Key form:** submenu overrides are stored as `parent>child`; top-level overrides stay
  a bare slug. Adopt AME's proven `template_id` pattern (prior-art A1).
- **New saves always qualify submenus** — every submenu override is stored `parent>child`
  whether or not its slug collides with a parent. Consistent, predictable, simplest to test;
  Phase 22 demo fixtures must use qualified submenu keys.
- **Legacy bare keys keep matching both** (top-level AND same-slug submenu) as a legacy
  fallback — exactly today's behavior — so **no existing config changes behavior until it is
  re-saved**. Zero-regression by construction; non-destructive. The editor's full-replace save
  emits qualified keys on the next save, at which point that config gets the fix.
- **Keep BOTH existing collision guards** — level-qualification does not eliminate them:
  - Axis-1 (two distinct stored keys normalizing to one → veto)
  - Axis-2 (one stored key matching 2+ distinct rendered slugs in a scope → veto)
- **Qualified-key normalization:** split on `>` and run `Slug::normalize()` on the parent and
  child halves **independently**, matching each against the rendered parent/child (v1.3.0
  both-sides-normalized contract: host move, `ver=`, `utm_*`, `&amp;`).
- **Parent-half miss:** if the parent half matches no rendered parent, **skip the override and
  degrade silently** — same as any orphaned stale slug today. Reset/re-save fixes it.

### COMPAT-07 — badge/HTML preservation on rename
- **Text-node replacement, full surrounding markup** — replace only the human-readable text
  node(s), preserving markup **before and after** the label. Handles trailing count bubbles
  (WooCommerce/Yoast) AND markup that *wraps* the label (WPForms `<span>Addons</span>`, Yoast
  upsell wrappers) — clears the required 4/6-plugin bar. Not a trailing-suffix split.
- **Editor field edits plain text only** — the rename field shows the tags-stripped label;
  markup is re-attached automatically at replay. Matches the existing `wp_strip_all_tags`
  treatment in `get_menu_model()`; admin can't corrupt markup.
- **Markup re-extracted from the LIVE title each request** at replay, then the stored plain-text
  custom label is inserted into it. Counts/badges always current; the stored config holds only
  plain text. The badge HTML never enters storage, so `sanitize_text_field()` still guards the
  stored title. Non-destructive, resolve-time.
- **No-text-node fallback:** if no plain-text label can be identified (title is entirely icon+span),
  set the title wholesale as Replay does today. Predictable; only the rare no-text item loses
  markup, and reset restores it.

### COMPAT-10 — optional cascade-hide to children
- **Per-parent toggle, default OFF** (success criterion). Pure visibility computation over the
  existing `hidden_roles` semantics — **never touches capabilities** (cosmetic-only guardrail).
- **Rides the parent hide** — cascade fires for a role only when the parent is itself hidden for
  that role. Turning cascade on with no parent-hide does nothing.
- **Role-mirrored** — a child is cascade-hidden for exactly the roles the parent is hidden from.
  Parent hidden from editor only → children vanish for editors, admins still see the subtree.
- **Union with a child's own rule** — a child is hidden if EITHER its own `hidden_roles` OR the
  parent cascade says so.
- **All live children** — when cascade fires, every child rendered under the parent is hidden
  (no per-child override required); the whole subtree goes.
- **Editor UI:** an "also hide children" checkbox **inside the existing visibility popover**;
  shown **only on parents that have children**; **always enabled**, its effect gated at replay
  (stored independently of whether a role is currently hidden).

### A1b — minimal client-side submenu DOM association
- Bind each localized submenu entry to its rendered `<li>` by a **stable attribute (resolved
  slug / anchor href)** instead of array index — scoped to what COMPAT-04 needs so a shared-slug
  parent vs child are edited independently in the live inline editor. Not the full A1b hardening.

### sub_order & icons
- **sub_order stays as-is** (parent slug → ordered child slugs). Its children are already
  parent-scoped by the parent key and can't collide with a top-level slug — no qualification needed.
- **Icons stay top-level only.** A qualified submenu override carries title/visibility/cascade but
  never an icon (WP submenu rows have no icon slot — COMPAT-08). `sanitize()` drops any icon on a
  submenu key.

### Verification
- **PHP unit/integration** against the R1 shared-slug + badge fixtures drives replay correctness
  (TDD — pure logic: match-key qualification, badge/text-node extraction, cascade computation,
  tested `expect(fn(in)).toBe(out)` before wiring).
- **Targeted Playwright e2e** proving a shared-slug parent vs child can be edited independently
  in the live editor (COMPAT-04 + minimal A1b).
- **Zero-regression gate:** existing PHP unit/integration + Playwright e2e stay green; WPCS clean;
  PHPStan clean; Plugin Check 0 errors.

### Claude's Discretion
- Exact `parent>child` separator escaping and the badge/text-node extraction algorithm internals.
- Precise placement/label wording of the cascade checkbox and any hint text within the popover.
- Whether the badge re-extraction is a shared helper vs inline in `Replay::replay()`.
- Fixture file organization under `tests/`.

</decisions>

<specifics>
## Specific Ideas

- Prior art is `.planning/compat/PRIOR-ART-admin-menu-editor.md` (Admin Menu Editor 1.15.1),
  written for this phase. Adopt A1 (qualified key) + A2 (text-node preservation); **avoid** AME's
  hide-as-access-control conflation (V1) and its stored full-tree (V2). Maestro's cosmetic-only,
  sparse-delta model is the differentiator — keep it.
- COMPAT-14 (`custom_menu_order` pass-through) is already fixed (PR #106) and is **not** part of
  this phase.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `includes/class-replay.php` — `replay()` is the seam. Top-level loop (~L119-153) and submenu
  loop (~L156-264) already scan separately; both currently look up the SAME flat `$norm_items[$nk]`
  (the COMPAT-04 root cause). `normalized_items()` builds the lookup (Axis-1 guard); Axis-2 guards
  are the pre-scans in each loop. Title write is `$menu[pos][0]` / `$submenu[parent][pos][0]`
  wholesale (the COMPAT-07 root cause). Hide is `unset()` of the row (cosmetic — the model to
  extend for cascade). `is_hidden_for_current_user()` (~L301) is the per-role hide seam.
  `get_menu_model()` (~L411) + `resolved_hidden_roles()` feed the editor and must stay in lockstep
  with `replay()`.
- `includes/class-config.php` — sparse `{items:{slug:{title?,icon?,hidden_roles?}},top_order,sub_order}`;
  `save()` is full-replace; `sanitize()` (~L149) runs `sanitize_text_field` on titles and drops
  icons via `sanitize_icon`. New keys/flags (qualified keys, cascade flag) plug in here.
- `includes/class-slug.php` — `Slug::normalize()`; apply per-half to qualified keys.
- `includes/class-ordering.php` — `Ordering::submenu()`/`top()` (unchanged by this phase).
- `assets/maestro.js` — the index-zip submenu DOM-join (the A1b seam).

### Established Patterns
- Resolve-time normalization, storage stays raw (v1.3.0). Overrides applied on `admin_menu`
  @ `PHP_INT_MAX`; top-order via core `custom_menu_order`/`menu_order`. Reset = `delete_option`.
- "When resolution is ambiguous, apply nothing" — the consistent collision-guard philosophy.
- Pure logic is unit-tested; WP-coupled paths are integration-tested.

### Integration Points
- Replay title/visibility/cascade logic (server) ←→ `get_menu_model()` editor model ←→
  `assets/maestro.js` DOM binding. All three must agree on qualified keys and cascade so the
  editor never shows a rule that the next full-replace save would silently drop.

</code_context>

<deferred>
## Deferred Ideas

- **Full A1b hardening** — comprehensive stable-attribute DOM association across the whole editor
  (beyond the minimal shared-slug binding this phase needs). Prior art treats it as a distinct fix.
- **Reparenting / drag-between-levels** — already gated in SPEC.md on a highlighting strategy (v2).
- **Client-side highlight-fix technique** (prior-art A3) — banked for the reparenting work.
- **Import/export presets** — market gap noted in prior art; separate backlog item.

</deferred>

---

*Phase: 20-third-party-compatibility-fixes*
*Context gathered: 2026-08-01*
