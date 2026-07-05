# Phase 19: Cosmetic Hiding Feasibility - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a written feasibility note (ROLE-01) that decides — **before any
implementation** — whether per-user and/or cloned-role menu hiding can be
delivered without touching capabilities (stays strictly cosmetic, per Maestro's
core value). If **go**, the note specifies the storage shape and the Replay
resolution seam. If **no-go**, it explains why and Phase 21 (ROLE-02) is marked
deferred rather than attempted.

This phase produces **analysis + a guardrail test sketch only** — no shipped
feature code, no editor UI. It gates Phase 21; Phase 21 cannot begin planning
without an explicit **go** verdict signed off here.

</domain>

<decisions>
## Implementation Decisions

### Feature scope the note investigates
- Evaluate **both** per-user hiding **and** cloned-role hiding, but the note
  must **recommend which is simpler to ship first** in Phase 21.
- **Partial-go is allowed:** if only one of the two clears the cosmetic bar
  cleanly, Phase 21 ships that one and the other is documented as **deferred
  with a stated reason** (not all-or-nothing).
- Include a short **need/value section**: argue *when* per-user beats the
  already-shipped per-role hide (e.g. decluttering for one specific admin) so
  Phase 21 isn't built on an untested assumption.
- Include a **lightweight UX-feasibility flag** on the editor surface (how an
  admin would target a user/clone) — not a full UI design, just enough that
  Phase 21 planning isn't blindsided by the large-user-count perf risk.

### What "cloned role" means (cosmetic-critical)
- **"Cloned role" = a Maestro-internal hiding profile** — a named set of hides
  (e.g. "Reduced view") assigned to users/roles **cosmetically**. It **never**
  calls `add_role()` / `add_cap()` / any capability-mutating WP API. Cosmetic by
  construction. This is the *only* definition that clears the bar; the note may
  briefly document and reject the "real WP role duplicate" interpretation to
  leave an auditable rationale.
- **Assignment mechanism (role vs. user vs. named profile): note recommends.**
  The choice between a named-profile registry, a flat per-user axis, or a
  unified target model is a **design finding** — the researcher weighs the
  options against the existing storage and recommends.
- **Always intersect against live roles** — same contract as the shipped
  per-role hide: a rule only applies where it overlaps the user's current
  roles/context; if a user's roles change, stale rules silently stop applying
  (preserves the self-healing, never-grants guarantee).
- **Union precedence:** an item is hidden if **any** applicable rule hides it.
  Hides are **additive** — there is **no "un-hide"** concept. Simplest model,
  matches cosmetic-declutter intent, cannot accidentally reveal something.

### The go / no-go bar
- **Go bar: the design must leave `current_user_can()` provably unchanged** for
  any capability when a user/clone rule is applied or removed — the same
  guarantee the shipped per-role hide meets, mirroring the ROLE-02 test
  criterion.
- **Anchor the argument to the shipped per-role proof.** Frame per-user/clone
  as "same resolution seam, wider match key" and argue the cosmetic guarantee
  transfers because it reuses `is_hidden_for_current_user()`'s drop-from-`$menu`
  mechanism — rather than re-deriving cosmetic-safety from first principles.
- **A no-go verdict must state the reason AND what would unblock it** (a WP
  capability change, a bridge to wp-sudo, etc.) — the deferral stays actionable
  with a concrete revisit trigger, not a dead end.
- **Deliverable = written analysis + a guardrail test sketch** — prose verdict
  plus a sketch of the test asserting `current_user_can()` is invariant
  before/after applying a rule, which Phase 21 implements for real. No feature
  PoC.

### Storage & resolution seam
- **Storage direction: note recommends among bounded options** —
  (a) a parallel inline axis `items[slug].hidden_users` alongside `hidden_roles`,
  (b) a separate top-level map keyed by user ID / profile, or
  (c) a named-profile registry — evaluated against the sparse-delta / reset /
  sanitize constraints, with one recommended.
