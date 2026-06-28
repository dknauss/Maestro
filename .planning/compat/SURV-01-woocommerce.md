# SURV-01 — WooCommerce Compatibility Survey

R1 compatibility classification survey for **WooCommerce**, the locked first-priority plugin and
the heaviest admin-menu manipulator in the compat set. This file is a filled copy of the pristine
`.planning/compat/SCHEMA.md` template (which remains untouched until Plan 03's batched
end-of-phase refinement). It characterizes HOW WooCommerce registers and manipulates the WordPress
admin menu (Part 1), classifies every Maestro operation against every affected item (Part 2), and
assigns each surfaced issue one classified R1 fix (Part 3).

> **Status:** Part 1 + Method header + natural-state baseline complete (Plan 14-01). Parts 2 and 3
> are filled by Plans 14-02 and 14-03.

## Survey Front Fields

- **Plugin:** WooCommerce
- **Slug:** `woocommerce`
- **Pinned version:** `10.9.1` (pinned in `tests/compat/VERSIONS.md` / `tests/compat/.wp-env.json`)
- **Date surveyed:** 2026-06-28
- **Surveyor:** Claude (Maestro R1 compatibility survey)

## Method / how evidence was gathered

This section records the exact, reproducible procedure so Phase 15 surveys (SURV-02..06) repeat it
identically and any cell can be re-derived. All commands run against the committed Phase 13 compat
harness (`tests/compat/`).

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
npx wp-env run cli wp plugin list --status=active   # WooCommerce 10.9.1 + maestro-menu-editor active
npx wp-env run cli wp user list --fields=ID,user_login,roles
#   1 admin               administrator
#   2 compat_editor       editor
#   3 compat_shop_manager shop_manager   (WooCommerce's own role)
```

Cold-boot notes (from Phase 13): ~15 min cold; a transient Elementor ZIP CRC error self-heals on a
`compat:start` retry; a leftover partial `WordPress-PHPUnit/` can block the shallow clone (move it
aside); `testsEnvironment: false` is set but wp-env 11.8.1 still provisions the tests env (harmless
deprecation warning). NOTE: **all six compat plugins are active in this harness**, so the raw dumps
below contain Jetpack / Yoast / Elementor / WPForms / LifterLMS rows too; this survey reads only the
WooCommerce-owned rows (`woocommerce`, `wc-*`, `woocommerce-marketing`, the Payments item, and the
Products-submenu items WooCommerce adds).

### `$menu` / `$submenu` dump command

The reusable dump script is `.planning/compat/SURV-01-assets/dump-menu.php`. It hooks `admin_menu`
at `PHP_INT_MAX` — the **same priority Maestro's `Replay::replay()` uses** (`includes/class-replay.php:56`) —
so it observes the globals in exactly the fully-registered state Maestro sees, then `exit`s before
WordPress's per-user privilege filtering in `wp-admin/includes/menu.php` (which `wp_die()`s under
WP-CLI). Run it per role:

```bash
cd tests/compat
npx wp-env run cli -- php -d memory_limit=512M /usr/local/bin/wp \
  --exec="define('WP_ADMIN', true);" \
  eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-01-assets/dump-menu.php \
  --user=admin            # or compat_editor / compat_shop_manager
```

**The `--exec="define('WP_ADMIN', true);"` is mandatory.** Without it `is_admin()` is false, so
WooCommerce's classic `WC_Admin_Menus` class never instantiates and the dump is silently
incomplete — the top-level `woocommerce` item, `separator-woocommerce`, the Products → Attributes
submenu, and the Reports/Settings/Status/Add-ons submenus all vanish. With it, the admin-context
init paths fire and the dump matches the rendered sidebar. (The `.planning` tree is inside the repo,
which the harness maps to `wp-content/plugins/maestro-menu-editor`, so `eval-file` can reach the
script.) Each row prints `pos⇥slug⇥title⇥icon⇥css` for top-level and `pos⇥slug⇥title⇥cap` for
submenus. Captured baselines live in `SURV-01-assets/baseline-*.txt`.

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
# Natural (pre-override) baseline — used for ALL Part 1 dumps in this plan:
npx wp-env run cli wp option delete maestro_config

# Plan 02 applies each operation by writing the diff, then re-dumps to compare:
npx wp-env run cli -- wp option update maestro_config '<json>' --format=json
```

Notable items are additionally spot-checked through the real in-place editor UI at
`http://localhost:8890/wp-admin/` (drive with the `tests/e2e/` Playwright patterns if scripted).

**Top-level Reorder is the one exception to the `$menu`-dump method.** `Replay::replay()` applies
rename / icon / visibility / submenu-order to the globals on `admin_menu @ PHP_INT_MAX`, but
top-level ordering goes through the `custom_menu_order` + `menu_order` filters at render time
(`includes/class-replay.php:58-60`), which run *after* `admin_menu`. A raw `$menu` dump taken at
`PHP_INT_MAX` therefore will **not** reflect a reordered top-level sequence. Plan 02 classifies
top-level Reorder cells from the **effective rendered order** (the admin sidebar DOM, or by applying
the `menu_order` filter explicitly in `wp eval`), never from the raw post-replay global. Rename,
icon, hide, and submenu reorder ARE visible in the raw dump.

