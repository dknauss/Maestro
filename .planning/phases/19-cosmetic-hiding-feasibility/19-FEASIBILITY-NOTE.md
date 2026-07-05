# ROLE-01 Feasibility Note: Per-User & Cloned-Role Cosmetic Menu Hiding

**Date:** 2026-07-04
**Phase:** 19-cosmetic-hiding-feasibility
**Gates:** Phase 21 (ROLE-02) — no planning may begin without an explicit go verdict below.

**Verdict: PARTIAL-GO.** Per-user hiding is **go**. Cloned-role (named internal hiding
profile) hiding is **go**, contingent on shipping as a thin layer over the per-user
mechanism rather than as an independent storage/resolution path (see §7, Recommendation).
Neither branch is no-go. Per-user hiding is recommended as the simpler first slice;
cloned-role ships as an additive registry on top of the same seam, either in the same
Phase 21 pass or a fast-follow — see §12 for the sequencing recommendation.

**Sign-off:** ✅ **Approved 2026-07-05** by maintainer (Dan Knauss) via the Task 3 blocking human-verify checkpoint. Partial-go verdict accepted: per-user hiding is go (ship first); cloned-role hiding is go as an additive `profiles` registry that compiles onto the same inline resolution axis. **Phase 21 (ROLE-02) is unblocked** with per-user-first scope.

---

## 1. Reference proof (the anchor)

Maestro already ships a cosmetic hide-by-role feature. Its entire cosmetic guarantee lives
in one method:

```php
// includes/class-replay.php:299
private function is_hidden_for_current_user( array $ovr ) {
    if ( empty( $ovr['hidden_roles'] ) ) {
        return false;
    }
    $user = wp_get_current_user();
    if ( ! $user || empty( $user->roles ) ) {
        return false;
    }
    return (bool) array_intersect( (array) $user->roles, (array) $ovr['hidden_roles'] );
}
```

This method is called from exactly two sites:

- `class-replay.php:149` — top-level `$menu`: `if ( $this->is_hidden_for_current_user( $ovr ) ) { unset( $menu[ $pos ] ); }`
- `class-replay.php:190` — submenu `$submenu[$parent]`: same pattern.

Both call sites are annotated in the shipped code: *"Cosmetic removal; the page still
loads by direct URL."* The method:

- Reads exactly one WP-provided fact: `$user->roles` (the array of role slugs already
  assigned to the current user by WordPress core/other plugins).
- Performs exactly one operation on it: `array_intersect()` against a stored list.
- Returns a plain boolean.
- Never calls `current_user_can()`, never reads or writes `wp_roles()`, never touches
  `$user->allcaps`, `$user->caps`, or any `add_cap`/`remove_cap`/`add_role`/`remove_role`
  API. It has **zero write surface** onto the capability system and **zero read
  dependency** on capabilities — only on role *membership*, which WordPress already
  computes for us.
- A `true` return causes exactly one effect: `unset()` on an array key in the local
  `$menu`/`$submenu` globals during the `admin_menu` hook. This is the same technique
  WordPress core itself documents for admin-menu customization (see `remove_menu_page()`,
  which does the same `unset()` under the hood). It does not persist, does not affect
  any other request, and does not touch the page's own permission check
  (`current_user_can()` inside the target page's own callback, which WordPress still
  runs in full if the URL is hit directly).

**The cosmetic guarantee, stated as a property of this seam:** *a boolean gate, computed
from data WordPress already exposes (role membership), that only ever removes an array
entry from a transient, per-request, per-hook-priority render list.* Nothing about that
property depends on the match key being "role." It depends on the operation being a
read-only intersect against WP-native membership data, feeding a drop-only mutation of a
render-time array. That is the property that must transfer.

## 2. Same seam, wider match key

Per-user hiding and cloned-role hiding are proposed as **the same mechanism with a wider
match key**, not a new mechanism:

- **Per-role (shipped):** match key = `$user->roles` (array of role slugs). Stored list =
  `hidden_roles`.
- **Per-user (Task 1 target):** match key = `$user->ID` (or `$user->user_login`). Stored
  list = `hidden_users` (a set of user IDs).
