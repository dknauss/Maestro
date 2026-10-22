# Phase 27 — Context (27-01 decisions)

**Status:** 2026-10-22. Task 2 (re-verify the architecture) is done against
`main` at the Phase 28 merge. **All recommendations approved by Dan on
2026-10-22:** modal-only creation, users-only membership, assignment checkboxes,
counted deletion confirmation and cleanup, 20 profiles / 50 members, and unique
case-insensitive 1–40 character names under generated stable IDs. The child
profile axis recommendation is also approved. Release shape was already locked:
width v1.7.0, profiles v1.8, Client-Site Workflow v1.9. These are planning
decisions; no profile storage, seam or UI implementation has been written.

Inputs: `19-FEASIBILITY-NOTE.md` (§4, §5c, §7, §9, §12), the pending todo
`2026-08-02-cloned-role-hiding-profiles.md`, and
`.planning/DECISION-settings-surface.md` (Profiles modal in the toolbar's right
zone; assignment stays in the visibility popover).

---

## Task 2 — Architecture re-verified against shipped code

The feasibility note's line refs (`:299`, `:391`) are stale. Current anchors on
`main`:

| What | Where now |
|---|---|
| Hiding seam | `Replay::is_hidden_for_current_user()`, `includes/class-replay.php:596` |
| Reserved Term-3 slot | `class-replay.php:634-636` |
| Field-parameterized resolver | `Replay::resolved_override_list()`, `class-replay.php:769` |
| Child-axis resolver | `Replay::resolved_child_override_list()`, `class-replay.php:816` |
| Child merge | `Cascade::effective_hidden_users()`, `includes/class-cascade.php:69` |
| Authorization pattern | `Config::protected_user_axes()`, `includes/class-config.php:376`; gate at `:330` and `:483` |
| Caps | `Config::MAX_HIDDEN_ROLES` / `MAX_HIDDEN_USERS` = 50, `class-config.php:112`, `:126` |

### Confirmed

- **The OR structure takes a third term without restructuring.** Terms 1 and 2
  are independent early-returns; Term 3 appends after Term 2.
- **`resolved_override_list()` serves `hidden_profiles` unchanged.** The item's
  `hidden_profiles` is a plain per-item list, so the qualified-key, schema-v2
  and Axis-1/Axis-2 guards apply through the one implementation. No parallel
  resolver.
- **The `profiles` map stays authoring-only.** Hiding resolves from
  `items[].hidden_profiles` alone; the map is read only for live membership.

### Amended (the note's plan does not survive as written)

1. **Term 3 is not a list-intersect on the item.** Terms 1 and 2 compare an item
   list with a property of the user (`$user->roles`, `$user->ID`). Term 3 must
   first derive *which profiles the current user belongs to* from the `profiles`
   map, then intersect that set with the item's `hidden_profiles`. Do it once per
   request, memoized on Replay (as Config is memoized), and only when some item
   carries `hidden_profiles`, so sites without profiles pay nothing.
2. **The no-rule fast path must widen.** `:602` returns early when an item has no
   `hidden_roles` and no `hidden_users`. Left as is, Term 3 would never run.
   Add `hidden_profiles` to that guard.
3. **Term 3 must be suspended in edit mode, like Term 2.** A profile can contain
   the admin who is editing, so it is a self-target in exactly the way `:619-628`
   describes: applying it in edit mode removes the row before
   `get_menu_model()` and strands the rule. Same multisite super-admin exemption
   as the user axis (`is_exempt_from_user_axis()`), for the same reason.
4. **Profiles need the `list_users` gate.** Profiles name people. A saver without
   `list_users` must not create, rename, delete or change membership, and must
   not add or remove `hidden_profiles` on items (doing so hides things from named
   people by proxy). Extend `protected_user_axes()` to carry `hidden_profiles`
   and `child_hidden_profiles`, and preserve the stored `profiles` map wholesale
   for such a saver, mirroring `:330`.
5. **The child axis.** The popover already has "Hide its sub-items from" groups
   for roles and users. For parity, add `child_hidden_profiles`, resolved through
   `resolved_child_override_list()` and merged by a `Cascade` helper alongside
   `effective_hidden_users()`. (Decision: include it. Leaving it out makes
   the profile group the only one without a sub-items twin.)

---

## Task 1 — Authoring UX (LOCKED by Dan, 2026-10-22)

Frame already decided (2026-08-10): profiles are created, renamed, deleted and
have members edited in a **Profiles modal** from a right-zone toolbar icon;
assigning a profile to an item is a fifth group in the visibility popover; no
wp-admin settings page. The Phase 28 Settings dialog is the shell to reuse.

| # | Question | Decision | Rejected alternative, and why |
|---|---|---|---|
| 1 | Inline create from the popover? | **No.** One creation path, the modal. The popover's profile group shows a "Manage profiles…" link that opens it. | Inline "New profile…" in the popover: convenient, but a second create path with its own naming, validation and empty-membership states to keep consistent, inside a popover already at four groups. |
| 2 | What can a profile contain? | **LOCKED (Dan, 2026-10-22): users only in v1.** | Users + roles (§5c allows both): a role inside a profile does what `hidden_roles` already does, so two controls produce the same effect and the popover can no longer say plainly why an item is hidden. Roles can be added later without a storage change, since §5c's shape already has room. |
| 3 | Does the popover show which profiles hide an item? | **Yes**, as checkboxes, one per profile, checked when it hides the item. This is a direct read of `items[].hidden_profiles`; no backwards resolution is needed. | Add-only control: the user cannot see or undo an existing assignment without opening the modal. |
| 4 | What happens on delete? | **Confirm with the count.** "Delete Reduced view? It hides 6 items for 3 people. They will see those items again." Deleting removes the name from every `hidden_profiles` on the same save. Self-healing at read time stays as the safety net. | Silent delete relying on self-heal: technically safe, but rules disappear without the admin being told. |
| 5 | Caps? | **20 profiles**, **50 members per profile** (= `MAX_HIDDEN_USERS`), and an item's `hidden_profiles` bounded by the profile count. | 50 profiles to match the other caps: no plausible site needs 50 named hide-bundles, and the modal's list stays usable at 20. |

Also decided: profile names are free text, 1-40 characters, unique
case-insensitively, stored under a generated stable ID (`p_<n>`) so a rename
does not rewrite every item. Items store IDs, the UI shows names.

---

## Task 3 — Release shape (LOCKED by Dan, 2026-10-22)

Decision: **ship Phase 28 on its own as v1.7.0**, independently of Phase 27,
which is the largest phase since Phase 21 (5 plans). Release PR #232 has since
merged. This records the release shape, not WordPress.org deployment approval
or verification. Phase 28 acceptance still has affected human rechecks and real
touch-device testing outstanding; see `../28-configurable-admin-menu-width/28-VERIFICATION.md`.

Profiles then ship as v1.8.0. The Client-Site Workflow milestone's number was
already marked provisional; it moves to v1.9. Changelog framing for profiles:
"new: hiding profiles", with a line noting it completes per-user hiding from
v1.5. Both framings are honest; the feature framing is the one users read.

Rejected: bundling 27 + 28 as one release (delays a finished feature by a whole
phase); shipping width as 1.6.1 (it is a feature, not a fix).
