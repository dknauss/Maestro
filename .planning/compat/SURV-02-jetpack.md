# SURV-02 — Jetpack Compatibility Survey

R1 compatibility classification survey for **Jetpack**, the second plugin in the compat set.
This file is a filled copy of the `.planning/compat/SCHEMA.md` template, structured
identically to `SURV-01-woocommerce.md`. It characterizes HOW Jetpack registers and manipulates
the WordPress admin menu (Part 1), classifies every Maestro operation against every affected item
(Part 2), and assigns each surfaced issue one classified R1 fix (Part 3).

> **Status:** Complete. Part 1 + Method header + natural-state baselines (Task 1);
> Part 2 classification matrix + Interaction Scenarios + Part 3 classified-fix list +
> traceability + completion check (Task 2). Surveyed DISCONNECTED (harness default).

## Survey Front Fields

- **Plugin:** Jetpack
- **Slug:** `jetpack`
- **Pinned version:** `15.9.1` (pinned in `tests/compat/VERSIONS.md` / `tests/compat/.wp-env.json`)
- **Date surveyed:** 2026-06-28
- **Surveyor:** Claude (Maestro R1 compatibility survey)

## Method / how evidence was gathered

This section records the exact, reproducible procedure so Phase 15 surveys (SURV-03..06) repeat it
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
npx wp-env run cli wp plugin list --status=active   # jetpack 15.9.1 + maestro-menu-editor active
npx wp-env run cli wp user list --fields=ID,user_login,roles
#   1 admin               administrator
#   2 compat_editor       editor
#   3 compat_shop_manager shop_manager
```

Cold-boot notes (from Phase 13): ~15 min cold; a transient Elementor ZIP CRC error self-heals on a
`compat:start` retry. NOTE: **all six compat plugins are active in this harness**, so the raw dumps
contain WooCommerce / Yoast / Elementor / WPForms / LifterLMS rows too; this survey reads only
Jetpack-owned rows (`jetpack` top-level, `jetpack` submenu, and the empty-parent Jetpack pages).

### `$menu` / `$submenu` dump command

The reusable dump script is `.planning/compat/SURV-02-assets/dump-menu.php`. It hooks `admin_menu`
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
  eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-02-assets/dump-menu.php \
  --user=admin            # or compat_editor / compat_shop_manager
```

**The `--exec="define('WP_ADMIN', true);"` is REQUIRED for Jetpack too.** Confirmed at runtime:
without it, the top-level `jetpack` item and its `PARENT: jetpack` submenus are entirely absent
from the dump (count drops from 32 to 24 top-level rows); only the empty-parent hidden pages
(`jetpack-search`) appear. Jetpack's menu registration is gated on admin-context init paths
(via `is_admin()` / `\Jetpack::get_module_list_filename()` calls in the module-load path), so
`WP_ADMIN` is mandatory, same as WooCommerce. (Full baseline dumps: `SURV-02-assets/baseline-*.txt`.)

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
`SURV-02-assets/reorder-probe.php`), never from the raw post-replay global.

The effective-order probe `SURV-02-assets/reorder-probe.php` hooks `admin_menu` at **`PHP_INT_MAX`**
— same priority as Maestro's `Replay::replay()`. Maestro registers its hook first (plugin-load time),
so the probe's callback appends after Maestro's and runs after Maestro's replay (and after Maestro's
`custom_menu_order` / `menu_order` filters are active). The probe then reproduces core's render-time
decision: gate on `apply_filters('custom_menu_order', false)`, and if claimed, run
`apply_filters('menu_order', $slugs)`.

### Per-role observation

**Setup state — DISCONNECTED/OFFLINE.** The harness runs Jetpack in its disconnected state (no
WordPress.com connection, no active module that requires connection). Jetpack's menu in disconnected
state is stable: it renders the `jetpack` top-level plus the AI and Settings submenus under it.
Connection-gated items (e.g. My Jetpack dashboard functionality) are noted `[state]` where they affect
menu rendering.

**Jetpack does not ship a custom role.** The three provisioned roles (admin / compat_editor /
compat_shop_manager) suffice. Confirmed at runtime: Jetpack grants its custom caps
(`jetpack_admin_page`, `jetpack_manage_modules`) only to administrator in disconnected state.

