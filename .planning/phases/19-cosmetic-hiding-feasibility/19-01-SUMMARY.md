---
phase: 19-cosmetic-hiding-feasibility
plan: 01
subsystem: research
tags: [feasibility, cosmetic-hiding, roles, wordpress-capabilities, replay-engine]

# Dependency graph
requires:
  - phase: 17-slug-normalization
    provides: "Slug::normalize() resolution path and normalized_items()/resolved_hidden_roles() lookup in class-replay.php that this note's widened seam rides"
provides:
  - "ROLE-01 go/partial-go feasibility verdict on cosmetic per-user and cloned-role menu hiding"
  - "Recommended storage shape (inline items[slug].hidden_users axis + compiled profiles registry) and widened Replay resolution seam"
  - "Non-runnable guardrail test sketch asserting the current_user_can() invariant, for Phase 21 to implement"
affects: [21-cosmetic-per-user-cloned-role-hiding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feasibility-note-as-gate pattern: written verdict + blocking human-verify checkpoint precedes implementation planning for a conditional phase (mirrors Phase 16 synthesis gating Phase 17)"

key-files:
  created:
    - .planning/phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md
  modified: []

key-decisions:
  - "Verdict: PARTIAL-GO — per-user hiding is unconditional go; cloned-role hiding is go contingent on compiling to the same inline resolution axis rather than an independent storage/resolve path"
  - "Recommended storage: inline parallel axis items[slug].hidden_users (mirrors shipped hidden_roles sanitize/bound shape); cloned-role authored via a profiles registry that compiles down onto items[slug].hidden_profiles at save time — one resolution seam, not two"
  - "Resolution seam: widen is_hidden_for_current_user() (class-replay.php:299) to a three-way OR (hidden_roles / hidden_users / hidden_profiles), fed by generalizing resolved_hidden_roles() (:391) to return the whole override so all three axes ride the same Slug::normalize() lookup"
  - "Rejected the 'real WP role duplicate' reading of cloned-role explicitly — add_role()/set_role() would change current_user_can() and fail the go bar; documented as auditable rejection, not silently omitted"
  - "Sequencing: per-user recommended as the simpler first slice for Phase 21; cloned-role is a bounded fast-follow, not deferred as no-go"

patterns-established:
  - "Same-seam-wider-match-key transfer argument: new cosmetic-hiding axes must reuse the existing boolean-intersect-and-drop mechanism and its existing normalized lookup rather than introducing a parallel resolve path"

requirements-completed: [ROLE-01]  # Task 3 human sign-off recorded 2026-07-05 (maintainer approved partial-go verdict)

# Metrics
duration: 8min
completed: 2026-07-05
---

# Phase 19 Plan 01: ROLE-01 Feasibility Note Summary

**Written feasibility note delivering a PARTIAL-GO verdict: per-user cosmetic hiding is unconditionally go, cloned-role hiding is go via a profiles-registry that compiles to the same inline `items[slug].hidden_users`/`hidden_profiles` axis and widened `is_hidden_for_current_user()` seam. Human sign-off (Task 3) APPROVED 2026-07-05 — Phase 21 (ROLE-02) is unblocked with per-user-first scope.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-05T05:07:35Z
- **Completed:** 2026-07-05T05:10:35Z (Tasks 1-2; Task 3 checkpoint returned to parent session)
- **Tasks:** 3 of 3 completed (Task 3 blocking human-verify checkpoint — approved by maintainer 2026-07-05 in the parent session)
- **Files modified:** 1 created (19-FEASIBILITY-NOTE.md), this SUMMARY.md

## Accomplishments

- Produced the complete ROLE-01 feasibility note (533 lines) covering all 14 required
  sections: reference proof, same-seam transfer argument, cloned-role definition +
  rejection of the WP-role-duplicate reading, go-bar invariants, three bounded storage
  options, verdict, recommendation, guardrail test sketch, need/value, coexistence,
  targeting-UX flag, safety rails, multisite risk flag, enforcement-line reaffirmation,
  and sequencing recommendation.
- Verdict: **PARTIAL-GO** (per-user: go; cloned-role: go, contingent on compiling to the
  shipped resolution seam rather than a parallel path).
- All automated verify predicates from the plan pass (see Verification below).

## Task Commits

Both analysis/writing tasks were authored together into one document and committed as a
single atomic commit, since Task 2 completes/fills placeholders left open by Task 1 in
the same file with no meaningful intermediate git state to split on:

1. **Task 1 + Task 2: Write ROLE-01 feasibility note (analysis + verdict)** - `302d53c` (docs)

**Task 3 (blocking human-verify checkpoint): NOT executed by this agent.** Per explicit
run instructions, this agent does not self-approve phase-gating human sign-offs. Returned
to the parent session as a checkpoint with the full note content for review.

**Plan metadata:** this SUMMARY.md commit (pending — see below; STATE.md/ROADMAP.md
updates deferred per worktree isolation instructions)

## Files Created/Modified

- `.planning/phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md` - The complete
  ROLE-01 feasibility note: verdict, recommendation, guardrail sketch, and all locked
  framing sections.
- `.planning/phases/19-cosmetic-hiding-feasibility/19-01-SUMMARY.md` - This summary.

## Decisions Made

- **Verdict is partial-go, not a flat go**, because cloned-role hiding is only
  recommended as go *conditional* on a specific compile-to-inline-axis design (§7 of the
  note) rather than as an independently resolved mechanism — flagging this nuance in the
  verdict rather than glossing it as a flat "go" for both branches.
- **Storage recommendation is option (a) inline parallel axis**, not (b) separate
  top-level map or (c) a standalone profile-registry resolve path — chosen specifically
  because it requires zero new resolve-time lookup path (reuses the existing
  `normalized_items()`/`resolved_hidden_roles()` seam), which was the deciding factor
  against (b)'s duplicated collision-guard/normalization surface.
- **Cloned-role authored via a `profiles` registry that compiles down to the inline axis
  at save time** — a deliberate hybrid: gets the authoring ergonomics of a named-profile
  registry (§5c) without paying the resolve-path-duplication cost that a standalone
  profile-resolution mechanism would introduce.
- Per STATE.md/ROADMAP.md isolation instructions for this worktree session, no changes
  were made to either file; that reconciliation is deferred to the orchestrator.

## Deviations from Plan

None - plan executed exactly as written, with one explicit, plan-mandated exception:
Task 3 (blocking human-verify checkpoint / phase gate) was not self-approved, per both
the plan's own `type="checkpoint:human-verify" gate="blocking"` designation and this
session's explicit run instructions. This is not a deviation from the plan — the plan
itself defines Task 3 as requiring a human reviewer, not an executing agent.

## Issues Encountered

- This worktree's branch (`worktree-agent-a066c3b3a3c9f958b`) was created before the
  Phase 19 plan files existed on `main` and had fully diverged-zero/behind-9 status (no
  unique commits of its own). Fast-forwarded (`git merge --ff-only main`) to bring in
  `19-01-PLAN.md`, `19-CONTEXT.md`, and related planning docs before execution could
  begin. No conflict; no work was lost (0 commits ahead of main before the merge).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 21 (ROLE-02) planning is UNBLOCKED** — the maintainer signed off
  19-FEASIBILITY-NOTE.md via the Task 3 checkpoint on 2026-07-05 (partial-go verdict
  accepted). Phase 21 proceeds with per-user-first scope; cloned-role profiles as the
  bounded fast-follow.
- STATE.md, ROADMAP.md, and REQUIREMENTS.md were intentionally left untouched by this
  execution (worktree-isolation instruction) — the orchestrator must reconcile:
  - STATE.md position/decisions/session fields
  - ROADMAP.md Phase 19 plan-progress row
  - REQUIREMENTS.md ROLE-01 completion checkbox (only mark complete once Task 3 sign-off
    is actually recorded — this plan's `requirements-completed` frontmatter field above
    is deliberately left empty for that reason)

---
*Phase: 19-cosmetic-hiding-feasibility*
*Completed: 2026-07-05 (Tasks 1-2; Task 3 pending human sign-off)*
