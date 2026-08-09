=== Maestro: The Inline Admin Menu Editor ===
Contributors: dpknauss
Donate link: https://github.com/sponsors/dknauss
Tags: admin menu, admin menu editor, menu editor, hide menu items, menu icons
Requires at least: 6.4
Tested up to: 7.0
Stable tag: 1.5.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Rename, reorder, change icons, and hide WordPress admin menu items per user role — an inline admin menu editor you drive right on the menu itself.

== Description ==

**Maestro lets you orchestrate the appearance of the WordPress admin menu.** 

Instead of a separate settings screen, Maestro turns the admin menu into something you edit *in place* — right where it lives. Toggle **Edit Menu** from the admin bar, and the menu becomes editable. Click a menu item to rename it, hide it from selected user roles, or change its icon. Drag submenu items and whole menu groups to reorder them. 

**Try Maestro right here.** Launch a demo in [WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-hosted.json) — it boots a throwaway site with the plugin active in edit mode, plus User Switching and test users (editor, author, contributor, subscriber; password `password`) so you can try per-role visibility by switching to another user's account.

= What you can do — as a site administrator =

Maestro's enhancements are only activated for logged-in users with an Administrator role. They can:

* **Rename** any top-level or submenu item — just click the label.
* **Reorder** items by dragging (top-level items among themselves, submenu items within their parent), or with the keyboard (`Alt`+`Arrow`).
* **Swap icons** on top-level items. The icon picker offers Dashicons and bundled Bootstrap Icons with search. It accepts any of WordPress's four native icon forms (dashicon, "none", base64 image data-URI, or an image URL).
* **Hide** items from chosen roles — including administrators. Custom roles registered by other plugins ([User Role Editor](https://wordpress.org/plugins/user-role-editor/), [Members](https://wordpress.org/plugins/members/), etc.) appear automatically.
* **Hide items from specific people**, by name, when a role is the wrong unit — one person on a shared role who doesn't need a particular tool. Search for someone in the visibility popover and add them; a parent's sub-items can be hidden per person too, with the parent left visible. Like every other hide in Maestro, this is cosmetic only: the page still loads by URL for anyone authorized to see it.
* **Reset** a single item to its WordPress default, or reset everything at once.

Changes are **global** — one configuration applies to everyone. Your custom menu configuration is stored as a sparse delta (just the differences) layered over the menu WordPress builds on each load. Nothing is rebuilt or duplicated, so a reset simply removes the delta, and the original menu returns. 

= Important: visibility is cosmetic, not access control =

Hiding a menu item only declutters the menu. The underlying admin page still loads for anyone who knows or types its URL if they're authorized to see it. That's because a page's own registered **capability** is the true lock. Maestro operates on the menu (presentation), which is a different plane from authorization.

If you need to actually prevent *access*, pair Maestro with a capability manager like [PublishPress Capabilities](https://wordpress.org/plugins/capability-manager-enhanced/)**. It's menu-aware, and its Pro tier can block admin pages by URL.

The `maestro_capability` filter lets such a plugin hand editing rights to a custom capability instead of the default `manage_options`.

= Accessibility and localization =

The editor is keyboard-operable end to end — select with `Enter`/`Space`, reorder with `Alt`+`Arrow`, and every move and save is announced to screen
readers. Modified items carry a non-color indicator with screen-reader text, so their state is never indicated by color alone.

Maestro uses the `maestro-menu-editor` text domain and ships a translation template plus starter language packs for Spanish (`es_ES`), German (`de_DE`), Japanese (`ja`), French (`fr_FR`), Portuguese – Brazil (`pt_BR`), and Italian (`it_IT`). WordPress.org language packs override and extend these; native-speaker and WordPress Polyglots reviews are welcome.

== Installation ==

1. In your dashboard, go to **Plugins → Add New**, search for "Maestro: The Inline Admin Menu Editor", and click **Install Now**, then **Activate**.
2. Or upload the plugin zip via **Plugins → Add New → Upload Plugin**, then activate it.
3. Or, manually: unzip into `wp-content/plugins/maestro-menu-editor` and activate from **Plugins**.
4. After activating, click **Edit Menu** in the admin bar to start editing the admin menu in place.

== Frequently Asked Questions ==

= Does hiding a menu item block access to that page or disable its features? =

No — and this is important. Hiding an item is **cosmetic**: it removes the link from the admin menu but does not stop anyone from reaching the page by typing or
bookmarking its URL. Real access is governed by each page's registered capability. To truly block all access to a page, use a capability manager such as
[User Role Editor](https://wordpress.org/plugins/user-role-editor/) or [PublishPress Capabilities](https://wordpress.org/plugins/capability-manager-enhanced/).

= Do my changes affect everyone, or just me? =

Everyone. Maestro stores one global configuration that applies to all users. *Visibility* is the exception: you can hide items from chosen roles, or from
named individuals, so what each person sees can differ. The rename/reorder/icon changes themselves are global.

= Can I hide something from just one person? =

Yes. Alongside the role lists, the visibility popover has a search box for
people. Type a name, pick them, and the item disappears from that person's menu
only — everyone else with the same role still sees it. You can target several
people, and on an item with children you can hide the sub-items per person while
the parent stays visible.

Use it when a role is the wrong unit: one editor on a team of editors who
doesn't need a particular tool. If you find yourself adding the same person list
to many items, a role is probably the better fit.

Two notes. Targeting your own account is allowed — Maestro warns you, and you
can always get back in, because the Edit Menu control lives in the admin bar and
no hide rule can remove it. And on a multisite network, network super admins are
exempt from person-targeted hides (role-targeted hides still apply to them, as
they always have).

= Can I hide items from administrators, too? =

Yes. The hide by role feature includes the administrator role. However, you have to be an administrator to use Maestro's features, so if you hide a menu item from administrators, you are hiding it from yourself as well.

Remember that this is cosmetic, not a permission change, and you can reset any or all of the changes made in Maestro at any time.

= Does it work with custom roles from other plugins? =

Yes. Any role registered on the site — including custom roles from User Role Editor, Members, and similar plugins — appears automatically in the visibility
control.

= Is the editor keyboard accessible? =

Yes. You can select, rename, reorder (`Alt`+`Arrow`), open the icon and visibility controls, and reset items without a mouse. Saves and moves are announced to screen readers.

= What happens when I deactivate or reset the plugin? =

The admin menu returns to exactly what WordPress and your active plugins generate. Your customizations live in a single option as a sparse delta; **Reset All** deletes that option, and deactivating the plugin stops it from being applied.

= Can I move an item between a top-level position and a submenu? =

Not yet. Reparenting is deliberately deferred (see "Known limits" below). Top-level items reorder among top-level items, and submenu items reorder within
their current parent.

== Screenshots ==

1. The inline editor — select any admin-menu item to edit it in place using the quiet, wp-admin-native toolbar and shared controls panel (rename, icon, visibility, reset). A single admin-bar toggle enters and exits edit mode — labelled "Edit Menu" when idle and "Exit Menu Editor" while editing.
2. The icon picker: searchable Dashicons and bundled Bootstrap Icons tabs for swapping a top-level admin menu icon.
3. Visibility — open the selector to hide an item from selected roles or from named individuals, and (on an item with children) to hide its sub-items independently while the parent stays visible. Cosmetic declutter, not access control.
4. A renamed item showing the transient "Saved" state — the indicator auto-clears to idle once the autosave settles.
5. Reordering a top-level menu group by dragging — a live sortable-helper shows the item in motion.
6. Reordering a submenu item using the ▲/▼ move controls — the OS-independent, keyboard-accessible reorder path.

== Architecture (for developers) ==

* `Config` — reads/writes/sanitizes a single option (`maestro_config`) holding only the deltas. Reset = delete the option; the natural menu returns automatically.
* `Replay` — on a late `admin_menu` pass, applies rename/icon/visibility to the `$menu`/`$submenu` globals and reorders submenus. Top-level order uses the core `custom_menu_order` + `menu_order` filters. Resilient to missing slugs (orphans are skipped) and new items (appended at the end).
* `Rest` — `maestro/v1/config` (GET/POST/DELETE), capability-gated, `X-WP-Nonce`.
* The editor JS is driven by a localized model (with DOM ids), not DOM scraping, and diffs against captured pristine defaults so the stored config stays sparse.
* Localized editor labels are passed from PHP to JavaScript in `maestroData.i18n`; the runtime zip includes the bundled POT template and starter catalogs.

== Performance & footprint ==

Maestro is built to stay out of the way:

* **Zero extra database queries on the front end.** Every hook is admin-only, so the plugin is completely inert for public page loads and logged-out visitors.
* **One extra query on an admin page** — a single, *non-autoloaded* option (`maestro_config`), read once per request and cached. With a persistent object cache (Redis / Memcached) that drops to zero.
* **Nothing added to `alloptions`.** Because the option is not autoloaded, it adds no weight to the bundle WordPress loads on every request.
* **Minimal storage.** One `wp_options` row, created only when you first save a change — a fresh install stores nothing. No custom tables, no post or user meta, no transients, no cron jobs. Uninstalling deletes that single row.
* **Small install** — roughly a 115 KB download. Menu changes are applied in memory during the `admin_menu` pass, not through extra queries.

(Figures are a v1.4.1 snapshot.)

== Known limits / deferred to v2 ==

* **Reparenting** (moving an item between a top-level position and a submenu) is not included. Top-level items reorder among top-level items, and submenu items reorder within their current parent. Reparenting needs hand-splicing of the globals plus `parent_file`/`submenu_file` highlighting fixes — a known minefield, parked deliberately.
* **Separators** are preserved in place but not yet add/move/delete-able; their generated slugs (`separator1`…) have no stable identity to key against.
* **Renaming** an item drops any core-appended count badge (e.g., pending comments) from that label, since the badge lives inside the title string.
* Submenu sort relies on items registering by the late `admin_menu` pass; a plugin that registers submenus on an unusually late hook may not be captured.

== Credits ==

Bundled [Bootstrap Icons](https://icons.getbootstrap.com/) are © The Bootstrap Authors, licensed under the MIT License. They are recoloured to WordPress
menu grey and embedded as data-URIs; see `bin/generate-bootstrap-icons.mjs`.

== Support This Plugin ==

If Maestro saves you time or brings you or your clients the joy of a tidy admin menu, you can support its ongoing maintenance through [GitHub Sponsors](https://github.com/sponsors/dknauss).

== Changelog ==

= 1.5.0 =
* **New: hide menu items from specific people, not just roles.** The visibility popover now has a search box for people alongside the role lists. Type a name, pick them, and the item disappears from that person's admin menu only — everyone else with the same role still sees it. You can target several people, and on an item with sub-items you can hide the sub-items per person while the parent stays visible. Use it when a role is the wrong unit: one editor on a team of editors who doesn't need a particular tool.
* **Still cosmetic, exactly like hiding by role.** This changes what someone sees, never what they can do. A hidden page still opens normally for anyone who types its URL and holds the capability it requires, and no capability is added or removed by any rule. If you need to actually restrict access, pair Maestro with a capability manager — hiding a menu item is not a security measure.
* Targeting your own account is allowed. Maestro warns you inline, and you can always undo it: the Edit Menu control lives in the WordPress toolbar where no rule can reach it, and a row you have hidden from yourself still appears while you are editing so you can remove the rule.
* Targeting people requires the ability to list users. If you have handed Maestro to a custom role via the `maestro_capability` filter and that role cannot list users, the person search is hidden and hiding by role continues to work as before.
* Known limitation: on a multisite network, network super admins are not affected by person-targeted hides. Role-targeted hides still apply to them, unchanged.

= 1.4.1 =
* **Fixed: editing a top-level item no longer changes a submenu item that happens to share its slug.** WordPress and many plugins register a submenu under the same slug as a top-level item — the "All Products" self-link under a custom post type, or a plugin shortcut that points at an existing top-level screen. Renaming or hiding the top-level item could carry to that submenu row as well. It now applies only to the item you edited. This completes the fix started in 1.4.0, which covered the reverse direction (editing a submenu never touched its parent).
* Configs are now stamped with a schema version, so Maestro can tell an override you saved recently from one saved before submenu items could be addressed individually. Overrides saved by earlier versions keep behaving exactly as they did until you next save.
* **If a submenu item was already renamed along with its parent**, that name is kept when you upgrade, so nothing changes under you unexpectedly. Select that submenu item and use **Reset Item** once to restore its original label.

= 1.4.0 =
* **Hide sub-items independently of their parent.** The visibility popover now offers a second role list, "Hide its sub-items from:", on any item that has children — so a parent can stay visible while its sub-items are hidden from the roles you choose. A role already hidden at the parent level shows as implied and is never stored twice.
* **Renames keep count bubbles and badges.** Renaming an item that carries a count bubble or a "NEW" badge (WooCommerce order counts, plugin notification badges) now preserves that markup instead of stripping it. The stored title stays plain text; the badge is re-read from the live menu on every request.
* **Editing a submenu no longer changes its same-slug parent.** WordPress registers some submenu items under the same slug as their top-level parent (the "All Products" style self-link under a custom post type). Renaming or hiding that submenu row now applies to that row alone. Editing the *top-level* item still carries to a same-slug submenu row until you give that row an edit of its own — that is deliberate, so overrides saved by earlier versions keep behaving exactly as they did.
* **Better coexistence with other menu plugins.** Maestro no longer overrides another plugin's `custom_menu_order` when it has no ordering of its own to apply.
* Hiding a top-level item is now strictly cosmetic by construction: Maestro only removes a row the current user could already reach, so WordPress core's own permission check still fires on every page. Hiding can never widen access.
* Internal hardening: the stored config is bounded (slug length, icon URL length, sub-order parents, and a 1 MB aggregate ceiling), and an over-size payload is rejected whole rather than partially written.
* Accessibility: the two role lists in the visibility popover are now programmatically grouped and named, so screen-reader users can tell "hide this item" from "hide its sub-items".
* Fixed: a very long menu name written in a multibyte script (Japanese, Chinese, emoji) is now shortened on a character boundary instead of being cut mid-character.

= 1.3.1 =
* Editor restyle: the edit-mode toolbar and controls now look native to wp-admin — quiet, borderless icon buttons replacing the coloured-outline toolbar introduced in 1.2.0. Colour is now reserved for errors and the destructive "Reset All".
* Exit is a single control: the admin-bar "Exit Menu Editor" toggle (the duplicate Exit button in the bottom toolbar is gone). Clicking it saves any pending change before leaving edit mode.
* Quieter save status — a muted "Saved" confirmation, with red shown only when a save fails.
* The controls panel, the icon/visibility popovers, and the first-run tour adopt core wp-admin styling; the first-run banner's text and button are now vertically centered.
* Accessibility: improved contrast for the "Reset All", "Save failed", and "Saved" indicators on dark admin colour schemes (e.g. Midnight).

= 1.3.0 =
* Saved overrides now keep applying even when your site moves to a new host, when a plugin updates and changes a version number in its menu URL, when UTM tracking parameters drift on external-tool links, and when a taxonomy slug is stored with `&amp;` encoding instead of `&` (or vice versa) — no manual re-save needed.
* Edit-mode toolbar: the Exit and Reset All controls now use clearer, more consistent icons (Exit matches the admin-bar toggle).
* New: a first-run guided tour walks you through editing the menu — selecting an item, the rename/icon/visibility controls, reordering, autosave, and exit. A "?" button in the edit-mode toolbar replays it anytime. (It replaces the previous one-time menu highlight.)
* Fix: while editing, the menu's group separators no longer show as a stray dark band between sections (most noticeable above the Posts group); they collapse so items sit flush. The normal menu is unchanged.

= 1.2.0 =
* Redesigned edit-mode toolbar: every control is now a compact icon button in one consistent system, with colour signalling meaning — green for editing/saved, amber for unsaved changes, red for Reset All. Fully accessible: each control keeps its name for screen readers and shows a tooltip on hover.
* Mobile: the editor is reachable on phones now — the admin-bar "Edit Menu" toggle stays visible at small screen widths (it was hidden before), and the toolbar and controls are sized for touch.
* "Edit Mode" indicator: a persistent, glanceable cue that you're editing, plus a one-time first-run hint highlighting the menu.
* Rename: the field shows a placeholder label, and the transient "Saved" confirmation now clears itself after a moment so the toolbar stays quiet.
* Reorder: keyboard (Alt+Arrow) and the new ▲/▼ buttons leave menu separators in place; the per-item Reset button is disabled when there's nothing to undo.
* Robustness: Maestro engages WordPress's menu-order machinery only when you've actually reordered top-level items (otherwise it stays out of other plugins' way); the stored configuration is size-bounded; and concurrent save / reset / exit actions are race-safe.
* Fix: the "modified" indicator now sits on the changed row's label for items that have submenus.

= 1.1.1 =
* Editor: the selected item's name is now screen-reader-only — the visible breadcrumb duplicated the rename field and ate horizontal space, and the controls are self-explanatory. Screen-reader users still get the item/submenu context.
* Editor: shorter reset button labels — "Reset Item" and "Reset All".

= 1.1.0 =
* Keyboard reordering: select a menu item, then press `Alt+ArrowUp` / `Alt+ArrowDown` to move it. Each move is announced to screen readers (politely for success, assertively when already at the boundary). No mouse required.
* Modified indicator: changed items show a non-color glyph (•) with screen-reader text "(modified)" in edit mode. The indicator refreshes live on every rename, icon change, visibility change, and reset.
* Discoverable per-item reset: the **Reset this item** button in the controls panel is now keyboard-reachable (Tab + Enter/Space) and is visually emphasised whenever the selected item has unsaved overrides.
* Solid bundled icons: the Bootstrap Icons set now uses solid (`*-fill`) variants, so it mixes naturally with WordPress's dashicons in the picker.
* Edit-mode polish: clearer toolbar grouping, a more scannable icon grid, and a dismissible first-run hint.
* Native save status: the saving / saved / error states now use WordPress dashicons (a spinner, a check, a warning) instead of emoji glyphs that some platforms recoloured or dropped; the idle state shows no icon.
* Fixes: the saved status no longer renders a double check mark; the rename field no longer shifts as the title length changes; toolbar controls wrap instead of overlapping on narrow screens.
* Listing: rewritten description and FAQ, plus a "Try it first" link to a live WordPress Playground demo.

= 1.0.0 =
* Initial release: rename, reorder, per-role visibility, reset.
* Icons: accepts all four native WordPress forms (dashicon, none, base64 image data-URI, image URL); picker bundles dashicons + curated Bootstrap Icons with search, keyboard accessibility, and mobile-sized touch targets.
* Editor: click-to-select with a shared panel, debounced single-flight autosave, and folded-mode neutralization.

== Upgrade Notice ==

= 1.5.0 =
Adds hiding menu items from specific people, alongside hiding by role — on items and their sub-items. Still cosmetic only: a hidden page still opens by URL for anyone allowed to see it, and no capability changes. Existing role rules are untouched.

= 1.4.1 =
Fixes editing a top-level item also changing a submenu item that shares its slug (the "All Products" self-link shape, and plugin shortcuts pointing at an existing screen). If a submenu item was already renamed with its parent, that name is kept — select it and use Reset Item once.

= 1.4.0 =
Hide a parent's sub-items from chosen roles while the parent stays visible. Renames now keep count bubbles and badges. Editing a submenu that shares its slug with its parent no longer changes the parent too. Existing overrides keep working; no config changes needed.

= 1.3.1 =
Editor visual refresh: the edit-mode toolbar and controls now match wp-admin's native look (the 1.2.0 coloured-outline system is retired), exit is consolidated onto the admin-bar "Exit Menu Editor" toggle, and dark-scheme contrast is improved. No config changes required.

= 1.3.0 =
Reliability fix: your saved menu overrides keep applying after a site moves hosts, a plugin update changes a menu URL's version number, tracking parameters drift, or a slug's `&` is stored as `&amp;`. Adds a first-run guided tour for the editor (replay it with the toolbar "?"). No configuration changes required.

= 1.2.0 =
A redesigned, compact icon-only edit-mode toolbar; the editor is now reachable and touch-friendly on mobile; clearer "Edit Mode" and save states; separator-safe reordering; and internal hardening (scoped menu-order, bounded config, race-safe saves). No configuration changes required.

= 1.1.1 =
Minor editor UI tidy: the item-name label is now screen-reader-only, and the reset buttons are "Reset Item" / "Reset All". No configuration changes.

= 1.1.0 =
Keyboard-accessible reordering, a live "modified" indicator, solid bundled icons, native dashicon save-status, and responsive/edit-mode polish. No configuration changes required.