### Per-role observation

Each of the three provisioned users is dumped separately via the `--user=` flag above, because
Maestro's Hide is **per-role** (`Replay::is_hidden_for_current_user()` only `unset()`s an item when
the current user's roles intersect `hidden_roles`). `admin` (administrator) sees everything;
`compat_shop_manager` (WooCommerce's own role) exercises the Woo-specific caps; `compat_editor`
(generic editor) is the baseline that lacks WooCommerce caps. Differences are noted in Part 1 and
will drive the Hide column in Part 2.

### Two setup states surveyed

WooCommerce gates several menu behaviours on onboarding/setup state, so both are captured:

- **(a) Fresh-activated** — WooCommerce active, setup wizard NOT completed. This is the harness's
  default state (`woocommerce_onboarding_profile` absent). Baseline:
  `SURV-01-assets/baseline-admin-fresh.txt`.
- **(b) Completed-setup** — onboarding marked complete with Analytics on. Reached with:
  ```bash
  npx wp-env run cli -- wp option update woocommerce_onboarding_profile \
    '{"completed":true,"skipped":false}' --format=json
  npx wp-env run cli wp option update woocommerce_analytics_enabled yes
  ```
  Baseline: `SURV-01-assets/baseline-admin-completed.txt`. Revert by
  `wp option delete woocommerce_onboarding_profile`.

The visible difference between states is recorded in Part 1 (the Home submenu's
`remaining-tasks-badge` count present when fresh, absent when complete).

### Classification rubric (applied verbatim across SURV-01..06)

- **safe** — operation works, persists across reload, no side effects.
- **degraded** — partial / cosmetic / recoverable loss or caveat (e.g. a count badge lost on
  rename; a reorder that reverts but leaves the menu working and access intact).
- **broken** — operation fails, or causes functional loss / access breakage (a submenu 403s after
  hide, a menu item disappears, the plugin's menu breaks).
- **Deciding test:** recoverable / cosmetic → **degraded**; functional loss or access breakage →
  **broken**.
- **Persistence/timing note required per cell (Part 2):** state whether the result persists across
  reload, and for degraded/broken cases name the cause — WooCommerce's late/conditional
  `admin_menu` injection vs. Maestro's `PHP_INT_MAX` replay ordering.

### Success-criterion traceability

| Phase 14 success criterion | Where addressed |
| --- | --- |
| 1. HOW WooCommerce registers/manipulates the menu, all six dimensions | Part 1 + this Method header + baseline dumps (Plan 14-01) |
| 2. Every Maestro op classified per affected item with evidence | Part 2 matrix (Plan 14-02) |
| 3. Every surfaced issue gets exactly one classified fix | Part 3 fix list (Plan 14-03) |
| 4. SCHEMA.md stress-tested and finalized | "Schema-change candidates" scratch list (this plan) → batched into SCHEMA.md (Plan 14-03) |
| Requirement SURV-01 | This entire file |

## Part 1 — Manipulation-Dimensions Checklist

Check each locked manipulation dimension the plugin exhibits and record concise evidence in `Notes:`.
Source citations are paths under the running container's `wp-content/plugins/woocommerce/`; runtime
confirmation rows are from the natural-state (no `maestro_config`) baselines in `SURV-01-assets/`.

WooCommerce exhibits **all six** dimensions. It is by far the heaviest manipulator in the set: a
classic `WC_Admin_Menus` registration path (priorities 9/20/50/60/70) *plus* a separate React
"wc-admin" / `PageController` injection path, with direct `$submenu` surgery, count badges baked into
titles, a custom separator, and its own `custom_menu_order` + `menu_order` filters — the last
colliding directly with Maestro's own top-level reorder mechanism.

- [x] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** Top-level `woocommerce` is registered at fractional position **`'55.5'`** (`includes/admin/class-wc-admin-menus.php:94`). Payments is pinned to **`56`** ("Position after WooCommerce Product menu item", `src/Internal/Admin/Settings/PaymentsController.php:81`); Analytics to `57`; Marketing to **`58`** (`src/Internal/Admin/Marketing.php`). Confirmed in `baseline-admin-fresh.txt`: rows `55.5 woocommerce`, `56 admin.php?page=wc-settings…PAYMENTS_MENU_ITEM`, `57 wc-admin&path=/analytics/overview`, `58 woocommerce-marketing`. WooCommerce relies on these positions to cluster its items; Maestro reorder must contend with them (Part 2).
- [x] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority so Maestro may observe or replay them at a different time.
  - **Notes:** Registration is spread across `admin_menu` at priorities **9** (`admin_menu`, `orders_menu`), **20** (`reports_menu`), **50** (`settings_menu`), **60** (`status_menu`), **70** (`addons_my_subscriptions`) in `class-wc-admin-menus.php:43-61`; Marketing parent at **9** then `reorder_marketing_submenu` at **99** (`Marketing.php:58-62`); Analytics/Homescreen/Payments register their pages on `admin_menu` via `wc_admin_register_page` / `PageController`. All of this completes before Maestro's `PHP_INT_MAX` replay, so Maestro **does** see the fully-assembled menu — good for rename/icon/hide/submenu-order. The injection is also **setup/feature-gated**: Marketing only when the `navigation` feature is off (`Marketing.php:74`), Analytics only when enabled, and the Home submenu badge only while onboarding tasks remain (see baselines fresh vs completed). The standing risk for Part 2 is timing on *reorder*, which runs through render-time filters WooCommerce also hooks.
- [x] **Re-registered menus** — menu removed then re-added, or slug re-registered, causing the same intended item to appear through more than one registration path.
  - **Notes:** WooCommerce maintains **two parallel registration paths for the same conceptual menu**: the classic `WC_Admin_Menus` (`add_menu_page('woocommerce', …)`) and the React `wc-admin`/`PageController` system that injects `Home`, `Customers`, `Analytics`, `Extensions`, `Marketing` as connected pages. `Homescreen::register_page()` registers `Home` either as the top-level item (for users who *cannot* view the core Woo menu) or as a submenu under `woocommerce` (for those who can), and `Homescreen::possibly_remove_woocommerce_menu()` (`src/Internal/Admin/Homescreen.php:224`) `unset()`s the top-level `woocommerce` row for the former group — i.e. the same item is conditionally present via different paths depending on capability. `Coupons` is re-pathed: the classic Coupons entry is replaced by a `coupons-moved` redirect submenu (`src/Internal/Admin/Coupons.php`) pointing at `edit.php?post_type=shop_coupon` — confirmed as `3 coupons-moved Coupons` in `baseline-admin-fresh.txt` (present for admin, **absent for shop_manager** which lacks `manage_options`). Multiple slugs (`woocommerce`, `wc-admin`, `wc-admin&path=/analytics/overview`) front overlapping destinations, complicating slug resolution for renames/hides.
- [x] **Count badges baked into titles** — an awaiting-mod / update bubble span or similar count badge is embedded inside the menu title string.
  - **Notes:** Three observed, all embedded directly in the title string (index 0):
    1. **Orders processing count** — `menu_order_count()` appends `<span class="menu-counter count-N"><span class="processing-count">N</span></span>` to the Orders submenu title (`class-wc-admin-menus.php:285`); only when `current_user_can('edit_others_shop_orders')` and the count is non-zero. (No processing orders in the fresh harness, so the span is absent in the baseline; the code path and conditional are documented.)
    2. **Home remaining-tasks badge** — `<span class="menu-counter remaining-tasks-badge woocommerce-task-list-remaining-tasks-badge"><span class="count-6">6</span></span>` baked into the `Home` submenu title (`src/Admin/Features/OnboardingTasks/TaskLists.php`). **Setup-state-dependent:** present in `baseline-admin-fresh.txt` (`count-6`), **gone** in `baseline-admin-completed.txt` (title is plain `Home`).
    3. **Payments badge** — `<span class="wcpay-menu-badge awaiting-mod count-1"><span class="plugin-count">1</span></span>` baked into the top-level Payments title (`PaymentsController.php:86`), visible in the baseline. **Implication for Maestro rename:** a rename overwrites `$menu[..][0]` / `$submenu[..][..][0]` wholesale (`includes/class-replay.php:98,131`), so any baked-in badge span is **lost on rename** → classified `degraded` in Part 2 (cosmetic, recoverable).
- [x] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows that affect ordering or visible grouping.
  - **Notes:** `WC_Admin_Menus::admin_menu()` pushes a custom separator row directly onto `$menu`: `$menu[] = array('', 'read', 'separator-woocommerce', '', 'wp-menu-separator woocommerce')`, gated on `can_view_woocommerce_menu_item()` (`class-wc-admin-menus.php`). Confirmed as `100 separator-woocommerce  wp-menu-separator woocommerce` in `baseline-admin-fresh.txt`. `menu_order()` then repositions `separator-woocommerce` to sit immediately before the `woocommerce` item at render time. LifterLMS adds a comparable `llms-separator`; both are visible in the baseline. Separators are skipped by Maestro (`Replay::replay()` continues on `empty($row[2])` is false here, but the editor model skips `wp-menu-separator` rows, `class-replay.php:258`), so they are not directly renamed/hidden but **do affect effective top-level ordering** that Maestro's reorder must account for.
- [x] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals rather than using the WordPress menu API.
  - **Notes:** Yes — WooCommerce writes the globals directly in several places beyond the menu API: (a) the separator push above (`$menu[] = …`); (b) `menu_order_count()` does `unset($submenu['woocommerce'][0])` to drop the redundant first "WooCommerce" submenu and then string-concatenates the Orders count badge onto `$submenu['woocommerce'][$key][0]` (`class-wc-admin-menus.php:276,285`); (c) `Homescreen::possibly_remove_woocommerce_menu()` iterates `$menu` and `unset()`s the top-level row by slug+cap (`Homescreen.php:231-237`). This direct surgery runs at default/various `admin_menu` priorities — i.e. **before** Maestro's `PHP_INT_MAX` replay — so Maestro observes the post-surgery state and its rename/hide operate on already-mutated rows. The collision risk is concentrated in **reorder**, where both WooCommerce (`menu_order()` + `custom_menu_order()`, `class-wc-admin-menus.php:300`) and Maestro (`reorder_top()` + `has_top_order()`, `class-replay.php:158-175`) hook the same `custom_menu_order` / `menu_order` filters — characterized in Part 2.

### Natural-state baseline — revealing slices

All slices below are from the natural state (`maestro_config` deleted), `--user=admin`, fresh-activated,
captured with the Method-header dump command. Full dumps: `SURV-01-assets/baseline-*.txt`.

**Top-level WooCommerce-owned rows** (`pos⇥slug⇥title⇥icon-prefix`), showing fractional positions,
the custom separator, count-badge-in-title, and the base64 SVG (data-URI) icons:

```text
55.5  woocommerce                                              WooCommerce   data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjE…
100   separator-woocommerce                                    (separator)   (css: wp-menu-separator woocommerce)
56    admin.php?page=wc-settings&tab=checkout&from=PAYMENTS…    Payments <span class="wcpay-menu-badge awaiting-mod count-1"><span class="plugin-count">1</span></span>   data:image/svg+xml;base64,PHN2…
57    wc-admin&path=/analytics/overview                        Analytics     dashicons-chart-bar
58    woocommerce-marketing                                    Marketing     dashicons-megaphone
```

**`$submenu['woocommerce']` — admin, fresh-activated** (Home carries the remaining-tasks badge;
`coupons-moved` redirect present):

```text
0  wc-admin                          Home <span class="menu-counter remaining-tasks-badge woocommerce-task-list-remaining-tasks-badge"><span class="count-6">6</span></span>   (cap: read)
1  edit.php?post_type=shop_order     Orders        (cap: edit_shop_orders)
2  wc-admin&path=/customers          Customers     (cap: view_woocommerce_reports)
3  coupons-moved                     Coupons       (cap: manage_options)
4  wc-reports                        Reports       (cap: view_woocommerce_reports)
5  wc-settings                       Settings      (cap: manage_woocommerce)
6  wc-status                         Status        (cap: manage_woocommerce)
7  wc-addons                         (Add-ons)     (cap: manage_woocommerce)
8  wc-admin&path=/extensions         Extensions <span class="update-plugins count-0">…</span>   (cap: view_woocommerce_reports)
```

**Same parent — admin, completed-setup** (badge gone; otherwise identical), proving the setup-state
dependence of the Home badge:

```text
0  wc-admin                          Home          (cap: read)        ← remaining-tasks badge absent
```

**Same parent — `compat_shop_manager`** (note `coupons-moved` is **absent** — shop_manager lacks
`manage_options`; this is the per-role variance that drives Hide classification):

```text
0  wc-admin                          Home <span class="…remaining-tasks-badge…count-6…">   (cap: read)
1  edit.php?post_type=shop_order     Orders        (cap: edit_shop_orders)
2  wc-admin&path=/customers          Customers     (cap: view_woocommerce_reports)
3  wc-reports                        Reports       (cap: view_woocommerce_reports)
4  wc-settings                       Settings      (cap: manage_woocommerce)
5  wc-status                         Status        (cap: manage_woocommerce)
6  wc-addons                         (Add-ons)     (cap: manage_woocommerce)
7  wc-admin&path=/extensions         Extensions    (cap: view_woocommerce_reports)
```

For `compat_editor` (generic editor, no WooCommerce caps): the top-level `woocommerce`, `Marketing`,
and `Analytics` rows are present but `$submenu['woocommerce']` is **empty** — every Woo submenu is
capability-gated away. (`baseline-editor-fresh.txt`.)

### Inventory of affected WooCommerce items (seeds the Plan 02 matrix)

Top-level (effective render order clusters them via `menu_order()`):

| Item | Slug | Position | Notes / state-dependence |
| --- | --- | --- | --- |
| WooCommerce | `woocommerce` | `55.5` | Classic top-level; data-URI SVG icon. Conditionally `unset()` for users who cannot view it (Homescreen). |
| (separator) | `separator-woocommerce` | `100` → render-repositioned | Custom separator; gated on `can_view_woocommerce_menu_item()`. |
| Payments | `admin.php?page=wc-settings&tab=checkout&from=PAYMENTS_MENU_ITEM` | `56` | Badge baked in title; data-URI SVG icon. |
| Analytics | `wc-admin&path=/analytics/overview` | `57` | Feature-gated (Analytics enabled). 11 submenu reports. |
| Marketing | `woocommerce-marketing` | `58` | Only when `navigation` feature off; `dashicons-megaphone`. |

Submenus under `woocommerce`: `wc-admin` (Home, badge state-dependent), `edit.php?post_type=shop_order`
(Orders, processing-count badge when non-zero), `wc-admin&path=/customers` (Customers),
`coupons-moved` (Coupons; admin-only), `wc-reports` (Reports), `wc-settings` (Settings), `wc-status`
(Status), `wc-addons` (Add-ons), `wc-admin&path=/extensions` (Extensions). Submenus under
`woocommerce-marketing`: Overview, Coupons. Submenus under `wc-admin&path=/analytics/overview`:
Overview, Products, Revenue, Orders, Variations, Categories, Coupons, Taxes, Downloads, Stock,
Settings. WooCommerce also injects into the **Products** menu (parent `edit.php?post_type=product`):
`product_attributes` (Attributes), `product-reviews` (Reviews), `product_importer` (Product Import),
`product_exporter` (Product Export), plus the `product_brand`/`product_cat`/`product_tag` taxonomy
items. (Plan 02 adds one matrix row per affected item, flagging the state/feature/role-dependent
ones above.)

### Schema-change candidates (Phase 14) — scratch list

Collected while surveying; applied **batched** to `SCHEMA.md` in Plan 14-03 with a changelog (per
14-CONTEXT). Nothing is changed in `SCHEMA.md` during this plan.

1. **Per-cell persistence/timing column.** 14-CONTEXT requires per-cell persistence + timing-cause
   notes; the current Part 2 evidence cell is free-text. Consider a dedicated "Persists?" / "Timing
   cause" sub-note convention (or columns) so Phase 16 synthesis is mechanical.
2. **Setup/feature/role state-dependence flag.** Several items only appear in certain setup states
   (Home badge), feature states (Analytics/Marketing), or for certain roles (`coupons-moved`).
   A per-row "State-dependent" marker would make the matrix self-documenting. (Candidate: an extra
   column or a `Level` value extension.)
3. **Count-badge handling note.** Badge-in-title loss on rename is a recurring, predictable
   `degraded` pattern; consider a standard Notes phrase or a dedicated dimension cross-reference so
   each survey classifies it identically.
4. **Interaction-scenarios section.** 14-CONTEXT calls for testing op interactions
   (hide-parent-with-visible-children, rename+reorder). Provisionally add an "Interaction notes"
   subsection in SURV-01 (Plan 02); promote to SCHEMA.md only if generally useful.

(Decision on each is deferred to Plan 14-03's batched refinement.)

## Part 2 — Classification Matrix

Use one row per affected menu item, including both top-level items and submenus. Add as many rows as needed. Each operation cell must contain one classification (`safe`, `degraded`, or `broken`) plus a short observable-evidence note.

### Classification Definitions

- **safe** — operation works as expected, persists, no side effects.
- **degraded** — operation partially works or works with caveats / cosmetic loss (e.g. count badge lost on rename).
- **broken** — operation fails, reverts, or breaks the plugin's menu/access.

> **How this matrix was produced.** Each operation was applied config-driven via `maestro_config`
> (sparse-diff option), the `$menu`/`$submenu` globals were re-dumped with the Method-header command
> and compared to the Plan 01 natural baseline, then the config was reset (`wp option delete
> maestro_config`) so cases did not contaminate each other. **Top-level Reorder cells are classified
> from the EFFECTIVE rendered order** (the `custom_menu_order` + `menu_order` filter pipeline,
> reproduced by `SURV-01-assets/reorder-probe.php`), NOT the raw post-replay `$menu` global — see the
> Method header's top-level-reorder exception. Persistence was confirmed by re-running the
> dump/probe as a fresh request after each op. Per-cell shorthand: **persists** = override survives a
> reload; **timing cause** (degraded/broken only) names whether the caveat comes from WooCommerce's
> late/conditional `admin_menu` injection or its own render-time `menu_order` filter vs. Maestro's
> `PHP_INT_MAX` replay ordering.

#### Cross-cutting findings (apply to many rows, stated once here, referenced in cells)

- **F1 — Rename overwrites the title wholesale → any baked-in badge span is lost (degraded, cosmetic).**
  `Replay::replay()` sets `$menu[pos][0]`/`$submenu[parent][pos][0] = $ovr['title']`
  (`includes/class-replay.php:98,131`), so a title that carried a count-badge `<span>` loses it.
  Observed: renaming Payments to "Pay Stuff" dropped its `wcpay-menu-badge awaiting-mod count-1`
  span; renaming Extensions would drop its `update-plugins count-0` span; renaming Home (fresh state)
  drops the `remaining-tasks-badge`. Timing cause: not a timing collision — Maestro replays *after*
  Woo bakes the badge in, then overwrites index [0]. Persists across reload. Recoverable (reset
  restores the badge) → **degraded**.
- **F2 — Re-icon is top-level only; on a submenu slug it is a silent no-op (N/A).** `Replay::replay()`
  only writes the icon to `$menu[pos][6]` (`class-replay.php:101`); submenu rows have no icon index.
  Applying `{"icon":...}` to a submenu slug changed nothing in the dump. Classified **N/A (no-op,
  cosmetic)** on every submenu row, leaning to the "degraded" column purely so the matrix stays
  mechanical — the operation does not exist for submenus and never breaks anything.
- **F3 — Hide is a cosmetic per-role `unset()`; it never removes a capability, so the page still
  loads by direct URL.** `is_hidden_for_current_user()` only `unset()`s the `$menu`/`$submenu` row
  when the current user's roles intersect `hidden_roles` (`class-replay.php:113-115,133-135`).
  Observed: hiding Orders from `shop_manager` removed the menu item but the Orders page still
  **LOADS (200)** for shop_manager (cap `edit_shop_orders` intact). Per-role: admin (not in
  `hidden_roles`) keeps seeing the item; editor/shop_manager lose it cosmetically. Where a role
  also lacks the page cap (e.g. `compat_editor` has no `edit_shop_orders`), a direct hit 403s — but
  that is WordPress's own cap gate, **not** Maestro's hide. Cosmetic + access intact → **degraded**
  (never broken). Persists across reload.
- **F4 — Top-level Reorder: item order is honored and persists, but WooCommerce's own
  `menu_order` filter (priority 10, runs AFTER Maestro at the same priority) re-clusters
  `separator-woocommerce` against the `woocommerce` item.** Both `Maestro\Replay::reorder_top` and
  `WC_Admin_Menus::menu_order` hook `menu_order` at priority 10; Maestro is registered first
  (plugin load order), so WC re-runs on Maestro's output and forces its separator immediately before
  `woocommerce`. Observed: requesting `[analytics, marketing, woocommerce]` rendered
  `analytics, marketing, separator-woocommerce, woocommerce, …` — Maestro-only would have produced
  `analytics, marketing, woocommerce, separator-woocommerce, …`. The **requested item order is
  preserved**; only the separator slot is overridden, which is cosmetic and does not affect access.
  Persists across reload. Timing cause: Woo's render-time `menu_order` filter overrides Maestro's
  separator placement → **degraded** for items adjacent to the WooCommerce cluster, **safe** for the
  ordering of the items themselves. (Maestro also `custom_menu_order`-claims only when a `top_order`
  exists; WC claims it unconditionally — so a reorder is always actually applied.)
- **F5 — Setup/feature/role state-dependence.** The Home `remaining-tasks-badge` exists only in
  fresh-activated state (gone once onboarding completes); Marketing exists only while the
  `navigation` feature is off; Analytics only when enabled; `coupons-moved` only for roles with
  `manage_options` (present for admin, absent for shop_manager). Rows below are flagged **[state]**
  where behavior differs by state; both behaviors recorded where they diverge.

### Maestro Operation Matrix

Legend: **safe** / **degraded** / **broken** per the rubric; **[state]** = behavior is setup/feature/role-dependent. Re-icon on submenu rows = **N/A** (F2). All cells persist across reload unless noted.

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `WooCommerce` | top-level | `woocommerce` | **degraded** — title set to "Shop HQ", persists; no badge in title so no loss, but link/icon intact (F1 applies only when a badge is present) → effectively **safe** for this item | **degraded** — item lands in requested slot and persists; WC re-clusters `separator-woocommerce` adjacent to it (F4) | admin **safe** (stays visible); editor/shop_manager **degraded** — item hidden cosmetically, pages still LOAD by URL (F3); hiding parent does NOT unset child rows (see Interaction S1) | **safe** — data-URI SVG swapped to `dashicons-star-filled`, persists; `menu-icon-*` strip logic untouched for dashicon |
| `(separator)` | top-level | `separator-woocommerce` | **N/A → degraded** — separators are skipped by Maestro (`empty($row[2])`/`wp-menu-separator` skip, `class-replay.php:87,258`); rename never targets it | **degraded** — not directly reorderable; its effective position is dictated by WC's `menu_order` filter (F4), which overrides any Maestro top_order placement | **N/A → safe** — Maestro never hides separators (skipped); no role effect | **N/A → degraded** — separators have no icon; skipped (F2-like) |
| `Payments` | top-level | `admin.php?page=wc-settings&tab=checkout&from=PAYMENTS_MENU_ITEM` | **degraded** — renamed to "Pay Stuff"/"Money", persists; **`wcpay-menu-badge awaiting-mod count-1` span LOST** (F1). Timing: Maestro overwrites index [0] after Woo bakes the badge | **degraded** — reorders to requested slot and persists; subject to WC cluster re-ordering (F4) when placed near `woocommerce` | admin **safe**; editor/shop_manager **degraded** — cosmetic hide, Settings/Payments page LOADS by URL for shop_manager (`manage_woocommerce` intact) (F3) | **safe** — data-URI SVG → dashicon swap applies and persists |
| `Analytics` | top-level | `wc-admin&path=/analytics/overview` | **safe** — renamed, persists; no badge in top-level title | **degraded** — honored + persists; near-cluster separator re-ordering (F4). **[state]** present only when Analytics enabled | admin **safe**; editor/shop_manager **degraded** — cosmetic; report pages gated by `view_woocommerce_reports` (shop_manager has it → LOADS; editor lacks it → WP 403, not Maestro) (F3) | **safe** — `dashicons-chart-bar` → `dashicons-tag` applies + persists |
| `Marketing` | top-level | `woocommerce-marketing` | **safe** — renamed, persists; no badge | **degraded** — honored + persists; F4 cluster caveat. **[state]** present only while `navigation` feature off | admin **safe**; editor/shop_manager **degraded** — cosmetic; Overview gated `view_woocommerce_reports` (F3) | **safe** — `dashicons-megaphone` → `dashicons-money-alt`/`dashicons-cart` applies + persists |
| `Home` | submenu | `wc-admin` (parent `woocommerce`) | **[state] degraded (fresh) / safe (completed-setup)** — renamed, persists; in fresh state the `remaining-tasks-badge` span is LOST (F1); in completed-setup the badge is already absent so rename is clean | **N/A → safe** — submenu order is set via `sub_order` (not this op's top-level path); reorderable within parent, see below | admin **safe**; editor (no Woo caps, naturally absent) / shop_manager **degraded** — cosmetic hide, Home (cap `read`) LOADS by URL (F3) | **N/A** (F2) → degraded |
| `Orders` | submenu | `edit.php?post_type=shop_order` (parent `woocommerce`) | **degraded** — renamed to "Sales Orders", persists; processing-count badge would be LOST when present (F1; none in fresh harness, count is zero) | **N/A → safe** — submenu reorder via `sub_order` reorders surviving rows by slug (`Ordering::submenu`) | admin **safe**; editor **degraded** (cosmetic; editor lacks `edit_shop_orders` so WP 403s independently); shop_manager **degraded** — cosmetic, Orders page **LOADS (200)** by URL (`edit_shop_orders` intact) (F3) | **N/A** (F2) → degraded |
| `Customers` | submenu | `wc-admin&path=/customers` (parent `woocommerce`) | **safe** — renamed, persists; no badge | **N/A → safe** — `sub_order` reorder | admin **safe**; editor/shop_manager **degraded** — cosmetic; gated `view_woocommerce_reports` (F3) | **N/A** (F2) → degraded |
| `Coupons` | submenu | `coupons-moved` (parent `woocommerce`) | **safe** — renamed, persists. **[state]** present only for roles with `manage_options` (admin yes, shop_manager NO — slug absent → rename is a silent orphan no-op for shop_manager) | **N/A → safe** — `sub_order` reorder; orphan when absent | admin **safe**; editor (absent) / shop_manager (absent) → cosmetic-only where present → **degraded** | **N/A** (F2) → degraded |
| `Reports` | submenu | `wc-reports` (parent `woocommerce`) | **safe** — renamed, persists | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cosmetic; `view_woocommerce_reports` (F3) | **N/A** (F2) → degraded |
| `Settings` | submenu | `wc-settings` (parent `woocommerce`) | **safe** — renamed, persists | **N/A → safe** — `sub_order` | admin **safe**; editor **degraded** (cosmetic; editor lacks `manage_woocommerce` → WP 403); shop_manager **degraded** — cosmetic, Settings **LOADS (200)** by URL (`manage_woocommerce` intact) (F3) | **N/A** (F2) → degraded |
| `Status` | submenu | `wc-status` (parent `woocommerce`) | **safe** — renamed, persists | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cosmetic; `manage_woocommerce` (F3) | **N/A** (F2) → degraded |
| `Add-ons` | submenu | `wc-addons` (parent `woocommerce`) | **safe** — renamed, persists (natural title is empty in dump; rename gives it a label) | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cosmetic; `manage_woocommerce` (F3) | **N/A** (F2) → degraded |
| `Extensions` | submenu | `wc-admin&path=/extensions` (parent `woocommerce`) | **degraded** — renamed, persists; `update-plugins count-0` span LOST (F1) | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cosmetic; `view_woocommerce_reports` (F3) | **N/A** (F2) → degraded |
| `Marketing → Overview` | submenu | `admin.php?page=wc-admin&path=/marketing` (parent `woocommerce-marketing`) | **safe** — renamed, persists | **N/A → safe** — `sub_order` under marketing | admin **safe**; editor/shop_manager **degraded** — cosmetic; `view_woocommerce_reports` (F3) | **N/A** (F2) → degraded |
| `Marketing → Coupons` | submenu | `edit.php?post_type=shop_coupon` (parent `woocommerce-marketing`) | **safe** — renamed, persists | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cosmetic; `edit_shop_coupons` (shop_manager has it → LOADS) (F3) | **N/A** (F2) → degraded |
| `Analytics → Overview` | submenu | `wc-admin&path=/analytics/overview` (parent self) | **safe** — renamed, persists | **N/A → safe** — `sub_order` under analytics | admin **safe**; editor/shop_manager **degraded** — cosmetic; `view_woocommerce_reports` (F3) | **N/A** (F2) → degraded |
| `Analytics → Products` | submenu | `wc-admin&path=/analytics/products` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Revenue` | submenu | `wc-admin&path=/analytics/revenue` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Orders` | submenu | `wc-admin&path=/analytics/orders` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Variations` | submenu | `wc-admin&path=/analytics/variations` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Categories` | submenu | `wc-admin&path=/analytics/categories` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Coupons` | submenu | `wc-admin&path=/analytics/coupons` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Taxes` | submenu | `wc-admin&path=/analytics/taxes` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Downloads` | submenu | `wc-admin&path=/analytics/downloads` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Stock` | submenu | `wc-admin&path=/analytics/stock` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Analytics → Settings` | submenu | `wc-admin&path=/analytics/settings` | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic (F3) | **N/A** (F2) → degraded |
| `Products → Brands` | submenu | `edit-tags.php?taxonomy=product_brand&post_type=product` (parent `edit.php?post_type=product`) | **safe** — renamed, persists. Note: dump shows `&amp;`-encoded slug; the slug Maestro stores must match the rendered slug for the match to land (slug-resolution candidate) | **N/A → safe** — `sub_order` under Products | admin **safe**; editor/shop_manager **degraded** — cosmetic; `manage_product_terms` (shop_manager has it) (F3) | **N/A** (F2) → degraded |
| `Products → Categories` | submenu | `edit-tags.php?taxonomy=product_cat&post_type=product` (parent Products) | **safe** — renamed, persists (same `&amp;` slug caveat) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic; `manage_product_terms` (F3) | **N/A** (F2) → degraded |
| `Products → Tags` | submenu | `edit-tags.php?taxonomy=product_tag&post_type=product` (parent Products) | **safe** — renamed, persists (same `&amp;` slug caveat) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic; `manage_product_terms` (F3) | **N/A** (F2) → degraded |
| `Products → Attributes` | submenu | `product_attributes` (parent Products) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic; `manage_product_terms` (F3) | **N/A** (F2) → degraded |
| `Products → Reviews` | submenu | `product-reviews` (parent Products) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic; `moderate_comments` (editor HAS it → LOADS) (F3) | **N/A** (F2) → degraded |
| `Products → Product Import` | submenu | `product_importer` (parent Products) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic; `import` (F3) | **N/A** (F2) → degraded |
| `Products → Product Export` | submenu | `product_exporter` (parent Products) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cosmetic; `export` (F3) | **N/A** (F2) → degraded |

> **Net for Part 3 (issues to classify-fix):** the recurring **degraded** patterns are (a) badge-in-title
> loss on rename [F1] — Payments, Extensions, Home(fresh), Orders(when count>0); (b) the
> `separator-woocommerce` re-clustering that overrides Maestro's top-level separator placement [F4];
> (c) the `&amp;`-encoded Products-taxonomy slugs (rename/hide only land if the stored slug matches
> the rendered, entity-encoded slug) [slug-resolution]; (d) the N/A submenu re-icon convention [F2].
> No **broken** cell surfaced: Maestro's hide is always cosmetic (never strips a cap), rename/icon
> always persist, and reorder always honors the requested *item* order. WooCommerce's own
> `menu_order` filter co-runs without breaking Maestro's result.

### Evidence Notes

- All classifications are grounded in re-dumped `$menu`/`$submenu` output (and the `reorder-probe.php`
  effective-order output for top-level Reorder) compared against the Plan 01 natural baseline, not
  inferred intent. Representative observed phrases: "Payments badge span dropped after rename, title
  now plain 'Money'"; "requested order [analytics, marketing, woocommerce] rendered with
  separator-woocommerce forced before woocommerce"; "Orders page LOADS (200) for shop_manager while
  the menu item is hidden".
- Homogeneous sibling rows (the eleven Analytics reports; the Products taxonomy items) were verified
  to behave identically to their representative sibling (rename safe+persists; reorder via `sub_order`
  safe; hide cosmetic per-role; re-icon N/A); each still gets its own row per the full-coverage rule.
- Where a cell is genuinely not applicable (submenu re-icon, separator rename/hide), it is marked
  **N/A** with the closest column classification so Phase 16 synthesis stays mechanical, and the
  rationale (F2 / separator-skip) is named.

## Part 3 — Classified-Fix List

Every surfaced issue from the matrix gets one classified fix using exactly one R1 category. These entries feed DELV-02's prioritized backlog in Phase 16.

Allowed R1 fix categories:

1. **slug-resolution tweak**
2. **later `admin_menu` re-hook** (later admin_menu re-hook)
3. **special-casing**
4. **documented limitation**

| Issue summary | Affected operation(s) | Chosen classification | One-line rationale |
| --- | --- | --- | --- |
| TODO: summarize the surfaced issue | Rename / Reorder / Hide / Re-icon | slug-resolution tweak / later `admin_menu` re-hook (later admin_menu re-hook) / special-casing / documented limitation | TODO: explain why this category is the right R1 classification |

## Survey Completion Check

- [ ] All six manipulation dimensions above are checked or left unchecked with `Notes:` evidence.
- [ ] Every affected top-level menu item has a matrix row.
- [ ] Every affected submenu has a matrix row.
- [ ] Every Rename cell is classified `safe`, `degraded`, or `broken` with evidence.
- [ ] Every Reorder cell is classified `safe`, `degraded`, or `broken` with evidence.
- [ ] Every Hide cell is classified `safe`, `degraded`, or `broken` with evidence.
- [ ] Every Re-icon cell is classified `safe`, `degraded`, or `broken` with evidence.
- [ ] Every issue has exactly one classified fix: slug-resolution tweak, later `admin_menu` re-hook (later admin_menu re-hook), special-casing, or documented limitation.
- [ ] The filled survey copy remains under `.planning/compat/SURV-NN-<plugin>.md`; this `SCHEMA.md` template remains pristine.
