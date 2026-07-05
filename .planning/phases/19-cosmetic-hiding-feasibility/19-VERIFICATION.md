---
phase: 19-cosmetic-hiding-feasibility
status: passed
verified: 2026-07-05
requirements: [ROLE-01]
verdict: partial-go
gates: 21-cosmetic-per-user-cloned-role-hiding
---

# Phase 19 Verification: Cosmetic Hiding Feasibility

**Status: PASSED** — goal-backward verification against the four ROADMAP success
criteria. The deliverable is a written feasibility note (not code), so verification
confirms the note exists, states a clear verdict, and specifies the storage shape +
resolution seam demanded by the phase goal.

**Phase goal:** It is known, before any implementation, whether per-user and/or
cloned-role menu hiding can be delivered without touching capabilities — and if so, how
it should be stored and resolved.

## Success-Criteria Traceability

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | Clear go/no-go verdict on strictly-cosmetic feasibility (no capability grant/removal) within WP's role/user model | Note header + §14: **PARTIAL-GO** — per-user go, cloned-role go (contingent on compile-to-inline-axis). Cosmetic-safety argued by transfer from the shipped per-role proof (§1–§2); go bar = `current_user_can()` provably unchanged (§4) | ✅ Met |
| 2 | If go: storage shape + Replay resolution seam specified | §5 (three bounded options weighed) → §7 recommends inline `items[slug].hidden_users` axis + `profiles` registry compiling onto `items[slug].hidden_profiles`; seam = widen `is_hidden_for_current_user()` (`class-replay.php:299`) via generalized `resolved_override()` (`:391`) | ✅ Met |
| 3 | If no-go: reason + (per CONTEXT) unblock trigger; Phase 21 deferred | Neither branch is no-go, so this branch is N/A. The capability-touching "real WP role duplicate" reading IS documented and rejected with rationale (§3), preserving an auditable "what a different bar would look like" | ✅ Met (N/A — no no-go) |
| 4 | Note reviewed and signed off before Phase 21 planning | Task 3 blocking human-verify checkpoint; maintainer sign-off recorded 2026-07-05 in the note header and 19-01-SUMMARY.md | ✅ Met |

## Locked-Framing Compliance (19-CONTEXT.md)

| Framing | Honored | Where |
|---------|---------|-------|
| Cosmetic-only; NO wp-sudo / external-plugin dependency | ✅ (`grep -i wp-sudo` returns nothing) | §13 |
| "Cloned role" = Maestro-internal profile, never `add_role()` | ✅ (WP-role-duplicate reading rejected) | §3 |
| Go bar = `current_user_can()` invariant, argued by transfer not re-derivation | ✅ | §1, §2, §4 |
| Resolution seam = widen `is_hidden_for_current_user()` | ✅ | §2, §7 |
| Union precedence; intersect-against-live-roles; sparse/non-destructive | ✅ | §4 |
| Guardrail test SKETCH (non-runnable), current_user_can invariant | ✅ | §6 |
| Need/value; coexistence; targeting-UX flagged-not-decided; safety rails; multisite risk-flag; sequencing | ✅ | §8–§12, §14 |

## Code-Anchor Accuracy

Line references in the note were confirmed against live source during planning
verification: `is_hidden_for_current_user()` at `class-replay.php:299`,
`resolved_hidden_roles()` at `:391`, call sites at `:149`/`:190`, sanitize block at
`class-config.php:178`, `MAX_HIDDEN_ROLES`. The "argue by transfer" anchor is grounded in
current, real code.

## Editorial

One dangling duplicated fragment in §12 ("or treated identically. / the same as any other
user.") was corrected during finalization.

## Verdict

**PASSED.** ROLE-01 is satisfied; Phase 21 (ROLE-02) is unblocked with a partial-go
verdict (per-user first, cloned-role profiles as a bounded fast-follow).

---
*Verified: 2026-07-05 — Phase 19 complete*
