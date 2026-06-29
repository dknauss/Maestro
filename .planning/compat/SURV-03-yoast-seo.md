# SURV-03 — Yoast SEO Compatibility Survey

R1 compatibility classification survey for **Yoast SEO**, the locked SEO choice for the R1 compat
set. This file is a filled copy of the `.planning/compat/SCHEMA.md` template, structured
identically to `SURV-01-woocommerce.md` and `SURV-02-jetpack.md`. It characterizes HOW Yoast SEO
registers and manipulates the WordPress admin menu (Part 1), classifies every Maestro operation
against every affected item (Part 2), and assigns each surfaced issue one classified R1 fix (Part 3).

> **Status:** Complete. Part 1 + Method header + natural-state baselines (Task 1);
> Part 2 classification matrix + Interaction Scenarios + Part 3 classified-fix list +
> traceability + completion check (Task 2).

> **Rank Math — OUT OF SCOPE / DEFERRED.** `tests/compat/VERSIONS.md` explicitly records
> "Yoast SEO (`wordpress-seo`) is the chosen SEO plugin and Rank Math is not loaded." Rank Math
> is not active in the compat harness and is not surveyed here. Any future Rank Math coverage
> belongs in a separate SURV-NN file under a later R1 phase. All references in this survey to
> "SEO plugin" mean Yoast SEO only.

## Survey Front Fields

- **Plugin:** Yoast SEO
- **Slug:** `wordpress-seo`
- **Pinned version:** `27.9` (pinned in `tests/compat/VERSIONS.md` / `tests/compat/.wp-env.json`)
- **Date surveyed:** 2026-06-28
- **Surveyor:** Claude (Maestro R1 compatibility survey)

## Method / how evidence was gathered

This section records the exact, reproducible procedure so Phase 15 surveys (SURV-04..06) repeat it
identically and any cell can be re-derived. All commands run against the committed Phase 13 compat
harness (`tests/compat/`). The methodology is LOCKED by `14-CONTEXT.md` and demonstrated in SURV-01;
this header reproduces it verbatim, adapting only the plugin name and the WP_ADMIN / role-variation
findings.

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
npx wp-env run cli wp plugin list --status=active   # wordpress-seo 27.9 + maestro-menu-editor active
npx wp-env run cli wp user list --fields=ID,user_login,roles
#   1 admin               administrator
#   2 compat_editor       editor
#   3 compat_shop_manager shop_manager
```

Cold-boot notes (from Phase 13): ~15 min cold; a transient Elementor ZIP CRC error self-heals on a
`compat:start` retry. NOTE: **all six compat plugins are active in this harness**, so the raw dumps
below contain WooCommerce / Jetpack / Elementor / WPForms / LifterLMS rows too; this survey reads
only Yoast SEO-owned rows (`wpseo_dashboard`, `wpseo_page_academy`, and their submenus, plus the
`wpseo_fake_menu_parent_page_slug` hidden-parent page).

### `$menu` / `$submenu` dump command

The reusable dump script is `.planning/compat/SURV-03-assets/dump-menu.php`. It hooks `admin_menu`
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
  eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-03-assets/dump-menu.php \
  --user=admin            # or compat_editor / compat_shop_manager
```

**The `--exec="define('WP_ADMIN', true);"` is REQUIRED for Yoast SEO too.** Confirmed at runtime:
without it, both the `wpseo_dashboard` item and the alternative `wpseo_page_academy` item are absent
from the dump — Yoast's menu registration is gated on admin-context init paths (same pattern as
WooCommerce and Jetpack). With `WP_ADMIN=true`, the full admin-only init fires and the dump captures
all Yoast menu rows.

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
`SURV-03-assets/reorder-probe.php`), never from the raw post-replay global.

The effective-order probe `SURV-03-assets/reorder-probe.php` hooks `admin_menu` at **`PHP_INT_MAX`**
— same priority as Maestro's `Replay::replay()`. Maestro registers its hook first (plugin-load time),
so the probe's callback appends after Maestro's and runs after Maestro's replay (and after Maestro's
`custom_menu_order` / `menu_order` filters are active). The probe then reproduces core's render-time
decision: gate on `apply_filters('custom_menu_order', false)`, and if claimed, run
`apply_filters('menu_order', $slugs)`.

### Per-role observation

**Setup state.** Yoast SEO has a first-time configuration wizard but the harness presents a
post-install state (wizard not explicitly completed); the menu is fully functional. No hard external
gate prevents the survey from running in this state. Setup-state-dependent items are tagged `[state]`.

**Yoast does not ship a custom role.** The three provisioned roles (admin / compat_editor /
compat_shop_manager) suffice. However, Yoast grants its own custom capabilities:
- `admin` (administrator) → `wpseo_manage_options` granted.
- `compat_editor` (editor) → `wpseo_bulk_edit` and `wpseo_edit_advanced_metadata` granted; NOT
  `wpseo_manage_options`.
- `compat_shop_manager` (shop_manager) → no Yoast caps granted (not `wpseo_manage_options`, not
  `wpseo_bulk_edit`). Confirmed at runtime via `wp eval 'echo json_encode(...)' --user=<role>`.

**Role-conditional menu registration (critical Yoast-specific behavior).** Yoast registers
DIFFERENT top-level slugs depending on whether the current user holds `wpseo_manage_options`:
- Users WITH `wpseo_manage_options` (admin): top-level slug is **`wpseo_dashboard`** (pos `99.63782`).
  Submenus: General, Settings, Integrations, Tools, Academy, Plans, Workouts (premium upsell),
  Redirects (premium upsell), Support, Upgrade (upsell), AI Brand Insights (upsell).
- Users WITHOUT `wpseo_manage_options` (editor, shop_manager): top-level slug is
  **`wpseo_page_academy`** (pos `99.62926`). Submenus: Academy, Workouts (upsell), Redirects
  (upsell), Upgrade (upsell), AI Brand Insights (upsell).

This is Yoast's role-access system: users who cannot manage SEO settings get a limited "Academy /
Premium features" entry point instead. Both registrations are committed before Maestro's
`PHP_INT_MAX` replay so Maestro sees both — **but they have DIFFERENT slugs**. A Maestro override
keyed on `wpseo_dashboard` only applies for admin; editor/shop_manager's `wpseo_page_academy`
item is a distinct, separately-keyed item that requires its own override. This is the defining
re-registration finding for Part 1 and Part 3.

