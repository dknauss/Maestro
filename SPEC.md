# Maestro — Plugin Specification

## Overview

A WordPress plugin that makes the admin menu editable **in place**: rename items, reorder them, swap top-level dashicons, and hide items per role. There is no separate settings screen — editing happens on the menu itself, toggled from the admin bar. Customizations are **global** (one configuration applies to everyone) and are stored as a sparse delta layered over the menu WordPress builds each request.

**Plugin name:** Maestro - Inline Admin Menu Editor
**Plugin slug:** `maestro-menu-editor`
**Text domain:** `maestro-menu-editor`
**PHP namespace:** `Maestro`
**Option key:** `maestro_config` (single, autoload `false`)
**Update URI:** omitted (the unique `maestro-menu-editor` .org slug is the collision protection; Plugin Check disallows the header for .org-hosted plugins. Re-add `Update URI: false` only when distributing off-.org under a non-unique slug.)
**License:** GPL-2.0-or-later

---

## Guiding Principles

1. **The editor is a capture mechanism; the replay engine is the truth.** The menu re-renders server-side on every admin load. Drag/rename/recolor in the DOM only collects intent; the real work is replaying stored overrides onto `$menu`/`$submenu` each request.

2. **Store the delta, not the menu.** The config holds only what the user changed. The natural menu is never copied. This is what makes reset trivial (delete the option) and the system resilient (orphaned overrides degrade silently; new plugin items appear automatically).

3. **Visibility is presentation, not authorization.** Hiding an item declutters the menu; it does not lock the page. A page's own registered capability is the true gate, and it lives on a different plane. The plugin never pretends otherwise, and points users to a capability manager for real access control.

4. **Borrow patterns, not code.** Prior art (Admin Menu Editor) solves the same hard problems — highlighting, slug normalization — but with a heavier full-rebuild architecture and a dedicated editor screen. We study its solutions to the dragons; we do not import its approach.

5. **Degrade gracefully over matching cleverly.** When a stored slug no longer corresponds to a live menu item, skip it. Never error, never guess.

---

## Architecture

### Components

| Class | File | Responsibility |
|-------|------|----------------|
| `Config` | `includes/class-config.php` | Read/write/sanitize the single option. Owns the override schema and the reset. |
| `Ordering` | `includes/class-ordering.php` | Pure reorder logic (top-level + submenu) with the resilience contract. No WP calls — unit-testable. |
| `Replay` | `includes/class-replay.php` | On a late `admin_menu` pass, mutate the globals (rename/icon/visibility) and reorder submenus; expose the editor model + pristine snapshot. |
| `Rest` | `includes/class-rest.php` | `maestro/v1/config` GET/POST/DELETE, capability-gated. |
| `Admin_Bar` | `includes/class-admin-bar.php` | The edit-mode toggle node. |
| `Assets` | `includes/class-assets.php` | Enqueue + localize the editor, edit mode only. |

Two free functions in the bootstrap: `Maestro\capability()` (filterable via `maestro_capability`) and `Maestro\is_edit_mode()` (capability-gated `?maestro_edit=1`).

### Request lifecycle

1. `admin_menu` fires; every plugin registers its items.
2. **`Replay::replay()` runs at `PHP_INT_MAX`** — after everyone. In edit mode it first snapshots the natural state (pristine), then applies rename/icon/visibility to `$menu`/`$submenu` and reorders each submenu.
3. Core applies the **`custom_menu_order` + `menu_order`** filters; `Replay::reorder_top()` returns the re-sorted top-level slug list.
4. `admin_enqueue_scripts` fires; if in edit mode, `Assets` enqueues the editor and localizes the now-effective menu model.
5. `menu-header.php` renders the menu.
6. The editor (browser) decorates the rendered menu and collects edits via a **click-to-select** model. Each change **autosaves** (debounced) by `POST`ing the full config to REST — no manual Save button, no reload per change. The menu is reloaded only on **Exit edit mode**, to reconcile the live preview against the server render.

### Data model (`maestro_config`)

