# Phase 27 · Plan 05 — Summary

**Date:** 2026-10-23
**Status:** Tasks 1–4 done. Task 5 (phase verification) is open for Dan in
[27-VERIFICATION.md](27-VERIFICATION.md).

## Task 1 — end-to-end proof

`tests/e2e/specs/hidden-profiles.spec.ts` follows `hidden-users.spec.ts`:
fixture users created by the spec, sessions signed in once per file. Two
tests, each asserting in the member's own sidebar with a same-role bystander:

1. **Own-item profile.** The admin creates "Reduced view" in the dialog, adds
   the member, and ticks the profile on Posts. The save payload carries the
   hide in the map and nothing on the item; the stored option shows the
   compiled `items['edit.php'].hidden_profiles`. Then:
   - the member loses Posts, and `edit.php` still loads by URL;
   - the bystander keeps Posts;
   - **live membership, out:** removing the member in the dialog brings Posts
     back while the stored item still names the profile;
   - **live membership, in:** adding them back hides it again;
   - **delete:** the payload sends an empty map, the stored option has no
     profiles and no compiled axis, and the member sees Posts again.
2. **Sub-items profile.** Parent visible and children gone for the member,
   `post-new.php` still loads by URL, the bystander keeps every child.

Both pass locally (WordPress 7.1.3 + SQLite with the e2e fixtures); CI runs
them in wp-env.

## Task 2 — gate

Local, at this branch's head:

- unit 221/221 (540 assertions), JS 123/123, phpcs clean, PHPStan clean, doc
  links clean.

CI on `a9daf3d` (this PR's code head; later commits only record these
numbers), every check green:

- integration single-site: 202 tests, 829 assertions, 14 skipped;
- integration multisite: 202 tests, 854 assertions, 1 skipped (same counts
  as main after #239, so nothing was silently dropped);
- e2e: 113 passed, 28 skipped (111 on main plus the 2 new profile tests);
- unit (PHP 7.4 and 8.3), JS, WPCS, PHPStan, Plugin Check on the runtime ZIP,
  dependency audit, Markdown links.

Full local e2e: 112 passed, 1 failed, the known sandbox-only console-error
check in `shared-slug.spec.ts`, which fails identically on main.

## Task 3 — documentation

`README.md` and `readme.txt` describe hiding profiles in user terms (name a
group, add people, tick it on items), state next to the feature that a
profile is **not a role and not access control**, and say when to prefer a
role ("if a role already matches the people you mean, use the role"). A new
readme.txt FAQ covers what a profile is, the `list_users` gate, and the
multisite super-admin exemption. The changelog entry is left for the v1.8
release PR.

## Task 4 — ROLE-02 closed

- `REQUIREMENTS.md`: ROLE-02 `[~]` → `[x]`, both halves named, caveats carried
  (super-admin exemption now covers the per-user AND profile axes; the
  `list_users` authoring gate). The traceability row agrees.
- `ROADMAP.md` and `STATE.md`: Phase 27 code complete, awaiting human
  verification.
- The cloned-role todo moved to `todos/completed/`; references updated.

## Task 5 — checkpoint

Open. Nobody but automation has driven the profile flow in a browser yet.