- **Cloned-role / named profile (Task 1 target):** match key = the set of profile names
  assigned to the current user by Maestro's own bookkeeping (never a WP role). Stored
  list = `hidden_profiles`, checked against a separate `profile → users/roles` assignment
  map (see §5c).

In every case the widened check is still: *take a small, cheap, already-resident fact
about the current user (their ID, their roles, or their Maestro-profile membership),
intersect it against a stored per-item list, return a boolean, and unset() on true if
any one of the three lists matches.* No new fact about the user needs to be fetched or
computed — `$user->ID` and `$user->roles` are already loaded into `wp_get_current_user()`
for the per-role check; profile membership is a lookup Maestro owns entirely and derives
from data it already stores (see §5).

**Where the widened check lives — one path, one place to audit.** `is_hidden_for_current_user()`
is widened in place (not duplicated) to also intersect `$ovr['hidden_users']` against
`array($user->ID)` and `$ovr['hidden_profiles']` against the current user's resolved
profile memberships, unioned with the existing role check:

```
hidden  =  ( hidden_roles    ∩ user.roles     )  ≠ ∅
        OR ( hidden_users    ∩ { user.ID }    )  ≠ ∅
        OR ( hidden_profiles ∩ user.profiles  )  ≠ ∅
```

This is still called from exactly the same two sites (`:149` top-level, `:190` submenu),
and still resolves the applicable override through the **same normalized lookup** used
today — `resolved_hidden_roles()` (`class-replay.php:391`) is generalized to
`resolved_override(slug, norm_items, norm_skip, base)` returning the whole override
array (not just `hidden_roles`), so `is_hidden_for_current_user()` receives
`hidden_users`/`hidden_profiles` through the identical `Slug::normalize()` resolution
path that already handles absolute-URL slugs, `&amp;`-encoding, and `ver=`/`utm_*`
stripping. Per-user/profile resolution rides this path unchanged — it is not a second
lookup mechanism living beside the first.

Because the mechanism is unchanged (still a boolean gate, still a drop, still zero
capability reads or writes), the cosmetic guarantee transfers **by construction**, not
by a fresh proof. The only thing that changes is which stored list gets intersected
against which already-resident user fact.

## 3. "Cloned role" definition + rejection of the WP-role-duplicate reading

**Locked definition (the only one that clears the bar):** a "cloned role" is a
**Maestro-internal named hiding profile** — an admin-facing label (e.g. "Reduced view")
that names a set of hide rules and a set of users/roles it applies to. It is Maestro
bookkeeping only: a name, a list of item-slugs it hides, and a list of who it applies to.
It never calls `add_role()`, `add_cap()`, `remove_cap()`, or any other capability-mutating
WordPress API. It never appears in `wp_roles()->get_names()`. It never changes what
`$user->roles` or `$user->allcaps` contain. It is indistinguishable, from WordPress
core's perspective, from a plugin option — because that is exactly what it is.

**Rejected interpretation — "real WP role duplicate."** An alternative reading of
"cloned role" would create an actual new WordPress role via `add_role( 'editor_reduced',
'Reduced Editor', $capabilities )`, copying an existing role's capability set and then
subtracting or adding capabilities to produce the "clone." This is explicitly **rejected**
for ROLE-02:

- It requires `add_role()`/capability arrays — a direct, permanent write to the
  capability system (persisted in `wp_options` under `wp_user_roles`), not a per-request
  render-time filter.
- It requires re-assigning the user's actual WP role (`$user->set_role()` or
  `add_role()`/`remove_role()` on the user object) to make the clone "active" — a
  capability-level mutation of the user, indistinguishable in effect from what
  `current_user_can()` sees.
- It would make `current_user_can()` for that user provably **different** the moment the
  clone is assigned (that is the entire point of a real role clone — it changes what the
  user can do, not just what they see). This directly fails the go bar in §4.
- It moves menu-hiding out of Maestro's own bookkeeping and into WordPress's live role
  table, which is shared, global, persisted state other plugins also read/write — a much
  larger blast radius and a real migration/rollback hazard (deleting the plugin does not
  cleanly undo a role clone the way deleting a Maestro option does).

Documenting and rejecting this reading up front leaves an auditable rationale: any future
proposal to make hiding profiles into real WP roles is a **different, enforcement-shaped
feature**, not ROLE-02, and would need its own feasibility pass against a different
(capability-mutating) bar.

