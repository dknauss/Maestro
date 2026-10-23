---
created: 2026-08-02T00:00:00.000Z
title: Cloned-role hiding profiles (ROLE-02 second half)
area: roles
files:
  - includes/class-config.php (add `profiles` map + compile step → items[slug].hidden_profiles; mirror hidden_users sanitize)
  - includes/class-replay.php (is_hidden_for_current_user() 3-way OR already built for per-user in Phase 21 — add the hidden_profiles term + live profile-membership resolution)
  - assets/maestro.js / maestro-logic.js (profile authoring + "Hide for profile" popover section)
  - .planning/phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md (authoritative design: §3, §5c, §7, §11–14)
---

## Problem

ROLE-02 = "hide menu items for a specific user **or a cloned role**." Phase 21 ships the
**per-user** half only; the **cloned-role "profiles"** half is deferred here as a
**v1.5 candidate**. Once Phase 21 lands, ROLE-02 is partially delivered — mark it
accordingly (per-user done; profiles pending).

> **CORRECTION 2026-08-08.** This todo originally read "Phase 21 (v1.4.0) ships the
> per-user half" and "ROLE-02 is therefore partially delivered in v1.4.0". That is
> **not what happened.** It was written 2026-08-02, anticipating Phase 21 would make the
> v1.4.0 cut; on 2026-08-04 the release deferred **all** of Phase 21 to v1.5 (see STATE.md
> Release Binding). Neither half of ROLE-02 shipped in v1.4.0 or v1.4.1 — the per-user half
> is delivered by Phase 21 under **v1.5**, and this profiles half remains queued behind it.
> The "seam is already 3-way-OR-ready after Phase 21" note below is a statement about
> Phase 21's design requirement, and only becomes true once Phase 21 has actually landed.

## What it is (vetted in Phase 19 — verdict: go, as a thin layer over per-user)

A "cloned role" is a **Maestro-internal named hiding profile**, NOT a real WP role. A profile
= a label ("Reduced view") + a list of hidden item-slugs + an assignment list (user IDs
and/or role slugs). It never calls `add_role`/`add_cap`, never appears in `wp_roles()`, never
changes `$user->roles` or capabilities — plugin bookkeeping only, so it stays cosmetic-only.
Value over per-user: **reuse** — name a hide-bundle once, apply it to a small recurring group
that doesn't map to a WP role.

## Design (from the feasibility note — not yet CONTEXT/PLAN'd)

- **Storage:** a `profiles` top-level map (authoring structure) that **compiles onto** an
  inline `items[slug].hidden_profiles` axis at save time — so resolution stays inside the
  same widened `is_hidden_for_current_user()` OR (`roles ∪ users ∪ profiles`), one seam, one
  audit point. The `profiles` map is consulted only to resolve **live** membership (who a
  profile currently applies to), intersected fresh each request (self-healing invariant).
- **Seam is already 3-way-OR-ready** after Phase 21 (built to slot in the third term).
- **Sanitize/bounds:** mirror `hidden_users`/`hidden_roles` — `MAX_HIDDEN_PROFILES = 50`,
  valid-profile-name intersect, sparse, reset = delete.
- **UI (§9):** additive "Hide for profile" section in the existing visibility popover, plus a
  small profile authoring/management affordance (label + assignment) — authoring UX is the
  main open design question for a future discuss-phase.
- **Guardrail:** the same cosmetic-only invariant test as per-user, extended to the profile axis.
- **Rejected:** real WP role clones (`add_role` + capability arrays) — mutates capabilities,
  fails the cosmetic-only bar; a different enforcement-shaped feature entirely (§3, §13).

## When to pick up

v1.5 (after v1.4.0 ships). Revisit via `/gsd:discuss-phase` for the profile **authoring UX**
(inline vs management screen; membership assignment; naming) — storage/seam are already settled.
