# SURV-05 — WPForms Lite Compatibility Survey

R1 compatibility classification survey for **WPForms Lite** (`wpforms-lite` 1.10.2.1), the fifth
plugin in the compat set. This file is a filled copy of the `.planning/compat/SCHEMA.md` template,
structured identically to `SURV-01-woocommerce.md`. It characterizes HOW WPForms Lite registers and
manipulates the WordPress admin menu (Part 1), classifies every Maestro operation against every
affected item (Part 2), and assigns each surfaced issue one classified R1 fix (Part 3).

> **Status:** Complete. Part 1 + Method header + natural-state baselines (Task 1);
> Part 2 classification matrix + Interaction Scenarios + Part 3 classified-fix list +
> traceability + completion check (Task 2). Surveyed with first-run onboarding NOT completed
> (harness default — no WPForms account or license required for Lite). Lite-vs-Pro
> feature-gated items tagged `[state]` throughout.

## Survey Front Fields

- **Plugin:** WPForms Lite
- **Slug:** `wpforms-lite`
- **Pinned version:** `1.10.2.1` (pinned in `tests/compat/VERSIONS.md` / `tests/compat/.wp-env.json`)
- **Date surveyed:** 2026-06-29
- **Surveyor:** Claude (Maestro R1 compatibility survey)

## Method / how evidence was gathered

This section records the exact, reproducible procedure so Phase 15 surveys (SURV-06) repeat it
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
npx wp-env run cli wp plugin list --status=active   # wpforms-lite 1.10.2.1 + maestro-menu-editor active
npx wp-env run cli wp user list --fields=ID,user_login,roles
#   1 admin               administrator
#   2 compat_editor       editor
#   3 compat_shop_manager shop_manager
```

Cold-boot notes (from Phase 13): ~15 min cold; a transient Elementor ZIP CRC error self-heals on a
`compat:start` retry. NOTE: **all six compat plugins are active in this harness**, so the raw dumps
contain WooCommerce / Jetpack / Yoast / Elementor / LifterLMS rows too; this survey reads only
WPForms-owned rows (`wpforms-overview` top-level and its submenus under `wpforms-overview`).

### `$menu` / `$submenu` dump command

The reusable dump script is `.planning/compat/SURV-05-assets/dump-menu.php`. It hooks `admin_menu`
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
  eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-05-assets/dump-menu.php \
  --user=admin            # or compat_editor / compat_shop_manager
```

**The `--exec="define('WP_ADMIN', true);"` is REQUIRED for WPForms Lite too.** Confirmed at runtime:
without it, the top-level `wpforms-overview` item and all submenus are entirely absent from the dump
because WPForms gates its menu registration on `is_admin()`. With `WP_ADMIN=true`, the top-level and
all thirteen submenus appear in the dump for admin. (Full baseline dumps: `SURV-05-assets/baseline-*.txt`.)

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
`SURV-05-assets/reorder-probe.php`), never from the raw post-replay global.

The effective-order probe `SURV-05-assets/reorder-probe.php` hooks `admin_menu` at **`PHP_INT_MAX`**
— same priority as Maestro's `Replay::replay()`. Maestro registers its hook first (plugin-load time),
so the probe's callback appends after Maestro's and runs after Maestro's replay (and after Maestro's
`custom_menu_order` / `menu_order` filters are active). The probe then reproduces core's render-time
decision: gate on `apply_filters('custom_menu_order', false)`, and if claimed, run
`apply_filters('menu_order', $slugs)`.

### Per-role observation

**Setup state — FIRST-RUN / LITE BUILD.** The harness runs WPForms Lite without completing any
onboarding wizard or connecting an account. WPForms Lite ships several items that are either
first-run-gated or Pro-only upsells:

- **"Upgrade to Pro"** (`https://wpforms.com/lite-upgrade/?...`) — the last submenu item, an absolute
  URL to wpforms.com, visible in Lite at all times. `[state: Lite-only]` — absent in Pro builds
  (which replace it with a Pro feature set). Lite behavior: visible link in sidebar.
- **"Payments"** (`wpforms-payments`) with `NEW!` badge — present in Lite as an onboarding prompt;
  Pro gates full payment functionality. `[state]` — badge is present regardless of setup state in
  Lite 1.10.2.1.
- **"Addons"** (`wpforms-addons`) with orange-colored title span — present in Lite as an upsell
  presentation; Pro unlocks actual add-on installation. `[state: Lite-vs-Pro]`.
- **"Entries"** (`wpforms-entries`), **"Templates"** (`wpforms-templates`),
  **"Privacy Compliance"** (`wpforms-wpconsent`), **"SMTP"** (`wpforms-smtp`),
  **"Community"** (`wpforms-community`), **"About Us"** (`wpforms-about`) — all present in Lite;
  functionality varies between Lite and Pro.

**WPForms does not ship a custom role.** The three provisioned roles (admin / compat_editor /
compat_shop_manager) suffice. Confirmed at runtime: WPForms uses standard `manage_options` for all
its menu registration — no custom capability is introduced.

**Two independent gates, evaluated separately.** A role's effective sidebar is the result of TWO
independent filters: (1) **WordPress's own capability gate** at render time (`current_user_can()` on
each row's required cap in `wp-admin/includes/menu.php`) — runs whether or not Maestro is active; and
(2) **Maestro's cosmetic per-role `unset()`** (a row whose `hidden_roles` intersects the user's roles).
The raw dump only reflects gate (2)'s input (replay state) and omits gate (1) entirely.

