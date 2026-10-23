# Phase 29 — Verification

**Status: built; human check open.** Automated coverage is in
[29-SUMMARY.md](29-SUMMARY.md). The phase closes when Dan has tried it in a
browser and confirmed D3 (the tri-state checkbox).

## Success criteria (ROADMAP)

| # | Criterion | Evidence |
|---|---|---|
| 1 | One activation ticks every role the user does not hold, in one save; a second clears them | e2e test 1 (save counted, payload compared with every non-own role) |
| 2 | The editing user still sees the item after reload | e2e test 1 (admin reload) |
| 3 | On both role groups, never on the per-person group | e2e test 3; built in `buildRoleGroup()` only |
| 4 | Locked rows stay derived: never written, still checked and `aria-disabled` | e2e test 2; `applySelectAll()` unit tests |
| 5 | Accessible name includes the group heading; the result is announced | e2e test 1 (`getByRole` by full name, recorded `wp.a11y.speak()`) |
| 6 | Zero regression | local: unit, JS, e2e, WPCS, PHPStan, doc links; CI: both integration lanes, e2e, Plugin Check |

## Human check — open

- [ ] D3 confirmed: a tri-state checkbox reading "All other roles (not
      Administrator)", or switch to the pair of links.
- [ ] On a real site, tick it on an item and confirm another role's user
      loses the item while you keep it.
- [ ] With a screen reader, the control reads with its group heading and the
      mixed state is announced as mixed.