**Two independent gates, evaluated separately.** A role's effective sidebar is the result of TWO
independent filters: (1) **WordPress's own capability gate** at render time (`current_user_can()` on
each row's required cap in `wp-admin/includes/menu.php`) — runs whether or not Maestro is active; and
(2) **Maestro's cosmetic per-role `unset()`** (a row whose `hidden_roles` intersects the user's
roles). The raw dump only reflects gate (2)'s input (replay state) and omits gate (1) entirely.

Observed per-role render outcomes (natural state, no Maestro hide):

- **`admin`** — `wpseo_manage_options` granted → sees `wpseo_dashboard` top-level with the full 11-item
  submenu (General, Settings, Integrations, Tools, Academy, Plans, Workouts, Redirects, Support,
  Upgrade, AI Brand Insights). Also sees `wpseo_fake_menu_parent_page_slug` → Search Console in
  the sidebar as a hidden-parent page.
- **`compat_editor`** — lacks `wpseo_manage_options`, has `edit_posts` and `edit_others_posts`. WP
  gate (1) removes the admin-only `wpseo_dashboard` item from editor's rendered sidebar (cap
  `wpseo_manage_options` unmet). Yoast registers the alternative `wpseo_page_academy` top-level
  (cap `edit_posts`) for this role — editor DOES see `wpseo_page_academy` with its reduced submenu
  (Academy, Workouts/Redirects upsell items with `edit_others_posts`). Confirmed: editor dump shows
  `wpseo_page_academy` at pos 99.62926 and NOT `wpseo_dashboard`.
- **`compat_shop_manager`** — lacks `wpseo_manage_options` AND `edit_others_posts` (shop_manager
  role). Same `wpseo_page_academy` top-level appears in dump (same as editor). WP gate: cap for
  Academy is `edit_posts` — shop_manager holds `edit_posts` so the `wpseo_page_academy` top-level
  renders. The Workouts/Redirects upsell submenus require `edit_others_posts` which shop_manager
  lacks — WP gate removes those. Confirmed: shop_manager dump mirrors editor dump for Yoast rows.

**Consequence for the Hide column.** For the `wpseo_dashboard` item: only admin sees it, so
editor/shop_manager Hide sub-cells are moot (WP gate removes the item for them — they see
`wpseo_page_academy` instead). For the `wpseo_page_academy` item: both editor and shop_manager see
it (edit_posts); admin does NOT see it (admin sees `wpseo_dashboard` instead). Hide logic for each
slug therefore only applies to the roles that actually see it.

### Classification rubric (applied verbatim across SURV-01..06)

- **safe** — operation works, persists across reload, no side effects.
- **degraded** — partial / cosmetic / recoverable loss or caveat.
- **broken** — operation fails, or causes functional loss / access breakage.
- **Deciding test:** recoverable / cosmetic → **degraded**; functional loss or access breakage →
  **broken**.
- **Persistence/timing note required per cell (Part 2):** state whether the result persists across
  reload, and for degraded/broken cases name the cause.

### Success-criterion traceability

| Phase 15 success criterion | Where addressed |
| --- | --- |
| 1. HOW Yoast SEO registers/manipulates the menu (all six dimensions) | Part 1 — Manipulation-Dimensions Checklist + this Method header + baseline dumps (Task 1) |
| 2. Every Maestro op classified per affected item with evidence | Part 2 — Classification Matrix + Interaction Scenarios (Task 2) |
| 3. Every surfaced issue gets exactly one classified R1 fix | Part 3 — Classified-Fix List (Task 2) |
| 4. Survey structurally mirrors SURV-01 (schema-faithful) | This entire file — Method header, Part 1 checklist, Part 2 matrix, Interaction Scenarios, Part 3 fix list, traceability, completion check |
| Requirement **SURV-03** | This entire file |

## Part 1 — Manipulation-Dimensions Checklist

Check each locked manipulation dimension the plugin exhibits and record concise evidence in `Notes:`.
Source citations are paths under the running container's `wp-content/plugins/wordpress-seo/`; runtime
confirmation rows are from the natural-state (no `maestro_config`) baselines in `SURV-03-assets/`.

Yoast SEO exhibits **four of the six** dimensions. It is a moderate-complexity manipulator: a
role-conditional dual-registration path (the defining finding), count badges baked into both
top-level titles, direct `$submenu` surgery for a hidden-parent page, and a standard
`add_menu_page` registration at a fractional position. No custom separator or `custom_menu_order`
filter (no top-level reorder conflict with Maestro).