- **Must preserve the sparse, non-destructive contract:** per-user/profile
  hides stay sparse (store only what's hidden), never rewrite stored config at
  resolve time, and reset = delete. Non-negotiable consistency with the shipped
  model.
- **Targeting UX: note flags options, does not decide.** List candidates
  (async user-search picker vs. dropdown vs. hide-for-this-user-while-viewing)
  and the large-site perf risk of loading all users; leave the pick to Phase 21.
- **Resolution seam: widen the existing `is_hidden_for_current_user()` check**
  at `includes/class-replay.php:299` to also consult user/profile rules — one
  drop-from-`$menu` path, one place to audit. Consistent with the shipped
  mechanism.

### Multisite scope
- **Single-site primary; multisite noted as a risk.** Reason primarily about
  single-site (the plugin's tested target). Call out multisite specifics (super
  admin, per-site roles, network users) as a **known risk/edge** for Phase 21 to
  handle — do not fully solve multisite in the feasibility note.

### Coexistence with the shipped per-role hide
- **Additive layer; note recommends the UI.** Per-user/profile is a new additive
  layer over the existing global per-role hide (union precedence already locked).
  The note recommends how it surfaces in the visibility popover **without
  breaking the current "hide for role X" mental model** or the config shape.

### Safety rails (self-lockout / confusion)
- **Specify minimum guardrails.** The note must require, at minimum: never hide
  the Maestro editor entry / admin-bar toggle for the acting admin, and document
  that hidden pages remain **URL-reachable** (the escape hatch). Cheap insurance
  against "where did my menu go."

### Enforcement-line reaffirmation
- **Explicit restatement; enforcement is out of scope, full stop.** The note
  carries a short section restating that ROLE-02 is **cosmetic-only** and that
  **Maestro never enforces** — WordPress's own per-page capability check is the
  true access gate, and a hidden page still loads by URL for a capable user.
  Keeps the "we hide, we don't enforce" line legible so Phase 21 can't drift
  across it.
- **Maestro assumes NO dependency on any other plugin.** The cosmetic-only
  guarantee must hold on Maestro alone — Maestro must not assume, require,
  reference, or depend on wp-sudo (or anything else) for its behavior. Maestro
  behaves identically whether or not wp-sudo exists on the site.
- **wp-sudo is an internal-roadmap note only, not part of this feature.** If an
  *enforced* per-user tier is ever wanted (V2-17), that is separate work in a
  separate project; the feasibility note and Phase 21 make **no functional
  reference to it** and ship nothing that touches it.

### Claude's Discretion
- Exact structure/format of the feasibility note document.
- Which of the bounded storage options the research ultimately recommends.
- The precise assignment mechanism recommendation (profile registry vs. flat
  per-user axis vs. unified model).
- Wording of the guardrail test sketch.

</decisions>

<specifics>
## Specific Ideas

- The shipped per-role hide is the **reference proof** the whole note leans on:
  `hidden_roles` stored per-item, resolved by `is_hidden_for_current_user()`
  (`includes/class-replay.php:299`) via `array_intersect($user->roles,
  $ovr['hidden_roles'])`, dropping the item from `$menu`/`$submenu` and **never**
  touching a capability. Per-user/clone is "same seam, wider match key."
- "Cloned role" is deliberately **not** a WordPress role clone — it's a named
  Maestro hiding profile. This reframing is what keeps the branch cosmetic.
- The cosmetic guarantee's public face: a hidden page **still loads by direct
  URL** for a user who independently holds the capability.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Replay::is_hidden_for_current_user()` (`includes/class-replay.php:299`) — the
  cosmetic hide resolution seam; per-user/profile resolution widens this exact
  method. Reference implementation of the cosmetic guarantee.
- `Replay::resolved_hidden_roles()` (`includes/class-replay.php:391`) + the
  normalized-lookup path — how a rendered slug's stored hide is resolved through
  slug normalization; per-user/profile resolution must ride the same normalized
  lookup.
- `Config::sanitize()` (`includes/class-config.php:178`) — validates
  `hidden_roles` against `wp_roles()->get_names()`, bounded by
  `MAX_HIDDEN_ROLES`. A `hidden_users`/profile axis reuses this sanitize/bound
  plumbing.

### Established Patterns
- **Sparse-delta storage** keyed by menu slug; reset = delete the option;
  non-destructive at resolve time. Per-user/profile storage must preserve this.
- **Intersect-against-live-roles** hiding — never stores or mutates a
  capability; self-heals when roles change. The model the note extends.
- **Cosmetic-only guardrail** already met by the shipped per-role hide — the
  transferable proof.

### Integration Points
- Resolution: `is_hidden_for_current_user()` in `class-replay.php` (single
  drop-from-`$menu` path).
- Storage/validation: `Config::sanitize()` + the `items[slug]` entry shape in
  `class-config.php`.
- Editor surface (Phase 21, flagged only here): the existing visibility popover
  with role checkboxes is where a user/profile target would surface.

</code_context>

<deferred>
## Deferred Ideas

- **Full multisite user targeting / role intersection** — noted as a risk in the
  feasibility note; full solution deferred to Phase 21 (or later) rather than
  solved in ROLE-01.
- **Enforced per-user privileged tier (V2-17)** — out of scope for Maestro;
  enforcement is a separate concern Maestro never takes on. Any such work would
  be an entirely separate project with no Maestro dependency (internal roadmap
  note only). The note restates the cosmetic-only line; no work here.
- **Unified "who sees this" targeting model** (folding role + user + profile into
  one UI/storage) — the note may float it as a direction, but any redesign of
  the shipped visibility surface is Phase 21+ work.

</deferred>

---

*Phase: 19-cosmetic-hiding-feasibility*
*Context gathered: 2026-07-04*
</content>
</invoke>