```php
[
  'items' => [
    '<slug>' => [
      'title'        => 'Custom Title',         // optional; top-level or submenu
      'icon'         => 'dashicons-foo',         // optional; TOP-LEVEL ONLY (index 6)
                                                 //   any of the four native forms (see below)
      'hidden_roles' => [ 'author', 'editor' ],  // optional; roles that do NOT see it
    ],
  ],
  'top_order' => [ '<slug>', '<slug>', ... ],            // desired top-level order
  'sub_order' => [ '<parent_slug>' => [ '<slug>', ... ] ],
]
```

- **Identity = `menu_slug`** (the `$menu`/`$submenu` index `2`). Slugs may be query-arg URLs (`edit.php?post_type=page`); they are treated as opaque strings, never parsed.
- The stored config is always a **diff against pristine** — the editor only writes keys that differ from the captured defaults, so untouched items continue to reflect upstream changes (e.g. a plugin renaming its own item).
- **Icon accepts all four native WordPress menu-icon forms** (the values `add_menu_page()` allows at index `6`), validated by `Config::icon_form()`:
  1. a `dashicons-*` class;
  2. the literal `none` (blank, styled via CSS);
  3. a base64 image **data-URI** (`data:image/{svg+xml|png|gif|jpeg|webp};base64,…`);
  4. an image **URL** (http(s), protocol-relative, or root-relative).
  Anything else is rejected to `''`. The picker bundles two sets — the dashicons font and ~87 curated **Bootstrap Icons** (MIT) baked to data-URIs — but the validator, not the picker, is the authority on what may be saved.

### Ordering contract (`Ordering::top` / `::submenu`)

Both methods obey the same rules:

1. Desired items that still exist are emitted first, in desired order.
2. Live items not named in the desired order are appended afterward, in their original relative order (newcomers sink to the bottom).
3. Desired names that no longer exist are skipped.
4. A duplicated desired name is honoured once.

Empty desired order ⇒ passthrough. These are pure functions (no WP dependency) and carry the densest unit coverage.

### REST contract (`maestro/v1/config`)

| Method | Body | Returns | Notes |
|--------|------|---------|-------|
| `GET` | — | `{ config }` | Current stored config. |
| `POST` | `{ config: {...} }` | `{ saved: true, config }` | **Full replace.** Sanitized server-side; returns the stored result. |
| `DELETE` | — | `{ reset: true, config: {} }` | Deletes the option. |

- **Auth:** `permission_callback` ⇒ `current_user_can( Maestro\capability() )`. Cookie-auth nonce via `X-WP-Nonce` (`wp_create_nonce('wp_rest')`).
- **Save semantics:** what you send is what gets stored (after sanitization). Predictable, no merge surprises.

### DOM-join contract (editor ↔ rendered menu)