- [x] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** Yoast registers both its top-level items at fractional position **`99.63782`** (admin path, `wpseo_dashboard`) and **`99.62926`** (non-admin path, `wpseo_page_academy`), placing them near the very bottom of the menu stack (after `separator-last` at 99). These fractional positions are unlikely to collide with other plugins. Confirmed in the natural-state admin dump: `99.63782 wpseo_dashboard` and in the editor dump: `99.62926 wpseo_page_academy`. The effective rendered order (reorder probe, natural state, no `maestro_config`) shows `wpseo_dashboard` at position 21 (between `elementor-home` at 20 and `woocommerce-marketing` at 22). Yoast does NOT hook `custom_menu_order` or `menu_order` (Maestro's probe shows `custom_menu_order claimed: YES` — that is WooCommerce's filter, not Yoast's). No reorder conflict with Maestro on this dimension.

- [ ] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority so Maestro may observe or replay them at a different time.
  - **Notes:** Yoast registers all its menu items on the standard `admin_menu` hook at default priority (10), before Maestro's `PHP_INT_MAX` replay. No late injection observed. All items are fully present in the replay-state dump. The role-conditionality (which slug is registered) is baked at registration time, not at a later hook. (The `WP_ADMIN=true` requirement is an init-path gate, not late injection — see Method header.)

- [x] **Re-registered menus** — menu removed then re-added, or slug re-registered, causing the same intended item to appear through more than one registration path. Note any **entity-encoded slugs** here.
  - **Notes:** Yoast's core re-registration pattern is the **dual-slug role-conditional registration**: the `wpseo_dashboard` top-level (cap `wpseo_manage_options`) and the `wpseo_page_academy` top-level (cap `edit_posts`) are distinct registrations that represent the same conceptual "Yoast SEO" menu entry for different user tiers. Both are registered on the same `admin_menu` hook (both present in the replay-state globals simultaneously), but WP's render-time cap gate ensures only one is visible per role. This means the **replay-state dump contains BOTH slugs** for all three roles (both are registered before `PHP_INT_MAX`), but each role's rendered sidebar shows only one. From Maestro's perspective these are two independent items — an override on `wpseo_dashboard` does not affect `wpseo_page_academy` and vice versa. **No entity-encoded (`&amp;`) slugs observed** in Yoast-owned rows. Slugs are clean alphanumeric/underscore page slugs throughout.

- [x] **Count badges baked into titles** — an awaiting-mod / update bubble span or similar count badge is embedded inside the menu title string.
  - **Notes:** Both Yoast top-level items embed a notification count badge in their title string: `Yoast SEO <span class="update-plugins count-0"><span class="plugin-count" aria-hidden="true">0</span><span class="screen-reader-text">0 notifications</span></span>`. Observed in both `wpseo_dashboard` (admin dump) and `wpseo_page_academy` (editor dump). Current harness state shows `count-0` (zero notifications). **Implication for Maestro rename (convention 3):** a rename overwrites `$menu[..][0]` wholesale (`includes/class-replay.php:98`), so the baked-in notification badge span is **lost on rename** → classified `degraded` in Part 2 (cosmetic, recoverable — badge returns when config is reset). Several submenu items also carry HTML-span upsell badges in their titles (Workouts, Redirects carry `yoast-badge yoast-premium-badge`; Upgrade carries a full `yst-root`-wrapped button; AI Brand Insights carries a `yoast-brand-insights-gradient-border` wrapper). These upsell decoration spans are also lost on rename of those submenus.

- [ ] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows that affect ordering or visible grouping.
  - **Notes:** Yoast adds no custom separator. No Yoast-owned `wp-menu-separator` row observed in any dump. Existing separators (`separator1`, `separator2`, `separator-last`, `separator-woocommerce`, `llms-separator`) belong to WP core and WooCommerce/LifterLMS respectively.

- [x] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals rather than using the WordPress menu API.
  - **Notes:** Yoast registers the Search Console page under a **fake empty-parent slug** `wpseo_fake_menu_parent_page_slug` via direct `$submenu` surgery (or `add_submenu_page('wpseo_fake_menu_parent_page_slug', ...)`) — visible in the admin dump as `PARENT: wpseo_fake_menu_parent_page_slug / 0 wpseo_search_console Search Console wpseo_manage_options`. This is the same hidden-parent pattern observed in Jetpack (`""` parent pages). The `wpseo_fake_menu_parent_page_slug` parent never appears in the top-level `$menu`, so Search Console is only accessible by direct URL (`admin.php?page=wpseo_search_console`), not from the sidebar. Maestro's `Replay::replay()` does not target hidden-parent items (the fake parent slug is not a `$menu` row). Several submenu items under `options.php` (the WP options page) are also registered by Yoast: `wpseo_installation_successful_free`, `wpseo_page_site_kit_set_up`, `wpseo_page_settings_saved`, `wpseo_configurator` — these are used programmatically and appear under `PARENT: options.php` in the dump. These are out of scope for Maestro ops (Maestro targets visible sidebar items, not programmatic admin pages).

### Natural-state baseline — revealing slices

All slices below are from the natural state (`maestro_config` deleted), captured with
`WP_ADMIN=true`. Full dumps saved as `SURV-03-assets/baseline-admin.txt`,
`SURV-03-assets/baseline-compat_editor.txt`, `SURV-03-assets/baseline-compat_shop_manager.txt`.

**Yoast top-level row — admin** (`pos⇥slug⇥title (truncated to text)⇥icon-prefix`):

```text
99.63782  wpseo_dashboard   Yoast SEO <span class="update-plugins count-0">…</span>   data:image/svg+xml;base64,[Yoast SVG]   menu-top toplevel_page_wpseo_dashboard
```

**Yoast top-level row — compat_editor / compat_shop_manager** (different slug, same badge):

```text
99.62926  wpseo_page_academy   Yoast SEO <span class="update-plugins count-0">…</span>   data:image/svg+xml;base64,[Yoast SVG]   menu-top toplevel_page_wpseo_page_academy
```

**`$submenu['wpseo_dashboard']` — admin:**

```text
PARENT: wpseo_dashboard
   0   wpseo_dashboard        General                                                      wpseo_manage_options
   1   wpseo_page_settings    Settings                                                     wpseo_manage_options
   2   wpseo_integrations     Integrations                                                 wpseo_manage_options
   3   wpseo_tools            Tools                                                        wpseo_manage_options
   4   wpseo_page_academy     Academy                                                      edit_posts
   5   wpseo_licenses         Plans                                                        wpseo_manage_options
   6   wpseo_workouts         Workouts <span class="yoast-badge yoast-premium-badge"></span>    edit_others_posts
   7   wpseo_redirects        Redirects <span class="yoast-badge yoast-premium-badge"></span>   edit_others_posts
   8   wpseo_page_support     Support                                                      wpseo_manage_options
   9   wpseo_upgrade_sidebar  <span class="yst-root">…Upgrade…</span>                     edit_posts
   10  wpseo_brand_insights   <span class="yoast-brand-insights-gradient-border">…AI Brand Insights…</span>   edit_posts
```

**`$submenu['wpseo_page_academy']` — compat_editor / compat_shop_manager:**

```text
PARENT: wpseo_page_academy
   0   wpseo_page_academy   Academy                                                        edit_posts
   1   wpseo_workouts       Workouts <span class="yoast-badge yoast-premium-badge"></span>  edit_others_posts
   2   wpseo_redirects      Redirects <span class="yoast-badge yoast-premium-badge"></span> edit_others_posts
   3   wpseo_upgrade_sidebar  <span class="yst-root">…Upgrade…</span>                      edit_posts
   4   wpseo_brand_insights   <span class="yoast-brand-insights-gradient-border">…</span>  edit_posts
```

**Yoast hidden-parent page (Search Console) — admin only:**

```text
PARENT: wpseo_fake_menu_parent_page_slug
   0   wpseo_search_console   Search Console   wpseo_manage_options
```

**Yoast hidden pages under `options.php` (programmatic; out of scope for Maestro ops):**

```text
PARENT: options.php
   0   wpseo_installation_successful_free    (empty title)   manage_options
   1   wpseo_page_site_kit_set_up            (empty title)   wpseo_manage_options
   2   wpseo_page_settings_saved             (empty title)   wpseo_manage_options
   3   wpseo_configurator                    (empty title)   manage_options
```

**Yoast entry in `$submenu['tools.php']` — Tools screen redirect:**

```text
PARENT: tools.php
   32  wpseo_redirects_tools   Yoast Redirects   edit_others_posts
```

**Natural-state effective rendered order (reorder-probe, no `maestro_config`):**
- `custom_menu_order claimed: YES` (WooCommerce claims this, not Yoast).
- `wpseo_dashboard` appears at effective position 21 (for admin). `wpseo_page_academy` appears at
  position 21 for editor/shop_manager (same fractional position, different slug).

### Inventory of affected Yoast SEO items (seeds the Part 2 matrix)

**Top-level (role-conditional — each role sees one of two slugs, not both):**

| Item | Slug | Who sees it | Position |
| --- | --- | --- | --- |
| Yoast SEO (admin) | `wpseo_dashboard` | admin only (requires `wpseo_manage_options`) | 99.63782 → effective 21 |
| Yoast SEO (editor/shop_manager) | `wpseo_page_academy` | editor + shop_manager (requires `edit_posts`) | 99.62926 → effective 21 |

**Submenus under `wpseo_dashboard` (admin only):**

| Item | Slug | Cap | Notes |
| --- | --- | --- | --- |
| General | `wpseo_dashboard` | `wpseo_manage_options` | Shares slug with top-level parent |
| Settings | `wpseo_page_settings` | `wpseo_manage_options` | — |
| Integrations | `wpseo_integrations` | `wpseo_manage_options` | — |
| Tools | `wpseo_tools` | `wpseo_manage_options` | — |
| Academy | `wpseo_page_academy` | `edit_posts` | Shares slug with the non-admin top-level |
| Plans | `wpseo_licenses` | `wpseo_manage_options` | — |
| Workouts | `wpseo_workouts` | `edit_others_posts` | Premium upsell badge in title |
| Redirects | `wpseo_redirects` | `edit_others_posts` | Premium upsell badge in title |
| Support | `wpseo_page_support` | `wpseo_manage_options` | — |
| Upgrade | `wpseo_upgrade_sidebar` | `edit_posts` | Full HTML button in title |
| AI Brand Insights | `wpseo_brand_insights` | `edit_posts` | HTML decoration in title |

**Submenus under `wpseo_page_academy` (editor/shop_manager):**
Academy, Workouts, Redirects, Upgrade, AI Brand Insights — same slugs as the Academy and upsell
items listed above, now parented under `wpseo_page_academy`. These are the SAME slugs appearing
under a different parent for non-admin roles.

**Out of scope:**
- `wpseo_fake_menu_parent_page_slug` / `wpseo_search_console` — hidden-parent page, not in sidebar.
- `options.php` / `wpseo_*` pages — programmatic admin pages, not accessible from sidebar.
- `tools.php` / `wpseo_redirects_tools` — a Tools-screen entry, not a Yoast-owned top-level/submenu.

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
> `SURV-03-assets/reorder-probe.php`), NOT the raw post-replay `$menu` global — see the Method header's
> top-level-reorder exception. Persistence was confirmed by re-running the dump/probe as a fresh request
> after each op. Per-cell shorthand: **persists** = override survives a reload.