## 4. Invariants that must hold (the go bar)

**Go bar:** `current_user_can( $any_capability )` must be **provably unchanged** for any
user, for any capability, whether or not a per-user or cloned-role hide rule is applied
or removed. "Provably" means: the design must not introduce any code path that calls
`add_cap`, `remove_cap`, `add_role`, `remove_role`, `set_role`, or writes to
`wp_user_roles`/`$user->allcaps`/`$user->caps` as a side effect of applying a hide rule.
If no such code path exists, `current_user_can()` is unchanged by construction — this is
exactly how the shipped per-role hide already satisfies the bar, and it is the same
argument, unmodified, for the widened match key.

Three locked model invariants (from `19-CONTEXT.md`) must hold for both new branches,
mirroring the shipped model exactly:

- **Intersect-against-live-roles (self-healing).** For per-role hiding, a rule only
  applies while the user still holds the matching role — if roles change, the rule
  silently stops applying (nothing is stored on the user, only a live re-check each
  request). Per-user hiding preserves the same property trivially (`$user->ID` doesn't
  change). Cloned-role/profile hiding must preserve it explicitly: profile membership is
  itself resolved live at intersect time (never cached onto the user object), so if an
  admin removes a user from a profile, hides governed by that profile stop applying on
  the very next request with no stale state anywhere.
- **Union precedence (additive, no un-hide).** An item is hidden if *any* applicable
  rule hides it — role rule, user rule, or profile rule. There is no mechanism, in any
  of the three lists, to force an item *visible* that another rule hides. This holds
  automatically once all three checks are OR'd together in §2's formula: OR only ever
  adds hides, never removes them.
- **Sparse/non-destructive storage.** Only non-empty hide lists are ever stored; an
  item with no hides for any axis has no entry at all (or an entry missing the relevant
  key). Nothing is rewritten at resolve time — `is_hidden_for_current_user()` (and its
  widened form) is a pure read. Reset = delete the relevant key/option, same as today.

Tying back to the shipped model: today's `hidden_roles` axis already satisfies all three
invariants. The widened design in §2 doesn't change how any of the three invariants are
satisfied — it just adds two more lists that are checked and stored under the identical
rules.

## 5. Storage options (bounded) + assignment mechanism

Three bounded storage shapes were weighed against the sparse/reset/sanitize constraints
in `class-config.php:178` (the shipped `hidden_roles` sanitize block, bounded by
`MAX_HIDDEN_ROLES = 50`).

**(a) Inline parallel axis — `items[slug].hidden_users` alongside `hidden_roles`.**

```
items['tools.php'] => [
    'hidden_roles' => ['author'],
    'hidden_users' => [42, 107],
]
```

- *Pros:* Reuses the exact same per-item entry shape and the exact same sanitize
  function shape (`array_intersect` against a valid-ID/user list, `array_slice` to a
  `MAX_HIDDEN_USERS` bound) as `hidden_roles` today — a near copy-paste of
  `class-config.php:178-188`. Reset-per-item is free (deleting the `items[slug]` key
  removes both axes at once, or either axis independently). No new top-level config
  key; no new resolve-time lookup beyond widening the one that already runs.
- *Cons:* User IDs (unlike role slugs) can be numerous and the per-item array could
  grow large on a big site if used indiscriminately; needs its own cap
  (`MAX_HIDDEN_USERS`) separate from `MAX_HIDDEN_ROLES`, and the config option overall
  is bounded by `MAX_ITEMS` × per-item payload size, so a poorly-bounded per-user list
  has more blast radius on total option size than the small, fixed universe of roles.
  Mitigated entirely by a modest bound (e.g. 50, matching `MAX_HIDDEN_ROLES`) — per-item
  hiding is inherently a short list in practice (an admin doesn't hand-pick hundreds of
  users per menu item).

**(b) Separate top-level map keyed by user ID / profile.**

```
'hidden_by_user' => [
    42  => ['tools.php', 'edit.php?post_type=page'],
    107 => ['tools.php'],
],
```

- *Pros:* Groups by user, which could be a nicer shape for a future "manage this user's
  hidden items" admin screen; avoids ballooning any single `items[slug]` entry.