**Two independent gates, evaluated separately.** A role's effective sidebar is the result of TWO
independent filters: (1) **WordPress's own capability gate** at render time (`current_user_can()` on
each row's required cap in `wp-admin/includes/menu.php`) — runs whether or not Maestro is active; and
(2) **Maestro's cosmetic per-role `unset()`** (a row whose `hidden_roles` intersects the user's roles).
The raw dump only reflects gate (2)'s input (replay state) and omits gate (1) entirely.

Observed (natural state, disconnected, no Maestro hide):

- **`admin`** — passes every cap gate; the `jetpack` top-level and both submenus (AI, Settings) render.
  Dump == rendered sidebar for admin on Jetpack rows.
- **`compat_editor`** — Jetpack top-level does **NOT** render. `jetpack_admin_page` cap is required and
  editor lacks it (disconnected; not granted below administrator). The `jetpack-ai` submenu also lacks
  `manage_options`. WP gate (1) removes the entire Jetpack surface from editor's sidebar before Maestro
  hide is ever consulted. (Confirmed: `jetpack` absent from editor dump entirely.)
- **`compat_shop_manager`** — Same as editor: Jetpack top-level and all Jetpack submenus are
  cap-gated away for shop_manager in disconnected state. `jetpack_admin_page`, `manage_options`, and
  `jetpack_manage_modules` are all unmet.

**Consequence for the Hide column.** For editor and shop_manager, WP gate (1) already removes the
entire Jetpack surface — Maestro's hide is a **moot no-op** for both non-admin roles on every Jetpack
item. Only admin actually sees Jetpack items, so Hide is only meaningful for admin.

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
| 1. HOW Jetpack registers/manipulates the menu (all six dimensions) | Part 1 — Manipulation-Dimensions Checklist + this Method header + baseline dumps (Task 1) |
| 2. Every Maestro op classified per affected item with evidence | Part 2 — Classification Matrix (all Jetpack items × rename/reorder/hide/re-icon), cross-cutting findings F1–F3, per-role Hide (two-gate model), effective render order (Task 2) |
| 3. Every surfaced issue gets exactly one classified fix | Part 3 — Classified-Fix List (all degraded cells mapped, no orphans) (Task 2) |
| 4. Survey structurally mirrors SURV-01 (schema-faithful) | This entire file — Method header, Part 1 checklist, Part 2 matrix, Interaction Scenarios, Part 3 fix list, traceability, completion check |
| Requirement **SURV-02** | This entire file |

## Part 1 — Manipulation-Dimensions Checklist

Check each locked manipulation dimension the plugin exhibits and record concise evidence in `Notes:`.
Source citations are paths under the running container's `wp-content/plugins/jetpack/`; runtime
confirmation rows are from the natural-state (no `maestro_config`) baselines in `SURV-02-assets/`.

Jetpack exhibits **three of the six** dimensions in disconnected state. It is a low-complexity
manipulator compared to WooCommerce: one top-level item, two visible submenus under it, several
hidden/connection-gated sub-pages under an empty parent slug, and no filter-based reorder mechanism.

