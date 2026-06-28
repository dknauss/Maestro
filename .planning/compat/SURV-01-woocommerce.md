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

- [ ] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** TODO
- [ ] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority so Maestro may observe or replay them at a different time.
  - **Notes:** TODO
- [ ] **Re-registered menus** — menu removed then re-added, or slug re-registered, causing the same intended item to appear through more than one registration path.
  - **Notes:** TODO
- [ ] **Count badges baked into titles** — an awaiting-mod / update bubble span or similar count badge is embedded inside the menu title string.
  - **Notes:** TODO
- [ ] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows that affect ordering or visible grouping.
  - **Notes:** TODO
- [ ] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals rather than using the WordPress menu API.
  - **Notes:** TODO

## Part 2 — Classification Matrix

Use one row per affected menu item, including both top-level items and submenus. Add as many rows as needed. Each operation cell must contain one classification (`safe`, `degraded`, or `broken`) plus a short observable-evidence note.

### Classification Definitions

- **safe** — operation works as expected, persists, no side effects.
- **degraded** — operation partially works or works with caveats / cosmetic loss (e.g. count badge lost on rename).
- **broken** — operation fails, reverts, or breaks the plugin's menu/access.

### Maestro Operation Matrix

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `TODO: affected item label` | `top-level` or `submenu` | `TODO` | `safe/degraded/broken` — TODO observable evidence | `safe/degraded/broken` — TODO observable evidence | `safe/degraded/broken` — TODO observable evidence | `safe/degraded/broken` — TODO observable evidence |
| **Illustrative example only:** `Example Plugin` | `top-level` | `example-plugin` | `safe` — rename persists across reload and the menu link still opens | `degraded` — reorder persists initially but shifts below a custom separator after plugin reinjection | `safe` — hidden for Editor and remains accessible for Admin | `broken` — custom icon is replaced by plugin on next `admin_menu` pass |

### Evidence Notes

- Prefer observable evidence over inferred intent, such as: "rename persists across reload", "reorder reverts on next `admin_menu` pass", "count badge lost on rename", "submenu access 403s after hide", or "custom icon restored after reload".
- If a cell is not applicable, still choose the closest classification and explain why in the evidence note so Phase 16 synthesis remains mechanical.

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
