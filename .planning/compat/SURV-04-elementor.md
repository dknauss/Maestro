# SURV-04 — Elementor Compatibility Survey

R1 compatibility classification survey for **Elementor** (free), the fourth plugin in the compat
set. This file is a filled copy of the `.planning/compat/SCHEMA.md` template, structured
identically to `SURV-01-woocommerce.md`. It characterizes HOW Elementor registers and manipulates
the WordPress admin menu (Part 1), classifies every Maestro operation against every affected item
(Part 2), and assigns each surfaced issue one classified R1 fix (Part 3).

> **Status:** Complete. Part 1 + Method header + natural-state baselines (Task 1);
> Part 2 classification matrix + Interaction Scenarios + Part 3 classified-fix list +
> traceability + completion check (Task 2). Surveyed with setup wizard NOT completed
> (harness default — no WordPress.com / Elementor account connection required).

## Survey Front Fields

- **Plugin:** Elementor
- **Slug:** `elementor`
- **Pinned version:** `4.1.4` (pinned in `tests/compat/VERSIONS.md` / `tests/compat/.wp-env.json`)
- **Date surveyed:** 2026-06-29
- **Surveyor:** Claude (Maestro R1 compatibility survey)

## Method / how evidence was gathered

This section records the exact, reproducible procedure so Phase 15 surveys (SURV-05..06) repeat it
identically and any cell can be re-derived. All commands run against the committed Phase 13 compat
harness (`tests/compat/`). The methodology is LOCKED by `14-CONTEXT.md` and demonstrated in SURV-01;
this header reproduces it verbatim, adapting only the plugin name and the WP_ADMIN finding.

### Harness boot

```bash
# From the repo root. Docker must be running.
npm run compat:start          # wraps: cd tests/compat && npx wp-env start
# Site:  http://localhost:8890   (admin: http://localhost:8890/wp-admin/)
# Stop:  npm run compat:stop
```

Confirm readiness before surveying:

```bash
cd tests/compat
npx wp-env run cli wp plugin list --status=active   # elementor 4.1.4 + maestro-menu-editor active
npx wp-env run cli wp user list --fields=ID,user_login,roles
#   1 admin               administrator
#   2 compat_editor       editor
#   3 compat_shop_manager shop_manager
```

Cold-boot notes (from Phase 13): ~15 min cold; a transient Elementor ZIP CRC error self-heals on a
`compat:start` retry. NOTE: **all six compat plugins are active in this harness**, so the raw dumps
contain WooCommerce / Jetpack / Yoast / WPForms / LifterLMS rows too; this survey reads only
Elementor-owned rows (`elementor-home`, `elementor`, `edit.php?post_type=elementor_library`, and
their submenus).

### `$menu` / `$submenu` dump command

The reusable dump script is `.planning/compat/SURV-04-assets/dump-menu.php`. It hooks `admin_menu`
at `PHP_INT_MAX` — the **same priority Maestro's `Replay::replay()` uses** (`includes/class-replay.php:56`) —
so it observes the globals in exactly the fully-registered state Maestro sees, then `exit`s before
WordPress's per-user privilege filtering in `wp-admin/includes/menu.php`. Run it per role:

> **CRITICAL — these dumps capture Maestro's REPLAY STATE, not the WP-rendered sidebar.** The script
> exits *before* `wp-admin/includes/menu.php` applies WordPress's own per-capability filtering, so the
> dumped `$menu`/`$submenu` are the post-replay globals Maestro mutates — they still contain rows the
> current user will never actually see. For `compat_editor` / `compat_shop_manager` the dump therefore
> shows admin-only rows that WordPress strips at render time. **WP applies its capability gate at render
> INDEPENDENTLY of Maestro**: a row present in this dump may be cap-gated away for a given role
> regardless of any Maestro hide. The raw dump is the right tool for rename / icon / submenu-order
> (which mutate the replay globals), but it is **NOT** the per-role rendered sidebar. Per-role Hide
> evidence below is therefore taken from a separate **rendered/post-cap-filter check** (see "Per-role
> observation"), never from this raw dump alone.

```bash
cd tests/compat
npx wp-env run cli -- php -d memory_limit=512M /usr/local/bin/wp \
  --exec="define('WP_ADMIN', true);" \
  eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-04-assets/dump-menu.php \
  --user=admin            # or compat_editor / compat_shop_manager
```

**The `--exec="define('WP_ADMIN', true);"` is REQUIRED for Elementor too.** Confirmed at runtime:
without it, all Elementor top-level menus and their submenus are entirely absent from the dump.
Elementor's menu registration is gated on admin-context init paths (Elementor's Settings class
checks `is_admin()` before hooking `admin_menu`; the `Elementor_One_Menu_Manager` also registers its
hooks during admin initialization). With `WP_ADMIN=true`, all three Elementor top-level items and
every submenu appear. (Full baseline dumps: `SURV-04-assets/baseline-*.txt`.)

### Op-application path (config-driven) + natural baseline

Maestro replays from a single sparse-diff option, `maestro_config` (constant `MAESTRO_OPTION`),
shaped:

```jsonc
{
  "items": { "<slug>": { "title": "...", "icon": "dashicons-...", "hidden_roles": ["editor"] } },
  "top_order": ["<slug>", ...],
  "sub_order": { "<parent_slug>": ["<slug>", ...] }
}
```

```bash
# Natural (pre-override) baseline — used for all Part 1 dumps:
npx wp-env run cli wp option delete maestro_config

# Apply each operation by writing the diff, then re-dump to compare:
npx wp-env run cli -- wp option update maestro_config '<json>' --format=json

# Reset between cases (prevent contamination):
npx wp-env run cli wp option delete maestro_config
```

**Top-level Reorder is the one exception to the `$menu`-dump method.** `Replay::replay()` applies
rename / icon / visibility / submenu-order to the globals on `admin_menu @ PHP_INT_MAX`, but
top-level ordering goes through the `custom_menu_order` + `menu_order` filters at render time
(`includes/class-replay.php:58-60`), which run *after* `admin_menu`. A raw `$menu` dump taken at
`PHP_INT_MAX` therefore will **not** reflect a reordered top-level sequence. Part 2 classifies
top-level Reorder cells from the **effective rendered order** (produced by
`SURV-04-assets/reorder-probe.php`), never from the raw post-replay global.

The effective-order probe `SURV-04-assets/reorder-probe.php` hooks `admin_menu` at **`PHP_INT_MAX`**
— same priority as Maestro's `Replay::replay()`. Maestro registers its hook first (plugin-load time),
so the probe's callback appends after Maestro's and runs after Maestro's replay (and after Maestro's
`custom_menu_order` / `menu_order` filters are active). The probe then reproduces core's render-time
decision: gate on `apply_filters('custom_menu_order', false)`, and if claimed, run
`apply_filters('menu_order', $slugs)`.

### Per-role observation

**Setup state — SETUP WIZARD NOT COMPLETED.** The harness runs Elementor without completing the
Elementor setup/onboarding wizard and without an Elementor account connection. Wizard-gated items
are noted `[state]` where they affect menu rendering. Elementor free ships an "Upgrade" submenu item
(`elementor-one-upgrade`) under the `elementor-home` top-level; this is a upsell link present in all
states of the free build. [state: Wizard items] — items gated behind completing the setup wizard
or Elementor account connection are documented where relevant.

**Elementor does not ship a custom role.** The three provisioned roles (admin / compat_editor /
compat_shop_manager) suffice. Elementor ships a Role Manager feature (controls which roles can use
the Elementor editor), but this creates no new WordPress roles.