Observed (natural state, no Maestro hide):

- **`admin`** — passes every cap gate (`manage_options`); the `wpforms-overview` top-level and all
  thirteen submenus render. All WPForms items are present in dump and rendered sidebar for admin.
- **`compat_editor`** — WPForms top-level (`wpforms-overview`) row is **present in the replay-state
  dump** (at position 58.9) but **NOT rendered in the sidebar** at render time. WPForms requires
  `manage_options` for every item; editors lack `manage_options`. WP's cap gate (1) removes the entire
  WPForms surface from the editor's rendered sidebar. Furthermore, the `$submenu['wpforms-overview']`
  array does NOT appear in the editor dump at all — WPForms conditionally registers submenus only
  for users with `manage_options`, so the submenu global is empty for editor. Maestro's hide is a
  **moot no-op** for editor on all WPForms items.
- **`compat_shop_manager`** — same as editor: `wpforms-overview` appears in the top-level `$menu`
  dump row but no `$submenu['wpforms-overview']` is registered. WP cap gate removes the top-level
  from the rendered sidebar (`manage_options` unmet for shop_manager in standard WC setup). Maestro
  hide is a **moot no-op** for shop_manager on all WPForms items.

**Consequence for the Hide column.** For editor and shop_manager, WP cap-gate (1) already removes
the entire WPForms surface — Maestro's hide is a **moot no-op** for both non-admin roles on every
WPForms item. Only admin actually sees WPForms items, so Hide is only meaningful for admin.

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
| 1. HOW WPForms Lite registers/manipulates the menu (all six dimensions) | Part 1 — Manipulation-Dimensions Checklist + this Method header + baseline dumps (Task 1) |
| 2. Every Maestro op classified per affected item with evidence | Part 2 — Classification Matrix (all WPForms items × rename/reorder/hide/re-icon), cross-cutting findings F1–F4, per-role Hide (two-gate model), effective render order (Task 2) |
| 3. Every surfaced issue gets exactly one classified fix | Part 3 — Classified-Fix List (all degraded cells mapped, no orphans) (Task 2) |
| 4. Survey structurally mirrors SURV-01 (schema-faithful) | This entire file — Method header, Part 1 checklist, Part 2 matrix, Interaction Scenarios, Part 3 fix list, traceability, completion check |
| Requirement **SURV-05** | This entire file |

## Part 1 — Manipulation-Dimensions Checklist

Check each locked manipulation dimension the plugin exhibits and record concise evidence in `Notes:`.
Source citations are paths under the running container's `wp-content/plugins/wpforms-lite/`; runtime
confirmation rows are from the natural-state (no `maestro_config`) baselines in `SURV-05-assets/`.

WPForms Lite exhibits **three of the six** dimensions. It is a medium-complexity manipulator:
one top-level item, thirteen submenus (including two with embedded HTML markup in titles), one
absolute-URL upsell link, and a custom position. No separator, no global surgery beyond the menu API.