- *Cons:* Requires a *second* independent sanitize/bound pass (separate from
  `items[]`), a *second* independent resolve-time lookup (does not ride the existing
  `normalized_items()`/`resolved_hidden_roles()` path at all — slugs would need
  independent normalization here too, doubling the normalization surface and doubling
  the places a slug-collision guard must be maintained). This breaks the "one drop
  path, one place to audit" property from §2 and duplicates the Axis-1/Axis-2 collision
  guards already carefully built into `class-replay.php`'s `normalized_items()`. Higher
  design/maintenance cost for no cosmetic-safety benefit.

**(c) Named-profile registry.**

```
'profiles' => [
    'reduced-view' => [
        'label' => 'Reduced view',
        'hides' => ['tools.php', 'edit-comments.php'],
        'users' => [42, 107],
        'roles' => ['shop_manager'],
    ],
],
```

- *Pros:* Natural fit for the cloned-role concept specifically — a profile *is* a named
  bundle of hides plus an assignment list. Scales well when many items should be hidden
  for the same group of people (one profile entry vs. N per-item `hidden_users` edits).
  Assignment (`users`/`roles` under the profile) is itself sparse and small.
  Resolving "does this slug hide for this user" becomes: does any profile that (a) hides
  this slug and (b) includes this user's ID or one of their current roles.
- *Cons:* Requires inverting the lookup at resolve time — from "given a slug, what
  hides it" (today's shape) to "given a slug, which profiles hide it, and does the
  current user belong to any of them" — an extra join, though a cheap one (profiles are
  few; a per-request in-memory index from slug → owning profiles, built once per
  request, keeps this O(1) per item). Does not by itself cover the simpler "hide this
  one item for this one user" case as directly as (a) — using a profile as the
  container for a single-user single-item hide is a heavier shape than necessary for
  the common case Phase 21's need/value section (§8) actually motivates.

**Assignment mechanism weighed independently of storage shape:** a **flat per-user axis**
(option a) is the simplest assignment mechanism — an admin picks a user, checks a box on
an item. A **named-profile registry** (option c) is the richer assignment mechanism — an
admin builds a reusable named bundle, then assigns it to users/roles once. A **unified
target model** (folding role + user + profile into one "who sees this" list per item)
was considered and is **not recommended for Phase 21**: it would require redesigning the
existing `hidden_roles` config shape and the visibility popover's current "role
checkboxes" UI in the same pass as shipping the new feature, which is a larger, riskier
change than necessary to clear ROLE-01/ROLE-02's actual bar. It remains a legitimate
longer-term direction (see Deferred, §13) but is out of scope here.

No option is picked yet in this section — §7 below states the recommendation and
justifies it against the tradeoffs laid out here.

## 6. Guardrail test sketch (non-runnable, for Phase 21 to implement)

The following is prose/pseudocode only — a sketch that Phase 21 turns into a real
PHPUnit/integration test. It asserts the cosmetic invariant: **visibility can change;
`current_user_can()` never does.**

```
SKETCH — cosmetic-invariant guardrail (Phase 21 implements for real)

GIVEN a test user U with a fixed, real WordPress role (e.g. 'editor')
  AND a representative capability set C = [
        'edit_posts', 'manage_options', 'edit_theme_options',
        'publish_posts', 'moderate_comments', ... (the role's full cap list)
      ]

STEP 1 — capture baseline:
  baseline = { cap => current_user_can( cap ) for cap in C }   // for user U

STEP 2 — apply a hide rule against U (per-user OR cloned-role/profile axis):
  Config::save( items: { 'some-slug': { hidden_users: [U.ID] } } )
  // (repeat as a second case with a named profile that includes U)

STEP 3 — assert the invariant HOLDS while the rule is active:
  after_apply = { cap => current_user_can( cap ) for cap in C }   // for user U
  ASSERT after_apply === baseline   // byte-for-byte / key-for-key identical

STEP 4 — assert the menu actually changed (sanity: the hide did something):
  ASSERT 'some-slug' is present in Replay::get_menu_model() output BEFORE the rule
  ASSERT 'some-slug' is ABSENT from Replay::get_menu_model() output AFTER the rule
  // (visibility changed — this is the point of the feature)

STEP 5 — remove the rule (reset = delete the key):
  Config::save( items: {} )  // or delete just the hidden_users/hidden_profiles key

STEP 6 — assert the invariant STILL holds after removal:
  after_remove = { cap => current_user_can( cap ) for cap in C }   // for user U
  ASSERT after_remove === baseline

CONCLUSION asserted by this sketch: applying and removing a per-user/profile hide rule
never changes what U can DO (current_user_can is invariant across steps 1/3/6) — only
what U SEES (step 4). This is the cosmetic guarantee, made concrete and assertable.
```

