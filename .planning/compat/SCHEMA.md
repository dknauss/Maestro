# R1 Compatibility Classification Schema

This is the canonical R1 classification schema for Admin Menu Maestro third-party compatibility surveys.

Every survey **copies this pristine template** to `.planning/compat/SURV-NN-<plugin>.md` (for example, `.planning/compat/SURV-01-woocommerce.md`) and fills in the copy. Do not fill in this source template directly. This template is committed before any SURV-xx survey file is authored to satisfy SCHM-01 / Phase 13 success criterion 4.

## Survey Front Fields

- **Plugin:** TODO
- **Slug:** TODO
- **Pinned version:** TODO — copy from `tests/compat/VERSIONS.md`
- **Date surveyed:** TODO
- **Surveyor:** TODO

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