**Three Elementor top-level menus in replay state.** At PHP_INT_MAX, all three are present in
`$menu`: `elementor-home` (pos 2.40565), `elementor` (pos 58.5), and
`edit.php?post_type=elementor_library` (pos 26, the Templates CPT post list). However, Elementor
uses `admin_head` CSS (`hide_old_elementor_menu` + `hide_legacy_templates_menu`) to visually hide
`elementor` and `edit.php?post_type=elementor_library` from the rendered sidebar — only
`elementor-home` is visible by default. Maestro's replay happens at `admin_menu @ PHP_INT_MAX`
**before** `admin_head` fires, so all three items are full targets for Maestro operations at the
replay-state level. Maestro's hide (unset at replay) applies to the item in the replay state; the
subsequent CSS hide by Elementor is a separate, independent layer.

**Two independent gates, evaluated separately.** A role's effective sidebar is the result of TWO
independent filters: (1) **WordPress's own capability gate** at render time (`current_user_can()` on
each row's required cap in `wp-admin/includes/menu.php`) — runs whether or not Maestro is active; and
(2) **Maestro's cosmetic per-role `unset()`** (a row whose `hidden_roles` intersects the user's roles).
The raw dump only reflects gate (2)'s input (replay state) and omits gate (1) entirely.

Observed (natural state, no Maestro hide):

- **`admin`** — passes every cap gate; all three Elementor top-levels and all submenus present in
  replay state and rendered sidebar. `elementor` (pos 58.5) and
  `edit.php?post_type=elementor_library` are hidden by Elementor's own `admin_head` CSS (not by WP
  cap), so admin sees only `elementor-home` visually; but the items load by direct URL.
- **`compat_editor`** — Has `edit_posts` cap. The `edit.php?post_type=elementor_library` top-level
  (cap `edit_posts`) and `elementor-home` (cap `edit_posts`, via the `Menu_Capability_Edit_Posts`
  constant) render in editor's sidebar at replay state. The `elementor` top-level (second entry,
  cap `edit_posts`) is also in replay state but CSS-hidden. Submenus under `elementor` that require
  `manage_options` are cap-gated away for editor at render time. Under `elementor-home`, editor
  sees the submenus that require only `edit_posts` (Editor, Add New Template, Categories).
- **`compat_shop_manager`** — Same as editor for Elementor access; shop_manager also has
  `edit_posts` and therefore sees the same Elementor surface as editor.

**Consequence for the Hide column.** All three roles can see Elementor surfaces (at least some
items). Maestro's hide is meaningful and non-moot for admin on all items. For editor and shop_manager,
items requiring `manage_options` are WP cap-gated anyway; the two-gate model applies per cell.

### Classification rubric (applied verbatim across SURV-01..06)

- **safe** — operation works, persists across reload, no side effects.
- **degraded** — partial / cosmetic / recoverable loss or caveat.
- **broken** — operation fails, or causes functional loss / access breakage.
- **Deciding test:** recoverable / cosmetic → **degraded**; functional loss or access breakage → **broken**.
- **Persistence/timing note required per cell (Part 2):** state whether the result persists across
  reload, and for degraded/broken cases name the cause.

### Success-criterion traceability

| Phase 15 success criterion | Where addressed |
| --- | --- |
| 1. HOW Elementor registers/manipulates the menu (all six dimensions) | Part 1 — Manipulation-Dimensions Checklist + this Method header + baseline dumps (Task 1) |
| 2. Every Maestro op classified per affected item with evidence | Part 2 — Classification Matrix (all three Elementor top-levels × rename/reorder/hide/re-icon; all submenus), cross-cutting findings F1–F5, per-role Hide (two-gate model), effective render order (Task 2) |
| 3. Every surfaced issue gets exactly one classified fix | Part 3 — Classified-Fix List (all degraded cells mapped, no orphans) (Task 2) |
| 4. Survey structurally mirrors SURV-01 (schema-faithful) | This entire file — Method header, Part 1 checklist, Part 2 matrix, Interaction Scenarios, Part 3 fix list, traceability, completion check |
| Requirement **SURV-04** | This entire file |

## Part 1 — Manipulation-Dimensions Checklist

Check each locked manipulation dimension the plugin exhibits and record concise evidence in `Notes:`.
Source citations are paths under the running container's `wp-content/plugins/elementor/`; runtime
confirmation rows are from the natural-state (no `maestro_config`) baselines in `SURV-04-assets/`.

Elementor exhibits **all six** manipulation dimensions, making it the most complex menu manipulator
in the compat set (more complex than WooCommerce in several respects). It registers THREE top-level
menu items, uses multiple `admin_menu` hook priorities for late injection, hides two of its own
top-levels via `admin_head` CSS surgery, and has both absolute-URL slugs and entity-encoded slugs in
its submenu items.