#### Cross-cutting findings (apply to many rows, stated once here, referenced in cells)

- **F1 — Rename on either top-level item drops the notification badge (degraded, cosmetic).**
  Both `wpseo_dashboard` and `wpseo_page_academy` carry the title badge
  `<span class="update-plugins count-0"><span class="plugin-count" aria-hidden="true">0</span>
  <span class="screen-reader-text">0 notifications</span></span>`. `Replay::replay()` sets
  `$menu[pos][0] = $ovr['title']` (`includes/class-replay.php:98`), which overwrites the title
  wholesale — the badge span is lost. Observed: renaming `wpseo_dashboard` to "SEO Manager"
  produced `SEO Manager` in the dump with no badge. Recoverable (reset `maestro_config` restores it).
  Persists across reload. → **degraded** (same mechanism as WooCommerce F1, SURV-01).

- **F2 — Upsell-badge spans in submenu titles are also lost on rename (degraded, cosmetic).**
  Several submenus carry HTML decoration spans in their titles (Workouts, Redirects: `yoast-badge
  yoast-premium-badge`; Upgrade: full `yst-button yst-w-full…`; AI Brand Insights: full gradient-border
  wrapper). A rename of any of these submenus drops the HTML decoration — Maestro overwrites
  `$submenu[parent][pos][0]` wholesale (`class-replay.php:131`). Cosmetic loss; no functional breakage.
  Persists across reload. → **degraded** (subset of the badge-in-title convention per Part 1).

- **F3 — Re-icon is top-level only; submenu rows have no icon index (N/A).** Same as SURV-01 F2 /
  SURV-02 F2. `Replay::replay()` only writes to `$menu[pos][6]` (`class-replay.php:101`). Applying
  `{"icon":...}` to a submenu slug is a silent no-op. Classified **N/A** on every submenu row.

- **F4 — Hide is a cosmetic per-role `unset()`; it never removes a capability, so the page still
  loads by direct URL — and it composes with WP's INDEPENDENT cap gate.** Same mechanics as
  SURV-01 F3 / SURV-02 F3. Per the Method header's two-gate model:
    - **Maestro side:** `unset()`s the `$menu`/`$submenu` row for roles in `hidden_roles`; purely
      cosmetic, the cap is untouched.
    - **WP side:** if the role holds the page cap, the page still **LOADS (200)** by direct URL.
  Observed: hiding `wpseo_dashboard` from admin removed it from the top-level (count: 31 vs 32)
  while the `$submenu['wpseo_dashboard']` array remained fully populated (non-cascading parent-hide,
  per F5). Admin can still reach the Yoast settings at `admin.php?page=wpseo_dashboard` by URL.
  Cosmetic + access intact → **degraded**. Persists across reload.

- **F5 — Parent-hide does not cascade to children.** Hiding `wpseo_dashboard` from admin removes
  the top-level `$menu` entry but leaves `$submenu['wpseo_dashboard']` intact (all 11 child rows
  remain). This is the same non-cascading behavior documented in SURV-01 I6 / SURV-02 I4.
  The children become cosmetically orphaned (no parent anchor) but remain accessible by direct URL.

