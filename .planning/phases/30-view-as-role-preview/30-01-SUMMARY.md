# Phase 30 · Plan 01 — Summary

**Date:** 2026-10-23
**Status:** built. Server half only; no way to enter preview from the UI yet
(30-02). Needs Dan's deep review before merge, as the roadmap requires for a
capability-resolution change.

## What it does

`includes/class-preview.php` adds `Maestro\Preview`. A request to the
Dashboard carrying `maestro_preview=<role>` and a valid
`maestro_preview_nonce` makes the viewer's own capability checks answer as that
role would while the menu is built, then hands back their real capabilities.

- **Gate** (`Preview::validate()`, pure): an ordinary wp-admin page load, a
  site's own admin, the Dashboard, the viewer's REAL capabilities passing
  `capability()`, not a multisite super admin, a valid nonce, a role that
  exists and holds `read`. Capability is checked before the nonce, so someone
  who cannot edit learns nothing about it. Refusals are kept in
  `Preview::refused()` for 30-02's notice.
- **Window:** opens on `auth_redirect` (PHP_INT_MAX), closes on
  `custom_menu_order` (PHP_INT_MAX, after Replay's) and, as a backstop, on
  `admin_init` (PHP_INT_MIN). Core's menu build, plugins' `admin_menu`
  callbacks, Replay and core's pruning run inside it; the access check, the
  page and everything after run outside it.
- **Filter:** `user_has_cap` at PHP_INT_MAX. For the viewer only, every granted
  key the role lacks becomes `false`. It never adds a key or sets one `true`.
- **Maestro's rules:** while previewing, `is_hidden_for_current_user()`
  answers for the previewed role on the role axis and skips the person and
  profile axes. `is_edit_mode()` is false, so the editor never loads.

## Found on a real request: Dashboard only

The first version previewed on any admin page. On Settings, an administrator
previewing Editor got "Sorry, you are not allowed to access this page."
Core's pruning records what it removed in `$_wp_menu_nopriv` and
`$_wp_submenu_nopriv`, and `user_can_access_admin_page()` reads them after the
window has closed. Built inside the window, they describe the role. They
cannot be rebuilt for the viewer once the rows are gone, and clearing them
could let through a page the viewer really lacks. The Dashboard needs only
`read`, so preview now runs there and is refused on other pages. 30-02's
picker sends the viewer to the Dashboard. This is a narrowing of the approved
design, not a widening; Dan should confirm it in review.

## Tests

- `tests/unit/PreviewRequestTest.php`: 13 tests covering every branch of the gate.
  These were written after the first cut of the code, not before it.
- `tests/integration/PreviewWindowTest.php`: 25 tests, one per D2 boundary:
  - subtraction;
  - never granting, including a custom-role viewer previewing Administrator;
  - per-user grants removed;
  - viewer isolation;
  - closing at `custom_menu_order` and `admin_init`;
  - each refusal leaving capabilities untouched;
  - the super-admin refusal (multisite lane);
  - never edit mode;
  - no option or user-meta writes;
  - role rules applied for the previewed role, the viewer's own role rules
    not applied, and person rules not applied;
  - one run of core's own `wp-admin/menu.php` in preview. It checks that the
    window closes inside it, the Dashboard stays reachable, and the menu is
    Editor-shaped.
- Integration was run locally on SQLite (now documented in TESTING.md):
  - single site: 227 tests, 894 assertions, 15 skipped;
  - multisite: 227 tests, 922 assertions, 1 skipped.

  Before this plan, these local runs matched CI's counts exactly.
- Unit 234/234 (555), phpcs and PHPStan clean.
- A real request on the local site (WordPress 7.1.3) gave:
  - **Full menu:** Dashboard, Posts, Media, Pages, Comments, Appearance,
    Plugins, Users, Tools, Settings.
  - **Editor preview:** Dashboard, Posts, Media, Pages, Comments, Profile,
    Tools.
  - **Settings with a preview arg:** refused as `not_dashboard`, so Settings
    rendered normally.
  - **Bad nonce:** the full menu.

## For 30-02

- Per-role parity against real users of each core role belongs in e2e: core's
  menu include is `require_once`, so PHPUnit can run it only once per process.
- The picker navigates to `index.php`, not the current page.
