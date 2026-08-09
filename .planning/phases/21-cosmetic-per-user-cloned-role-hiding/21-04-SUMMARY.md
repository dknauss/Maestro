# Phase 21 · Plan 04 — Summary

**Completed:** 2026-08-08
**Commit:** `551db33`
**Status:** ✅ Complete (3/3 tasks)

## What shipped

Per-user hiding is now reachable and usable. The visibility popover has four
independent target groups (role × user, item × sub-item), an async person
picker, and a payload that round-trips.

| Layer | Change |
|---|---|
| `get_menu_model()` | `hiddenUsers` / `childHiddenUsers` as id+name pairs, via the shared resolvers |
| `maestro-logic.js` | 5 pure, unit-tested axis helpers |
| `maestro.js` | shared `buildUserGroup()`, two sections, picker, payload, reset |
| `maestro.css` | chips, results list, self-target caution |
| `class-assets.php` | `usersUrl`, `userId`, 7 i18n strings |

## Two real bugs the manual check caught

Both would have shipped silently — neither is visible to any unit or
integration test, and both are exactly what 21-04's `<manual>` verify step
exists for.

**1. Broken on plain permalinks.** The search URL appended `?`
unconditionally. On a site with plain permalinks `rest_url()` already returns
`index.php?rest_route=/wp/v2/users`, so the result was a second `?` and a 404:

```
http://localhost:8889/index.php?rest_route=/wp/v2/users?per_page=10&search=Tess
```

The picker would have worked on pretty-permalink sites — where nearly all
testing happens — and been dead on the others. The separator is now chosen
rather than assumed.

**2. Clicking a result closed the whole popover.** `placePopover()`'s
outside-click handler tests `pop.contains( e.target )`. Both `pick()` and
`renderChips()` re-render synchronously inside the click handler, detaching the
clicked node *before* the document listener runs — so a click on a result or a
chip's remove button read as "outside" and tore down the popover. Both now
`stopPropagation()`, with the hazard documented at both sites so the next person
adding a control to this popover sees it.

## Decisions taken during execution

**id+name pairs, not bare ids.** The popover needs a label the instant it opens.
Bare ids would mean a request per stored target to render what the server already
knows, with raw numbers visible during the round-trip.

**One batched name query for the whole model**, asserted by test
(`test_display_names_are_resolved_in_one_batched_query`). A per-item lookup is
the shape that turns a large menu into a page-load problem, and edit mode is
where menus are largest.

**Core's `wp/v2/users`, not a Maestro route.** It is already gated by
`list_users`, so we inherit core's authorization instead of re-implementing it,
and the existing `wp_rest` nonce authenticates it. No new endpoint, no new
capability surface.

**No derived-lock affordance on the per-user child group.** The role version
exists because core drops a hidden parent's entire subtree for that *role*. There
is no per-user equivalent — a parent hidden from one person is still rendered for
everyone else, so its children are not implied gone. Copying the affordance would
have asserted something untrue.

**a11y written in, not retrofitted.** Phase 20 shipped an S1 defect of precisely
this shape (popover groups without programmatic names) that had to be fixed at
the release gate. Both new groups carry `role="group"` + `aria-labelledby`, the
search field has a real label, results are focusable buttons, and each chip's
remove control names *who* it removes rather than being one of N identical
"remove" buttons.

## One assertion legitimately updated

`cascade-hide.spec.ts` enumerates EVERY heading in the popover, so it grew from
two entries to four. Updated with the reasoning inline rather than silently, per
the Phase 23 lesson. The COMPAT-10 behaviour it guards — the role groups, their
order, and the gating rules asserted around it — is unchanged.

## Verification

| Check | Result |
|---|---|
| `composer test:unit` | ✅ 165/165, 218 assertions |
| `npm run test:php` | ✅ 109/109, 257 assertions (was 102/246) |
| `npm run test:js` | ✅ 83/83 |
| `npm run test:e2e` | ✅ 36 passed, 28 capture-skipped, 0 failed |
| `composer lint` / `analyse:phpstan` | ✅ clean / 0 errors |
| `npm run check:doc-links` | ✅ clean |
| Manual round-trip in wp-env | ✅ pick → chip → save → reload → rule intact |

## Environment note worth keeping

Running `npx playwright test <file>` directly **bypasses** the `pretest:e2e`
hook that activates the plugin on the tests instance, which presents as a total
editor failure (`maestroData` undefined, no toolbar) that looks exactly like a
JS regression. Use `npm run test:e2e`, or activate first. This cost real
debugging time.

## Downstream notes

- 21-05 owns the permanent e2e spec. The temporary verification spec used here
  was deleted; its shape (pick → chip → save → reload) is a good starting point,
  and 21-05 must add the second-context sidebar assertions.
- The picker needs a real user to search for. 21-05's spec should create its own
  fixture user rather than assume one exists — the ones created here were removed.
- **Still-open coverage gap (carried from 21-02/21-03):** the multisite
  super-admin exempt branch has no direct test. Assessed 2026-08-08 as **low
  priority** — the blast radius is cosmetic-only (the tested invariant makes an
  access effect impossible), and multisite is explicitly not the supported
  target. **21-05 must state it at the checkpoint and in the docs** rather than
  carry it silently.

## Next

21-05 — e2e in a real sidebar, full zero-regression gate, docs, ROLE-02 status
records, phase close.