- **F6 — Dual-slug role-conditional registration: overrides on `wpseo_dashboard` do NOT apply to
  `wpseo_page_academy` and vice versa.** Each slug is independently keyed in the replay-state
  globals. A rename of `wpseo_dashboard` to "SEO Hub" leaves the `wpseo_page_academy` top-level
  for editor/shop_manager unchanged and vice versa. An admin configuring a rename must configure
  BOTH slugs to rename the menu consistently across all roles. This is a **natural consequence of
  Yoast's own role-conditional architecture** — each registration is a separate menu row. Classified
  as a documented limitation (I1 in Part 3).

- **F7 — Slug collision: `wpseo_dashboard` submenu "General" shares slug with the top-level parent;
  `wpseo_page_academy` submenu "Academy" shares slug with the non-admin top-level.** A Maestro
  override on slug `wpseo_dashboard` applies to both the top-level item AND the "General" first-
  submenu under it (since both have `$row[2] === 'wpseo_dashboard'`). Observed: renaming
  `wpseo_dashboard` to "SEO Manager" renamed both the top-level title and the first-submenu title
  to "SEO Manager". Similarly, overriding `wpseo_page_academy` renames both the non-admin top-level
  AND the "Academy" submenu under the admin's full menu. This is cosmetically unintuitive but not
  functionally broken (both rename correctly, both persist). → **degraded** for Rename (semantic
  confusion about scope), noted in the matrix row for each affected cell.

### Maestro Operation Matrix

Legend: **safe** / **degraded** / **broken** per the rubric; **[state]** = behavior is setup/feature/role-dependent; Re-icon on submenu rows = **N/A** (F3); Hide cells are per-role (admin / editor / shop_manager). All cells persist across reload unless noted.

