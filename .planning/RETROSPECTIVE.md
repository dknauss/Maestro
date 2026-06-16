# Retrospective: Maestro

A living retrospective, one section per milestone, plus cross-milestone trends.

---

## Milestone: v1.0 — WordPress.org Release Readiness

**Shipped:** 2026-06-14
**Phases:** 5 | **Plans:** 10

### What Was Built
A feature-complete inline admin-menu editor was made publishable on WordPress.org:
security confirmed and hardened, accessibility audited to A11Y-01–05, test coverage
extended (unit 44/44, integration 29/29, e2e 9/9), full .org listing assets produced,
and the build submitted to the review queue. Tagged `v1.0.0` with a GitHub Release.

### What Worked
- **Brownfield-green at intake** — entering with passing tests and clean phpcs meant the
  milestone was about *confirming* and *publishing*, not firefighting. Coarse 5-phase
  granularity fit cleanly.
- **Verify, don't assert** — the REST nonce gate was proven with integration tests rather
  than assumed; the Codex security scan turned up a real (if low-severity) DOM XSS that an
  assertion-only pass would have missed.
- **Combining TEST + PERF into one Verification phase** kept the phase count honest without
  losing coverage.

### What Was Inefficient
- **Plan/summary tracking was informal** — this project never adopted the GSD
  phase-directory + SUMMARY.md structure, so milestone stats had to be reconstructed from
  ROADMAP.md and STATE.md decisions at close time rather than read from summary files.
- **External gate at the finish line** — the milestone's true "done" (live on .org) depends
  on an external review that can't be driven from here; the dev milestone and the .org
  publication had to be decoupled.

### Patterns Established
- **Multi-milestone REQUIREMENTS.md** — v1.0/v1.1/v2 coexist in one file; on milestone
  close, archive only the completed slice and retain the rest (do **not** delete the file).
- **Semver tag is the release anchor** — `v1.0.0` + GitHub Release stand in for a separate
  GSD `v1.0` milestone tag; no duplicate tag created.
- **Promote-from-backlog** — v1's documented gaps (keyboard reorder, modified indicator)
  were promoted into the v1.1 requirement set with origin IDs preserved for lineage.

### Key Lessons
- Decouple "development milestone complete" from "published" when publication is external;
  archive the dev work and keep the external follow-up as an explicit pending todo.
- When a project doesn't use phase directories, the roadmap + STATE decisions log become the
  authoritative source for the milestone archive — keep them current during execution.

### Cost Observations
- Model mix: predominantly Opus (planning/security/judgment); not separately metered.
- Notable: most effort was verification and asset production, not new feature code.

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Shipped | Test posture at close |
|-----------|--------|-------|---------|------------------------|
| v1.0 | 5 | 10 | 2026-06-14 | unit 44/44 · integration 29/29 · e2e 9/9 · Plugin Check clean |

*Trends accumulate as milestones complete.*