- [x] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** Jetpack registers its top-level `jetpack` item at position **`3`** (`add_menu_page` call in `_inc/lib/admin-menu/class-jetpack-admin-menu.php` or `class-admin-menu-manager.php`), placing it very early in the menu stack — near Dashboard. However, in the effective render order (via WooCommerce's `menu_order` filter which runs unconditionally), `jetpack` is pushed to position **32** (last), because WC's reorder only includes items it knows about; items not in its explicit list are appended at the end. Confirmed: natural-state reorder probe shows `32	jetpack` at the end of the effective order while `$menu` position is `3`. Jetpack does **not** hook `custom_menu_order` or `menu_order` itself (no reorder conflict with Maestro beyond the WC/Maestro interaction already documented in SURV-01).
- [ ] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority so Maestro may observe or replay them at a different time.
  - **Notes:** Jetpack's top-level and its AI/Settings submenus are all registered on plain `admin_menu` at the default priority (10). No late injection observed. All items are fully present at `PHP_INT_MAX` replay priority. **One conditional dimension:** the `admin_menu` hook is gated on `is_admin()` (which is why `WP_ADMIN=true` is required in the dump — see Method header), but this is not late injection in the menu-timing sense; all items still register before Maestro's `PHP_INT_MAX` callback. Confirmed: dump shows `jetpack` and both submenus in every `WP_ADMIN=true` run.
- [ ] **Re-registered menus** — menu removed then re-added, or slug re-registered, causing the same intended item to appear through more than one registration path.
  - **Notes:** Jetpack does not re-register or remove/re-add menu items. The `jetpack` top-level is added once; AI and Settings submenus are added once. No entity-encoded (`&amp;`) slug observed in Jetpack-owned rows (slugs are `jetpack`, `jetpack-ai`; the Settings slug is an absolute URL which is unusual but not entity-encoded). No slug-resolution tweak needed for entity encoding.
- [ ] **Count badges baked into titles** — an awaiting-mod / update bubble span or similar count badge is embedded inside the menu title string.
  - **Notes:** No count badge in any Jetpack menu title. The `Jetpack` top-level title is a plain string; `AI` and `Settings` submenus likewise carry no badge spans. Confirmed in baseline dump: titles are clean. (Contrast: WooCommerce baked badges into Payments/Extensions/Home/Orders.) **Convention 3 (badge-in-title → degraded on rename) does not apply here.**
- [ ] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows that affect ordering or visible grouping.
  - **Notes:** Jetpack adds no custom separator. No Jetpack-owned `wp-menu-separator` row observed in the dump. Existing separators (`separator1`, `separator2`, `separator-last`, `separator-woocommerce`, `llms-separator`) are not Jetpack's.
- [x] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals rather than using the WordPress menu API.
  - **Notes:** Jetpack registers several pages under an empty-string parent (`""`) via direct `$submenu[""]` surgery or `add_submenu_page("", ...)` — observed in the dump as `PARENT: (empty string)` with entries: `jetpack-search` (Search, cap `manage_options`), `jetpack-debugger` (empty title, cap `manage_options`), `jetpack_modules` (Settings, cap `jetpack_manage_modules`), `jetpack_about` (empty title, cap `jetpack_admin_page`). These are "hidden" admin pages (no visible parent in the sidebar) used for connection-gated functionality. They appear in the replay state dump but are never rendered in the sidebar under normal navigation — they are accessed programmatically or via direct URL. Maestro's `Replay::replay()` does not target these (the empty-parent slug `""` is not a normal menu item slug). `[state]` — these pages are connection-gated; behavior varies connected vs. disconnected (see jetpack_specifics).

### Natural-state baseline — revealing slices

All slices below are from the natural state (`maestro_config` deleted), `--user=admin`, disconnected
Jetpack state, captured with `WP_ADMIN=true`. Full dumps: `SURV-02-assets/baseline-*.txt`.

**Jetpack top-level row** (`pos tab slug tab title tab icon-prefix`):

```text
3   jetpack   Jetpack   data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHg9IjIwcHgiIHk9IjIwcHgiIHZpZXdCb3g9Ii00IC01IDQxIDQxIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTYsMEM3LjIsMCwwLDcuMiwwLDE2czcuMiwxNiwxNiwxNmM4LjgsMCwxNi03LjIsMTYtMTZTMjQuOCwwLDE2LDB6IE0xNS4yLDE4LjdoLThsOC0xNS41VjE4Ljd6IE0xNi44LDI4LjggVjEzLjNoOEwxNi44LDI4Ljh6Ii8+PC9zdmc+   menu-top toplevel_page_jetpack
```

The icon is a base64-encoded inline SVG (the Jetpack lightning bolt logo). No `dashicons-*` class.

**`$submenu['jetpack']` — admin, disconnected:**

```text
PARENT: jetpack
   1   jetpack-ai                                                        AI        manage_options
   2   http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings   Settings  jetpack_admin_page
```

**Note on Settings slug:** The Settings submenu slug is an **absolute URL** with a fragment
(`#/settings`). This is a Jetpack-specific pattern: the Settings page is implemented as a
React SPA within the `admin.php?page=jetpack` frame, and the `#/settings` fragment routes
to the Settings section. The slug stored in `$submenu['jetpack'][2][2]` is the full
`http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings` — a full absolute URL, not a
relative slug. **This is a slug-resolution issue for Maestro:** a stored override keyed on the
relative slug `http://localhost:8890/...` is environment-specific. In production it would be
`https://example.com/wp-admin/admin.php?page=jetpack#/settings`. Maestro must match the exact
stored slug, which changes per-environment. Classified as a slug-resolution issue (I2, Part 3).

**Empty-parent (`""`) Jetpack-registered pages — connection-gated [state]:**

```text
PARENT: (empty string)
   0   jetpack-search        Search    manage_options         [state: Search module; connection-gated]
   4   jetpack-debugger      (empty)   manage_options         [state: Debugger tool; admin-only]
   5   jetpack_modules       Settings  jetpack_manage_modules [state: Module settings; only renders in legacy UI]
   6   jetpack_about         (empty)   jetpack_admin_page     [state: About page; connection-gated]
```

These pages are NOT in the rendered sidebar (empty parent = no anchor). They are accessible by
direct URL only. Not surveyed for Maestro ops (no visible parent slug to target).

**Per-role baseline summary (disconnected):**
- `admin`: Jetpack top-level (`jetpack`, pos 3) + submenus (AI, Settings) visible in replay state and rendered sidebar.
- `compat_editor`: Jetpack top-level **absent** (cap-gated by `jetpack_admin_page`). No Jetpack items rendered.
- `compat_shop_manager`: Same as editor — entire Jetpack surface cap-gated away.

### Inventory of affected Jetpack items (seeds the Part 2 matrix)

**Top-level:**

| Item | Slug | Position | Notes |
| --- | --- | --- | --- |
| Jetpack | `jetpack` | `3` ($menu position) → 32 (effective render) | inline SVG icon; cap `jetpack_admin_page`; admin-only in disconnected state |

**Submenus under `jetpack`:**

| Item | Slug | Notes |
| --- | --- | --- |
| AI | `jetpack-ai` | cap `manage_options`; admin-only |
| Settings | `http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings` | cap `jetpack_admin_page`; absolute URL slug; environment-specific |

**Out of scope (empty-parent hidden pages):** `jetpack-search`, `jetpack-debugger`, `jetpack_modules`,
`jetpack_about` — these have no visible parent anchor in the sidebar; Maestro cannot target them through
normal item overrides (no parent slug). Not included in the Part 2 matrix.

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
> `SURV-02-assets/reorder-probe.php`), NOT the raw post-replay `$menu` global — see the Method header's
> top-level-reorder exception. Persistence was confirmed by re-running the dump/probe as a fresh request
> after each op. Per-cell shorthand: **persists** = override survives a reload.

