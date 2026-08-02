# Phase 21: Cosmetic Per-User / Cloned-Role Hiding - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

An admin can hide menu items for a **specific user**, purely cosmetically — the hide is
computed by intersecting the rule against the user's live identity and **never grants or
removes a capability**; a page hidden this way still loads by direct URL for a user who
independently holds the capability (ROLE-02).

**Scope decision (this phase = per-user only):** the cloned-role "profiles" registry half
of ROLE-02 is **deferred** to a v1.5 backlog item (see Deferred). ROLE-02 is therefore
**partially delivered** in v1.4.0 (per-user shipped; cloned-role later) — this is the
feasibility note's recommended per-user-first slice. The seam must be designed to
accommodate profiles later without rework.

Out of scope: real WordPress role clones (`add_role`/`add_cap` — explicitly rejected in
the feasibility note); any access enforcement (Maestro stays cosmetic-only); the profiles
registry (deferred).

</domain>

<decisions>
## Implementation Decisions

### Locked by the Phase 19 feasibility note (carried forward — do NOT re-derive)
See `phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md` (authoritative). Key points:
- **Storage:** inline per-item axis `items[slug].hidden_users` (a list of user IDs)
  alongside the existing `hidden_roles` — sparse, reset = delete key. NO separate top-level
  map (§5b rejected).
- **Seam:** widen `is_hidden_for_current_user()` (`class-replay.php:384`) to OR the user
  axis into the existing check: `hidden = (hidden_roles ∩ user.roles) OR (hidden_users ∩ {user.ID}) [OR profiles later]`. One drop path, one audit point; ride the existing
  `Slug::normalize()` lookup — do NOT add a second resolve mechanism.
- **Sanitize/bounds:** mirror the `hidden_roles` block (`class-config.php:203`) — a new
  `MAX_HIDDEN_USERS = 50` constant; `array_intersect` against valid user IDs
  (`get_users(['fields'=>'ID'])`); drop the key when empty (sparse).
- **Invariants (all three, same as shipped `hidden_roles`):** intersect-against-live
  (self-healing — user IDs re-checked each request, nothing stored on the user);
  union-precedence (any matching rule hides; no rule can force-show); non-destructive.
- **Mandatory guardrail test (§6 sketch):** assert `current_user_can()` is byte-identical
  before applying / while applied / after removing a per-user rule, for a representative
  cap set; assert the item is present in the menu model before and ABSENT after (visibility
  changed); assert the hidden page still loads by direct URL for the capable user.
- **Hard safety rail:** a hide rule can NEVER remove the acting admin's own Maestro editor
  entry / admin-bar toggle (no self-inflicted lockout of the editor entry point).

### Scope
- **Per-user only** this phase; cloned-role profiles deferred (v1.5 backlog). Build the
  widened seam as a 3-way-OR-ready shape so `hidden_profiles` slots in later with no rework.