Phase 21 implements this for both the per-user axis and (if shipped) the cloned-role
axis, and additionally asserts the direct-URL escape hatch (§10): hitting the hidden
page's URL directly, as the same user U, still passes the page's own
`current_user_can()` gate and loads normally.

## 7. Recommendation (storage + assignment + resolution seam)

**Recommended storage shape: (a) inline parallel axis**, `items[slug].hidden_users`,
shipped alongside the existing `items[slug].hidden_roles`.

**Justification against §5's tradeoffs:**

- It is the only option that requires **zero new sanitize pass** and **zero new
  resolve-time lookup path** — it reuses `class-config.php:178`'s existing per-item
  sanitize block (near-identical shape: intersect against valid IDs instead of valid
  role slugs, bound by a new `MAX_HIDDEN_USERS` constant mirroring `MAX_HIDDEN_ROLES`)
  and the existing `normalized_items()`/`resolved_override()` resolve path in
  `class-replay.php` (widened per §2, not duplicated).
- It preserves sparse-delta and reset=delete exactly: an item with no per-user hides
  simply has no `hidden_users` key, identical in spirit to today's `hidden_roles`.
- It directly and simply serves the need/value case in §8 (an admin hiding one item for
  one specific person) without requiring the heavier profile-registry indirection first.