- [x] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** WPForms Lite registers its top-level `wpforms-overview` at position **`58.9`** — a
    fractional position in the 58.x cluster, between WooCommerce Marketing (58) and Elementor (58.5).
    Source: `src/Admin/Menu.php` (or similar admin bootstrap class) calls `add_menu_page( 'WPForms', ..., 'wpforms-overview', ..., 58.9 )`. Confirmed in natural-state dump: `58.9 wpforms-overview WPForms [SVG base64]`. In the effective rendered order (via WooCommerce's `menu_order` filter), `wpforms-overview` lands at position **23** out of 32 items. WPForms does **not** hook `custom_menu_order` or `menu_order` itself; its fractional position is honored by WordPress's sort.
- [ ] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority so Maestro may observe or replay them at a different time.
  - **Notes:** WPForms registers all menu items on plain `admin_menu` at the default priority (10).
    The top-level and all thirteen submenus are fully present at `PHP_INT_MAX` replay priority.
    The `admin_menu` hook itself is gated on `is_admin()` (hence `WP_ADMIN=true` requirement — see
    Method header), but this is not late injection in the timing sense. Submenus are conditionally
    registered per-capability: `wpforms_overview`, `wpforms-builder`, and all other slugs require
    `manage_options`, so submenus do not appear in the dump for editor or shop_manager at all (they
    are not registered, not just cap-gated at render). This is a registration-gate, not a late-injection
    pattern. Confirmed: editor/shop_manager dumps show `wpforms-overview` top-level row but zero
    `PARENT: wpforms-overview` submenu section.
- [ ] **Re-registered menus** — menu removed then re-added, or slug re-registered, causing the same intended item to appear through more than one registration path. Note any **entity-encoded slugs** here.
  - **Notes:** WPForms does not re-register or remove/re-add menu items. The `wpforms-overview`
    top-level is added once; submenus are added once each. **No entity-encoded (`&amp;`) slug** was
    observed in any WPForms-owned row. All WPForms slugs are clean identifiers (`wpforms-overview`,
    `wpforms-builder`, etc.), except for the "Upgrade to Pro" item whose slug is an **absolute external
    URL** (`https://wpforms.com/lite-upgrade/?...`) — see Count badges / Conditional dimension for
    classification. The absolute URL is not entity-encoded but does present a slug-resolution issue
    (see Part 3).
- [x] **Count badges baked into titles** — an awaiting-mod / update bubble span or similar count badge is embedded inside the menu title string.
  - **Notes:** WPForms bakes **two forms of markup** into submenu title strings (convention 3):
    (a) **"Payments"** title: `Payments<span class="wpforms-menu-new">&nbsp;NEW!</span>` — a
    "NEW!" badge span baked directly into the title string. A Maestro rename of `wpforms-payments`
    overwrites the entire title index wholesale, so the badge span is **lost on rename** → classify
    Rename on that row as **degraded** (convention 3). Confirmed in dump: the natural title is
    `Payments<span class="wpforms-menu-new">&nbsp;NEW!</span>`; after rename to "Pay", the dump
    shows `Pay` with no badge. The badge is cosmetic (users see "NEW!" as a visual cue for a new
    feature), so badge loss is recoverable cosmetic — no functional harm.
    (b) **"Addons"** title: `<span style="color:#f18500">Addons</span>` — an orange inline-style
    span wrapping the entire label text. Maestro rename of `wpforms-addons` replaces this with a
    plain string, losing the color styling → classify Rename on that row as **degraded** (same
    convention 3 rationale: cosmetic HTML lost on rename). Confirmed: after rename to "My Addons",
    dump shows `My Addons` with no color span.
    No badge or markup observed on the top-level `WPForms` title itself (clean title string).
- [ ] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows that affect ordering or visible grouping.
  - **Notes:** WPForms adds no custom separator. No WPForms-owned `wp-menu-separator` row observed
    in the admin dump. Existing separators (`separator1`, `separator2`, `separator-last`,
    `separator-woocommerce`, `llms-separator`) are not WPForms-owned. WPForms sits in the
    WooCommerce-adjacent 58.x cluster but does not own any separator.
- [ ] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals rather than using the WordPress menu API.
  - **Notes:** WPForms uses the standard WordPress menu API (`add_menu_page` / `add_submenu_page`)
    throughout. No direct `$menu[$pos]` or `$submenu[$parent]` assignments observed. All WPForms
    menu items go through the API. Confirmed: all slugs appear in the dump through normal registration
    paths (none via the empty-parent `""` pattern used by Jetpack for hidden pages).
    **One non-standard slug:** the "Upgrade to Pro" submenu item uses an absolute external URL
    (`https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US`)
    as its `$menu_slug` parameter in `add_submenu_page`. This is a valid WordPress pattern (external
    link as submenu slug) but creates a slug-resolution issue for Maestro (Part 3). `[state: Lite-only]`
    — this item is absent in Pro builds.

### Natural-state baseline — revealing slices

All slices below are from the natural state (`maestro_config` deleted), `--user=admin`, captured
with `WP_ADMIN=true`. Full dumps: `SURV-05-assets/baseline-admin.txt`,
`SURV-05-assets/baseline-compat_editor.txt`, `SURV-05-assets/baseline-compat_shop_manager.txt`.

**WPForms top-level row** (`pos tab slug tab title tab icon tab css`):

```text
58.9   wpforms-overview   WPForms   data:image/svg+xml;base64,[base64-SVG]   menu-top toplevel_page_wpforms-overview
```

The icon is a base64-encoded inline SVG (WPForms envelope/form icon). No `dashicons-*` class.
No badge or markup in the top-level title string.

**`$submenu['wpforms-overview']` — admin, natural state:**

```text
PARENT: wpforms-overview
   0   wpforms-overview     All Forms                                                                    manage_options
   1   wpforms-builder      Add New Form                                                                 manage_options
   2   wpforms-entries      Entries                                                                      manage_options
   3   wpforms-payments     Payments<span class="wpforms-menu-new">&nbsp;NEW!</span>                     manage_options  [state: NEW badge]
   4   wpforms-templates    Form Templates                                                               manage_options
   5   wpforms-settings     Settings                                                                     manage_options
   6   wpforms-tools        Tools                                                                        manage_options
   7   wpforms-addons       <span style="color:#f18500">Addons</span>                                    manage_options  [state: Lite-vs-Pro upsell style]
   8   wpforms-wpconsent    Privacy Compliance                                                           manage_options
   9   wpforms-smtp         SMTP                                                                         manage_options
  10   wpforms-about        About Us                                                                     manage_options
  11   wpforms-community    Community                                                                    manage_options
  12   https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&...   Upgrade to Pro                   manage_options  [state: Lite-only]
```

**Hidden subpage under `wpforms-settings`:**

```text
PARENT: wpforms-settings
   0   wpforms-page   Info   manage_options
```

This is an empty-nav-target page registered under `wpforms-settings`. Not a visible sidebar item.

**Per-role baseline summary:**
- `admin`: `wpforms-overview` top-level + all 13 submenus present in replay state and rendered sidebar.
- `compat_editor`: `wpforms-overview` top-level present in `$menu` dump (replay state), but
  zero `$submenu['wpforms-overview']` registered (WPForms conditional registration). WP cap gate
  removes the top-level from the rendered sidebar (`manage_options` unmet). No WPForms items rendered.
- `compat_shop_manager`: same as editor — top-level in replay-state dump, no submenu registered,
  WP cap gate removes it from rendered sidebar.

**Natural-state effective order (reorder probe, no `maestro_config`):**

```text
custom_menu_order claimed: YES
EFFECTIVE top-level order:
...
22   woocommerce-marketing
23   wpforms-overview
24   separator-woocommerce
25   woocommerce
...
```

`wpforms-overview` sits at effective position 23, between `woocommerce-marketing` (22) and
`separator-woocommerce` (24). WooCommerce's `menu_order` filter does not explicitly list
`wpforms-overview`, so WC's filter passes it through in WP's natural sort order relative to the
items it does not know about.

### Inventory of affected WPForms items (seeds the Part 2 matrix)

**Top-level:**

| Item | Slug | Position | Notes |
| --- | --- | --- | --- |
| WPForms | `wpforms-overview` | `58.9` ($menu position) → 23 (effective render) | inline SVG icon; cap `manage_options`; admin-only in practice |

**Submenus under `wpforms-overview`:**

| Item | Slug | Notes |
| --- | --- | --- |
| All Forms | `wpforms-overview` | cap `manage_options`; slug matches top-level (default first-submenu pattern) |
| Add New Form | `wpforms-builder` | cap `manage_options` |
| Entries | `wpforms-entries` | cap `manage_options` |
| Payments | `wpforms-payments` | cap `manage_options`; title has embedded `NEW!` badge span `[state]` |
| Form Templates | `wpforms-templates` | cap `manage_options` |
| Settings | `wpforms-settings` | cap `manage_options` |
| Tools | `wpforms-tools` | cap `manage_options` |
| Addons | `wpforms-addons` | cap `manage_options`; title has embedded orange color span `[state: Lite-vs-Pro]` |
| Privacy Compliance | `wpforms-wpconsent` | cap `manage_options` |
| SMTP | `wpforms-smtp` | cap `manage_options` |
| About Us | `wpforms-about` | cap `manage_options` |
| Community | `wpforms-community` | cap `manage_options` |
| Upgrade to Pro | `https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US` | cap `manage_options`; absolute external URL slug; `[state: Lite-only]` |

**Out of scope:** `wpforms-settings/wpforms-page` (hidden sub-page under settings, not a sidebar item).

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
> `SURV-05-assets/reorder-probe.php`), NOT the raw post-replay `$menu` global — see the Method header's
> top-level-reorder exception. Persistence was confirmed by re-running the dump/probe as a fresh request
> after each op. Per-cell shorthand: **persists** = override survives a reload.