### Targeting UX
- **Async user-search picker** — type-ahead querying `wp/v2/users?search=` (already
  capability-gated by core's `list_users`); scales to any site size. NOT a plain all-users
  dropdown (perf/payload risk past a few hundred users — §10).
- **Multiple users per item** — a single per-user rule can target several users (the axis
  is a list of IDs; the picker adds multiple).

### Axes (parity with Phase 20's two-group popover)
- Per-user hiding gets **both** axes, mirroring the role groups Phase 20 built:
  - "Hide this item from [user(s)]" → `items[slug].hidden_users` (item-level).
  - "Hide its sub-items from [user(s)]" → `items[slug].child_hidden_users` (parent-only;
    hides all live children for the targeted users, parent stays visible) — the per-user
    analog of `child_hidden_roles`. Union with a child's own `hidden_users`.
- The visibility popover surfaces these as **additional sections in the existing popover**
  (per §9), not a separate UI surface. After Phase 20 the popover already has role groups;
  add user-targeted rows using the same interaction pattern.

### Safety & scope policy
- **Super admins exempt from hides by default** (multisite §12) — a hide never affects a
  super admin. Single-site is the primary v1.4 target; multisite specifics documented as a
  known limitation, not fully solved this phase.
- **Self-target = warn but allow** — when an admin adds a per-user hide against their OWN
  account, show an inline caution but permit it (legitimate self-declutter). The locked
  Maestro-entry protection still applies, so they can't strand themselves out of the editor.

### Claude's Discretion
- Whether to generalize `resolved_hidden_roles()`/`resolved_child_hidden_roles()` into a
  single `resolved_override()` returning the whole array, vs adding parallel
  `resolved_hidden_users()`/`resolved_child_hidden_users()` resolvers — pick whichever keeps
  the "one lookup, one audit point" property cleanest given Phase 20's current shape.
- Exact picker component/markup, debounce, and empty/no-results states.
- Precise wording of the self-target caution and the section labels/i18n keys.
- Whether the per-user child cascade reuses `Cascade::effective_hidden_roles()` generalized
  for users or a parallel helper.

</decisions>

<specifics>
## Specific Ideas

- The feasibility note (`19-FEASIBILITY-NOTE.md`) is the authoritative design input — the
  researcher/planner should treat §2 (seam), §4 (invariants), §6 (guardrail sketch), §7
  (recommendation), §10 (targeting), §11 (safety rails), §12 (multisite) as the spec.
- Cosmetic-only is the non-negotiable core value: "zero risk to access." The same argument
  that makes the shipped `hidden_roles` cosmetic transfers unchanged to `hidden_users`.

</specifics>

<code_context>
## Existing Code Insights (verified post-Phase-20, 2026-08-02)

### Reusable Assets
- `includes/class-replay.php`:
  - `is_hidden_for_current_user()` (~L384) — the pure boolean seam to widen (currently
    checks only `hidden_roles`).
  - `resolved_hidden_roles()` (~L486, now takes a `$parent_slug` for qualified keys) and
    `resolved_child_hidden_roles()` (~L521) — Phase 20's resolvers; the per-user axes plug in
    beside these (generalize or parallel — Claude's discretion).
  - The submenu loop (~L189-274) already unions a child's own roles with the parent's
    `child_hidden_roles` via `Cascade::effective_hidden_roles()` — the per-user child axis
    mirrors this.
  - `get_menu_model()` (~L550+) exposes `hiddenRoles`/`childHiddenRoles` to the editor; add
    `hiddenUsers`/`childHiddenUsers` the same way.
- `includes/class-config.php`:
  - `hidden_roles` sanitize block (~L203) and `child_hidden_roles` block (~L221) — copy the
    shape for `hidden_users`/`child_hidden_users` (intersect vs valid user IDs, `MAX_HIDDEN_USERS = 50`, drop-empty). `MAX_HIDDEN_ROLES = 50` (~L74) is the pattern.
- `includes/class-cascade.php` — `Cascade::effective_hidden_roles()` (pure union); the
  per-user child cascade reuses/mirrors it.
- `includes/class-rest.php` — `maestro/v1` namespace + `can_edit()`/nonce pattern; the user
  picker consumes core `wp/v2/users?search=` (no new Maestro route needed unless the planner
  finds a reason).
- `assets/maestro.js` / `maestro-logic.js` — the visibility popover (two role-checkbox
  groups after Phase 20) + `buildConfig()` payload; add the user-target sections + payload keys.

### Established Patterns
- Resolve-time, non-destructive; overrides applied on `admin_menu @ PHP_INT_MAX`; reset =
  `delete_option`. "When resolution is ambiguous, apply nothing" collision guards.
- Pure logic unit-tested; WP-coupled paths integration-tested; TDD gate = one GREEN commit
  per task (pre-commit hook rejects failing commits — no standalone RED commit).
- Canonical test counts hand-maintained in `TESTING.md` (update in the same commit; file
  paths must be markdown links or the doc-links test fails). Commit signing reads `~/.ssh`
  (sandbox blocks it) — run commits/phpstan/e2e with the sandbox disabled.

### Integration Points
- Server seam (`is_hidden_for_current_user`) ↔ editor model (`get_menu_model`) ↔ client
  popover + payload (`maestro.js`) must agree on the new axes so a round-trip save never
  drops a working rule (same lockstep discipline Phase 20 required).

</code_context>

<deferred>
## Deferred Ideas

- **Cloned-role "profiles" registry (ROLE-02 second half)** — a named `profiles` map
  (label + hides + user/role assignment) compiling onto an inline `hidden_profiles` axis via
  the same seam (feasibility note §5c/§7). **Deferred to a v1.5 backlog todo**, seeded from
  the feasibility note. ROLE-02 is partially delivered (per-user) in v1.4.0; mark ROLE-02
  accordingly and note the profiles half as pending. Design the per-user seam to extend to
  the third OR term without rework.
- **Unified "who sees this" target model** (folding role+user+profile into one list per item,
  redesigning the popover) — explicitly out of scope (§5 "not recommended for Phase 21").
- **Enforced per-user access tier** — a categorically different, capability-mutating feature;
  never part of ROLE-02 (§13).

</deferred>

---

*Phase: 21-cosmetic-per-user-cloned-role-hiding*
*Context gathered: 2026-08-02*