- [x] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** Elementor registers THREE top-level items at specific positions:
    - `elementor-home` at position **`2.40565`** — an unusually low fractional position placing it very early in the menu (near Dashboard). Source: `modules/editor-one/classes/menu-config.php` constant `MENU_POSITION = 58.5` for the `elementor` slug; the `elementor-home` position (2.40565) is set elsewhere in the admin-menu manager. Confirmed in dump: `2.40565 elementor-home Elementor dashicons-admin-generic`.
    - `elementor` at position **`58.5`** — mid-stack. Source: `core/admin/menu/main.php` `'position' => 58.5`. Confirmed in dump: `58.5 elementor Elementor dashicons-admin-generic`.
    - `edit.php?post_type=elementor_library` (Templates CPT) at position **`26`** — early in CPT cluster. This is a WordPress CPT post-list menu, registered by `register_post_type()` with `show_in_menu: true`, not by `add_menu_page` directly. Position 26 is the CPT's default placement.
    - Natural-state effective render order (reorder-probe, no Maestro config): `elementor-home` at effective pos 20, `elementor` at effective pos 31, `edit.php?post_type=elementor_library` at effective pos 7 (WooCommerce's `menu_order` filter runs after Maestro's and re-clusters items; items not in WC's explicit list are appended). All positions from reorder-probe (natural state).

- [x] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority so Maestro may observe or replay them at a different time.
  - **Notes:** Elementor uses **multiple** `admin_menu` hook priorities for late injection — a key complexity:
    - `add_action('admin_menu', [...], 9)` — `Elementor_One_Menu_Manager::register_elementor_home_submenus()` (priority 9, before the default 10). Registers the `Editor` submenu under `elementor-home`.
    - `add_action('admin_menu', [...], 20)` — `Settings::register_admin_menu()` (priority 20). Registers the old `elementor` top-level (pos 58.5, slug `elementor`) and its Settings page. Source: `includes/settings/settings.php:448`.
    - `add_action('admin_menu', [...], 20)` — `Admin_Menu_Manager::register_actions()` (priority 20). Registers all Elementor flyout/sidebar items via the `elementor/admin/menu/register` action. Source: `core/admin/menu/admin-menu-manager.php:40`.
    - `add_action('admin_menu', [...], 100)` — `register_pro_submenus()` (priority 100). Pro-only items, no-op in free build. Source: `core/admin/editor-one-menu/elementor-one-menu-manager.php`.
    - `add_action('admin_menu', [...], 10003..10005)` — Very late priorities: `intercept_legacy_submenus` (10003), `register_flyout_items_as_hidden_submenus` (10004), `remove_all_submenus_for_edit_posts_users` (10005).
    - **Maestro's `PHP_INT_MAX` replay fires AFTER all of these**, so the full Elementor menu is present at replay time. Confirmed in dump: all three tops and all submenus appear at PHP_INT_MAX.
    - **`[state]` — Wizard-gated items:** The `Upgrade` submenu (`elementor-one-upgrade`, under `elementor-home`) is conditionally shown in the free build as an upsell item. It is present in the natural-state dump at priority 20 (via the `elementor-home` hook or the admin-menu-manager route). Behavior is state-independent for the free build: always present.

- [x] **Re-registered menus** — menu removed then re-added, or slug re-registered, causing the same intended item to appear through more than one registration path. Note any **entity-encoded slugs** here.
  - **Notes:** Elementor has a deliberate dual-path registration pattern for the `elementor` slug:
    - The `elementor` slug is registered as a top-level menu (pos 58.5, title "Elementor", cap `edit_posts`) by `Settings::register_admin_menu()` (priority 20).
    - The `elementor` slug is ALSO registered as a submenu under `elementor-home` (as "Quick start", "Editor", and "Elementor" at positions 0, 1, 2 in the `elementor-home` parent) — several entries with the same slug, different labels/caps.
    - The old `elementor` top-level (pos 58.5) is visually hidden by `hide_old_elementor_menu()` via `admin_head` CSS (`#toplevel_page_elementor { display: none !important; }`). It is present in the replay state but hidden at render time.
    - **Entity-encoded slugs:** Two Elementor submenu entries use `&amp;`-encoded slugs:
      - `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` — under `edit.php?post_type=elementor_library` (Templates top-level) AND under `elementor-home`. Must be stored with `&amp;` encoding for Maestro to match. Confirmed: storing the `&amp;`-encoded form as the key lands the rename correctly (tested at runtime). This is a slug-resolution issue for any consumer that normalizes `&` to `&amp;` or vice versa.
    - **Absolute-URL slug:** `http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library` — the "Website Templates" submenu entry under `elementor` parent. Slug is a full absolute URL with host, query string, and fragment; changes per environment. Same slug-resolution issue as Jetpack Settings (SURV-02 I2), but compounded by a version number (`ver=4.1.4`) that also changes per version. Confirmed at runtime: rename lands when the full exact URL is used as the key.

- [x] **Count badges baked into titles** — an awaiting-mod / update bubble span or similar count badge is embedded inside the menu title string.
  - **Notes:** Yes — Elementor bakes notification badges and HTML into some menu titles in specific states:
    - The `wpseo_dashboard` top-level (Yoast SEO, not Elementor's own) in this harness has a count badge, but this is a cross-plugin observation. For Elementor specifically:
    - The `Upgrade` submenu (`elementor-one-upgrade`) title is conditionally replaced by the promotions module with `"Sale!<br />Upgrade Now"` (direct HTML with `<br />`) — baked HTML in the title string. Source: `modules/promotions/module.php`. This is a [state]-dependent behavior: the HTML replacement only fires during sale events (the promotions module modifies the submenu item title via the `add_menu_classes` filter at render time).
    - **Convention 3 applies:** if a Maestro rename targets `elementor-one-upgrade`, it replaces the title wholesale, losing any dynamically injected HTML (including sale text). Classified as **degraded** on rename. This behavior is identical to the WooCommerce badge-in-title pattern (SURV-01, F1).
    - No other Elementor menu items have static count badges baked in (unlike WooCommerce). The sale text injection is conditional/dynamic, not a static badge.

- [x] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows that affect ordering or visible grouping.
  - **Notes:** Yes — Elementor injects a `separator-elementor` separator at runtime:
    - Source: `hide_old_elementor_menu()` in `core/admin/editor-one-menu/elementor-one-menu-manager.php` calls `remove_elementor_separator()` which removes `separator-elementor` from `$menu` if present. The separator exists in some code paths before the removal.
    - At PHP_INT_MAX (after all Elementor hooks including the `10003`-`10005` priority late hooks), the `separator-elementor` is NOT present in the dump — it has been removed by the time Maestro's replay runs. The removal happens at priority 10005 or earlier (inside `hide_old_elementor_menu()` which runs on `admin_head`). Confirmed in dump: no `separator-elementor` row at PHP_INT_MAX — Elementor removes it before Maestro's replay can observe it.
    - **Net impact:** Elementor's custom separator is invisible to Maestro at replay time. It does not affect Maestro's classification for Reorder.

- [x] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals rather than using the WordPress menu API.
  - **Notes:** Elementor performs extensive direct `$menu`/`$submenu` global surgery at multiple priorities:
    - `hide_old_elementor_menu()` — removes `separator-elementor` from `$menu` directly (unset by key).
    - `hide_legacy_templates_menu()` — CSS-hides `#menu-posts-elementor_library` in `admin_head` (CSS-level, not PHP unset).
    - `hide_flyout_items_from_wp_menu()` — calls `remove_submenu_page()` for flyout menu items at `admin_menu` priority 10004, directly modifying `$submenu`.
    - `remove_all_submenus_for_edit_posts_users()` — at priority 10005, directly iterates `$submenu['elementor']` and calls `remove_submenu_page()` for all items except index 0 when the user has only `edit_posts`. This creates the conditional submenu surface for non-admin users.
    - `Base::register()` — writes directly to `$submenu[$menu_slug][$index + 1][4]` (the CSS class slot) for submenus. Source: `core/admin/menu/base.php:54`.
    - **All of this surgery happens at priorities 9–10005, BEFORE Maestro's `PHP_INT_MAX` replay.** Maestro sees the post-surgery state.

### Natural-state baseline — revealing slices

All slices below are from the natural state (`maestro_config` deleted), `--user=admin`, no wizard
completion, captured with `WP_ADMIN=true`. Full dumps: `SURV-04-assets/baseline-*.txt`.

**Three Elementor top-level rows** (`pos tab slug tab title tab icon tab css`):

```text
2.40565   elementor-home   Elementor   dashicons-admin-generic   menu-top menu-icon-generic toplevel_page_elementor-home
26        edit.php?post_type=elementor_library   Templates   dashicons-admin-page   menu-top menu-icon-elementor_library
58.5      elementor        Elementor   dashicons-admin-generic   menu-top menu-icon-generic toplevel_page_elementor
```

Both `elementor-home` and `elementor` use `dashicons-admin-generic` (generic gear icon).
The Templates top-level uses `dashicons-admin-page`.

**`$submenu['elementor-home']` — admin (natural state):**

```text
PARENT: elementor-home
   0   admin.php?page=elementor-home   Home        manage_options
   1   elementor                        Editor      edit_posts
   2   post-new.php?post_type=elementor_library   Add New Template   edit_posts
   3   edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library   Categories   manage_categories
   4   elementor-one-upgrade            Upgrade     manage_options
```

**`$submenu['edit.php?post_type=elementor_library']` — admin (natural state):**

```text
PARENT: edit.php?post_type=elementor_library
   5    edit.php?post_type=elementor_library                               All Templates    edit_posts
   10   post-new.php?post_type=elementor_library                           Add New Template edit_posts
   15   edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library   Categories   manage_categories
```

**`$submenu['elementor']` — admin (natural state, abridged):**

```text
PARENT: elementor
   0    elementor           Elementor      edit_posts
   1    elementor-settings  Settings       manage_options
   2    elementor           Quick start    manage_options
   3    elementor-tools     Tools          manage_options
   5    elementor-role-manager   Role Manager   manage_options
   6    elementor-custom-elements   Custom Elements   manage_options
   7    elementor_custom_fonts   Fonts        manage_options
   8    elementor_custom_icons   Icons        manage_options
   9    elementor-templates      Templates    edit_posts
   10   elementor-system-info    System Info  manage_options
   11   edit.php?post_type=elementor_library   Saved Templates   edit_posts
   14   http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library   Website Templates   manage_options
   15   elementor-app       Theme Builder   manage_options
   16   elementor-system    System          manage_options
   17   elementor-element-manager   Element Manager   manage_options
   18   elementor-connect-account   Connect Account   manage_options
   19   elementor-connect   Connect         edit_posts
```

**Note on `elementor` slug collision.** In `$submenu['elementor']`, the first entry (pos 0) has slug
`elementor` — this is the submenu anchor for the top-level page itself. Entries at pos 1/2 also use
slug `elementor` (for different submenu labels/caps). This is standard WP behavior for the anchor
submenu auto-added when registering a top-level page; Elementor adds additional `elementor`-slug
submenus with different labels and capabilities for the Editor One flyout menu.

**Note on Website Templates absolute URL slug.** The entry at pos 14 under `elementor` parent:
`http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library`
This is a full absolute URL including hostname, path, query parameters (including `ver=4.1.4` which
changes on plugin update), and a fragment (`#/kit-library`). Slug-resolution issue: the stored key
is environment- AND version-specific. (Same category as SURV-02 I2 for Jetpack Settings.)

**`$submenu['elementor_custom_code']` — additional hidden page:**

```text
PARENT: elementor_custom_code
   0   elementor_custom_code   Code   manage_options
```

This is a hidden admin page for custom code functionality (Pro feature stub).

**Per-role baseline summary (wizard not completed):**

- `admin`: All three Elementor tops + all submenus in replay state. Visual sidebar shows only `elementor-home` (the other two are CSS-hidden by Elementor). All pages load by URL.
- `compat_editor` / `compat_shop_manager`: Both have `edit_posts`. `elementor-home` (cap `edit_posts`) and `edit.php?post_type=elementor_library` (cap `edit_posts`) render in replay state. Under `elementor-home`, only submenus with `edit_posts` cap are shown (Editor, Add New Template, Categories). The `elementor` top-level (pos 58.5) is in replay state with cap `edit_posts` but is CSS-hidden by Elementor. Submenus under `elementor` requiring `manage_options` are WP cap-gated away at render for these roles. The `Upgrade` item under `elementor-home` (cap `manage_options`) is WP cap-gated away for editor/shop_manager.

### Inventory of affected Elementor items (seeds the Part 2 matrix)

**Top-level items:**

| Item | Slug | Position ($menu) | Effective render pos (no Maestro) | Cap | Notes |
| --- | --- | --- | --- | --- | --- |
| Elementor (Home) | `elementor-home` | `2.40565` | 20 | `edit_posts` (set via `MENU_CAPABILITY_EDIT_POSTS`) | Primary visible Elementor top-level; `dashicons-admin-generic` |
| Templates | `edit.php?post_type=elementor_library` | `26` | 7 | `edit_posts` | CPT post list; CSS-hidden by `admin_head` |
| Elementor (Settings) | `elementor` | `58.5` | 31 | `edit_posts` | Old top-level; CSS-hidden by `admin_head` (`display:none`) |

**Submenus under `elementor-home`:**

| Item | Slug | Cap | Notes |
| --- | --- | --- | --- |
| Home | `admin.php?page=elementor-home` | `manage_options` | Anchor submenu, auto-added by WP |
| Editor | `elementor` | `edit_posts` | Link to Elementor editor page |
| Add New Template | `post-new.php?post_type=elementor_library` | `edit_posts` | |
| Categories | `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` | `manage_categories` | Entity-encoded `&amp;` slug |
| Upgrade | `elementor-one-upgrade` | `manage_options` | Upsell item; title conditionally replaced with "Sale!" HTML |

**Submenus under `edit.php?post_type=elementor_library`:**

| Item | Slug | Cap | Notes |
| --- | --- | --- | --- |
| All Templates | `edit.php?post_type=elementor_library` | `edit_posts` | Anchor |
| Add New Template | `post-new.php?post_type=elementor_library` | `edit_posts` | |
| Categories | `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` | `manage_categories` | Entity-encoded `&amp;` slug |

**Key submenus under `elementor` (old top-level — CSS hidden but replay-state present):**

| Item | Slug | Cap | Notes |
| --- | --- | --- | --- |
| Settings | `elementor-settings` | `manage_options` | |
| Role Manager | `elementor-role-manager` | `manage_options` | |
| Tools | `elementor-tools` | `manage_options` | |
| System Info | `elementor-system-info` | `manage_options` | |
| Website Templates | `http://[host]/wp-admin/admin.php?page=elementor-app&ver=4.1.4&...#/kit-library` | `manage_options` | Absolute URL slug; environment- and version-specific |
| Theme Builder | `elementor-app` | `manage_options` | |
| Element Manager | `elementor-element-manager` | `manage_options` | |
| Connect Account | `elementor-connect-account` | `manage_options` | [state: relevant pre-account-connection] |

**Out of scope:** `elementor_custom_code` hidden page (no normal parent anchor in the sidebar);
`edit.php?post_type=elementor_library&tabs_group=library` parent (empty parent, hidden page for
Floating Elements).

## Part 2 — Classification Matrix

Use one row per affected menu item, including both top-level items and submenus. Each operation cell
must contain one classification (`safe`, `degraded`, or `broken`) plus a short observable-evidence note.

### Classification Definitions

- **safe** — operation works as expected, persists, no side effects.
- **degraded** — operation partially works or works with caveats / cosmetic loss.
- **broken** — operation fails, reverts, or breaks the plugin's menu/access.

> **How this matrix was produced.** Each operation was applied config-driven via `maestro_config`
> (sparse-diff option), the `$menu`/`$submenu` globals were re-dumped with the Method-header command
> and compared to the natural baseline, then the config was reset (`wp option delete maestro_config`)
> so cases did not contaminate each other. **Top-level Reorder cells are classified from the EFFECTIVE
> rendered order** (the `custom_menu_order` + `menu_order` filter pipeline, reproduced by
> `SURV-04-assets/reorder-probe.php`), NOT the raw post-replay `$menu` global — see the Method header's
> top-level-reorder exception. Persistence was confirmed by re-running the dump/probe as a fresh request
> after each op. Per-cell shorthand: **persists** = override survives a reload.

#### Cross-cutting findings (apply to many rows, stated once here, referenced in cells)

- **F1 — Re-icon is top-level only; submenu rows have no icon index (N/A).** `Replay::replay()` only
  writes the icon to `$menu[pos][6]` (`class-replay.php:101`); submenu rows have no icon index. Applying
  `{"icon":...}` to a submenu slug would change nothing. Classified **N/A** on every submenu row; leaning
  "degraded" so the matrix stays mechanical — the operation does not exist for submenus and never breaks
  anything. (Identical to SURV-01 F2 and SURV-02 F2.)
- **F2 — Hide is a cosmetic per-role `unset()`; it never removes a capability, so the page still loads
  by direct URL — and it composes with WP's INDEPENDENT cap gate.** Same mechanics as SURV-01 F3 and
  SURV-02 F3. Maestro's hide removes the row from the replay state; WP's cap gate runs independently at
  render. For roles that already lack the cap, Maestro's hide is a **moot no-op**. For admin, hiding
  removes the sidebar entry cosmetically; the page still **LOADS (200)** by direct URL (cap intact).
  Persists across reload.
- **F3 — The `elementor` top-level (pos 58.5) is CSS-hidden by Elementor at `admin_head` time.** Maestro
  operations on the `elementor` slug still land correctly in the replay state (rename, re-icon, hide,
  reorder all work), but the item is visually hidden by Elementor's own CSS rule
  (`#toplevel_page_elementor { display: none !important; }`). Maestro's cosmetic hide of this item is
  therefore redundant for visual effect but not semantically broken — the item is removed from the
  replay state as intended. **Degraded only for visual-verification purposes:** a tester relying on
  sidebar visual confirmation would not see Maestro's hide take effect because Elementor already hides
  the item visually. This is a documentation/UX observation, not a functional breakage.
- **F4 — `edit.php?post_type=elementor_library` (Templates top-level) is CSS-hidden by Elementor at
  `admin_head` time.** Same as F3 but for the Templates CPT. CSS rule: `#menu-posts-elementor_library
  { display: none !important; }`. Maestro operations land in replay state correctly; visual sidebar
  impact is masked by Elementor's own CSS. Same degraded-for-visual-verification observation.
- **F5 — Entity-encoded slug `&amp;` must be stored exactly.** The Categories submenu under both
  `elementor-home` and `edit.php?post_type=elementor_library` uses slug
  `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` — with
  `&amp;` entity encoding. Maestro matches overrides by exact slug. Storing the key with unencoded `&`
  would NOT match. Storing with `&amp;` DOES match (confirmed at runtime: rename lands). This is a
  slug-resolution issue for any consumer/UI that normalizes entities, requiring user-facing guidance.
  (Same category as SURV-01's entity-encoded Products slugs.)

#### Sub-matrix A: Top-level items

> **Reading the Hide column (per F2's two-gate model).** Each Hide sub-cell is **{Maestro's cosmetic
> per-role `unset()` on the replay state} + {WP's independent render-time cap gate}**. Where a role
> lacks the page cap, WP removes the row at render *before* Maestro's hide applies. For Elementor
> top-levels, all three roles have `edit_posts`, so WP cap-gate does not remove the tops for any role
> (they require `edit_posts`). Maestro's hide is non-moot for all roles on all three tops.

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `Elementor` (Home top-level) | top-level | `elementor-home` | **safe** — renamed to "El Home", persists across reload; no badge in title (title is plain "Elementor"); `dashicons-admin-generic` icon intact; link and submenus unaffected. Applied: `{"items":{"elementor-home":{"title":"El Home"}}}` → dump shows `2.40565 elementor-home El Home dashicons-admin-generic`. Persists. | **safe** — moved to requested slot and persists in effective rendered order. Applied: `{"top_order":["elementor-home","index.php","elementor","edit.php?post_type=elementor_library"]}` → probe shows `0 elementor-home / 1 index.php / 2 elementor / 3 edit.php?post_type=elementor_library`. All three Elementor tops interleave correctly; no separator re-clustering caveat (Elementor has no active separator at PHP_INT_MAX — removed before replay). Persists. | admin **degraded** — cosmetically hidden from sidebar replay state (`unset()` removes `elementor-home` from `$menu`); page still **LOADS (200)** by direct URL (`admin.php?page=elementor-home`, `edit_posts` cap intact, F2). Submenus remain in `$submenu['elementor-home']` (parent-hide non-cascading — see S1). editor **degraded** — cosmetic `unset()` removes from editor's replay state; page still LOADS (200) by URL (`edit_posts` intact). shop_manager **degraded** — same as editor. All hide sub-cells persist. | **safe** — `dashicons-admin-generic` replaced with requested dashicon (e.g. `dashicons-performance`), persists. Applied: `{"items":{"elementor-home":{"icon":"dashicons-performance"}}}` → dump shows `2.40565 elementor-home Elementor dashicons-performance`. Maestro's `Replay::replay()` sets `$menu[pos][6]` to the dashicon class string. Persists. |
| `Templates` (CPT top-level) | top-level | `edit.php?post_type=elementor_library` | **safe** — renamed to "El Templates", persists. Applied: `{"items":{"edit.php?post_type=elementor_library":{"title":"El Templates"}}}` → dump shows `26 edit.php?post_type=elementor_library El Templates dashicons-admin-page`. Note: Elementor's `admin_head` CSS still hides `#menu-posts-elementor_library` visually (F4); the rename lands in replay state correctly. Also renames the anchor submenu entry (pos 5 under `elementor_library`). Persists. | **safe** — moved to requested slot and persists in effective rendered order. Applied with `top_order` including `edit.php?post_type=elementor_library` → probe confirms placement. Note: Elementor CSS-hides this top visually (F4); reorder is effective in the underlying order even if not visually apparent without removing the CSS hide. Persists. | admin **degraded** — cosmetic `unset()`, page still **LOADS (200)** by `edit.php?post_type=elementor_library` (`edit_posts` cap intact, F2). Note: Elementor already CSS-hides this item visually (F4), so Maestro's hide is cosmetically redundant but semantically correct — the item is removed from replay state (F3/F4 caveat: visual confirmation masked). editor **degraded** — cosmetic `unset()`, page still LOADS (200) by URL (`edit_posts`). shop_manager **degraded** — same as editor. Persists. | **safe** — `dashicons-admin-page` replaced with requested dashicon, persists. Applied: `{"items":{"edit.php?post_type=elementor_library":{"icon":"dashicons-admin-appearance"}}}` → dump shows updated icon at pos 26. Note: Elementor's CSS visual-hide (F4) masks the icon change in the sidebar view, but the icon is correctly updated in replay state. Persists. |
| `Elementor` (Settings top-level) | top-level | `elementor` | **safe** — renamed; title updates in replay state and also propagates to the submenu entries under `elementor` parent that also use the `elementor` slug as anchor label. Applied: `{"items":{"elementor":{"title":"El Settings"}}}` → dump shows `58.5 elementor El Settings`. Also updates `PARENT: elementor` submenu anchor entries. Note: item is CSS-hidden by Elementor (F3); visual impact masked. Persists. | **safe** — moved to requested slot. Probe confirms effective position. All three Elementor tops reorder correctly relative to each other and to WP core items. CSS-hidden visually (F3) but order is correct in underlying rendered order. Persists. | admin **degraded** — cosmetic `unset()` from replay state. Page still **LOADS (200)** by `admin.php?page=elementor` (cap `edit_posts` intact, F2). Note: item is already CSS-hidden by Elementor (F3); Maestro's hide is cosmetically redundant. editor **degraded** — cosmetic unset; item CSS-hidden anyway (F3); page LOADS by URL. shop_manager **degraded** — same. Persists. | **safe** — icon updated in replay state from `dashicons-admin-generic` to requested dashicon; persists. Note: CSS-hidden visually (F3). Persists. |

#### Sub-matrix B: Submenus under `elementor-home`

> Submenu Re-icon is **N/A** (F1) for all rows below. Hide per-role uses the two-gate model (F2).
> For editor and shop_manager, the `Upgrade` submenu (cap `manage_options`) is WP cap-gated away at
> render — Hide for those roles is **moot no-op** for that specific item.

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `Home` (anchor) | submenu | `admin.php?page=elementor-home` (parent `elementor-home`) | **safe** — renamed; persists. Applied: `{"items":{"admin.php?page=elementor-home":{"title":"El Home Page"}}}` → dump shows updated anchor title. No badge. Persists. | **N/A → safe** — submenu reorder via `sub_order` key under `elementor-home` parent. Persists. | admin **degraded** — cosmetic unset; page LOADS (200) by URL (`manage_options` intact, F2). editor **degraded** — WP cap gates `manage_options` away at render; Maestro hide is moot. shop_manager **degraded** — same as editor. | **N/A** (F1) → degraded — no icon index on submenu rows. |
| `Editor` | submenu | `elementor` (parent `elementor-home`) | **safe** — renamed to "El Editor"; persists. Applied: `{"items":{"elementor":{"title":"El Editor"}}}` → dump shows updated title in `PARENT: elementor-home` at pos 1. Note: `elementor` is also the top-level slug; the rename applies to all `elementor`-keyed items in replay state (both top-level and submenu entries). Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic unset; page LOADS (200) by URL (`edit_posts` intact, F2). editor **degraded** — cosmetic unset; LOADS. shop_manager **degraded** — cosmetic unset; LOADS. | **N/A** (F1) → degraded — no icon index on submenu rows. |
| `Add New Template` | submenu | `post-new.php?post_type=elementor_library` (parent `elementor-home`) | **safe** — renamed; persists. No badge. Persists. | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cosmetic; LOADS. shop_manager **degraded** — cosmetic; LOADS. | **N/A** (F1) → degraded |
| `Categories` | submenu | `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` (parent `elementor-home`) | **safe** — renamed when stored key uses `&amp;` encoding (F5); persists. Applied: `{"items":{"edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library":{"title":"El Cats"}}}` → dump shows updated title. **[I2 — slug-resolution]** If stored with unencoded `&`, the rename does NOT land. Persists (with correct key). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — WP cap-gates `manage_categories` from editor; Maestro hide moot (moot no-op). shop_manager **degraded** — WP cap-gates; moot. | **N/A** (F1) → degraded |
| `Upgrade` (upsell) | submenu | `elementor-one-upgrade` (parent `elementor-home`) | **degraded** — rename replaces title wholesale, dropping any dynamically injected HTML (e.g. "Sale!`<br />`Upgrade Now" from the promotions module — F, convention 3). Applied: `{"items":{"elementor-one-upgrade":{"title":"Pro Upgrade"}}}` → dump shows "Pro Upgrade". During a sale event, the promotions module's `add_menu_classes` filter would have injected "Sale!" HTML into the title, which the rename overwrites. **[I3 — documented limitation: dynamic HTML injection in title]** Persists. | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS (200) by URL (`manage_options` intact). editor **degraded** — WP cap-gates `manage_options`; Maestro hide moot. shop_manager **degraded** — same as editor. | **N/A** (F1) → degraded |

#### Sub-matrix C: Submenus under `edit.php?post_type=elementor_library`

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `All Templates` (anchor) | submenu | `edit.php?post_type=elementor_library` (parent `edit.php?post_type=elementor_library`) | **safe** — renamed; persists. Persists. | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cosmetic; LOADS. shop_manager **degraded** — cosmetic; LOADS. | **N/A** (F1) → degraded |
| `Add New Template` | submenu | `post-new.php?post_type=elementor_library` (parent `edit.php?post_type=elementor_library`) | **safe** — renamed; persists. | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cosmetic; LOADS. shop_manager **degraded** — cosmetic; LOADS. | **N/A** (F1) → degraded |
| `Categories` | submenu | `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` (parent `edit.php?post_type=elementor_library`) | **safe** — renamed when stored with `&amp;` encoding (F5); same key as under `elementor-home` — rename lands on both occurrences. Persists. | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — WP cap-gates `manage_categories`; moot. shop_manager **degraded** — same as editor. | **N/A** (F1) → degraded |

#### Sub-matrix D: Key submenus under `elementor` (CSS-hidden top-level)

> The `elementor` top-level is CSS-hidden by Elementor (`admin_head`) but is fully present and
> mutable in replay state. Maestro operations on these submenus land correctly. Note that F3 applies
> (visual confirmation of changes to items under the CSS-hidden parent requires inspecting the DOM or
> replay dump rather than the sidebar).

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `Settings` | submenu | `elementor-settings` (parent `elementor`) | **safe** — renamed; persists. Note: under CSS-hidden parent (F3). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — WP cap-gates `manage_options`; moot. shop_manager **degraded** — WP cap-gates; moot. | **N/A** (F1) → degraded |
| `Role Manager` | submenu | `elementor-role-manager` (parent `elementor`) | **safe** — renamed; persists. Note: under CSS-hidden parent (F3). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cap-gated; moot. shop_manager **degraded** — cap-gated; moot. | **N/A** (F1) → degraded |
| `Tools` | submenu | `elementor-tools` (parent `elementor`) | **safe** — renamed; persists. Note: under CSS-hidden parent (F3). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cap-gated; moot. shop_manager **degraded** — cap-gated; moot. | **N/A** (F1) → degraded |
| `System Info` | submenu | `elementor-system-info` (parent `elementor`) | **safe** — renamed; persists. Note: under CSS-hidden parent (F3). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cap-gated; moot. shop_manager **degraded** — cap-gated; moot. | **N/A** (F1) → degraded |
| `Website Templates` | submenu | `http://[host]/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library` (parent `elementor`) | **safe** — renamed when stored with the full exact absolute URL as key; persists. Applied at runtime: rename lands correctly (`Web Tmpl` appears in dump). **[I1 — slug-resolution]** The slug is an absolute URL containing hostname (`localhost:8890`), plugin version (`ver=4.1.4`), query params, and fragment — all change per environment and on version update. A config generated on one install will not resolve on another. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic; LOADS (URL is its own slug). editor **degraded** — cap-gated `manage_options`; moot. shop_manager **degraded** — same as editor. | **N/A** (F1) → degraded |
| `Theme Builder` | submenu | `elementor-app` (parent `elementor`) | **safe** — renamed; persists. Note: under CSS-hidden parent (F3). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cap-gated; moot. shop_manager **degraded** — cap-gated; moot. | **N/A** (F1) → degraded |
| `Element Manager` | submenu | `elementor-element-manager` (parent `elementor`) | **safe** — renamed; persists. Note: under CSS-hidden parent (F3). | **N/A → safe** — submenu reorder. Persists. | admin **degraded** — cosmetic; LOADS. editor **degraded** — cap-gated; moot. shop_manager **degraded** — cap-gated; moot. | **N/A** (F1) → degraded |

> **Net for Part 3 (issues to classify-fix):**
> (a) Website Templates slug is an absolute environment+version-specific URL [I1 — slug-resolution tweak].
> (b) `&amp;`-encoded Categories slug requires exact encoding match [I2 — slug-resolution tweak].
> (c) Upgrade upsell title has baked-in dynamic HTML injection (sale text) lost on rename [I3 — documented limitation].
> (d) Submenu re-icon is N/A (no icon slot on submenus) [I4 — documented limitation].
> (e) Cosmetic Hide; pages still LOAD by URL [I5 — documented limitation].
> (f) Parent-hide does not cascade to children [I6 — documented limitation].
> (g) `elementor` and Templates top-levels are CSS-hidden by Elementor at `admin_head` — Maestro ops land correctly but visual confirmation in sidebar is masked [I7 — documented limitation].
> (h) Hide moot for editor/shop_manager on `manage_options`-capped submenus (WP cap-gates them away) [I8 — documented limitation].
> **No broken cells across all matrix rows.** All rename, reorder, and re-icon operations work correctly.

### Evidence Notes

- All classifications are grounded in re-dumped `$menu`/`$submenu` output (and the `reorder-probe.php`
  effective-order output for top-level Reorder) compared against the natural baseline.
- Representative observed phrases: "Renamed elementor-home to 'El Home', dump shows updated title at pos 2.40565"; "Re-icon applied generic→dashicons-performance swap, icon slot now `dashicons-performance`"; "Reorder moved all three Elementor tops correctly: probe `0 elementor-home / 1 index.php / 2 elementor / 3 edit.php?post_type=elementor_library`"; "Categories rename landed with `&amp;` encoded key, did NOT land with unencoded `&`"; "Website Templates rename landed with full absolute URL key"; "Hide of elementor-home from admin removes row from $menu, submenus remain in $submenu['elementor-home']".

## Interaction Scenarios

Beyond the per-op matrix, a few deliberate **op-combinations** were applied together in a single
`maestro_config` payload and classified the same way (safe / degraded / broken + observable evidence
+ persistence + timing cause). All scenarios reset config afterward.

| # | Scenario | Payload (shape) | Observed result | Classification |
| --- | --- | --- | --- | --- |
| S1 | **Hide-parent-with-visible-children** — hide `elementor-home` from admin while children (Editor, Categories, Upgrade) remain; verify whether parent-hide cascades | `{"items":{"elementor-home":{"hidden_roles":["administrator"]}}}` | admin: `elementor-home` removed from `$menu` at pos 2.40565 (unset from replay state). **All four child rows remain fully populated in `$submenu['elementor-home']`** (Home anchor, Editor, Add New Template, Categories, Upgrade all intact). Maestro's parent-hide does **not** cascade to children at the data level — it only removes the parent anchor. Editor page LOADS (200) by `admin.php?page=elementor` (`edit_posts` intact); Templates page LOADS by `edit.php?post_type=elementor_library`; Upgrade page LOADS by `admin.php?page=elementor-one-upgrade`. Subtree cosmetically orphaned, not access-broken. The other two Elementor tops (`elementor` and `edit.php?post_type=elementor_library`) are unaffected. Persists. | **degraded** — cosmetic subtree-orphaning, no access break. Timing: pure Maestro `PHP_INT_MAX` unset, no Elementor-timing interaction. Same pattern as SURV-01 S1 and SURV-02 S1 (non-cascading parent-hide). |
| S2 | **Rename + reorder the same item together** — rename `elementor-home` to "El Home" AND move it after `index.php` AND rename `elementor` top-level to "El Main" simultaneously | `{"items":{"elementor-home":{"title":"El Home"},"elementor":{"title":"El Main"}},"top_order":["index.php","elementor-home","elementor","edit.php?post_type=elementor_library"]}` | Both effects apply and **compound cleanly**: `elementor-home` title becomes "El Home" (persists), `elementor` title becomes "El Main" (persists), AND effective rendered order matches the requested sequence (probe: `0 index.php / 1 elementor-home / 2 elementor / 3 edit.php?post_type=elementor_library`). No badge loss (no static badge in either title). No new failure mode from combining three simultaneous rename+reorder ops across three tops. Both/all three persist. | **safe** — all operations succeed independently and together; the combination introduces no additional degradation. No WooCommerce-style separator re-cluster (Elementor's `separator-elementor` is removed before PHP_INT_MAX; no active separator remains). |
| S3 | **Re-icon + reorder across a separator** — re-icon `elementor-home` with `dashicons-performance` AND move it to a position immediately after `separator1` (between Dashboard and Media cluster) | `{"items":{"elementor-home":{"icon":"dashicons-performance"}},"top_order":["index.php","separator1","elementor-home","elementor"]}` | `elementor-home` icon swaps to `dashicons-performance` (top-level re-icon, **safe**, persists); effective order places `elementor-home` immediately after `separator1` at position 2 (probe: `0 index.php / 1 separator1 / 2 elementor-home / 3 elementor`). The icon swap and cross-separator reorder both apply and persist independently. No new failure mode crossing the separator. The `elementor` and Templates tops fall at their remaining positions. Persists. | **safe** — re-icon is safe; reorder across separator is safe (Elementor has no active separator at PHP_INT_MAX, no clustering anchor). |
| S4 | **Interleave all three Elementor tops with each other** — reorder `elementor-home`, `elementor`, and `edit.php?post_type=elementor_library` in a specific sequence (Templates first, then Home, then Settings) to verify that Maestro can independently reorder all three Elementor-owned tops | `{"top_order":["edit.php?post_type=elementor_library","elementor-home","elementor","index.php"]}` | Effective order matches: probe shows `0 edit.php?post_type=elementor_library / 1 elementor-home / 2 elementor / 3 index.php`. All three Elementor tops are correctly placed in the requested order relative to each other and to WP core items. No failure mode from interleaving three plugin-owned tops. Persists. | **safe** — all three Elementor tops reorder independently and correctly relative to each other; the three-way interleave introduces no additional degradation. |

**Interaction scenario findings for Part 3:** S1 (non-cascading parent-hide) is a documented limitation,
same as SURV-01 I6 and SURV-02 I4. S2, S3, and S4 produced no new issues (all safe). No new fix rows
needed beyond those in the main matrix.

## Part 3 — Classified-Fix List

Every surfaced issue from the matrix gets one classified fix using exactly one R1 category. These entries feed DELV-02's prioritized backlog in Phase 16. **No orphans:** every degraded cell and every interaction finding maps to exactly one row below.

Allowed R1 fix categories:

1. **slug-resolution tweak**
2. **later `admin_menu` re-hook** (later admin_menu re-hook)
3. **special-casing**
4. **documented limitation**

> **Coverage note.** Part 2 surfaced **no `broken` cells** across all matrix rows + 4 interaction
> scenarios. Every classified fix below therefore addresses a `degraded` (cosmetic/recoverable) or
> limitation pattern. Several patterns are already covered by SURV-01 and SURV-02 analogues (I4–I8),
> making Phase 16 deduplication mechanical. Two new slug-resolution issues (I1, I2) are Elementor-specific
> but share the same fix category as SURV-02 I2 (Jetpack Settings absolute URL).

| # | Issue summary | Affected operation(s) | Affected items / source | Chosen classification | One-line rationale |
| --- | --- | --- | --- | --- | --- |
| I1 | **Website Templates submenu slug is an absolute URL that changes per environment and per plugin version** — the slug `$submenu['elementor'][14][2]` is `http://[host]/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library`; hostname, plugin version (`ver=4.1.4`), and fragment are all environment/version-specific; a config generated on one install will not resolve on another | Rename, Reorder (sub_order), Hide | Elementor "Website Templates" submenu under `elementor` parent — matrix Sub-matrix D (Website Templates row) | **slug-resolution tweak** | Same root cause as SURV-02 I2 (Jetpack Settings absolute URL), but compounded by a version number in the query string. Normalizing absolute-URL slugs to a host-relative + version-stripped + page-parameter form would make the override portable. Phase 16 DELV-02 deduplication: shares fix category with SURV-02 I2. |
| I2 | **Categories submenu slug is entity-encoded (`&amp;`) — override key must match exactly** — slugs `edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library` appear in `$submenu['elementor-home']` and `$submenu['edit.php?post_type=elementor_library']`; Maestro matches by exact slug; storing with unencoded `&` does NOT match | Rename, Hide | Categories submenu under `elementor-home` and under `edit.php?post_type=elementor_library` — matrix F5, Sub-matrix B/C (Categories rows) | **slug-resolution tweak** | Identical to the entity-encoded WooCommerce Products-taxonomy slugs (SURV-01 I3). Normalizing `&` ↔ `&amp;` in slug matching or documenting that the editor must display/store the encoded form. Phase 16 deduplication: identical to SURV-01 I3. |
| I3 | **Upgrade upsell submenu title has dynamic HTML injection that is lost on rename** — the promotions module conditionally replaces the `elementor-one-upgrade` title with `"Sale!<br />Upgrade Now"` via the `add_menu_classes` filter; Maestro's `{"title":"..."}` override replaces the title wholesale, dropping this dynamic HTML | Rename | Elementor "Upgrade" submenu under `elementor-home` — Sub-matrix B (Upgrade row) | **documented limitation** | Maestro's rename overwrites the title index wholesale — the same mechanism that drops WooCommerce count badges (SURV-01 I1). The dynamic injection is Elementor's own render-time behavior; accepting the loss is correct for a cosmetic rename. Phase 16 deduplication: same as SURV-01 I1 (badge-in-title documented limitation). |
| I4 | **Submenu re-icon is a silent no-op** — `Replay::replay()` only writes the icon to the top-level `$menu[pos][6]`; submenu rows have no icon index, so `{"icon":...}` on a submenu slug changes nothing | Re-icon | All Elementor submenus — matrix N/A cells (F1) | **documented limitation** | The operation does not exist for submenus in WordPress's menu model (submenu rows carry no icon slot); it never breaks anything. Correct and safe by design — accepted as-is. (Identical to SURV-01 I4 and SURV-02 I1; Phase 16 can dedup.) |
| I5 | **Cosmetic per-role Hide; page still loads by direct URL** — Maestro's hide is a per-role `unset()` that never strips a capability, so hidden Elementor pages still LOAD (200) by direct URL | Hide | All Elementor top-levels and submenus — all Hide cells (F2) | **documented limitation** | Same as SURV-01 I5 and SURV-02 I3: Hide is a sidebar-visibility convenience, not access control. Any 403 is WP's own cap gate, not Maestro. Correct and intended. (Identical to SURV-01 I5; Phase 16 can dedup.) |
| I6 | **Parent-hide does not cascade to children (Interaction S1)** — hiding `elementor-home` from admin leaves all child `$submenu['elementor-home']` rows (Editor, Add New Template, Categories, Upgrade) populated; the subtree is cosmetically orphaned but each child page LOADS by URL | Hide (parent + children interaction) | `elementor-home` parent + all its children — Interaction Scenario S1 | **documented limitation** | Same pattern as SURV-01 I6 and SURV-02 I4: non-cascading is the safe default — children remain reachable. Cascading-on-parent-hide would be a behavior change with access implications, out of R1 scope. (Identical to SURV-01 I6; Phase 16 can dedup.) |
| I7 | **`elementor` (pos 58.5) and `edit.php?post_type=elementor_library` top-levels are CSS-hidden by Elementor at `admin_head`; Maestro ops land correctly but visual sidebar confirmation is masked** — Elementor uses `display: none !important` CSS in `admin_head` to hide these two tops from the rendered sidebar; Maestro's rename/reorder/hide/re-icon operations are correctly applied at the replay-state level, but a tester relying on sidebar visual confirmation would not observe the changes | Rename, Reorder, Hide, Re-icon | `elementor` top-level (F3), `edit.php?post_type=elementor_library` top-level (F4) | **documented limitation** | This is Elementor's own UX design (showing only `elementor-home` as the "Editor One" menu while keeping the old menus for backward compatibility); Maestro's replay correctly mutates the globals. The limitation is purely observational — users will not see these items in the sidebar regardless. Documenting for DELV-02 awareness; no R1 implementation fix warranted. |
| I8 | **Maestro's Hide is a moot no-op for editor/shop_manager on `manage_options`-capped Elementor submenu items** — many Elementor submenus under `elementor-home` (Upgrade, Home anchor) and most under `elementor` parent require `manage_options`; WP's cap gate (1) removes these from non-admin sidebars independently of Maestro; Maestro's hide `unset()` has nothing to act on for those roles | Hide | All `manage_options`-capped submenus — all Hide sub-cells for editor/shop_manager on those items | **documented limitation** | This is WP's own capability design protecting non-admin roles from admin-only pages, not a Maestro defect. When a role gains `manage_options` (e.g. custom role), Hide would become non-moot — a state-dependent behavior change already handled by the per-role model. Documented for DELV-02 awareness; no R1 implementation fix warranted. (Identical pattern to SURV-02 I5; Phase 16 can dedup.) |

**Interaction scenarios S2 (rename+reorder, safe), S3 (re-icon+reorder-across-separator, safe), and S4
(three-top interleave, safe)** surfaced no new issues. They are therefore covered by "no issue" and
need no fix rows.

## Success-Criterion Traceability

| Phase 15 success criterion | Where addressed in this survey | Status |
| --- | --- | --- |
| 1. Survey covers HOW Elementor registers/manipulates the menu (all six manipulation dimensions) | Part 1 — Manipulation-Dimensions Checklist (all six checked with source + runtime evidence: custom positions, late/conditional injection, re-registered menus + entity-encoded slugs + absolute-URL slugs, dynamic HTML in titles, custom separator removed before replay, direct `$menu`/`$submenu` surgery) + Method header + natural-state baselines (Task 1) | ✅ Met |
| 2. Every Maestro op classified safe/degraded/broken per affected item, with observable evidence + persistence | Part 2 — Classification Matrix (three top-levels × rename/reorder/hide/re-icon in Sub-matrix A; five submenus under `elementor-home` in Sub-matrix B; three submenus under Templates in Sub-matrix C; seven key submenus under `elementor` in Sub-matrix D), cross-cutting findings F1–F5, per-role Hide (two-gate model with WP cap-gate + Maestro cosmetic `unset()`), top-level reorder from effective rendered order (reorder-probe) + Interaction Scenarios S1–S4 (Task 2) | ✅ Met |
| 3. Every surfaced issue gets exactly one classified R1 fix | Part 3 — Classified-Fix List I1–I8: every degraded matrix cell + interaction finding mapped to one of the four categories, no orphans; S2/S3/S4 safe (no fix rows) (Task 2) | ✅ Met |
| 4. Survey structurally mirrors SURV-01 and fills the SCHEMA.md template identically | This file: Method header, Part 1 six-dimension checklist, Part 2 full-coverage matrix + cross-cutting findings + per-role Hide, Interaction Scenarios, Part 3 fix list, traceability table, completion check — all present and schema-faithful | ✅ Met |
| Requirement **SURV-04** (Elementor surveyed and documented) | This entire file — HOW (Part 1) + what happens (Part 2) + classified fixes (Part 3) | ✅ Met |

## Survey Completion Check

- [x] All six manipulation dimensions above are checked or left unchecked with `Notes:` evidence. — All six checked: custom positions (three tops at 2.40565/26/58.5); conditional/late injection (multiple `admin_menu` priorities 9/20/100/10003–10005); re-registered menus + entity-encoded slugs + absolute-URL slugs; dynamic HTML in title (Upgrade/sale text); custom separator (removed before PHP_INT_MAX); direct global surgery (CSS-hide, `remove_submenu_page()`, `$submenu` direct write).
- [x] Every affected top-level menu item has a matrix row. — `elementor-home`, `edit.php?post_type=elementor_library`, `elementor` (3 rows in Sub-matrix A).
- [x] Every affected submenu has a matrix row. — 5 rows under `elementor-home` (Sub-matrix B); 3 rows under Templates (Sub-matrix C); 7 key rows under `elementor` (Sub-matrix D). Total: 15 matrix rows + 3 top-level = 18 rows.
- [x] Every Rename cell is classified `safe`, `degraded`, or `broken` with evidence. — All rename cells classified with observable evidence + persistence. `Upgrade` rename = degraded (dynamic HTML loss); all others = safe.
- [x] Every Reorder cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level from effective render order (reorder-probe); submenu reorder via `sub_order`; each cell classified. All top-level reorder cells safe (no active separator, no WC-style re-cluster for Elementor-owned items).
- [x] Every Hide cell is classified `safe`, `degraded`, or `broken` with evidence. — Per-role (admin / editor / shop_manager) with cosmetic-vs-access (loads-200 vs WP cap-403) noted per F2, using the two-gate model; editor/shop_manager sub-cells on `manage_options`-capped items are "WP cap-gated away (Maestro hide moot)" per F2/I8. Per-role render outcomes measured via separate post-cap-filter check (Method header, "Per-role observation"). All hide cells degraded (cosmetic).
- [x] Every Re-icon cell is classified `safe`, `degraded`, or `broken` with evidence. — Three top-level re-icon cells = safe (dashicons swap persists); all submenu re-icon cells = N/A→degraded (F1, no icon slot on submenu rows, rationale stated).
- [x] Every issue has exactly one classified fix: slug-resolution tweak, later `admin_menu` re-hook (later admin_menu re-hook), special-casing, or documented limitation. — Part 3 I1–I8: each surfaced degraded pattern + interaction finding mapped to exactly one category; no orphans; S2/S3/S4 safe, no fix rows needed.
- [x] The filled survey copy remains under `.planning/compat/SURV-NN-<plugin>.md`; `SCHEMA.md` is unmodified. — This copy is `.planning/compat/SURV-04-elementor.md`. SCHEMA.md was not edited (it is in final form for Phase 15 per 14-CONTEXT.md).