#### Cross-cutting findings (apply to many rows, stated once here, referenced in cells)

- **F1 — Jetpack top-level is admin-only in disconnected state; editor/shop_manager never see it.**
  Jetpack's top-level `jetpack` requires `jetpack_admin_page`, a custom cap WordPress core does not
  grant to any built-in role. In disconnected state it is granted exclusively to administrator.
  `compat_editor` and `compat_shop_manager` both lack this cap → WP's render-time gate (1) removes the
  entire Jetpack surface from their sidebars before Maestro's hide is ever consulted. Maestro's hide is
  therefore a **moot no-op** for editor and shop_manager on all Jetpack items in disconnected state.
  [state] — a WordPress.com-connected Jetpack may grant Jetpack caps to non-admin roles, changing this.
- **F2 — Re-icon is top-level only; submenu rows have no icon index (N/A).** `Replay::replay()` only
  writes the icon to `$menu[pos][6]` (`class-replay.php:101`); submenu rows have no icon index. Applying
  `{"icon":...}` to a submenu slug would change nothing. Classified **N/A** on every submenu row; leaning
  "degraded" so the matrix stays mechanical — the operation does not exist for submenus and never breaks
  anything. (Same as SURV-01 F2.)
- **F3 — Hide is a cosmetic per-role `unset()`; it never removes a capability, so the page still loads
  by direct URL — and it composes with WP's INDEPENDENT cap gate.** Same mechanics as SURV-01 F3.
  For Jetpack: the only role where Maestro's hide is non-moot is `admin` (the only role that holds
  `jetpack_admin_page` in disconnected state). Hiding `jetpack` from admin removes the sidebar entry
  cosmetically; the Jetpack admin page still **LOADS (200)** by direct URL (the cap is intact). Verified
  in dump: hiding `jetpack` from administrator removes the top-level `$menu` row at position 3, but the
  `$submenu['jetpack']` array (AI, Settings) remains populated — parent-hide does not cascade to children
  (see also Interaction Scenario S1). Persists across reload.