The editor does **not** scrape the DOM to discover the menu. PHP localizes a model with, per top-level item, the exact `<li>` id that `menu-header.php` assigns (core's `preg_replace('|[^a-zA-Z0-9_:.]|', '-', $item[5])`). The JS:

- **Top-level:** `getElementById(liId)` — precise.
- **Submenu:** the localized order matches the rendered `.wp-submenu > li` order (both derive from the same `$submenu` array), so items are zipped **by index** after skipping `.wp-submenu-head`.

This is the most environment-sensitive seam and is exercised only by the E2E layer.

### Localization / i18n contract

The plugin text domain is `maestro`, matching the WordPress.org slug
and plugin header. The plugin declares `Domain Path: /languages`, ships a POT
template, and bundles starter catalogs for `es_ES`, `de_DE`, `ja`, `fr_FR`,
`pt_BR`, and `it_IT`. Runtime PHP strings use WordPress translation helpers with
that text domain. The editor does not hardcode user-facing English strings in
JavaScript; PHP passes translated labels, dialog names, button text, status
messages, and reset prompts through `maestroData.i18n` via `wp_localize_script()`.

WordPress.org language packs can still override and extend the bundled
translations. The bundled catalogs are starter translations and should remain
open to native-speaker and WordPress Polyglots review. Plugin Check validates
the shipped runtime artifact.

### Editor interaction model

The editor is **selection-based**, not per-item-decorated. This keeps the DOM changes to the menu minimal, which is what makes it survive WordPress's own menu CSS (including folded mode) and stay light.

- **Force a stable expanded state while editing.** On entering edit mode the body gets an editing class that overrides `body.folded` and disables the fold/flyout behaviour (guard against `common.js` re-collapsing). All editing happens against the expanded menu; folded mode is never edited directly.
- **No chrome until selection.** On entering edit mode the menu shows no edit tools. Each row exposes only a faint drag handle on hover/focus; the icon / visibility / reset controls live exclusively in the shared panel, which stays empty/hidden until an item is selected.
- **Per-item DOM is minimal:** a drag handle (for sortable, hover/focus-revealed) and a selection target. No per-item button clusters.
- **Click to select.** Clicking an item (top-level or submenu) selects it — navigation is already suppressed in edit mode — and applies a selection highlight. Exactly one item is selected at a time.
- **One shared controls panel** reflects the selected item: a rename field, an icon picker (top-level only; absent/disabled for submenu items, which carry no icon), per-role visibility toggles, and a reset-this-item control. One panel, not N clusters.
- **Autosave, debounced (~500 ms).** Every change — reorder (`sortstop`), rename commit, icon pick, visibility toggle, per-item reset — autosaves by POSTing the full config. The payload shape is unchanged (full replace); only the cadence differs. **No reload on autosave**; the live DOM preview already reflects the change. A subtle "Saving… / Saved ✓" status replaces the Save button.
- **Reload only on Exit**, to reconcile the preview against the authoritative server render. "Reset all" remains the global escape hatch.

This model supersedes the original always-visible per-item control clusters, which were too heavy and broke in folded mode.

---

## Security

- **Capability gate everywhere.** Admin-bar node, edit-mode flag, asset enqueue, and every REST method check `Maestro\capability()` (default `manage_options`, filterable).
- **Nonce on writes.** REST writes require the `wp_rest` cookie-auth nonce.
- **Server-side sanitization is authoritative.** `Config::sanitize()`:
  - titles ⇒ `sanitize_text_field` (markup stripped);
  - icons ⇒ classified by `Config::icon_form()` into one of the four native forms (dashicon / `none` / base64 image data-URI / http(s)·protocol-relative·root-relative URL) and sanitised per form (`sanitize_html_class`, passthrough, format-validated, `esc_url_raw`); anything else is dropped. Data-URIs render as CSS `background-image` (a non-executing context), so embedded SVG markup cannot run script; URL/whitespace/quote/angle break-out is rejected before `esc_url_raw`;
  - `hidden_roles` ⇒ intersected against live `wp_roles()` (unknown roles dropped);
  - slugs ⇒ tags stripped, but `? = . /` preserved (legitimate in core slugs), so **never** `sanitize_key` on a slug.
- **No privilege escalation surface.** The plugin cannot grant capabilities or change what any role *can do*; it only reshapes the menu. Hiding is cosmetic by design (see Principle 3).
- **No data in URLs.** Edit mode is a single boolean query flag; all state travels in the REST body.

---

## Accessibility

- Edit affordances are real `<button>`s with `title` labels; the rename control is a focusable `<input>` in the shared panel, committed on `Enter` and reverted on `Escape`.
- The menu is forced to a stable expanded state while editing, so all items (and the selection model) are reachable without hover/flyout behaviour.
- Keyboard users can tab to rendered menu links and press `Enter` or `Space` to select an item; focus then moves to the rename field in the shared controls panel.
- The icon picker and visibility picker are modal popovers with dialog semantics, trapped tab focus, Escape-to-close behaviour, and focus restoration to the triggering control.
- The shared controls panel and status indicator use core `.button`/`.button-primary` classes for native focus styling and contrast. Save success/failure is exposed through a polite status live region and `wp.a11y.speak()`.
- **Known gap (roadmap):** drag reordering is currently mouse/touch only via jQuery-UI sortable. Keyboard move-up/move-down controls or `aria-grabbed` semantics are deferred to v2.

---

## Testing Strategy

Three layers (see `TESTING.md` for commands):

1. **Unit (pure PHP).** `Ordering` resilience cases (orphan drop, newcomer append, dedupe, query-arg slugs, empty passthrough) and the dashicon validator. No WordPress, no DB. The ordering algorithm was additionally cross-validated via a faithful port.
2. **Integration (WP_UnitTestCase via wp-env).** Rename/icon/rename-submenu applied to real globals; role-based hide/show with factory users; submenu reorder; `menu_order` filter; empty-config no-op; full REST round-trip including capability rejection (subscriber ⇒ 403) and sanitization (bad icon dropped, unknown role filtered, markup stripped); reset clears the option.
3. **E2E (Playwright).** Edit-mode gating, admin-bar toggle presence, rename → save → persist-across-reload → reset-restores, and icon-picker preview.

Coverage targets the seams most likely to break: the pure ordering logic (unit), the global mutation + auth (integration), and the DOM-join + sortable + persistence flow (E2E).

---

## Edge Cases & Known Limits

- **Rename drops count badges.** Core injects badge markup (pending comments, plugin updates) *inside* the title string, so a renamed item loses its badge. Inherent to renaming; documented, not patched.
- **Separators are preserved, not editable.** Their generated slugs (`separator1`…) have no stable identity to key against. Sorting restricts itself to `li.menu-top.maestro-item`, leaving separators in place.
- **Late submenu registration.** Items registered on an unusually late hook (after `admin_menu` `PHP_INT_MAX`) may escape capture. Acceptable for v1; documented.
- **Custom top-level icons** accept all four native WordPress forms (dashicon / `none` / base64 image data-URI / image URL). Bundled data-URI icons (e.g. Bootstrap Icons) are baked to a fixed grey and so do **not** recolour on hover/active the way dashicon fonts do — a known cosmetic limitation of background-image icons. Arbitrary user-uploaded/pasted SVG (which would need deep markup sanitisation for inline rendering) remains out of scope.
- **`menu-icon-*` must be stripped for custom image icons.** Core gives its own items (Posts, Pages, Media, …) a `menu-icon-{slug}` class — printed on *both* the `<li>` and its `<a>` — whose CSS sets `background-image: none !important` on `div.wp-menu-image`. That rule would hide a data-URI/URL icon. The replay engine drops `menu-icon-*` from the menu row's class field when applying such an icon (and the editor mirrors this on the live `<li>`+`<a>` during preview); a dashicon, which paints via `::before`, keeps the class. Do not reinstate the class for custom-image items.

---

## Roadmap

1. **Reparenting.** Move items between top-level and submenu. Requires hand-splicing the globals plus `parent_file`/`submenu_file` highlighting fixes — the known minefield. Highest-value v2 feature; gated on a solid highlighting strategy (study Admin Menu Editor's approach).
2. **Separator management.** Add/move/delete separators, with a synthetic stable id scheme to survive plugin churn.
3. **Keyboard-accessible reordering.** Move-up/move-down controls and/or ARIA grab semantics, removing the mouse-only dependency.
4. **Per-item reset in the UI surfaced as an explicit affordance** with a visible "modified" indicator diffing against pristine.
5. ~~**Custom icon support.** Dashicons picker plus URL/SVG and `none`, with appropriate sanitization.~~ **Done** — the validator accepts all four native forms and the picker bundles dashicons + Bootstrap Icons. Remaining: media-library/URL input in the UI, arbitrary SVG upload with deep sanitisation, a `mask-image` path so bundled SVGs recolour with the admin scheme, and a heavier/solid bundled set (Bootstrap `*-fill` or Heroicons Mini) so bundled icons match dashicons' weight (V2-11 — the outline Bootstrap glyphs read thin next to dashicons).
6. **Import/export config** as JSON for staging→production parity and version control.
7. **Optional enforcement bridge.** Not built-in access control, but a documented, opt-in handoff that sets a hidden item's required capability *in concert with* a capability manager — clearly labelled as defense-in-depth, never as the primary lock.
8. **Multisite / network-level defaults** with per-site override.
9. **Configurable admin-menu width.** A toggle/control to widen the 160px sidebar so long or renamed titles don't wrap. Global `menu_width` in config, applied on every admin page via the same `#adminmenu`/`#wpcontent` rules used by the folded-mode override. First asset loaded outside edit mode; must respect folded mode and the `<782px` responsive breakpoint. (cf. "Wider Admin Menu", integrated into the editor.)
10. **Admin toolbar editing (research).** Feasibility of extending the in-place editor to the top admin bar (`#wpadminbar`) — hide/reorder/rename toolbar nodes with a better inline interface than existing tools (cf. "Hide Admin Menu"). Investigate `WP_Admin_Bar` node registration, safely-hideable nodes, front-end vs admin rendering, and per-role handling. Deliverable is a feasibility note first, not a commitment.
11. **UI/UX design polish.** Review edit mode as a dense WordPress admin tool: control hierarchy, spacing, responsive behavior, modified-state affordances, save/error status clarity, icon-picker scanability, and first-run/onboarding cues. Keep it visually native to wp-admin and verify with before/after screenshots plus keyboard/mouse walkthrough notes.

---

## Technical Decisions Log

- **Why an overlay/delta, not a stored full menu?** Reset becomes `delete_option`; resilience to plugin churn falls out for free; upstream label changes are not masked for untouched items. The full-rebuild approach (Admin Menu Editor) must work to recapture defaults — we get them for nothing.
- **Why `menu_order` filter for top-level but direct mutation for submenu?** Top-level ordering has a dedicated, stable core API; submenu ordering does not, so we rebuild `$submenu[$parent]` directly (menu-header.php `array_values()` flattens our sequence at render).
- **Why localize a model instead of scraping the DOM?** The `<li>` id join is deterministic and version-stable; href-scraping is fragile against absolute URLs and query-arg slugs.
- **Why the admin bar for the toggle?** A toggle that lives inside the menu it rearranges (and can hide) is self-undermining. The admin bar is always present and orthogonal to the edited surface.
- **Why stateless `?maestro_edit=1`?** No persisted edit state to leak, expire, or clean up; capability-gated so the flag alone is inert.
- **Why extract `Ordering`?** The resilience rules are the highest-risk logic and were entangled with WP globals. Pulled into a pure class, they become fast, dependency-free unit tests.
- **Why cosmetic-only visibility?** Authorization is a separate concern with a separate, mature toolset. Bundling half-enforcement manufactures false security — the worst failure mode in access control.
- **Why autosave instead of a Save button?** The in-place ethos wants changes to stick without ceremony; a manual Save is one more failure point (and was implicated in early "changes don't persist" reports). Debounced autosave with a status indicator, reloading only on Exit, keeps the toolbar light and nothing is lost. "Reset all" is the escape hatch for regret.
- **Why click-to-select with one shared panel, not per-item controls?** Always-visible per-item button clusters were too heavy and broke against WordPress's own menu CSS in folded mode. A selection model keeps per-item DOM to a handle plus a highlight, moving all controls into a single panel — far less to fight, and it also dissolves an earlier double-bound rename-handler smell.
- **Why rename the slug (and why no `Update URI`)?** The original slug `admin-menu-customizer` collided with a WordPress.org plugin, so core's update check overwrote the local code (the "plugin confusion" risk). The durable fix is a **unique slug** (`maestro-menu-editor`, verified free on .org). An interim `Update URI: false` header was used as extra insurance, but it is **disallowed by Plugin Check for .org-hosted plugins** and unnecessary once the plugin owns its slug, so it was removed for submission. Re-add it only for off-.org distribution under a non-unique slug.

---

## References

- [WordPress Administration Menus — Plugin Handbook](https://developer.wordpress.org/plugin/administration-menus/)
- [`custom_menu_order` / `menu_order` filters](https://developer.wordpress.org/reference/hooks/menu_order/)
- [`wp-admin/menu-header.php` (render + `<li>` id derivation)](https://github.com/WordPress/WordPress/blob/master/wp-admin/menu-header.php)
- [REST API — Adding Custom Endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/)
- [Dashicons](https://developer.wordpress.org/resource/dashicons/)
- [`@wordpress/env`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/)
- [WordPress PHPUnit test suite](https://make.wordpress.org/core/handbook/testing/automated-testing/phpunit/)
- [Playwright](https://playwright.dev/)
- Capability managers for real enforcement: [User Role Editor](https://wordpress.org/plugins/user-role-editor/); [PublishPress Capabilities](https://wordpress.org/plugins/capability-manager-enhanced/) (menu-aware; Pro blocks pages by URL).