**Recommended assignment mechanism for cloned-role: a thin named-profile registry that
compiles down to the same axis**, not a parallel resolve path. Concretely: a `profiles`
top-level map (per §5c's shape) is the **authoring/admin-facing** structure — "Reduced
view" is a name plus a hide-list plus an assignment list, edited as one unit — but at
save time, Phase 21's `Config::sanitize()` (or a small compile step immediately after
sanitize) expands each profile's effect onto the same `items[slug].hidden_profiles: [profile-name]`
inline axis (a third parallel list next to `hidden_roles`/`hidden_users`, following
exactly the same sanitize/bound shape as (a)) so that resolution stays entirely inside
the widened `is_hidden_for_current_user()` from §2 with **one lookup, one seam, one
audit point** — the `profiles` map is only ever consulted to know *whom a profile
currently applies to* (so profile membership can be intersected live, satisfying the
self-healing invariant in §4), never as a second place menu-hiding is resolved from.
This gets the authoring ergonomics of a registry (§5c) without the resolve-path
duplication cost (§5b's rejected con).

**Resolution seam, concretely:** widen `is_hidden_for_current_user()`
(`class-replay.php:299`) to the three-way OR formula in §2, fed by a generalized
`resolved_override()` (the current `resolved_hidden_roles()` at `class-replay.php:391`,
returning the whole override array instead of just one key) so `hidden_users` and
`hidden_profiles` ride the exact same `Slug::normalize()`-based lookup that
`hidden_roles` already uses today. One drop-from-`$menu`/`$submenu` path
(`:149`/`:190`, unchanged call sites), one normalized lookup, one place to audit —
consistent with the "same seam" argument in §2, not a new mechanism bolted on beside it.

**Sanitize/bound reuse:** both new lists (`hidden_users`, `hidden_profiles`) are
validated in `Config::sanitize()` immediately next to the existing `hidden_roles` block
at `class-config.php:178`, following its exact pattern — `array_intersect()` against a
valid universe (existing user IDs via `get_users(['fields'=>'ID'])`, or, for
`hidden_profiles`, valid profile names from the `profiles` map itself), each independently
bounded (`MAX_HIDDEN_USERS`, `MAX_HIDDEN_PROFILES`, both proposed at 50 to match
`MAX_HIDDEN_ROLES`), each dropped from the entry entirely when empty (sparse).

## 8. Need/value

When does per-user hiding beat the already-shipped per-role hide? The per-role hide
requires that "people who shouldn't see item X" line up exactly with a WordPress role
boundary. In practice, declutter needs are often narrower than a role:

- **One specific person, not a whole role.** A site owner wants to hide "Comments" for
  one contractor-editor who never uses it, without hiding it for every other editor —
  per-role hiding can't express this without creating a new WP role just for one person
  (which the shipped feature deliberately doesn't require).
- **Decluttering for a single named admin/power-user**, e.g. hiding "Plugins" for one
  admin who shouldn't be tempted to touch it, while leaving every other admin's menu
  untouched — again, a role-level hide would over-apply to every admin.
- **Ad hoc, low-friction exceptions.** Per-role hides are a blunt, site-wide policy tool;
  per-user hides are the "just for this one person" escape valve that keeps the
  per-role feature from needing ever-finer role subdivisions to express one-off needs.

Cloned-role/profile hiding adds value on top of *that*: once a site owner has crafted a
useful per-user hide-list for one person, a profile lets them **name and reuse** that
same bundle for the next similar person without re-checking every box again — the value
is reuse/consistency across a *small recurring group that doesn't map to a WP role*,
without requiring a real role to exist for that group.

## 9. Coexistence with the shipped per-role hide

The existing visibility popover already has "hide for role X" checkboxes fed by
`wp_roles()->get_names()`. The additive layer should surface as **more checkbox-style
targets in the same popover**, not a separate UI surface, to avoid splitting the mental
model:

- Keep the current role checkboxes exactly as-is (no behavior change, no re-labeling).
- Add a second, clearly-labeled section — "Hide for specific people" (per-user) and, if
  cloned-role ships, "Hide for profile" (profile) — using the same
  checkbox-list-with-search interaction pattern the role list already establishes,
  rather than inventing a new interaction paradigm.
- The three sections read as **one union**: "this item is hidden from anyone matched by
  any checked box below," consistent with §4's union-precedence invariant. No new mental
  model is introduced — only more rows.
- Config shape stays additive (§7): existing sites with only `hidden_roles` set are
  unaffected; the popover simply shows empty/unchecked new sections until used.

## 10. Targeting UX feasibility flag (options — not a decision)

Phase 21 must pick a targeting affordance for "which user(s) does this apply to." This
note flags candidates and a real perf risk, and explicitly leaves the pick to Phase 21:

- **Async user-search picker** (type-ahead, queries `wp-json/wp/v2/users?search=`)
  — scales to any site size, but adds a network round-trip and a new small
  editor-side dependency on the REST users endpoint (capability-gated by WP core
  already — `list_users`).
- **Plain `<select>`/dropdown of all users** — simplest to build, but does not scale:
  loading every user into a dropdown on a large site (thousands of users) is a real
  performance and payload-size risk (both for the admin-menu-editor page load and for
  the rendered DOM). Acceptable only behind a small-site-count heuristic, if at all.
- **"Hide for this user while viewing"** — an admin impersonates/previews as the target
  user (or simply toggles the hide while that user is the one currently logged in) —
  cheap to build, avoids the user-list problem entirely, but is more limited (only works
  well for one-at-a-time authoring, not bulk assignment) and needs its own small UX
  study on how an admin would actually reach this affordance for a *different* logged-in
  user's session.

**Perf risk flagged explicitly:** any affordance that loads "all users" into editor-side
state does not scale past a few hundred users and must not be the default on sites above
some threshold. This is a UX-design decision Phase 21 must make with real numbers in
hand — this note only surfaces the risk so Phase 21 isn't blindsided by it.

## 11. Safety rails (minimum)

At minimum, Phase 21's implementation must guarantee:

- **Never hide the acting admin's own Maestro editor entry or admin-bar toggle.** A hide
  rule that matches the currently-logged-in admin editing the config must not be able to
  remove Maestro's own entry point from their view — otherwise a self-inflicted hide
  rule could strand the admin with no visible way back into the editor. (The plugin's
  core value — "zero risk to access" — makes this a hard requirement, not a nice-to-have.)
- **Hidden pages remain URL-reachable — the escape hatch.** Consistent with the shipped
  per-role hide's existing code comment ("Cosmetic removal; the page still loads by
  direct URL"), any per-user/profile hide must leave the target page's own
  `current_user_can()` gate completely untouched. A user who is hidden from seeing
  "Tools" in the menu, but who independently holds the capability the Tools page
  requires, can still navigate there directly by URL and it will load normally. This is
  the safety valve that keeps a hide from ever becoming an accidental lockout, and it is
  exactly what the guardrail test in §6 asserts.

## 12. Multisite risk flag

Single-site is the primary target and the only configuration reasoned about in depth
here (matching the plugin's tested target per `19-CONTEXT.md`). Multisite introduces
specifics that are **flagged as a known risk/edge for Phase 21**, not solved here:

- **Super admin.** A super admin's capabilities are network-wide and partially
  synthesized (`is_super_admin()`), not fully captured by `$user->roles` on a given
  site — a naive per-user or per-profile hide rule authored on one site could have
  different practical effect for a super admin than for a normal per-site user. Phase 21
  must decide whether super admins are exempt from hides by default (consistent with
  "never lock out the admin" in §11) or treated the same as any other user.
- **Per-site roles.** The same user can hold different roles on different sites in the
  network; a `hidden_roles`/`hidden_users` config is already per-site (Maestro's option
  is stored per-blog), so per-user hides naturally inherit this per-site scoping — but
  it should be explicitly verified, not assumed, in Phase 21.
- **Network users vs. site users.** A `hidden_users` list authored via a per-site
  user-picker (§10) needs to decide whether it only offers users who are members of the
  current site, or any network user — an all-network picker compounds the perf risk
  flagged in §10 on large networks.

None of this changes the cosmetic-safety argument in §2-§4 (the mechanism is still a
boolean intersect-and-drop regardless of network topology) — it only affects which users
are practically reachable/targetable and how the picker (§10) should be scoped. Phase 21
owns resolving these specifics.

## 13. Enforcement-line reaffirmation

ROLE-02 is **cosmetic-only, full stop.** Maestro never enforces access. WordPress's own
per-page `current_user_can()` check — run by WordPress core or the target plugin itself,
inside that page's own callback — remains the true, only access gate. A hidden menu item
is a rendering decision made during the `admin_menu` hook; it has no bearing on whether a
direct hit to that page's URL succeeds. A user who is hidden from seeing a page, but who
independently holds the required capability, sees the page load normally if they
navigate there directly. This is unchanged from the shipped per-role hide and is not
weakened, bridged, or exception-cased anywhere in this proposal.

Maestro assumes **no dependency on any other plugin.** The cosmetic-only guarantee holds
on Maestro alone, using only WordPress core's user/role object and Maestro's own stored
config. Maestro's behavior is identical whether or not any other access-control or
security plugin is active on the site.

An *enforced* per-user access tier is a categorically different feature — it would
require Maestro to become (or depend on) something that can deny page loads, not just
menu visibility — and is explicitly **not** what ROLE-02 builds. Any such future
direction is an internal-roadmap idea only (tracked separately in project backlog, no
functional reference here) and this note makes no design, dependency, or bridge to it.

## 14. Sequencing recommendation

Per §7, per-user hiding (option a, the inline `hidden_users` axis) is the **simpler
branch to ship first** in Phase 21: it needs one new sanitize block (mirroring the
existing `hidden_roles` block almost line-for-line) and one widened boolean check, with
no new top-level config structure. Cloned-role/profile hiding adds a `profiles`
authoring structure and a compile-to-inline-axis step (§7) — a real but bounded increment
on top of the per-user work, not an independent build. Both clear the cosmetic-only bar
in this note (§4); neither is deferred as no-go. Phase 21 may ship both in one pass, or
ship per-user first and profile as a fast-follow within the same phase/milestone — that
sequencing call belongs to Phase 21 planning, not this note.

---

**This note gates Phase 21.** Per §4-§7, both branches clear the cosmetic-only bar
(partial-go is not required by a hard blocker, but per-user is flagged as the simpler,
lower-risk first slice). Phase 21 planning may proceed once a human reviewer signs off
this note via the Task 3 checkpoint. If sign-off instead requests changes, this note is
revised and Phase 21 planning remains blocked until an explicit go/partial-go verdict is
recorded here.
