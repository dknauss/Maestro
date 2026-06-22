---
phase: 12-release-assets-refresh
plan: 03
gate: deterministic-asset-gate
run_date: 2026-06-22
---

# 12-03 Deterministic Asset Gate Results

Run date: 2026-06-22

## Banner Gate (REL-07)

| Asset | Dimensions | Size | Status |
|-------|-----------|------|--------|
| banner-772x250.png | 772x250 | 99 KB | PASS |
| banner-1544x500.png | 1544x500 | 225 KB | PASS |

Both banners: correct dimensions and well under the 4 MB limit.

## Screenshot Gate (REL-08)

| Asset | Size | Status |
|-------|------|--------|
| screenshot-1.png | 196 KB | PASS |
| screenshot-2.png | 208 KB | PASS |
| screenshot-3.png | 36 KB | PASS |
| screenshot-4.png | 126 KB | PASS |
| screenshot-5.png | 31 KB | PASS |
| screenshot-6.png | 127 KB | PASS |

All 6 screenshots: under the 10 MB limit.

## Caption Count Gate

- `readme.txt == Screenshots ==` captions: 6
- `.wordpress-org/screenshot-*.png` files: 6
- Match: PASS

## E2E Regression Gate (DEFERRED — Docker required)

The full e2e suite (`npm run test:e2e`) requires Docker/wp-env and CANNOT run in the
sandbox. The orchestrator must run:

```
WP_ENV_TESTS_PORT=8899 npm run test:e2e
```

sandbox-disabled to confirm:
1. Suite is green (zero regressions from this assets-only phase)
2. `capture-directory-screenshots.spec.ts` is SKIPPED on this run (no screenshot churn
   — the describe-level `test.skip` gate is intact)

## Overall Gate

ALL deterministic gates: GREEN
E2E regression gate: DEFERRED to orchestrator (Docker)