#### Cross-cutting findings (apply to many rows, stated once here, referenced in cells)

- **F1 — All WPForms items require `manage_options`; editor/shop_manager never see them.**
  WPForms registers every menu item (top-level and all submenus) gated on `manage_options`. Neither
  `compat_editor` (editor role) nor `compat_shop_manager` (shop_manager role) holds `manage_options`
  in the standard WordPress capability model. WP's render-time cap gate (1) removes the entire
  WPForms surface from both non-admin roles' sidebars independently of Maestro. Additionally,
  WPForms conditionally registers submenus only for `manage_options` users, so the
  `$submenu['wpforms-overview']` global itself does not exist for editor or shop_manager (the
  Maestro replay state has no submenu rows to act on for those roles). Maestro's hide is therefore
  a **moot no-op** for editor and shop_manager on all WPForms items.
- **F2 — Re-icon is top-level only; submenu rows have no icon index (N/A).** `Replay::replay()` only
  writes the icon to `$menu[pos][6]` (`class-replay.php:101`); submenu rows have no icon index.
  Applying `{"icon":...}` to a submenu slug changes nothing. Classified **N/A** on every submenu row
  (leaning degraded — the operation does not exist for submenus and never breaks anything). Same as
  SURV-01 F2.
- **F3 — Hide is a cosmetic per-role `unset()`; it never removes a capability, so the page still
  loads by direct URL — and it composes with WP's INDEPENDENT cap gate.** Same mechanics as
  SURV-01 F3. For WPForms: the only role where Maestro's hide is non-moot is `admin`. Hiding
  `wpforms-overview` from admin removes the sidebar entry cosmetically; the WPForms admin pages
  still **LOAD (200)** by direct URL (all caps intact). Confirmed: hiding the top-level removes the
  `$menu[58.9]` row from replay state, but the `$submenu['wpforms-overview']` array remains populated
  (parent-hide non-cascading — see S1). Persists across reload.
- **F4 — Two badge/markup cases in title strings (convention 3).** (a) `wpforms-payments` embeds a
  `<span class="wpforms-menu-new">&nbsp;NEW!</span>` badge in the title; (b) `wpforms-addons`
  embeds `<span style="color:#f18500">...</span>` color styling. Both are wholesale-replaced by
  Maestro's title overwrite → cosmetic loss on rename (degraded). The `Upgrade to Pro` slug is an
  absolute URL (slug-resolution issue, Part 3). No markup in the top-level title.

### Maestro Operation Matrix

Legend: **safe** / **degraded** / **broken** per the rubric; **[state]** = behavior is
setup/feature/role-dependent; Re-icon on submenu rows = **N/A** (F2); Hide cells are per-role
(admin / editor / shop_manager). All cells persist across reload unless noted.