> **Reading the Hide column (per F4's two-gate model).** Each Hide sub-cell is **{Maestro's cosmetic
> per-role `unset()` on the replay state} + {WP's independent render-time cap gate}**. Where a role
> lacks the page cap, WP removes the row at render before Maestro's hide applies — Maestro's hide is
> a **moot no-op** for that role. For `wpseo_dashboard`: admin holds `wpseo_manage_options` → sees it;
> editor/shop_manager lack it → WP cap-gates it away (moot for hide). For `wpseo_page_academy`: editor
> and shop_manager hold `edit_posts` → see it; admin sees `wpseo_dashboard` instead (Yoast never
> registers `wpseo_page_academy` as visible for admin in the same session). Per-role render outcomes
> are documented in the Method header's "Per-role observation".

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `Yoast SEO` (admin path) | top-level | `wpseo_dashboard` | **degraded** — renamed to "SEO Manager", persists; the notification badge span (`update-plugins count-0`) is LOST (F1). Also renames the "General" first submenu (F7 slug collision). Timing: Maestro overwrites index [0] after Yoast bakes in the badge. | **safe** — moved to requested effective position; Yoast does NOT hook `custom_menu_order` or `menu_order`, so no separator re-clustering caveat. Applied `{"top_order":["wpseo_dashboard","index.php"]}` → probe shows `0 wpseo_dashboard / 1 index.php`. Persists. | admin **degraded** — hidden from sidebar cosmetically, page still LOADS (200) by direct URL (`wpseo_manage_options` cap intact, F4); children remain populated (F5, non-cascading). editor: WP cap-gates `wpseo_dashboard` away (Maestro hide moot — editor sees `wpseo_page_academy` instead). shop_manager: same as editor (moot). | **safe** — data-URI SVG swapped to `dashicons-search`, persists. Applied `{"items":{"wpseo_dashboard":{"icon":"dashicons-search"}}}` → dump shows `dashicons-search` at icon slot. |
| `Yoast SEO` (editor/shop_manager path) | top-level | `wpseo_page_academy` | **degraded** — renamed similarly; notification badge lost (F1). Also renames the "Academy" submenu under the admin path (F7 slug collision with `wpseo_page_academy` submenu). Persists. | **safe** — moves to requested effective position for all roles; no Yoast reorder filter conflict. Persists. | admin: WP cap-gates `wpseo_page_academy` away for admin at render (admin sees `wpseo_dashboard`; the alternative slug is present in replay state but effectively invisible to admin at sidebar render). editor **degraded** — hidden from sidebar cosmetically, page still LOADS (200) by URL (`edit_posts` intact, F4). shop_manager **degraded** — same as editor. | **safe** — data-URI SVG → dashicon swap applies and persists. |
| `General` | submenu | `wpseo_dashboard` (parent `wpseo_dashboard`) | **degraded** — slug `wpseo_dashboard` is shared with the top-level; a rename on this slug renames both parent AND General submenu simultaneously (F7). The rename lands on the submenu title ("General" → target title) and persists. Cannot target General without also affecting the top-level. | **N/A → safe** — submenu reorder via `sub_order`. Applied `{"sub_order":{"wpseo_dashboard":["wpseo_tools","wpseo_page_settings","wpseo_dashboard","wpseo_integrations"]}}` → General moved to pos 2, Tools to pos 0, Settings to pos 1. Persists. | admin **degraded** — cosmetic `unset()`, page still LOADS by URL (`wpseo_manage_options` intact, F4). editor: WP cap-gated (`wpseo_manage_options` unmet → entire `wpseo_dashboard` submenu invisible to editor; Maestro hide moot). shop_manager: same as editor. | **N/A** (F3) → degraded — submenu rows have no icon index. |
| `Settings` | submenu | `wpseo_page_settings` (parent `wpseo_dashboard`) | **safe** — renamed to "SEO Settings Renamed", persists; no badge in title. | **N/A → safe** — submenu reorder applies; Settings moves correctly in ordered dump. Persists. | admin **degraded** — cosmetic hide, page LOADS by URL. editor/shop_manager: WP cap-gated (`wpseo_manage_options` unmet → moot). | **N/A** (F3) → degraded. |
| `Integrations` | submenu | `wpseo_integrations` (parent `wpseo_dashboard`) | **safe** — renamed, persists; no badge in title. | **N/A → safe** — reorder applies. Persists. | admin **degraded** — cosmetic, LOADS. editor/shop_manager: moot (cap-gated). | **N/A** (F3) → degraded. |
| `Tools` | submenu | `wpseo_tools` (parent `wpseo_dashboard`) | **safe** — renamed, persists; no badge. | **N/A → safe** — reorder applies. Persists. | admin **degraded** — cosmetic, LOADS. Observed: hiding `wpseo_tools` from admin removed pos 3 from dump (`wpseo_tools` absent, remaining items re-indexed). editor/shop_manager: moot (cap-gated). | **N/A** (F3) → degraded. |
| `Academy` | submenu | `wpseo_page_academy` (parent `wpseo_dashboard`) | **degraded** — slug `wpseo_page_academy` is shared with the editor/shop_manager top-level (F7). A rename of `wpseo_page_academy` renames both this submenu (visible under admin's full menu) AND the non-admin top-level. Cannot target independently. Persists. | **N/A → safe** — submenu reorder places it correctly when listed in `sub_order`. Persists. | admin **degraded** — cosmetic, LOADS. editor/shop_manager: hold `edit_posts`; **Maestro hide is effective** for editor/shop_manager on this slug — but hiding `wpseo_page_academy` from editor removes their top-level entry (they see `wpseo_page_academy` as their entry point), so the entire Yoast surface disappears from their sidebar. Still cosmetic (URL still LOADS). | **N/A** (F3) → degraded. |
| `Plans` | submenu | `wpseo_licenses` (parent `wpseo_dashboard`) | **safe** — renamed, persists; no badge in title. | **N/A → safe** — reorder applies. Persists. | admin **degraded** — cosmetic, LOADS. editor/shop_manager: moot (cap-gated). | **N/A** (F3) → degraded. |
| `Workouts` | submenu | `wpseo_workouts` (parent `wpseo_dashboard` for admin; also parent `wpseo_page_academy` for editor/shop_manager) | **degraded** — premium upsell badge (`yoast-badge yoast-premium-badge`) lost on rename (F2). Persists. | **N/A → safe** — submenu reorder works under `wpseo_dashboard`. Persists. | admin **degraded** — cosmetic hide, page LOADS. editor **degraded** — holds `edit_others_posts` (cap met); cosmetic hide removes from sidebar, page LOADS. shop_manager: lacks `edit_others_posts` → WP cap-gated away (Maestro hide moot). | **N/A** (F3) → degraded. |
| `Redirects` | submenu | `wpseo_redirects` (parent `wpseo_dashboard` for admin; also parent `wpseo_page_academy` for editor/shop_manager) | **degraded** — premium upsell badge lost on rename (F2). Persists. | **N/A → safe** — submenu reorder works. Persists. | admin **degraded** — cosmetic, LOADS. editor **degraded** — `edit_others_posts` met; cosmetic hide, LOADS. shop_manager: cap-gated (moot). | **N/A** (F3) → degraded. |
| `Support` | submenu | `wpseo_page_support` (parent `wpseo_dashboard`) | **safe** — renamed, persists; no badge. | **N/A → safe** — reorder. Persists. | admin **degraded** — cosmetic, LOADS. editor/shop_manager: moot (cap-gated). | **N/A** (F3) → degraded. |
| `Upgrade` | submenu | `wpseo_upgrade_sidebar` (parent `wpseo_dashboard`; also parent `wpseo_page_academy`) | **degraded** — full `yst-root` HTML button wrapper in title lost on rename (F2). Persists. | **N/A → safe** — reorder. Persists. | admin **degraded** — cosmetic, LOADS. editor **degraded** — `edit_posts` met; cosmetic hide, LOADS. shop_manager **degraded** — `edit_posts` met; cosmetic hide, LOADS. | **N/A** (F3) → degraded. |
| `AI Brand Insights` | submenu | `wpseo_brand_insights` (parent `wpseo_dashboard`; also parent `wpseo_page_academy`) | **degraded** — HTML gradient-border wrapper in title lost on rename (F2). Persists. | **N/A → safe** — reorder. Persists. | admin **degraded** — cosmetic, LOADS. editor **degraded** — `edit_posts` met; cosmetic hide, LOADS. shop_manager **degraded** — `edit_posts` met; cosmetic hide, LOADS. | **N/A** (F3) → degraded. |

> **Net for Part 3 (issues to classify-fix):** (a) badge-in-title on both top-level items lost on
> rename (F1) — documented limitation; (b) upsell-badge spans on multiple submenus lost on rename
> (F2) — documented limitation; (c) submenu re-icon N/A (F3) — documented limitation; (d) hide is
> cosmetic per F4 — documented limitation; (e) non-cascading parent-hide (F5) — documented
> limitation; (f) dual-slug role-conditional registration requires per-slug overrides (F6) —
> documented limitation with potential slug-resolution consideration; (g) slug collision causing
> simultaneous rename of top-level + first-submenu (F7) — documented limitation.
> **No broken cells across 13 matrix rows.** All operations succeed or degrade cosmetically.

### Evidence Notes

- All rename/reorder/re-icon classifications are grounded in re-dumped `$menu`/`$submenu` output
  (and the `reorder-probe.php` effective-order output for top-level Reorder) compared against the
  natural baseline.
- Per-role Hide was verified via the two-gate model: (1) WP cap check per role (via `wp eval
  'echo current_user_can(...)'`) and (2) Maestro's `unset()` observed by comparing dump count
  (32 items natural vs 31 with admin hidden from `wpseo_dashboard`).
- Representative observed phrases: "Renamed `wpseo_dashboard` to 'SEO Manager', dump shows top-level
  title updated + badge absent + General submenu also renamed"; "Re-icon applied SVG→dashicon swap,
  icon slot now `dashicons-search`"; "Reorder moved `wpseo_dashboard` to position 0 in effective
  order, probe confirms `0 wpseo_dashboard / 1 index.php`"; "Hide from admin: count drops 32→31,
  submenu array still populated".

## Interaction Scenarios

Beyond the per-op matrix, a few deliberate **op-combinations** were applied together in a single
`maestro_config` payload and classified the same way (safe / degraded / broken + observable evidence
+ persistence + timing cause). All scenarios reset config afterward.

Yoast has both a parent/child menu structure (top-level `wpseo_dashboard` with 11 submenus) and
standard WP separators in the menu, making all three canonical probes applicable.

| # | Scenario | Payload (shape) | Observed result | Classification |
| --- | --- | --- | --- | --- |
| S1 | **Hide-parent-with-visible-children** — hide the top-level `wpseo_dashboard` from admin while children (General, Settings, Integrations, Tools, etc.) still hold accessible caps | `{"items":{"wpseo_dashboard":{"hidden_roles":["administrator"]}}}` | admin: top-level `$menu` entry removed (count 32→31); **all 11 `$submenu['wpseo_dashboard']` rows remain fully populated**. Maestro's parent-hide does NOT cascade to children at the data level. Children (General, Settings, Tools…) remain accessible by direct URL (`admin.php?page=wpseo_dashboard` etc., all caps intact). Subtree cosmetically orphaned, no access break. Persists. | **degraded** — cosmetic subtree-orphaning, no access break. Same non-cascading pattern as SURV-01 S1 / SURV-02 S1. No Yoast timing interaction involved (pure Maestro `PHP_INT_MAX` unset). |
| S2 | **Rename + reorder the same item together** — rename `wpseo_dashboard` to "SEO Hub" AND move it to the top via `top_order` | `{"items":{"wpseo_dashboard":{"title":"SEO Hub","icon":"dashicons-search"}},"top_order":["wpseo_dashboard","index.php"]}` | Both effects apply and **compound cleanly**: title becomes "SEO Hub" + re-icon to `dashicons-search` (badge lost, F1); AND effective rendered order places `wpseo_dashboard` at position 0 (probe: `0 wpseo_dashboard / 1 index.php`). No additional failure from combining. Badge loss is the same degradation as the single-op rename. Persists. | **degraded** — badge loss (F1, same as single-op rename); reorder and re-icon are safe additions. No new failure mode from combining. No WooCommerce-style separator re-clustering (Yoast owns no separator). |
| S3 | **Re-icon + reorder across a separator** — re-icon `wpseo_dashboard` with `dashicons-search` AND move it to a position across `separator2` | `{"items":{"wpseo_dashboard":{"icon":"dashicons-search"}},"top_order":["index.php","separator1","upload.php","separator2","wpseo_dashboard"]}` | `wpseo_dashboard` icon swaps to `dashicons-search` (safe, persists); effective order places `wpseo_dashboard` immediately after `separator2` at position 4 (probe confirms `3 separator2 / 4 wpseo_dashboard`). Both apply independently and persist. No new failure mode crossing the separator. | **safe** — re-icon is safe; reorder across separator is safe (Yoast has no own separator, no WC-style cluster anchoring on Yoast's behalf). |

**Interaction scenario findings for Part 3:** S1 (non-cascading parent-hide) is the same documented
limitation as SURV-01 I6 / SURV-02 I4. S2 (rename+reorder) produced badge loss but no new failure
mode beyond single-op rename. S3 (re-icon+reorder-across-separator) safe — no new fix rows needed
beyond those already captured in the main matrix.

## Part 3 — Classified-Fix List

Every surfaced issue from the matrix gets one classified fix using exactly one R1 category. These entries feed DELV-02's prioritized backlog in Phase 16. **No orphans:** every degraded cell and every interaction finding maps to exactly one row below.

Allowed R1 fix categories:

1. **slug-resolution tweak**
2. **later `admin_menu` re-hook** (later admin_menu re-hook)
3. **special-casing**
4. **documented limitation**

> **Coverage note.** Part 2 surfaced **no `broken` cells** across 13 matrix rows + 3 interaction
> scenarios. Every classified fix below therefore addresses a `degraded` (cosmetic/recoverable) pattern
> or a limitation that is well-behaved but worth documenting for Phase 16 synthesis. Several patterns
> are direct analogues of SURV-01 / SURV-02 issues (I4 mirrors SURV-01 F2 / SURV-02 I1; I5 mirrors
> SURV-01 I5 / SURV-02 I3; I6 mirrors SURV-01 I6 / SURV-02 I4), making Phase 16 deduplication mechanical.

| # | Issue summary | Affected operation(s) | Affected items / source | Chosen classification | One-line rationale |
| --- | --- | --- | --- | --- | --- |
| I1 | **Dual-slug role-conditional registration: `wpseo_dashboard` and `wpseo_page_academy` are two independent top-level entries** — Yoast registers different slugs for different user tiers; an admin-authored rename/reorder/hide override on `wpseo_dashboard` does NOT apply to editor/shop_manager's `wpseo_page_academy` view and vice versa; consistent cross-role menu customization requires two separate Maestro overrides | Rename, Reorder, Hide, Re-icon | `wpseo_dashboard` top-level + `wpseo_page_academy` top-level — F6 | **documented limitation** | This is Yoast's own role-access architectural choice (two separate `add_menu_page` registrations with different caps); Maestro matches overrides by exact slug and cannot merge two distinct rows into one conceptual item without knowing Yoast's role-conditional logic. Documented so Phase 16 DELV-02 can flag this as a "dual-slug plugin" needing user guidance (or a future special-case rule). |
| I2 | **Slug collision: `wpseo_dashboard` is shared between the top-level parent item and its "General" first submenu** — a rename override on slug `wpseo_dashboard` renames both simultaneously | Rename | `wpseo_dashboard` top-level + `wpseo_dashboard` General submenu — F7 | **documented limitation** | This is Yoast's own registration choice (the first submenu uses the same slug as the parent to create the "active page = parent slug" effect). Maestro matches by slug in a single pass and cannot distinguish parent from first-submenu when the slug is identical. Behavior is safe and correct but semantically surprising. Documented for DELV-02. |
| I3 | **Slug collision: `wpseo_page_academy` is shared between the editor/shop_manager top-level and the "Academy" submenu under the admin's full menu** — same consequence as I2 | Rename | `wpseo_page_academy` top-level (non-admin path) + `wpseo_page_academy` Academy submenu (admin path) — F7 | **documented limitation** | Same root cause as I2: Yoast's registration deliberately reuses the Academy submenu slug as the non-admin entry-point slug. Noted for DELV-02 alongside I2. |
| I4 | **Notification badge spans in top-level titles are lost on rename** — both `wpseo_dashboard` and `wpseo_page_academy` carry `<span class="update-plugins count-0">…</span>` baked into their title; Maestro's rename overwrites index [0] wholesale, dropping the badge | Rename | `wpseo_dashboard` top-level, `wpseo_page_academy` top-level — F1 | **documented limitation** | Identical to SURV-01 I3 (WooCommerce Payments badge loss) and consistent with the badge-in-title convention (Part 1 dimension 4). The operation is recoverable (badge returns on reset); no functional loss. Phase 16 can dedup with SURV-01 / SURV-02 analogues. |
| I5 | **Upsell/decoration HTML spans in submenu titles are lost on rename** — Workouts, Redirects, Upgrade, AI Brand Insights carry premium-badge or rich-HTML wrappers in their title; Maestro's rename overwrites `$submenu[parent][pos][0]` wholesale | Rename | `wpseo_workouts`, `wpseo_redirects`, `wpseo_upgrade_sidebar`, `wpseo_brand_insights` — F2 | **documented limitation** | Same mechanism as I4 and SURV-01 F1 — wholesale title overwrite drops any embedded HTML. The upsell decoration is purely cosmetic; no functional access loss. Correct and safe by design. |
| I6 | **Submenu re-icon is a silent no-op** — `Replay::replay()` only writes the icon to `$menu[pos][6]`; submenu rows have no icon index, so `{"icon":...}` on any Yoast submenu slug changes nothing | Re-icon | All Yoast submenu rows — F3 | **documented limitation** | Identical to SURV-01 I4 / SURV-02 I1. The operation does not exist for submenus in WordPress's menu model; it never breaks anything. Phase 16 can dedup across surveys. |
| I7 | **Cosmetic per-role Hide; page still loads by direct URL** — Maestro's hide is a per-role `unset()` that never strips a capability, so hidden Yoast pages still LOAD (200) by direct URL | Hide | All Yoast top-level and submenu items (admin sub-cells) — F4 | **documented limitation** | Same as SURV-01 I5 / SURV-02 I3: Hide is a sidebar-visibility convenience, not access control. Any 403 is WP's own cap gate, not Maestro. Correct and intended. Phase 16 can dedup. |
| I8 | **Parent-hide does not cascade to children (Interaction S1)** — hiding `wpseo_dashboard` from admin leaves all 11 child `$submenu` rows intact; the subtree is cosmetically orphaned but each child page LOADS by URL | Hide (parent + children interaction) | `wpseo_dashboard` parent + all 11 submenus — F5 / Interaction S1 | **documented limitation** | Same pattern as SURV-01 I6 / SURV-02 I4: non-cascading is the safe default — children remain reachable. Cascading-on-parent-hide would be a behavior change with access implications, out of R1 scope. Phase 16 can dedup. |

**Interaction scenarios S2 (rename+reorder, degraded only from badge loss already documented in I4)
and S3 (re-icon+reorder-across-separator, safe)** surfaced no new issues beyond those in the main
matrix. They are covered by existing rows and need no additional fix entries.

## Success-Criterion Traceability

| Phase 15 success criterion | Where addressed in this survey | Status |
| --- | --- | --- |
| 1. Survey covers HOW Yoast SEO registers/manipulates the menu (all six manipulation dimensions) | Part 1 — Manipulation-Dimensions Checklist (4 of 6 checked with source + runtime evidence; 2 unchecked with Notes confirming absence) + Method header (WP_ADMIN requirement, dual-slug registration, per-role observation) + baseline dumps (Task 1) | ✅ Met |
| 2. Every Maestro op classified safe/degraded/broken per affected item, with observable evidence + persistence | Part 2 — Classification Matrix (13 rows × rename/reorder/hide/re-icon), cross-cutting findings F1–F7, per-role Hide (two-gate model with WP cap-gate + Maestro cosmetic `unset()`), top-level reorder from effective rendered order (reorder-probe) + Interaction Scenarios S1–S3 (Task 2) | ✅ Met |
| 3. Every surfaced issue gets exactly one classified R1 fix | Part 3 — Classified-Fix List I1–I8: every degraded matrix cell + interaction finding mapped to one of the four categories, no orphans; S2 (badge loss already in I4) and S3 (safe, no fix needed) | ✅ Met |
| 4. Survey structurally mirrors SURV-01 and fills the SCHEMA.md template identically | This file: Method header, Part 1 six-dimension checklist, Part 2 full-coverage matrix + cross-cutting findings + per-role Hide, Interaction Scenarios, Part 3 fix list, traceability table, completion check — all present and schema-faithful | ✅ Met |
| Requirement **SURV-03** (Yoast SEO surveyed and documented; Rank Math noted out-of-scope) | This entire file — Rank Math explicitly noted out-of-scope/deferred in the preamble and front-field note; Yoast SEO fully surveyed (HOW in Part 1, classified ops in Part 2, classified fixes in Part 3) | ✅ Met |

## Survey Completion Check

- [x] All six manipulation dimensions above are checked or left unchecked with `Notes:` evidence. — Four checked (custom menu positions, re-registered menus, count badges in titles, direct `$menu` surgery); two unchecked with Notes confirming absence (no conditional/late injection, no custom separators).
- [x] Every affected top-level menu item has a matrix row. — `wpseo_dashboard` and `wpseo_page_academy` (2 top-level rows).
- [x] Every affected submenu has a matrix row. — 11 submenus under `wpseo_dashboard` (General, Settings, Integrations, Tools, Academy, Plans, Workouts, Redirects, Support, Upgrade, AI Brand Insights) → 11 submenu rows (13 rows total including top-level). Hidden-parent pages (Search Console, `options.php` entries) explicitly noted out-of-scope.
- [x] Every Rename cell is classified `safe`, `degraded`, or `broken` with evidence. — All 13 Rename cells classified with observable evidence + persistence + badge-loss caveats noted.
- [x] Every Reorder cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level from effective render order (reorder-probe, `0 wpseo_dashboard / 1 index.php`); submenu Reorder via `sub_order`; each cell classified with evidence.
- [x] Every Hide cell is classified `safe`, `degraded`, or `broken` with evidence. — Per-role (admin / editor / shop_manager) with cosmetic-vs-access (loads-200 vs WP cap gate) noted per F4, using the two-gate model; WP cap outcomes verified via `wp eval current_user_can(...)` per role; moot no-op cells called out explicitly where WP already gates a role away.
- [x] Every Re-icon cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level two items safe (SVG→dashicon swap confirmed in dump); submenus N/A→degraded (F3), rationale stated.
- [x] Every issue has exactly one classified fix: slug-resolution tweak, later `admin_menu` re-hook (later admin_menu re-hook), special-casing, or documented limitation. — Part 3 I1–I8: each surfaced degraded pattern + interaction finding mapped to exactly one category (all documented limitations); no orphans; S2/S3 covered by existing rows or safe.
- [x] The filled survey copy remains under `.planning/compat/SURV-03-yoast-seo.md`; `SCHEMA.md` is unmodified. — This copy is `.planning/compat/SURV-03-yoast-seo.md`. SCHEMA.md was not edited (it is in final form for Phase 15 per 14-CONTEXT.md, unchanged since the Phase 14 batched refinement).
- [x] **Rank Math explicitly noted out-of-scope/deferred.** — Noted in the preamble and the Survey Front Fields status block: Rank Math is not loaded in the compat harness; Yoast SEO is the locked SEO choice; no Rank Math survey attempted.