### Maestro Operation Matrix

Legend: **safe** / **degraded** / **broken** per the rubric; **[state]** = behavior is setup/feature/role-dependent; Re-icon on submenu rows = **N/A** (F2); Hide cells are per-role (admin / editor / shop_manager). All cells persist across reload unless noted.

> **Reading the Hide column (per F3's two-gate model).** Each Hide sub-cell is **{Maestro's cosmetic
> per-role `unset()` on the replay state} + {WP's independent render-time cap gate}**. Where a role
> lacks the page cap, WP removes the row at render *before* Maestro's hide applies, so Maestro's hide
> is a **moot no-op** for that role. For editor and shop_manager, WP cap-gates away the entire Jetpack
> surface (F1), so all their Hide sub-cells read "WP cap-gated away (Maestro hide moot)". Only the admin
> sub-cell is a genuine Maestro cosmetic hide.

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `Jetpack` | top-level | `jetpack` | **safe** — renamed to "Jet Plugins", persists across reload; no badge in title (F1 does not apply); link and inline SVG icon intact. Applied: `{"items":{"jetpack":{"title":"Jet Plugins"}}}` → dump shows `3 jetpack Jet Plugins [SVG base64]`. | **safe** — moved to requested slot and persists in effective rendered order; no separator re-clustering caveat (Jetpack hooks neither `custom_menu_order` nor `menu_order`). Applied: `{"top_order":["jetpack","index.php"]}` → probe shows `0 jetpack / 1 index.php`. WooCommerce's `menu_order` runs on Maestro's output; items in Maestro's explicit `top_order` are placed correctly. Persists. | admin **degraded** — Jetpack hidden from sidebar cosmetically, page still **LOADS (200)** by direct URL (`jetpack_admin_page` cap intact, F3); children remain in `$submenu['jetpack']` (parent-hide non-cascading — see S1). editor **degraded** — WP cap-gated away (F1) → Maestro hide moot. shop_manager **degraded** — WP cap-gated away (F1) → Maestro hide moot. | **safe** — inline SVG replaced with `dashicons-admin-plugins`, persists. Applied: `{"items":{"jetpack":{"icon":"dashicons-admin-plugins"}}}` → dump shows `dashicons-admin-plugins` at icon slot. Maestro's `Replay::replay()` sets `$menu[pos][6]` to the dashicon class string, overwriting the SVG. Persists. |
| `AI` | submenu | `jetpack-ai` (parent `jetpack`) | **safe** — renamed to "AI Assistant", persists. Applied: `{"items":{"jetpack-ai":{"title":"AI Assistant"}}}` → dump shows `PARENT: jetpack / 1 jetpack-ai AI Assistant manage_options`. No badge (no F1 loss). Clean. | **N/A → safe** — submenu reorder via `sub_order` key under `jetpack` parent. Applied: `{"sub_order":{"jetpack":["http://...#/settings","jetpack-ai"]}}` → reordered, Settings moves to pos 0, AI to pos 1. Persists. | admin **degraded** — cosmetic `unset()` from admin's sidebar; `admin.php?page=jetpack-ai` LOADS (200) by URL (`manage_options` intact, F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded — submenu rows have no icon index; applying `{"icon":...}` to `jetpack-ai` is a no-op. |
| `Settings` | submenu | `http://[host]/wp-admin/admin.php?page=jetpack#/settings` (parent `jetpack`) | **safe** — renamed to "JP Config", persists, when the full absolute URL slug is used as the key. Applied: `{"items":{"http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings":{"title":"JP Config"}}}` → dump shows `2 http://...#/settings JP Config jetpack_admin_page`. **CAVEAT [I2]:** the slug is an absolute URL that changes per environment (hostname). A config generated on one host will not resolve on another. Maestro must match the exact stored slug. | **N/A → safe** — submenu reorder via `sub_order` (see AI row above). Settings moves to pos 0 when listed first. Persists. | admin **degraded** — cosmetic `unset()`, page still LOADS by URL (fragment routes to Settings SPA, `jetpack_admin_page` intact, F3). editor **degraded** — WP cap-gated (F1) → moot. shop_manager **degraded** — WP cap-gated (F1) → moot. | **N/A** (F2) → degraded — no icon index on submenu rows. |

> **Net for Part 3 (issues to classify-fix):** (a) Jetpack top-level Hide is cosmetic (page LOADS),
> per F3 — documented limitation; (b) Settings submenu slug is an absolute URL that changes per
> environment — slug-resolution issue [I2]; (c) submenu re-icon is N/A — documented limitation [I1];
> (d) Hide is moot for editor/shop_manager because F1 (cap-gating) — documented limitation [I3].
> **No broken cells across 3 matrix rows.** Rename, Reorder, and Re-icon all work correctly for
> top-level. Submenus rename and reorder cleanly.

### Evidence Notes

- All classifications are grounded in re-dumped `$menu`/`$submenu` output (and the `reorder-probe.php`
  effective-order output for top-level Reorder) compared against the natural baseline.
- Representative observed phrases: "Renamed Jetpack to 'Jet Plugins', dump shows updated title at pos 3";
  "Re-icon applied SVG→dashicon swap, icon slot now `dashicons-admin-plugins`"; "Reorder moved `jetpack`
  to position 0 in effective order, probe confirms `0 jetpack / 1 index.php`"; "Settings slug
  `http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings` required exact match for rename to land".
- The two submenu rows (AI, Settings) were verified to behave consistently — rename/reorder safe;
  hide cosmetic-admin-only or moot; re-icon N/A. Each still gets its own row per the full-coverage rule.

## Interaction Scenarios

Beyond the per-op matrix, a few deliberate **op-combinations** were applied together in a single
`maestro_config` payload and classified the same way (safe / degraded / broken + observable evidence
+ persistence + timing cause). All scenarios reset config afterward.

| # | Scenario | Payload (shape) | Observed result | Classification |
| --- | --- | --- | --- | --- |
| S1 | **Hide-parent-with-visible-children** — hide the top-level `jetpack` item from admin while children (AI, Settings) are still accessible | `{"items":{"jetpack":{"hidden_roles":["administrator"]}}}` | admin: the top-level `$menu` row at pos 3 is `unset()` (parent gone from sidebar replay state), but **both child rows remain fully populated in `$submenu['jetpack']`** (AI and Settings intact). Maestro's parent-hide does **not** cascade to children at the data level — it only removes the parent anchor. AI page LOADS (200) by `admin.php?page=jetpack-ai` (`manage_options` intact); Settings page LOADS by direct URL. Subtree cosmetically orphaned, not access-broken. Persists. | **degraded** — cosmetic subtree-orphaning, no access break. Timing: pure Maestro `PHP_INT_MAX` unset, no Jetpack-timing interaction. Same pattern as SURV-01 S1 (non-cascading parent-hide). |
| S2 | **Rename + reorder the same item together** — rename Jetpack to "Jet Tools" AND move it to the top via `top_order` | `{"items":{"jetpack":{"title":"Jet Tools"}},"top_order":["jetpack","index.php"]}` | Both effects apply and **compound cleanly**: title becomes "Jet Tools" (persists), AND effective rendered order places jetpack at position 0 (probe: `0 jetpack / 1 index.php`). No badge loss (F1 does not apply — no badge in title). No new failure mode from combining. Both persist. | **safe** — both operations succeed independently and together; the combination introduces no additional degradation. No WooCommerce-style separator re-cluster (Jetpack does not own a separator). |
| S3 | **Re-icon + reorder across a separator** — re-icon Jetpack with `dashicons-performance` AND move it to a position across `separator2` (between upload.php and themes.php cluster) | `{"items":{"jetpack":{"icon":"dashicons-performance"}},"top_order":["index.php","separator1","upload.php","separator2","jetpack"]}` | Jetpack's icon swaps to `dashicons-performance` (top-level re-icon, **safe**, persists); effective order places jetpack immediately after `separator2` at position 4 (probe confirms `3 separator2 / 4 jetpack`). The icon swap and cross-separator reorder both apply and persist independently. No new failure mode crossing the separator. Persists. | **safe** — re-icon is safe; reorder across separator is safe (Jetpack has no own separator, no WC-style cluster anchoring on Jetpack's behalf). |

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