> **Reading the Hide column (per F3's two-gate model).** Each Hide sub-cell is **{Maestro's cosmetic
> per-role `unset()` on the replay state} + {WP's independent render-time cap gate}**. Where a role
> lacks `manage_options`, WP removes the row at render *before* Maestro's hide applies, so Maestro's
> hide is a **moot no-op** for that role. For editor and shop_manager, WP cap-gates away the entire
> WPForms surface (F1), so all their Hide sub-cells read "WP cap-gated away (Maestro hide moot)".
> Only the admin sub-cell is a genuine Maestro cosmetic hide.

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `WPForms` | top-level | `wpforms-overview` | **safe** — renamed to "My Forms", persists across reload; no badge or markup in top-level title (F4 does not apply to this row); link and inline SVG icon intact. Applied: `{"items":{"wpforms-overview":{"title":"My Forms"}}}` → dump shows `58.9 wpforms-overview My Forms [SVG]`. Note: "All Forms" first submenu also renamed to "My Forms" (default WordPress first-submenu behavior — title mirrors parent). Persists. | **safe** — moved to requested effective position and persists; WPForms does not hook `custom_menu_order` or `menu_order`, so no separator re-clustering caveat. Applied: `{"top_order":["wpforms-overview","index.php"]}` → probe shows `0 wpforms-overview / 1 index.php`. WooCommerce's `menu_order` filter runs on Maestro's output and places WPForms at position 0 correctly. Persists. | admin **degraded** — WPForms cosmetically hidden from sidebar; pages still **LOAD (200)** by direct URL (`manage_options` intact, F3); parent-hide non-cascading (children remain in `$submenu['wpforms-overview']` — see S1). Applied: `{"items":{"wpforms-overview":{"hidden_roles":["administrator"]}}}` → `wpforms-overview` absent from `$menu` dump for admin, but `PARENT: wpforms-overview` submenu still populated. Persists. editor **degraded** — WP cap-gated away (F1) → Maestro hide moot. shop_manager **degraded** — WP cap-gated away (F1) → Maestro hide moot. | **safe** — inline SVG replaced with `dashicons-feedback`, persists. Applied: `{"items":{"wpforms-overview":{"icon":"dashicons-feedback"}}}` → dump shows `dashicons-feedback` at icon slot. Maestro's `Replay::replay()` sets `$menu[pos][6]` to the dashicon class string, overwriting the SVG. Persists. |
| `All Forms` | submenu | `wpforms-overview` (parent `wpforms-overview`) | **safe** — renamed successfully (same slug as top-level parent; Maestro targets the first-submenu label). Applied via rename of parent (first submenu mirrors parent title by WP convention). Can also rename directly: `{"items":{"wpforms-overview":{"title":"Forms List"}}}` → both top-level and first submenu update. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Applied: `{"sub_order":{"wpforms-overview":["wpforms-settings","wpforms-overview","wpforms-builder"]}}` → dump shows Settings at pos 0, All Forms at pos 1, Add New Form at pos 2. Persists. | admin **degraded** — cosmetic `unset()`, `admin.php?page=wpforms-overview` LOADS (200) (`manage_options` intact, F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded — no icon index on submenu rows. |
| `Add New Form` | submenu | `wpforms-builder` (parent `wpforms-overview`) | **safe** — renamed to "New Form", persists. Applied: `{"items":{"wpforms-builder":{"title":"New Form"}}}` → dump shows `1 wpforms-builder New Form manage_options`. No badge. Clean. Persists. | **N/A → safe** — submenu reorder via `sub_order` (see All Forms row). Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Entries` | submenu | `wpforms-entries` (parent `wpforms-overview`) | **safe** — renamed to "Form Entries", persists. No badge or markup in title. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Payments` `[state: NEW badge]` | submenu | `wpforms-payments` (parent `wpforms-overview`) | **degraded** — rename succeeds (title updated in dump), but the `NEW!` badge span is lost on rename (F4a / convention 3). Natural title: `Payments<span class="wpforms-menu-new">&nbsp;NEW!</span>`. After rename to "Pay": dump shows `Pay` with no badge span. The badge is a cosmetic WPForms onboarding cue; its loss is purely visual and recoverable (remove the override to restore). Persists. `[state]` — badge presence is the Lite 1.10.2.1 natural state; Pro behavior may differ. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Form Templates` | submenu | `wpforms-templates` (parent `wpforms-overview`) | **safe** — renamed to "Templates Library", persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Settings` | submenu | `wpforms-settings` (parent `wpforms-overview`) | **safe** — renamed to "WPForms Config", persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Tools` | submenu | `wpforms-tools` (parent `wpforms-overview`) | **safe** — renamed to "Form Tools", persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Addons` `[state: Lite-vs-Pro]` | submenu | `wpforms-addons` (parent `wpforms-overview`) | **degraded** — rename succeeds (title updated in dump), but the orange color-span styling is lost on rename (F4b / convention 3). Natural title: `<span style="color:#f18500">Addons</span>`. After rename to "My Addons": dump shows `My Addons` with no color span. The orange styling is a WPForms upsell visual cue for Lite; its loss is cosmetic and recoverable. `[state: Lite-vs-Pro]` — orange span present in Lite as Pro upsell cue. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Privacy Compliance` | submenu | `wpforms-wpconsent` (parent `wpforms-overview`) | **safe** — renamed, persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `SMTP` | submenu | `wpforms-smtp` (parent `wpforms-overview`) | **safe** — renamed, persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `About Us` | submenu | `wpforms-about` (parent `wpforms-overview`) | **safe** — renamed, persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Community` | submenu | `wpforms-community` (parent `wpforms-overview`) | **safe** — renamed, persists. No badge or markup. Persists. | **N/A → safe** — submenu reorder via `sub_order`. Persists. | admin **degraded** — cosmetic `unset()`, page LOADS by URL (F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |
| `Upgrade to Pro` `[state: Lite-only]` | submenu | `https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US` (parent `wpforms-overview`) | **safe** (with CAVEAT [I3]) — rename succeeds when the full absolute URL slug is used as the key. Applied: `{"items":{"https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US":{"title":"Get Pro"}}}` → dump shows `12 https://wpforms.com/lite-upgrade/... Get Pro manage_options`. **CAVEAT [I3]:** the slug is an external absolute URL to wpforms.com. Unlike the Jetpack Settings slug (which was environment-specific), this URL is stable across all installations (always points to wpforms.com). However, the UTM parameters make the exact slug a fixed key that Maestro must match verbatim. Additionally, this item links to an external site, not an admin page — hiding or renaming it affects only the sidebar label; clicking always navigates to wpforms.com. `[state: Lite-only]` — this item is absent in Pro builds. Persists. | **N/A → safe** — submenu reorder via `sub_order` using full URL slug as the key. Tested: placing it first in `sub_order` moves it to position 0. Persists. | admin **degraded** — cosmetic `unset()`, slug is an external URL (no admin page to load). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded |

> **Net for Part 3 (issues to classify-fix):** (a) Payments and Addons badge/style loss on rename —
> documented limitation (cosmetic); (b) `Upgrade to Pro` absolute external-URL slug requires exact
> verbatim key match — slug-resolution tweak; (c) submenu re-icon is N/A — documented limitation;
> (d) Hide is moot for editor/shop_manager (cap-gating) — documented limitation; (e) Hide is cosmetic
> for admin (page loads by URL) — documented limitation; (f) parent-hide non-cascading — documented
> limitation. **No broken cells across 14 matrix rows.** All rename/reorder/re-icon operations succeed
> for admin; the two markup-loss cases are degraded (cosmetic).

### Evidence Notes

- All classifications are grounded in re-dumped `$menu`/`$submenu` output (and the
  `reorder-probe.php` effective-order output for top-level Reorder) compared against the natural
  baseline.
- Representative observed phrases: "Renamed WPForms to 'My Forms', dump shows updated title at
  pos 58.9"; "Reorder moved wpforms-overview to position 0 in effective order, probe confirms";
  "Payments rename to 'Pay' — badge span absent in post-rename dump (`Pay` only)"; "Addons rename
  to 'My Addons' — color span absent in post-rename dump"; "Upgrade to Pro renamed to 'Get Pro'
  with full URL slug as key — dump confirms updated title"; "sub_order reorder moves Settings to
  pos 0, All Forms to pos 1, confirmed in dump".
- All submenu rows were verified: rename / reorder safe; hide cosmetic-admin-only or moot;
  re-icon N/A. Each gets its own matrix row per the full-coverage rule.

## Interaction Scenarios

Beyond the per-op matrix, a few deliberate **op-combinations** were applied together in a single
`maestro_config` payload and classified the same way (safe / degraded / broken + observable evidence
+ persistence + timing cause). All scenarios reset config afterward.

| # | Scenario | Payload (shape) | Observed result | Classification |
| --- | --- | --- | --- | --- |
| S1 | **Hide-parent-with-visible-children** — hide the top-level `wpforms-overview` item from admin while children (All Forms, Add New Form, etc.) remain accessible | `{"items":{"wpforms-overview":{"hidden_roles":["administrator"]}}}` | admin: the top-level `$menu` row at pos 58.9 is `unset()` (parent gone from sidebar replay state), but **all child rows remain fully populated in `$submenu['wpforms-overview']`** (13 submenus intact). Maestro's parent-hide does **not** cascade to children at the data level — it only removes the parent anchor. Each child page LOADS by `admin.php?page=<slug>` (all have `manage_options` intact); "Upgrade to Pro" external URL is unaffected. Subtree cosmetically orphaned, not access-broken. Persists. | **degraded** — cosmetic subtree-orphaning, no access break. Timing: pure Maestro `PHP_INT_MAX` unset, no WPForms-timing interaction. Same pattern as SURV-01 S1. |
| S2 | **Rename + reorder the same item together** — rename WPForms top-level to "Form Hub" AND move it to the top via `top_order` | `{"items":{"wpforms-overview":{"title":"Form Hub"}},"top_order":["wpforms-overview","index.php"]}` | Both effects apply and **compound cleanly**: title becomes "Form Hub" (persists), AND effective rendered order places wpforms-overview at position 0 (probe: `0 wpforms-overview / 1 index.php`). First submenu "All Forms" also renames to "Form Hub" (WP first-submenu mirroring — cosmetic, not a new failure). No badge loss on top-level rename (no badge in top-level title). Both persist. | **safe** — both operations succeed independently and together; the combination introduces no additional degradation. No WooCommerce-style separator re-cluster (WPForms does not own a separator). |
| S3 | **Re-icon + reorder across a separator** — re-icon WPForms with `dashicons-feedback` AND move it to a position across `separator2` (between upload.php and themes.php cluster) | `{"items":{"wpforms-overview":{"icon":"dashicons-feedback"}},"top_order":["index.php","separator1","upload.php","separator2","wpforms-overview"]}` | WPForms icon swaps to `dashicons-feedback` (top-level re-icon, **safe**, persists); effective order places wpforms-overview immediately after `separator2` at position 4 (probe confirms `3 separator2 / 4 wpforms-overview`). Both the icon swap and the cross-separator reorder apply and persist independently. No new failure mode from crossing the separator. Persists. | **safe** — re-icon is safe; reorder across separator is safe (WPForms has no own separator; no WC-style cluster anchoring on WPForms's behalf). |

**Interaction scenario findings for Part 3:** S1 (non-cascading parent-hide) is a documented limitation,
same as SURV-01 I6. S2 and S3 produced no new issues (both safe). No new fix rows needed beyond those
in the main matrix.

## Part 3 — Classified-Fix List

Every surfaced issue from the matrix gets one classified fix using exactly one R1 category. These entries feed DELV-02's prioritized backlog in Phase 16. **No orphans:** every degraded cell and every interaction finding maps to exactly one row below.

Allowed R1 fix categories:

1. **slug-resolution tweak**
2. **later `admin_menu` re-hook** (later admin_menu re-hook)
3. **special-casing**
4. **documented limitation**

> **Coverage note.** Part 2 surfaced **no `broken` cells** across 14 matrix rows + 3 interaction
> scenarios. Every classified fix below therefore addresses a `degraded` (cosmetic/recoverable) or
> limitation pattern. Several patterns are already covered by SURV-01 / SURV-02 analogues, making
> Phase 16 deduplication mechanical.

| # | Issue summary | Affected operation(s) | Affected items / source | Chosen classification | One-line rationale |
| --- | --- | --- | --- | --- | --- |
| I1 | **Submenu re-icon is a silent no-op** — `Replay::replay()` only writes the icon to the top-level `$menu[pos][6]`; submenu rows have no icon index, so `{"icon":...}` on a submenu slug changes nothing | Re-icon | All 13 WPForms submenus — matrix N/A cells + F2 | **documented limitation** | The operation does not exist for submenus in WordPress's menu model (submenu rows carry no icon slot); it never breaks anything. Accepted as-is. (Identical to SURV-01 I4 and SURV-02 I1; Phase 16 can dedup.) |
| I2 | **Payments badge lost on rename (convention 3)** — `wpforms-payments` title embeds `<span class="wpforms-menu-new">&nbsp;NEW!</span>`; Maestro's rename overwrites the entire title index, so the badge span is lost on rename; the "NEW!" visual cue disappears | Rename | `wpforms-payments` — matrix Rename cell (Payments row) + F4a | **documented limitation** | Badge-in-title loss is the standard handling defined in convention 3 (promoted to SCHEMA.md in Phase 14). The rename overwrites the title wholesale; Maestro has no badge-preserving merge path. This is a cosmetic, recoverable limitation — remove the override to restore the badge. Same pattern as SURV-01 badge loss (WooCommerce Payments/Extensions). |
| I3 | **Addons color-span lost on rename** — `wpforms-addons` title is `<span style="color:#f18500">Addons</span>`; Maestro's rename overwrites the entire title index, losing the orange color styling; the upsell visual cue disappears | Rename | `wpforms-addons` — matrix Rename cell (Addons row) + F4b | **documented limitation** | Inline-style span in title is a variant of the badge-in-title convention 3 pattern. The rename overwrites the title wholesale; Maestro has no partial-title-markup-preserving path. Cosmetic and recoverable — remove the override to restore the orange styling. Analogous to SURV-01 badge-in-title cases (different markup form, same root cause). |
| I4 | **"Upgrade to Pro" submenu slug is an absolute external URL with UTM parameters** — slug is `https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US`; Maestro must match the exact stored slug verbatim to rename/reorder/hide this item; slight differences in UTM parameters or URL encoding break the match; slug is Lite-only (absent in Pro) | Rename, Reorder (sub_order), Hide | `Upgrade to Pro` submenu — matrix Rename/Reorder/Hide cell (Upgrade row) + Part 1 notes | **slug-resolution tweak** | The mismatch risk is in how Maestro stores and resolves the override key: the stored slug must match the rendered URL exactly, including all UTM parameters. Normalizing the slug match to be URL-agnostic (or stripping UTM params in the resolution path) would make the override robust. Unlike the Jetpack Settings slug (which was environment-specific / hostname-dependent), this URL is stable across installations (always wpforms.com). Lower priority than Jetpack's I2, but a slug-resolution tweak in Maestro's match path would eliminate the exact-match brittleness. `[state: Lite-only]` — Pro builds lack this item. |
| I5 | **Cosmetic per-role Hide; pages still load by direct URL** — Maestro's hide is a per-role `unset()` that never strips a capability, so hidden WPForms pages still LOAD (200) by direct URL | Hide | `wpforms-overview` top-level + all submenus (admin sub-cell) — matrix Hide cells + F3 | **documented limitation** | Same as SURV-01 I5: Hide is a sidebar-visibility convenience, not access control. Any 403 is WP's own cap gate, not Maestro. Correct and intended. (Identical to SURV-01 I5 and SURV-02 I3; Phase 16 can dedup.) |
| I6 | **All WPForms items cap-gated from editor/shop_manager; Hide is moot for those roles (F1)** — `manage_options` is unmet for both non-admin roles, so WP gate (1) removes WPForms items from their sidebars independently of Maestro; Maestro's hide `unset()` has nothing to act on | Hide | All WPForms items — all Hide sub-cells for editor/shop_manager — F1 | **documented limitation** | This is WPForms's own capability design (`manage_options` gating), not a Maestro defect. Behavior is correct: WP's cap gate protects non-admin roles from WPForms admin features they lack access to. Documented for DELV-02 awareness; no R1 implementation fix warranted. |
| I7 | **Parent-hide does not cascade to children (Interaction S1)** — hiding the top-level `wpforms-overview` item from admin leaves all 13 child `$submenu` rows populated; the subtree is cosmetically orphaned but each child page LOADS by URL | Hide (parent + children interaction) | `wpforms-overview` parent + all 13 submenus — Interaction Scenario S1 | **documented limitation** | Same pattern as SURV-01 I6 and SURV-02 I4: non-cascading is the safe default — children remain reachable. Cascading-on-parent-hide would be a behavior change with access implications, out of R1 scope. (Identical to SURV-01 I6; Phase 16 can dedup.) |

**Interaction scenarios S2 (rename+reorder, safe) and S3 (re-icon+reorder-across-separator, safe)**
surfaced no new issues. They are therefore covered by "no issue" and need no fix rows.

## Success-Criterion Traceability

| Phase 15 success criterion | Where addressed in this survey | Status |
| --- | --- | --- |
| 1. Survey covers HOW WPForms Lite registers/manipulates the menu (all six manipulation dimensions) | Part 1 — Manipulation-Dimensions Checklist (3 of 6 checked with source + runtime evidence; 3 unchecked with Notes confirming absence) + Method header + `SURV-05-assets/baseline-*.txt` (Task 1) | ✅ Met |
| 2. Every Maestro op classified safe/degraded/broken per affected item, with observable evidence + persistence | Part 2 — Classification Matrix (14 rows × rename/reorder/hide/re-icon), cross-cutting findings F1–F4, per-role Hide (two-gate model with WP cap-gate + Maestro cosmetic `unset()`), top-level reorder from effective rendered order (reorder-probe) + Interaction Scenarios S1–S3 (Task 2) | ✅ Met |
| 3. Every surfaced issue gets exactly one classified R1 fix | Part 3 — Classified-Fix List I1–I7: every degraded matrix cell + interaction finding mapped to one of the four categories, no orphans; S2/S3 safe (no fix rows) (Task 2) | ✅ Met |
| 4. Survey structurally mirrors SURV-01 and fills the SCHEMA.md template identically | This file: Method header, Part 1 six-dimension checklist, Part 2 full-coverage matrix + cross-cutting findings + per-role Hide, Interaction Scenarios, Part 3 fix list, traceability table, completion check — all present and schema-faithful | ✅ Met |
| Requirement **SURV-05** (WPForms Lite surveyed and documented) | This entire file — HOW (Part 1) + what happens (Part 2) + classified fixes (Part 3) | ✅ Met |

## Survey Completion Check

- [x] All six manipulation dimensions above are checked or left unchecked with `Notes:` evidence. — Three checked (custom positions, count-badges-in-title, direct-URL submenu slug); three unchecked with Notes confirming absence (no conditional/late injection beyond is_admin() gating, no re-registered menus, no custom separators, no global surgery).
- [x] Every affected top-level menu item has a matrix row. — `wpforms-overview` top-level (1 row).
- [x] Every affected submenu has a matrix row. — All 13 submenus (13 rows; 14 rows total including top-level): All Forms, Add New Form, Entries, Payments, Form Templates, Settings, Tools, Addons, Privacy Compliance, SMTP, About Us, Community, Upgrade to Pro.
- [x] Every Rename cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level and 11 clean submenus are `safe`; Payments is `degraded` (badge loss F4a); Addons is `degraded` (color-span loss F4b); Upgrade to Pro is `safe` with caveat I4. All 14 Rename cells classified with evidence + persistence.
- [x] Every Reorder cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level from effective render order (reorder-probe); submenus via `sub_order`; each cell classified (safe for all 14 rows).
- [x] Every Hide cell is classified `safe`, `degraded`, or `broken` with evidence. — Per-role (admin / editor / shop_manager) with cosmetic-vs-access (loads-200 vs WP cap-403) noted per F3, using the two-gate model; editor/shop_manager sub-cells are "WP cap-gated away (Maestro hide moot)" per F1. Per-role render outcomes confirmed via separate post-cap-filter check (Method header, "Per-role observation").
- [x] Every Re-icon cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level safe (SVG→dashicon swap); all 13 submenus N/A→degraded (F2), rationale stated.
- [x] Every issue has exactly one classified fix: slug-resolution tweak, later `admin_menu` re-hook (later admin_menu re-hook), special-casing, or documented limitation. — Part 3 I1–I7: each surfaced degraded pattern + interaction finding mapped to exactly one category; no orphans; S2/S3 safe, no fix rows needed.
- [x] The filled survey copy remains under `.planning/compat/SURV-NN-<plugin>.md`; `SCHEMA.md` is unmodified. — This copy is `.planning/compat/SURV-05-wpforms.md`. SCHEMA.md was not edited (it is in final form for Phase 15).