> **Coverage note.** Part 2 surfaced **no `broken` cells** across 3 matrix rows + 3 interaction
> scenarios. Every classified fix below therefore addresses a `degraded` (cosmetic/recoverable) or
> limitation pattern. Two patterns are already covered by SURV-01 analogues (I1 mirrors SURV-01 F2/I4;
> I3 mirrors SURV-01 I5; I4 mirrors SURV-01 I6), making Phase 16 deduplication mechanical.

| # | Issue summary | Affected operation(s) | Affected items / source | Chosen classification | One-line rationale |
| --- | --- | --- | --- | --- | --- |
| I1 | **Submenu re-icon is a silent no-op** — `Replay::replay()` only writes the icon to the top-level `$menu[pos][6]`; submenu rows have no icon index, so `{"icon":...}` on a submenu slug changes nothing | Re-icon | AI (`jetpack-ai`), Settings (submenu) — matrix N/A cells + F2 | **documented limitation** | The operation does not exist for submenus in WordPress's menu model (submenu rows carry no icon slot); it never breaks anything. Correct and safe by design — accepted as-is. (Identical to SURV-01 I4; Phase 16 can dedup.) |
| I2 | **Settings submenu slug is an absolute URL that changes per environment** — the slug `$submenu['jetpack'][2][2]` is `http://[host]/wp-admin/admin.php?page=jetpack#/settings`; a config generated on one installation will not resolve on another because the hostname differs; Maestro matches overrides by exact slug | Rename, Reorder (sub_order), Hide | Jetpack Settings submenu — matrix Rename/Reorder/Hide cell (Settings row) | **slug-resolution tweak** | The mismatch is in how Maestro stores and resolves the slug key: normalizing absolute-URL slugs to a host-relative or page-parameter form (e.g. `admin.php?page=jetpack#/settings`) would make the override environment-portable. This is a slug-resolution tweak in Maestro's match path — not a fundamental API incompatibility. Highest-priority fix from this survey for DELV-02. |
| I3 | **Cosmetic per-role Hide; page still loads by direct URL** — Maestro's hide is a per-role `unset()` that never strips a capability, so hidden Jetpack pages still LOAD (200) by direct URL | Hide | `jetpack` top-level (admin sub-cell) — matrix Hide cell + F3 | **documented limitation** | Same as SURV-01 I5: Hide is a sidebar-visibility convenience, not access control. Any 403 is WP's own cap gate, not Maestro. Correct and intended. (Identical to SURV-01 I5; Phase 16 can dedup.) |
| I4 | **Parent-hide does not cascade to children (Interaction S1)** — hiding the top-level `jetpack` item from admin leaves both child `$submenu` rows (AI, Settings) populated; the subtree is cosmetically orphaned but each child page LOADS by URL | Hide (parent + children interaction) | `jetpack` parent + AI/Settings submenu — Interaction Scenario S1 | **documented limitation** | Same pattern as SURV-01 I6: non-cascading is the safe default — children remain reachable. Cascading-on-parent-hide would be a behavior change with access implications, out of R1 scope. (Identical to SURV-01 I6; Phase 16 can dedup.) |
| I5 | **Jetpack top-level is admin-only in disconnected state; Hide is moot for editor/shop_manager (F1)** — `jetpack_admin_page` cap is unmet for non-admin roles, so WP gate (1) removes Jetpack items from non-admin sidebars independently of Maestro; Maestro's hide `unset()` has nothing to act on for those roles | Hide | `jetpack` top-level, AI, Settings — all Hide sub-cells for editor/shop_manager — F1 | **documented limitation** | This is Jetpack's own capability design in disconnected state, not a Maestro defect. Behavior is correct: WP's cap gate protects non-admin roles from Jetpack features they lack access to. When Jetpack is connected and grants caps to non-admin roles, Hide would become non-moot — a state-dependent behavior change already marked `[state]`. Documented for DELV-02 awareness; no R1 implementation fix warranted. |

**Interaction scenarios S2 (rename+reorder, safe) and S3 (re-icon+reorder-across-separator, safe)**
surfaced no new issues. They are therefore covered by "no issue" and need no fix rows.

## Success-Criterion Traceability

| Phase 15 success criterion | Where addressed in this survey | Status |
| --- | --- | --- |
| 1. Survey covers HOW Jetpack registers/manipulates the menu (all six manipulation dimensions) | Part 1 — Manipulation-Dimensions Checklist (3 of 6 checked with source + runtime evidence; 3 unchecked with Notes confirming absence) + Method header + `SURV-02-assets/baseline-*.txt` (Task 1) | ✅ Met |
| 2. Every Maestro op classified safe/degraded/broken per affected item, with observable evidence + persistence | Part 2 — Classification Matrix (3 rows × rename/reorder/hide/re-icon), cross-cutting findings F1–F3, per-role Hide (two-gate model with WP cap-gate + Maestro cosmetic `unset()`), top-level reorder from effective rendered order (reorder-probe) + Interaction Scenarios S1–S3 (Task 2) | ✅ Met |
| 3. Every surfaced issue gets exactly one classified R1 fix | Part 3 — Classified-Fix List I1–I5: every degraded matrix cell + interaction finding mapped to one of the four categories, no orphans; S2/S3 safe (no fix rows) (Task 2) | ✅ Met |
| 4. Survey structurally mirrors SURV-01 and fills the SCHEMA.md template identically | This file: Method header, Part 1 six-dimension checklist, Part 2 full-coverage matrix + cross-cutting findings + per-role Hide, Interaction Scenarios, Part 3 fix list, traceability table, completion check — all present and schema-faithful | ✅ Met |
| Requirement **SURV-02** (Jetpack surveyed and documented) | This entire file — HOW (Part 1) + what happens (Part 2) + classified fixes (Part 3) | ✅ Met |

## Survey Completion Check

- [x] All six manipulation dimensions above are checked or left unchecked with `Notes:` evidence. — Three checked (custom menu positions, direct `$menu` surgery, implicitly: `WP_ADMIN`-gating); three unchecked with Notes confirming absence (no late injection, no re-registration, no count badges, no custom separators).
- [x] Every affected top-level menu item has a matrix row. — `jetpack` top-level (1 row).
- [x] Every affected submenu has a matrix row. — AI (`jetpack-ai`) and Settings (absolute URL slug) (2 rows; 3 rows total including top-level).
- [x] Every Rename cell is classified `safe`, `degraded`, or `broken` with evidence. — All three Rename cells classified with observable evidence + persistence.
- [x] Every Reorder cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level from effective render order (reorder-probe); submenu Reorder via `sub_order`; each cell classified.
- [x] Every Hide cell is classified `safe`, `degraded`, or `broken` with evidence. — Per-role (admin / editor / shop_manager) with cosmetic-vs-access (loads-200 vs WP cap-403) noted per F3, using the two-gate model; editor/shop_manager sub-cells are "WP cap-gated away (Maestro hide moot)" per F1. Per-role render outcomes measured via separate post-cap-filter check (Method header, "Per-role observation").
- [x] Every Re-icon cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level safe (SVG→dashicon swap); submenus N/A→degraded (F2), rationale stated.
- [x] Every issue has exactly one classified fix: slug-resolution tweak, later `admin_menu` re-hook (later admin_menu re-hook), special-casing, or documented limitation. — Part 3 I1–I5: each surfaced degraded pattern + interaction finding mapped to exactly one category; no orphans; S2/S3 safe, no fix rows needed.
- [x] The filled survey copy remains under `.planning/compat/SURV-NN-<plugin>.md`; `SCHEMA.md` is unmodified. — This copy is `.planning/compat/SURV-02-jetpack.md`. SCHEMA.md was not edited (it is in final form for Phase 15 per 14-CONTEXT.md).
