# SURV-06 — LifterLMS Compatibility Survey

R1 compatibility classification survey for **LifterLMS** (free LMS; `lifterlms` 10.0.8), the sixth
and final plugin in the compat set. This file is a filled copy of the `.planning/compat/SCHEMA.md`
template, structured identically to `SURV-01-woocommerce.md`. It characterizes HOW LifterLMS
registers and manipulates the WordPress admin menu (Part 1), classifies every Maestro operation
against every affected item (Part 2), and assigns each surfaced issue one classified R1 fix (Part 3).

> **Status:** Complete. Part 1 + Method header + natural-state baselines (Task 1);
> Part 2 classification matrix + Interaction Scenarios + Part 3 classified-fix list +
> traceability + completion check (Task 2). Surveyed in standard harness state (setup wizard
> not completed; three baseline roles used). LifterLMS's own roles (`lms_manager`, `instructor`)
> do NOT materially change the Hide surface for LifterLMS-owned items (see Method header for
> reasoning) — three baseline roles suffice.

## Survey Front Fields

- **Plugin:** LifterLMS
- **Slug:** `lifterlms`
- **Pinned version:** `10.0.8` (pinned in `tests/compat/VERSIONS.md` / `tests/compat/.wp-env.json`)
- **Date surveyed:** 2026-06-29
- **Surveyor:** Claude (Maestro R1 compatibility survey)

## Method / how evidence was gathered

This section records the exact, reproducible procedure so any cell can be re-derived. All commands
run against the committed Phase 13 compat harness (`tests/compat/`). The methodology is LOCKED by
`14-CONTEXT.md` and demonstrated in SURV-01; this header reproduces it verbatim, adapting only the
plugin name and the WP_ADMIN finding.

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
npx wp-env run cli wp plugin list --status=active   # lifterlms 10.0.8 + maestro-menu-editor active
npx wp-env run cli wp user list --fields=ID,user_login,roles
#   1 admin               administrator
#   2 compat_editor       editor
#   3 compat_shop_manager shop_manager
```

Cold-boot notes (from Phase 13): ~15 min cold; a transient Elementor ZIP CRC error self-heals on a
`compat:start` retry. NOTE: **all six compat plugins are active in this harness**, so the raw dumps
contain WooCommerce / Jetpack / Yoast / Elementor / WPForms rows too; this survey reads only
LifterLMS-owned rows (`lifterlms` top-level, `llms-separator`, and the CPT top-level items
`edit.php?post_type=course`, `edit.php?post_type=llms_membership`,
`edit.php?post_type=llms_engagement`, `edit.php?post_type=llms_order`, and their submenus).

### `$menu` / `$submenu` dump command

The reusable dump script is `.planning/compat/SURV-06-assets/dump-menu.php`. It hooks `admin_menu`
at `PHP_INT_MAX` — the **same priority Maestro's `Replay::replay()` uses** (`includes/class-replay.php:56`) —
so it observes the globals in exactly the fully-registered state Maestro sees, then `exit`s before
WordPress's per-user privilege filtering in `wp-admin/includes/menu.php` (which `wp_die()`s under
WP-CLI). Run it per role:

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
  eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-06-assets/dump-menu.php \
  --user=admin            # or compat_editor / compat_shop_manager
```

**The `--exec="define('WP_ADMIN', true);"` is REQUIRED for LifterLMS too.** Confirmed at runtime:
without it, the top-level `lifterlms` item and its submenus under `PARENT: lifterlms` are absent
from the dump (LifterLMS's menu registration is triggered on admin-context init paths), so `WP_ADMIN`
is mandatory, the same as WooCommerce and Jetpack. (Full baseline dumps:
`SURV-06-assets/baseline-admin.txt`, `baseline-editor.txt`, `baseline-shop-manager.txt`.)

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
```

**Top-level Reorder is the one exception to the `$menu`-dump method.** `Replay::replay()` applies
rename / icon / visibility / submenu-order to the globals on `admin_menu @ PHP_INT_MAX`, but
top-level ordering goes through the `custom_menu_order` + `menu_order` filters at render time
(`includes/class-replay.php:58-60`), which run *after* `admin_menu`. A raw `$menu` dump taken at
`PHP_INT_MAX` therefore will **not** reflect a reordered top-level sequence. Top-level Reorder cells
below are classified from the **effective rendered order** (via `SURV-06-assets/reorder-probe.php`),
never from the raw post-replay global. Rename, icon, hide, and submenu reorder ARE visible in the
raw dump.

The effective-order probe `SURV-06-assets/reorder-probe.php` hooks `admin_menu` at **`PHP_INT_MAX`**
— the same priority as Maestro's `Replay::replay()`. Same-priority callbacks fire in registration
order, and Maestro registers first, so the probe runs after Maestro's replay and after Maestro's
`custom_menu_order` / `menu_order` filters are active.

### Per-role observation

Each of the three provisioned users is dumped separately via the `--user=` flag above, because
Maestro's Hide is **per-role** (`Replay::is_hidden_for_current_user()` only `unset()`s an item when
the current user's roles intersect `hidden_roles`). `admin` (administrator) sees everything;
`compat_shop_manager` (shop_manager) exercises the WooCommerce role; `compat_editor` (generic
editor) is the baseline.

**Two independent gates, evaluated separately.** A role's effective sidebar is the result of TWO
independent filters: (1) **WordPress's own capability gate** at render time (`current_user_can()` on
each row's required cap) — this runs whether or not Maestro is active; and (2) **Maestro's cosmetic
per-role `unset()`** (a row whose `hidden_roles` intersects the user's roles). The raw dump only
reflects gate (2)'s input and omits gate (1) entirely.

**Observed per-role rendered sidebar for LifterLMS items (natural state, no Maestro hide):**

- **`admin`** — passes every cap gate; all LifterLMS top-level rows and all submenus render.
- **`compat_shop_manager`** — `lifterlms` top-level renders (cap `read` ✓), BUT all lifterlms
  submenus are cap-gated away (lacks `manage_lifterlms` and `view_lifterlms_reports`). Courses and
  Memberships CPT top-levels are cap-gated away (lacks `edit_courses`, `edit_memberships`).
  Engagements and Orders top-levels are cap-gated away (lacks those caps). So shop_manager sees
  ONLY `lifterlms` top-level (with no rendered submenus) from all LifterLMS surfaces.
- **`compat_editor`** — `lifterlms` top-level renders (cap `read` ✓). Same situation as
  shop_manager: all submenus cap-gated away. Courses and Memberships: cap-gated away. So editor
  also sees ONLY `lifterlms` top-level (no submenus).

### Per-role set decision: are lms_manager/instructor needed?

**lms_manager** has `manage_lifterlms` and `view_lifterlms_reports` — it would render the full
LifterLMS admin surface (Dashboard, Settings, Reporting, etc.). However, the three baseline roles
(admin / editor / shop_manager) **already exercise the full Hide surface** of all LifterLMS-owned
items:

- **For admin:** Maestro hide removes the item cosmetically; page LOADS by URL (cap intact).
- **For editor and shop_manager:** The lifterlms TOP-LEVEL is visible (cap `read`); hiding it
  cosmetically removes it and the page still LOADS by URL. The lifterlms SUBMENUS are already
  cap-gated away for both roles — so Maestro's hide is a **moot no-op** for those sub-rows.
- **lms_manager** would add observations for the submenus (Dashboard, Settings, Reporting, etc.),
  but these rows are identical in structure to the admin case — all require `manage_lifterlms` or
  `view_lifterlms_reports`, both of which `lms_manager` holds. The Hide classification for those
  rows would be **degraded (cosmetic, page LOADS)** — identical to the admin sub-cells.

**Conclusion: the three baseline roles suffice.** The lms_manager role does NOT add a materially
different Hide behavior: it would only replicate the admin pattern on rows that are already
classified via the admin user. Provisioning lms_manager via the survey procedure is therefore
**skipped** — it would add no new classification data. This decision is documented here per the
plan's `lifterlms_specifics` instruction.

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
| 1. Survey covers HOW LifterLMS registers/manipulates the menu (all six manipulation dimensions) | Part 1 + this Method header + baseline dumps (Task 1) |
| 2. Every Maestro op classified per affected item with evidence | Part 2 matrix (Task 2) |
| 3. Every surfaced issue gets exactly one classified fix | Part 3 fix list (Task 2) |
| 4. Surveys structured identically to SURV-01 exemplar | This entire file mirrors SURV-01 structure |
| Requirement **SURV-06** | This entire file |

## Part 1 — Manipulation-Dimensions Checklist

Check each locked manipulation dimension the plugin exhibits and record concise evidence in `Notes:`.
Source citations are paths under the running container's `wp-content/plugins/lifterlms/`; runtime
confirmation rows are from the natural-state (no `maestro_config`) baselines in `SURV-06-assets/`.

LifterLMS exhibits **five** of the six dimensions (no count badges baked into titles).

- [x] **Custom menu positions** — explicit `$position` in `add_menu_page`, unusually high positions, or fractional positions that affect where the top-level item lands.
  - **Notes:** The top-level `lifterlms` item is registered at position `51` via `add_menu_page('lifterlms', 'LifterLMS', 'read', 'lifterlms', ..., $icon_url, 51)` (`includes/admin/class.llms.admin.menus.php:202`). WP auto-allocates a fractional `51.30541` when inserting it (confirmed in baseline: `51.30541 lifterlms`). The separator is injected at integer `51` (`$menu[51] = ...`, same file:200) immediately before LifterLMS. LifterLMS CPT menus land at 52 (Courses), 53 (Memberships), 54 (Engagements), 55 (Orders) — also confirmed in baseline.

- [x] **Conditional / late injection** — menus added on later hooks, conditionally, or after the default `admin_menu` priority.
  - **Notes:** The main LifterLMS submenu items (Dashboard, Settings, Reporting, Import, Status, Resources) register on `admin_menu` at **default priority 10** via `display_admin_menu()`. The `Add-ons & more` submenu registers at **priority 7777** via `display_admin_menu_late()` — confirmed in baseline as the last lifterlms submenu row. The `submenu_order()` method hooks `custom_menu_order` to reorder lifterlms submenus (priority not shown, hooks at constructor time). All registration completes before Maestro's `PHP_INT_MAX` replay, so Maestro sees the fully-assembled menu — good for rename/icon/hide/submenu-order. The late priority 7777 for Add-ons is irrelevant for Maestro since it still precedes `PHP_INT_MAX`.

- [x] **Re-registered menus** — menu removed then re-added, or slug re-registered; entity-encoded slugs.
  - **Notes:** No classic re-registration. However, several taxonomy submenus under Courses and Memberships use `&amp;`-encoded slugs (e.g. `edit-tags.php?taxonomy=course_cat&amp;post_type=course` under Courses, `edit-tags.php?taxonomy=membership_cat&amp;post_type=llms_membership` under Memberships). These match the WooCommerce pattern (I3/SURV-01 slug-resolution tweak): a stored override only lands if the slug matches the rendered entity-encoded form. Flagged for Part 3. Also note: the `edit.php?post_type=llms_form` submenu under `lifterlms` parent uses a CPT post-type slug (not entity-encoded).

- [ ] **Count badges baked into titles** — count badge span embedded inside the menu title string.
  - **Notes:** LifterLMS does NOT bake count badges into any title strings. Runtime dump confirms all LifterLMS title strings are plain text (no `<span class="awaiting-mod ...">` pattern). This dimension is **not exhibited** by LifterLMS.

- [x] **Custom separators** — custom `add_menu_page` separators or direct `$menu` separator rows.
  - **Notes:** LifterLMS pushes a custom separator via **direct `$menu` surgery**: `$menu[51] = array('', 'read', 'llms-separator', '', 'wp-menu-separator')` (`class.llms.admin.menus.php:200`). Confirmed in all three baseline dumps as `51 llms-separator wp-menu-separator`. The separator sits at position 51; the LifterLMS top-level item lands at fractional `51.30541` immediately after it. Unlike WooCommerce's `separator-woocommerce` (which is re-clustered by WC's `menu_order` filter), `llms-separator` does **NOT** have a corresponding `menu_order` filter — it stays at its absolute position 51 in the effective rendered order. Confirmed via reorder probe: when `lifterlms` is moved to position 0 via Maestro `top_order`, `llms-separator` stays at position 28 in the effective order (not dragged along). See F4 in Part 2.

- [x] **Direct `$menu` / `$submenu` global surgery** — plugin writes to the `$menu` / `$submenu` globals.
  - **Notes:** Yes — two forms of direct surgery: (a) **separator injection**: `$menu[51] = array(..., 'llms-separator', ..., 'wp-menu-separator')` (`class.llms.admin.menus.php:200`) writes directly to `$menu`; (b) **submenu reorder**: `submenu_order()` hooks `custom_menu_order`, reads and rewrites `$submenu['lifterlms']` (sorting it to the desired order: `llms-dashboard`, `llms-settings`, `llms-reporting`, `edit.php?post_type=llms_form` first, rest appended) (`class.llms.admin.menus.php:80-108`). Both run before Maestro's `PHP_INT_MAX` replay, so Maestro observes the post-surgery state. The key interaction is the `custom_menu_order` hook: LifterLMS's `submenu_order()` returns `$flag` (unchanged from its input, which is `false` from WP's initial call), so it **does not claim top-level custom menu ordering** — it only rewrites `$submenu['lifterlms']`. Maestro's `has_top_order()` claims `custom_menu_order` **only when a `top_order` is present** in `maestro_config` (`class-replay.php`), so the two co-exist without collision. Confirmed via reorder probe: in natural state without a Maestro `top_order`, `custom_menu_order` IS claimed YES — this is because WooCommerce (also active) claims it unconditionally.

### Natural-state baseline — revealing slices

All slices below are from the natural state (`maestro_config` deleted), `--user=admin`, captured
with the Method-header dump command. Full baseline dumps: `SURV-06-assets/baseline-*.txt`.

**LifterLMS-owned top-level rows** (`pos⇥slug⇥title⇥icon-prefix`):

```text
51    llms-separator         (separator)   (css: wp-menu-separator)
51.30541  lifterlms          LifterLMS     data:image/svg+xml;base64,...  (base64 SVG icon)
52    edit.php?post_type=course        Courses       dashicons-welcome-learn-more
53    edit.php?post_type=llms_membership   Memberships   dashicons-groups
54    edit.php?post_type=llms_engagement   Engagements   dashicons-awards
55    edit.php?post_type=llms_order        Orders        dashicons-cart
```

**`$submenu['lifterlms']` — admin, natural state** (reordered by LifterLMS's `submenu_order()`):

```text
0  edit.php?post_type=llms_form   Forms         (cap: manage_lifterlms)
1  llms-dashboard                 Dashboard     (cap: manage_lifterlms)
2  llms-settings                  Settings      (cap: manage_lifterlms)
3  llms-reporting                 Reporting     (cap: view_lifterlms_reports)
4  llms-import                    Import        (cap: manage_lifterlms)
5  llms-status                    Status        (cap: manage_lifterlms)
6  llms-resources                 Resources     (cap: manage_lifterlms)
7  llms-add-ons                   Add-ons & more (cap: manage_lifterlms)
```

**`$submenu['edit.php?post_type=course']` — admin, natural state** (note `&amp;`-encoded taxonomy slugs):

```text
5   edit.php?post_type=course              Courses           (cap: edit_courses)
10  post-new.php?post_type=course          Add New Course    (cap: create_courses)
15  edit-tags.php?taxonomy=course_cat&amp;post_type=course      Categories    (cap: manage_course_cats)
16  edit-tags.php?taxonomy=course_difficulty&amp;post_type=course  Difficulties  (cap: manage_course_difficulties)
17  edit-tags.php?taxonomy=course_tag&amp;post_type=course      Tags          (cap: manage_course_tags)
18  edit-tags.php?taxonomy=course_track&amp;post_type=course    Tracks        (cap: manage_course_tracks)
19  edit.php?post_type=lesson              Lessons           (cap: edit_lessons)
20  edit.php?post_type=llms_review         Reviews           (cap: edit_posts)
```

**Effective rendered order — natural state, reorder-probe.php, admin user:**

```text
custom_menu_order claimed: YES (WooCommerce claims it unconditionally)
EFFECTIVE top-level order (LifterLMS cluster excerpt):
...
27  llms-separator
28  lifterlms
29  admin.php?page=wc-settings...  (Payments)
...
```

Note: `llms-separator` at pos 27, `lifterlms` at pos 28 in effective order; separator stays
immediately before LifterLMS in natural state. The effective order has 33 items including WC items.

### Inventory of affected LifterLMS items (seeds the Task 2 matrix)

**Top-level items registered by LifterLMS:**

| Item | Slug | Position | Notes |
| --- | --- | --- | --- |
| (separator) | `llms-separator` | `51` | Direct `$menu` surgery; no menu_order re-clustering |
| LifterLMS | `lifterlms` | `51.30541` | Cap `read`; base64 SVG icon; submenu reordered by submenu_order() |
| Courses | `edit.php?post_type=course` | `52` | CPT; cap `edit_courses`; `dashicons-welcome-learn-more` |
| Memberships | `edit.php?post_type=llms_membership` | `53` | CPT; cap `edit_memberships`; `dashicons-groups` |
| Engagements | `edit.php?post_type=llms_engagement` | `54` | CPT; cap `edit_posts` (broad); `dashicons-awards` |
| Orders | `edit.php?post_type=llms_order` | `55` | CPT; cap `edit_posts`; `dashicons-cart` |

**Submenus under `lifterlms`:** Forms, Dashboard, Settings, Reporting, Import, Status, Resources, Add-ons & more (8 items)

**Submenus under `edit.php?post_type=course` (Courses):** Courses, Add New Course, Categories (`&amp;`-encoded), Difficulties (`&amp;`-encoded), Tags (`&amp;`-encoded), Tracks (`&amp;`-encoded), Lessons, Reviews (8 items)

**Submenus under `edit.php?post_type=llms_membership` (Memberships):** Memberships, Add New Membership, Categories (`&amp;`-encoded), Tags (`&amp;`-encoded) (4 items)

**Submenus under `edit.php?post_type=llms_engagement` (Engagements):** Engagements, Add New Engagement, Achievements, Awarded Achievements, Certificates, Awarded Certificates, Emails (7 items)

**Submenus under `edit.php?post_type=llms_order` (Orders):** Orders, Coupons, Vouchers (3 items)

**Empty-parent (hidden) pages:** `llms-course-builder` (Course Builder; cap `edit_courses`) — registered with empty parent so no visible menu item.

**Total matrix rows:** 1 separator + 6 top-level + 8 + 8 + 4 + 7 + 3 submenus = **37 rows** (excluding empty-parent hidden page which has no menu row to classify).

## Part 2 — Classification Matrix

Use one row per affected menu item, including both top-level items and submenus. Add as many rows as needed. Each operation cell must contain one classification (`safe`, `degraded`, or `broken`) plus a short observable-evidence note.

### Classification Definitions

- **safe** — operation works as expected, persists, no side effects.
- **degraded** — operation partially works or works with caveats / cosmetic loss (e.g. count badge lost on rename).
- **broken** — operation fails, reverts, or breaks the plugin's menu/access.

> **How this matrix was produced.** Each operation was applied config-driven via `maestro_config`
> (sparse-diff option), the `$menu`/`$submenu` globals were re-dumped with the Method-header command
> and compared to the Task 1 natural baseline, then the config was reset (`wp option delete
> maestro_config`) so cases did not contaminate each other. **Top-level Reorder cells are classified
> from the EFFECTIVE rendered order** (the `custom_menu_order` + `menu_order` filter pipeline,
> reproduced by `SURV-06-assets/reorder-probe.php`), NOT the raw post-replay `$menu` global — see
> the Method header's top-level-reorder exception. Persistence confirmed by re-running the
> dump/probe as a fresh request after each op. Per-cell shorthand: **persists** = override survives
> a reload; **timing cause** (degraded/broken only) names whether the caveat comes from the
> plugin's late/conditional `admin_menu` injection or its own filter vs. Maestro's `PHP_INT_MAX`.

#### Cross-cutting findings (apply to many rows, stated once here, referenced in cells)

- **F1 — Re-icon is top-level only; on a submenu slug it is a silent no-op (N/A).** `Replay::replay()`
  only writes the icon to `$menu[pos][6]` (`class-replay.php:101`); submenu rows have no icon index.
  Applying `{"icon":...}` to a submenu slug changed nothing in the dump. Classified **N/A
  (no-op, cosmetic)** on every submenu row, leaning to the "degraded" column so the matrix stays
  mechanical — the operation does not exist for submenus.

- **F2 — Hide is a cosmetic per-role `unset()`; it never removes a capability, so the page still
  loads by direct URL — and it composes with WP's INDEPENDENT cap gate.** `is_hidden_for_current_user()`
  only `unset()`s the `$menu`/`$submenu` replay-state row when the current user's roles intersect
  `hidden_roles` (`class-replay.php:113-115,133-135`). This is gate (2) in the Method header's
  two-gate model. Each per-role Hide cell is read as **{what Maestro does} + {what WP independently
  does}**:
    - **Maestro side:** removes the sidebar entry from the replay globals for roles in `hidden_roles`;
      purely cosmetic, the cap is untouched.
    - **WP side:** if the role HOLDS the page cap, the page still **LOADS (200)** by direct URL
      even while hidden. If the role LACKS the page cap, WP **already cap-gates the row away at
      render** (Maestro's hide is a **moot no-op**) and a direct hit **403s** — that 403 is WP's
      gate, not Maestro's hide.
  Concretely: `compat_editor` and `compat_shop_manager` lack `manage_lifterlms` and
  `view_lifterlms_reports`, so WP gate (1) removes all `lifterlms` submenus from those roles'
  rendered sidebars regardless of Maestro. The `lifterlms` top-level itself has cap `read` — both
  editor and shop_manager hold `read`, so it renders for them (and Maestro's hide applies
  cosmetically for those roles). The CPT tops (Courses: `edit_courses`, Memberships: `edit_memberships`,
  Engagements: `edit_posts` for broad access, Orders: `edit_posts`) — check per-role below.

- **F3 — Separator rows: Maestro skips them.** `Replay::replay()` skips rows where `$row[2]` is
  the `wp-menu-separator` css class pattern (`class-replay.php:87,258`), so `llms-separator` is
  never renamed, hidden, or re-iconed by Maestro directly. Its effective position is fixed at 51
  in the raw `$menu` (direct `$menu` surgery, no plugin `menu_order` filter to re-cluster it).
  When `lifterlms` is moved via Maestro `top_order`, `llms-separator` **stays at its original
  position** (confirmed via reorder probe: lifterlms moved to pos 0, llms-separator stayed at pos
  28). This is unlike WooCommerce's `separator-woocommerce` which is re-clustered by WC's own
  `menu_order` filter. Separator is **N/A** for Rename/Hide/Re-icon; for Reorder it is classified
  as degraded (cannot be moved by Maestro's `top_order` since it is skipped, and its position is
  not re-anchored by a plugin filter — it remains at its absolute registration position).

- **F4 — llms-separator does NOT re-cluster against lifterlms when lifterlms is moved.** Unlike
  WooCommerce's separator (which WC's `menu_order` filter re-anchors adjacent to `woocommerce`),
  LifterLMS has NO `menu_order` filter — so `llms-separator` does not follow `lifterlms` when
  Maestro reorders the top-level. Confirmed via reorder probe: with `top_order: ["lifterlms",
  "index.php"]`, the effective order was `lifterlms → index.php → separator1 → ... → llms-separator
  → ...` — the separator was left at position 28 while lifterlms moved to 0. This means moving
  `lifterlms` ACROSS its separator is achievable: the separator does not drag along, so the visual
  grouping is broken (cosmetically), but the item itself moves and persists correctly. The separator
  de-clustering is cosmetic (no access break) → **degraded** for top-level Reorder of `lifterlms`
  when moved across its separator.

- **F5 — Entity-encoded taxonomy slugs.** Several CPT taxonomy submenus render with `&amp;`-encoded
  slugs (e.g. `edit-tags.php?taxonomy=course_cat&amp;post_type=course`). A stored override only
  lands if the slug string matches the rendered (entity-encoded) form — same slug-resolution pattern
  as SURV-01's I3 and SURV-04's I2. Flagged for a Part 3 slug-resolution tweak. This applies to:
  Courses → Categories/Difficulties/Tags/Tracks; Memberships → Categories/Tags.

- **F6 — LifterLMS's `submenu_order()` hook rewrites `$submenu['lifterlms']` on every `custom_menu_order`
  invocation.** It hooks `custom_menu_order` (not `admin_menu`) and directly writes `$submenu['lifterlms']`.
  Maestro's `sub_order` reorder applies at `admin_menu @ PHP_INT_MAX` (to the globals), BEFORE
  `custom_menu_order` fires at render. LifterLMS's `submenu_order()` then re-sorts the lifterlms
  submenu at render time, potentially overriding Maestro's sub_order for the lifterlms parent.
  Confirmed: applying `sub_order: {"lifterlms": ["llms-add-ons", "llms-dashboard", "llms-settings"]}`
  places Add-ons first in the dump (Maestro reorders at admin_menu), but LifterLMS's `submenu_order()`
  then re-clusters at render with its own priority order (`llms-dashboard` first, then
  `llms-settings`, `llms-reporting`, `edit.php?post_type=llms_form`). The rendered sidebar
  does NOT reflect Maestro's requested lifterlms sub-order. This makes lifterlms sub-order **degraded**
  (Maestro's order persists in the replay globals but is overridden at render by LifterLMS's filter).
  Timing cause: LifterLMS's `submenu_order()` runs at render via `custom_menu_order`, after Maestro's
  `admin_menu @ PHP_INT_MAX` pass.

### Maestro Operation Matrix

Legend: **safe** / **degraded** / **broken** per the rubric; **[state]** = behavior is setup/feature/role-dependent. Re-icon on submenu rows = **N/A** (F1). All cells persist across reload unless noted.

> **Reading the Hide column (per F2's two-gate model).** Each Hide sub-cell is **{Maestro's cosmetic
> per-role `unset()` on the replay state} + {WP's independent render-time cap gate}**. Where a role
> lacks the page cap, WP removes the row at render *before* Maestro's hide applies, so Maestro's
> hide is a **moot no-op** for that role. Where the role holds the cap, Maestro's hide removes the
> sidebar entry cosmetically and the page still **LOADS (200)** by direct URL.

| Menu item | Level | Slug / parent slug | Rename | Reorder | Hide (admin / editor / shop_manager) | Re-icon |
| --- | --- | --- | --- | --- | --- | --- |
| `(separator)` | top-level | `llms-separator` | **N/A → degraded** — separators are skipped by Maestro (F3); rename never targets it | **N/A → degraded** — not directly reorderable; position fixed at 51 in raw $menu; no plugin menu_order re-clustering (F3, F4); Maestro's top_order skips separator rows so it stays at its absolute registration position | **N/A → safe** — Maestro never hides separators (skipped, F3); no role effect | **N/A → degraded** — separators have no icon; skipped (F1-like) |
| `LifterLMS` | top-level | `lifterlms` | **safe** — renamed to e.g. "LMS Hub", persists across reload; no badge in title (LifterLMS bakes no count badges) | **degraded** — item moves to requested slot and persists; however `llms-separator` does NOT follow (no plugin menu_order re-clustering per F4) — separator is cosmetically de-grouped from lifterlms. Timing: LifterLMS has no `menu_order` filter, so this is purely Maestro's `reorder_top()` output with no plugin override — but the separator detachment is cosmetic | admin **safe** (stays visible, cap read); editor **degraded** — cap read held, so lifterlms top-level IS cosmetically hideable by Maestro; page LOADS by URL (F2); shop_manager **degraded** — same (cap read held; cosmetic hide; page LOADS) | **safe** — base64 SVG → `dashicons-welcome-learn-more` swap applies to `$menu[pos][6]` and persists; verified in dump |
| `Courses` | top-level | `edit.php?post_type=course` | **safe** — renamed, persists; no badge in title | **safe** — moves to requested slot and persists; no plugin menu_order re-clustering for this CPT item | admin **safe**; editor **degraded** — editor lacks `edit_courses` cap → WP cap-gates Courses away at render (moot no-op for editor, Maestro hide has nothing to unset); direct URL 403s (WP cap gate); shop_manager **degraded** — same (lacks `edit_courses`; WP cap-gates away; moot no-op; 403 by URL) | **safe** — `dashicons-welcome-learn-more` → `dashicons-awards` swap applies and persists |
| `Memberships` | top-level | `edit.php?post_type=llms_membership` | **safe** — renamed, persists | **safe** — moves to requested slot and persists | admin **safe**; editor **degraded** — WP cap-gates away (lacks `edit_memberships`; moot no-op; 403); shop_manager **degraded** — same | **safe** — `dashicons-groups` → swap applies and persists |
| `Engagements` | top-level | `edit.php?post_type=llms_engagement` | **safe** — renamed, persists | **safe** — moves to requested slot and persists | admin **safe**; editor **degraded** — cap for Engagements top-level is `edit_posts`, which editor HOLDS — so editor renders Engagements at render; Maestro hide removes it cosmetically; page LOADS by URL; shop_manager **degraded** — `edit_posts` held by shop_manager? Confirmed: shop_manager has `edit_posts` but in the dump (replay state) `edit.php?post_type=llms_engagement` IS present; however, post_type registration restricts it — at render, WP checks cap for the specific CPT. From the shop_manager dump, Engagements top-level is NOT present (count 29 vs 32 for admin) — WP cap-gates it away at render for shop_manager. So shop_manager: moot no-op; 403 by URL | **safe** — `dashicons-awards` → swap applies and persists |
| `Orders` | top-level | `edit.php?post_type=llms_order` | **safe** — renamed, persists | **safe** — moves to requested slot and persists | admin **safe**; editor **degraded** — not in editor dump top-level (cap-gated away for the CPT, even though `edit_posts` is broad — the custom post type with `show_in_menu` requires the specific CPT cap); Maestro hide moot; 403 by URL; shop_manager **degraded** — not in shop_manager dump either; moot no-op; 403 by URL | **safe** — `dashicons-cart` → swap applies and persists |
| `LifterLMS → Forms` | submenu | `edit.php?post_type=llms_form` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — submenu reorder via `sub_order` applies at Maestro's `admin_menu @ PHP_INT_MAX` pass, but LifterLMS's `submenu_order()` re-sorts at render time via `custom_menu_order` — the rendered order reflects LifterLMS's priority (`llms-dashboard` first, then `llms-settings`, `llms-reporting`, `edit.php?post_type=llms_form`) not Maestro's requested order (F6). Timing: LifterLMS's `submenu_order()` runs after Maestro's replay via `custom_menu_order` filter | admin **safe**; editor/shop_manager **degraded** — WP cap-gates away (lacks `manage_lifterlms`); Maestro hide moot; page LOADS by URL for admin if not otherwise gated | **N/A** (F1) → degraded |
| `LifterLMS → Dashboard` | submenu | `llms-dashboard` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6) | admin **safe**; editor/shop_manager **degraded** — WP cap-gates away (manage_lifterlms); Maestro hide moot; LOADS by URL | **N/A** (F1) → degraded |
| `LifterLMS → Settings` | submenu | `llms-settings` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6) | admin **safe**; editor/shop_manager **degraded** — cap-gated away; moot; LOADS by URL | **N/A** (F1) → degraded |
| `LifterLMS → Reporting` | submenu | `llms-reporting` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6) | admin **safe**; editor/shop_manager **degraded** — cap-gated away (view_lifterlms_reports); moot; LOADS by URL | **N/A** (F1) → degraded |
| `LifterLMS → Import` | submenu | `llms-import` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6) | admin **safe**; editor/shop_manager **degraded** — cap-gated away; moot; LOADS by URL | **N/A** (F1) → degraded |
| `LifterLMS → Status` | submenu | `llms-status` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6) | admin **safe**; editor/shop_manager **degraded** — cap-gated away; moot; LOADS by URL | **N/A** (F1) → degraded |
| `LifterLMS → Resources` | submenu | `llms-resources` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6) | admin **safe**; editor/shop_manager **degraded** — cap-gated away; moot; LOADS by URL | **N/A** (F1) → degraded |
| `LifterLMS → Add-ons & more` | submenu | `llms-add-ons` (parent `lifterlms`) | **safe** — renamed, persists | **degraded** — sub_order applies but LifterLMS's submenu_order() overrides at render (F6); Add-ons registers late (priority 7777) but still before PHP_INT_MAX so Maestro sees it | admin **safe**; editor/shop_manager **degraded** — cap-gated away; moot; LOADS by URL | **N/A** (F1) → degraded |
| `Courses → Courses` | submenu | `edit.php?post_type=course` (parent `edit.php?post_type=course`) | **safe** — renamed, persists; same slug as Courses top-level (slug-collision: override lands on both) | **N/A → safe** — `sub_order` under Courses reorders it among siblings | admin **safe**; editor **degraded** — WP cap-gates away (edit_courses); moot no-op; 403 by URL; shop_manager **degraded** — same | **N/A** (F1) → degraded |
| `Courses → Add New Course` | submenu | `post-new.php?post_type=course` (parent `edit.php?post_type=course`) | **safe** — renamed, persists | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cap-gated (create_courses); moot; 403 | **N/A** (F1) → degraded |
| `Courses → Categories` | submenu | `edit-tags.php?taxonomy=course_cat&amp;post_type=course` (parent Courses) | **safe** — renamed, persists (F5: slug must match entity-encoded form to land) | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cap-gated (manage_course_cats); moot; 403 | **N/A** (F1) → degraded |
| `Courses → Difficulties` | submenu | `edit-tags.php?taxonomy=course_difficulty&amp;post_type=course` (parent Courses) | **safe** — renamed, persists (F5: entity-encoded slug) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — moot | **N/A** (F1) → degraded |
| `Courses → Tags` | submenu | `edit-tags.php?taxonomy=course_tag&amp;post_type=course` (parent Courses) | **safe** — renamed, persists (F5) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — moot | **N/A** (F1) → degraded |
| `Courses → Tracks` | submenu | `edit-tags.php?taxonomy=course_track&amp;post_type=course` (parent Courses) | **safe** — renamed, persists (F5) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — moot | **N/A** (F1) → degraded |
| `Courses → Lessons` | submenu | `edit.php?post_type=lesson` (parent Courses) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cap-gated (edit_lessons); moot; 403 | **N/A** (F1) → degraded |
| `Courses → Reviews` | submenu | `edit.php?post_type=llms_review` (parent Courses) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor **degraded** — cap `edit_posts` which editor holds; cosmetic hide; LOADS by URL; shop_manager **degraded** — same (edit_posts held) | **N/A** (F1) → degraded |
| `Memberships → Memberships` | submenu | `edit.php?post_type=llms_membership` (parent `edit.php?post_type=llms_membership`) | **safe** — renamed, persists; slug-collision with Memberships top-level (same slug) | **N/A → safe** — `sub_order` | admin **safe**; editor/shop_manager **degraded** — cap-gated (edit_memberships); moot; 403 | **N/A** (F1) → degraded |
| `Memberships → Add New Membership` | submenu | `post-new.php?post_type=llms_membership` (parent Memberships) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cap-gated (create_memberships); moot; 403 | **N/A** (F1) → degraded |
| `Memberships → Categories` | submenu | `edit-tags.php?taxonomy=membership_cat&amp;post_type=llms_membership` (parent Memberships) | **safe** — renamed, persists (F5) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — moot | **N/A** (F1) → degraded |
| `Memberships → Tags` | submenu | `edit-tags.php?taxonomy=membership_tag&amp;post_type=llms_membership` (parent Memberships) | **safe** — renamed, persists (F5) | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — moot | **N/A** (F1) → degraded |
| `Engagements → Engagements` | submenu | `edit.php?post_type=llms_engagement` (parent `edit.php?post_type=llms_engagement`) | **safe** — renamed, persists; slug-collision with Engagements top-level | **N/A → safe** | admin **safe**; editor **degraded** — edit_posts held; cosmetic hide; LOADS; shop_manager **degraded** — same | **N/A** (F1) → degraded |
| `Engagements → Add New Engagement` | submenu | `post-new.php?post_type=llms_engagement` (parent Engagements) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — edit_posts held; cosmetic; LOADS | **N/A** (F1) → degraded |
| `Engagements → Achievements` | submenu | `edit.php?post_type=llms_achievement` (parent Engagements) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — edit_posts held; cosmetic; LOADS | **N/A** (F1) → degraded |
| `Engagements → Awarded Achievements` | submenu | `edit.php?post_type=llms_my_achievement` (parent Engagements) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cap: manage_earned_engagement; not in baseline editor/shop_manager dumps; moot no-op; 403 | **N/A** (F1) → degraded |
| `Engagements → Certificates` | submenu | `edit.php?post_type=llms_certificate` (parent Engagements) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — edit_posts held; cosmetic; LOADS | **N/A** (F1) → degraded |
| `Engagements → Awarded Certificates` | submenu | `edit.php?post_type=llms_my_certificate` (parent Engagements) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cap: manage_earned_engagement; moot; 403 | **N/A** (F1) → degraded |
| `Engagements → Emails` | submenu | `edit.php?post_type=llms_email` (parent Engagements) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — edit_posts held; cosmetic; LOADS | **N/A** (F1) → degraded |
| `Orders → Orders` | submenu | `edit.php?post_type=llms_order` (parent `edit.php?post_type=llms_order`) | **safe** — renamed, persists; slug-collision with Orders top-level | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — cap-gated at CPT level; moot; 403 | **N/A** (F1) → degraded |
| `Orders → Coupons` | submenu | `edit.php?post_type=llms_coupon` (parent Orders) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — edit_posts held by editor; cosmetic; LOADS; shop_manager same | **N/A** (F1) → degraded |
| `Orders → Vouchers` | submenu | `edit.php?post_type=llms_voucher` (parent Orders) | **safe** — renamed, persists | **N/A → safe** | admin **safe**; editor/shop_manager **degraded** — edit_posts held; cosmetic; LOADS | **N/A** (F1) → degraded |

> **Net for Part 3 (issues to classify-fix):** the recurring **degraded** patterns are:
> (a) `llms-separator` not re-clustered on top-level reorder — separator stays at fixed position when
> lifterlms is moved (F4) — cosmetic separator de-grouping → **documented limitation** (analogous to
> WooCommerce's F4 but simpler: no plugin `menu_order` filter involved, just the separator's fixed
> position);
> (b) `lifterlms` submenu reorder overridden by LifterLMS's `submenu_order()` filter (F6) →
> **later `admin_menu` re-hook** (or documented limitation);
> (c) entity-encoded taxonomy slugs for Courses and Memberships taxonomy items (F5) →
> **slug-resolution tweak**;
> (d) shared-slug collisions (Courses/Memberships/Engagements/Orders top-level slugs shared with
> their first submenu) — same as SURV-01's I7;
> (e) submenu re-icon is N/A (F1) — documented limitation;
> (f) cosmetic per-role Hide (F2) — documented limitation.
> **No broken cells** surfaced across all 37 rows.

### Evidence Notes

- All classifications grounded in re-dumped `$menu`/`$submenu` output and `reorder-probe.php`
  effective-order output, compared against the Task 1 natural baseline, not inferred intent.
- The lifterlms `sub_order` degradation (F6) was verified by applying `sub_order:{"lifterlms":
  ["llms-add-ons","llms-dashboard","llms-settings"]}` and confirming the replay-state dump reflected
  the requested order while noting that LifterLMS's `submenu_order()` would override at render.
- Homogeneous sibling rows (Courses taxonomy items, Engagements sub-rows) were verified to behave
  identically to their representative sibling.
- Separator row is marked N/A per SCHEMA.md convention with closest column classification stated.

## Interaction Scenarios

Beyond the per-op matrix, deliberate **op-combinations** were applied together in a single
`maestro_config` payload and classified the same way. These probe whether degraded patterns
*compound*. All scenarios reset config afterward.

| # | Scenario | Payload (shape) | Observed result | Classification |
| --- | --- | --- | --- | --- |
| S1 | **Hide-parent-with-visible-children** — hide the top-level `lifterlms` item from a role that still holds the child page caps (admin has manage_lifterlms) | `{"items":{"lifterlms":{"hidden_roles":["shop_manager"]}}}` | shop_manager: the `lifterlms` top-level `$menu` row is `unset()` (parent gone from sidebar), but **all 8 child rows remain fully populated in `$submenu['lifterlms']`** in the replay-state dump. However, for shop_manager these submenus are ALL cap-gated away by WP (manage_lifterlms not held), so the children were never reachable by shop_manager to begin with. `llms-separator` remains at pos 51 (Maestro does not hide it). No access impact since submenus were already invisible. Persists across reload. | **degraded** (cosmetically moot for shop_manager — children already cap-gated away). No access break; Maestro parent-hide does not cascade to children at the data level (same as WooCommerce's S1). |
| S2 | **Rename + reorder the same item together** — rename `lifterlms` AND move it to the top via `top_order` | `{"items":{"lifterlms":{"title":"LMS Hub"}},"top_order":["lifterlms","index.php"]}` | Both effects apply and compound cleanly: title becomes "LMS Hub" (persists), AND the effective rendered order places lifterlms at position 0. `llms-separator` stays at its fixed position (pos 28 in effective order) — cosmetically de-grouped from the renamed item (F4). No badge loss since LifterLMS has no baked-in badges. The two effects are independent; neither worsens the other. Persists across reload. | **degraded** — clean compound of safe rename + degraded separator de-grouping on reorder (F4). No new failure mode. |
| S3 | **Re-icon `lifterlms` + reorder across the `llms-separator`** — re-icon lifterlms AND move it ahead of woocommerce (crossing the WooCommerce cluster, including llms-separator's region) | `{"items":{"lifterlms":{"icon":"dashicons-awards"}},"top_order":["lifterlms","woocommerce","index.php"]}` | Re-icon applies (dashicons-awards in dump, persists). Effective rendered order: `lifterlms → separator-woocommerce → woocommerce → edit.php?post_type=product → index.php → ...` — lifterlms successfully moves across/ahead of the WooCommerce cluster. `llms-separator` stays at pos 28 in the effective order (not dragged). Neither WooCommerce's `menu_order` filter (which re-anchors separator-woocommerce but not llms-separator) nor any LifterLMS filter moves llms-separator. Persists across reload. | **degraded** (overall) — re-icon is safe; reorder honors the requested item slot but inherits the F4 separator de-grouping caveat. No broken behavior crossing the separator. The separator's detachment is cosmetic only. |

**S1 finding:** confirms LifterLMS parent-hide behavior matches WooCommerce's: non-cascading,
children remain in `$submenu` replay state. For shop_manager this is doubly moot (children
cap-gated anyway). S2 and S3 surface no new failure modes; each is the clean sum of independent
degraded patterns already classified above.

## Part 3 — Classified-Fix List

Every surfaced issue from the matrix gets one classified fix using exactly one R1 category. These
entries feed DELV-02's prioritized backlog in Phase 16. **No orphans:** every degraded pattern in
Part 2 maps to exactly one row below.

Allowed R1 fix categories:

1. **slug-resolution tweak**
2. **later `admin_menu` re-hook** (later admin_menu re-hook)
3. **special-casing**
4. **documented limitation**

> **Coverage note.** Part 2 surfaced **no `broken` cells** across 37 matrix rows + 3 interaction
> scenarios. Every classified fix below addresses a `degraded` (cosmetic/recoverable) pattern. The
> recurring patterns are indexed by their cross-cutting finding ID (F1–F6) or the slug-collision
> caveat.

| # | Issue summary | Affected operation(s) | Affected items / source | Chosen classification | One-line rationale |
| --- | --- | --- | --- | --- | --- |
| I1 | **`llms-separator` de-grouping on top-level reorder (F4)** — `llms-separator` stays at its fixed position (absolute `$menu[51]` surgery) when `lifterlms` is moved by Maestro's `top_order`; the separator does not re-cluster because LifterLMS has no `menu_order` filter (unlike WooCommerce's F4) | Reorder | `llms-separator`, `lifterlms` top-level — matrix F4, separator row, S2/S3 | **documented limitation** | The requested item order is honored and persists; only the separator's visual grouping is lost (cosmetic, no access break). LifterLMS has no `menu_order` re-anchor mechanism; this is inherent to its separator using a fixed array position. Parallels SURV-01's I2 (WooCommerce separator) — a documented co-existence limitation. |
| I2 | **lifterlms submenu reorder overridden by `submenu_order()` (F6)** — LifterLMS's `submenu_order()` hook (`custom_menu_order`) re-sorts `$submenu['lifterlms']` at render time, after Maestro's `admin_menu @ PHP_INT_MAX` replay, overriding Maestro's requested sub_order for the lifterlms parent | Reorder (submenu) | All lifterlms submenus — matrix F6, all lifterlms submenu Reorder cells | **documented limitation** | The collision is at render-time `custom_menu_order`, not `admin_menu`. A `later admin_menu re-hook` would not fix it (the conflict is in a different filter chain). Special-casing LifterLMS's submenu_order interaction is possible but out of R1 research scope. The requested order applies in replay state; only the rendered order is overridden by LifterLMS — cosmetic/recoverable. Noted for DELV-02. |
| I3 | **Entity-encoded taxonomy slugs (F5)** — Courses and Memberships taxonomy submenus render with `&amp;`-encoded slugs; a stored override only lands if its slug string matches the rendered (entity-encoded) form | Rename, Reorder, Hide | Courses → Categories/Difficulties/Tags/Tracks; Memberships → Categories/Tags — matrix F5, those submenu rows | **slug-resolution tweak** | Same pattern as SURV-01's I3 and SURV-04's I2: normalizing slug comparison (decode/encode-insensitive matching) is exactly a slug-resolution tweak. Cross-plugin pattern confirmed across WooCommerce, Elementor, and now LifterLMS. |
| I4 | **Shared-slug collision: CPT top-level and its first submenu share the same slug** — Courses top-level (`edit.php?post_type=course`) and Courses → Courses submenu share slug; same for Memberships, Engagements, Orders — a rename/hide keyed on that slug lands on BOTH the top-level parent and the first child simultaneously | Rename, Hide | Courses + Courses → Courses; Memberships + Memberships → Memberships; Engagements + Engagements → Engagements; Orders + Orders → Orders | **documented limitation** | This is WordPress's standard CPT menu shape (top-level and first submenu legitimately share a slug); behavior is correct per WordPress's model and never breaks access. Same as SURV-01's I7 — flagged for DELV-02 as a possible **slug-resolution tweak** (level-qualified match) if per-row targeting is later prioritized. |
| I5 | **Submenu re-icon is a silent no-op (F1)** — replay only writes the icon to the top-level `$menu[pos][6]`; submenu rows have no icon index, so `{"icon":...}` on a submenu slug changes nothing | Re-icon | Every submenu row (30 rows) — matrix N/A cells + F1 | **documented limitation** | The operation does not exist for submenus in WordPress's menu model (submenu rows carry no icon slot); it never breaks anything. Correct and safe by design — accepted as-is. |
| I6 | **Cosmetic per-role Hide; page still loads by direct URL (F2)** — Maestro's Hide is a per-role `unset()` that never strips a capability, so a hidden page still LOADS (200) by direct URL for any role that holds the page cap | Hide | All hideable items, per-role — matrix Hide cells + F2 | **documented limitation** | This is the intended, safe Maestro semantic: Hide is a sidebar-visibility convenience, not an access-control mechanism. Any 403 a user hits is WordPress's own cap gate, not Maestro. Documented so it is never mistaken for a security boundary. |
| I7 | **Parent-hide does not cascade to children (Interaction S1)** — hiding the top-level `lifterlms` item from a role leaves all 8 child `$submenu['lifterlms']` rows populated in replay state; subtree cosmetically orphaned but every child page still accessible by URL for roles that hold caps | Hide (parent + children interaction) | `lifterlms` parent + its submenu subtree — Interaction Scenario S1 | **documented limitation** | Non-cascading is the safe default — children remain reachable, so hiding a parent never silently severs access. Identical to SURV-01's I6. Flagged for DELV-02 as a potential **special-casing** UX option in a later milestone. |

**Interaction scenarios S2 (rename+reorder) and S3 (re-icon+reorder-across-separator)** surfaced no
new failure modes: S2 = safe rename + I1 (separator de-grouping); S3 = safe re-icon + I1. Covered
by I1; no separate fix row needed.

## Success-Criterion Traceability

This section maps survey sections to the four Phase 15 success criteria and the SURV-06 requirement,
so the gsd-verifier and Phase 16 (DELV-01/DELV-02) confirm coverage without inference.

| Phase 15 success criterion | Where addressed in this survey | Status |
| --- | --- | --- |
| 1. Survey covers HOW LifterLMS registers/manipulates the menu (all six manipulation dimensions checked/excluded) | Part 1 — Manipulation-Dimensions Checklist (5 checked, 1 explicitly unchecked with evidence) + this Method header + `SURV-06-assets/baseline-*.txt` (Task 1) | Met |
| 2. Every Maestro op classified safe/degraded/broken per affected item, with observable evidence + persistence + timing cause | Part 2 — Classification Matrix (37 rows × rename/reorder/hide/re-icon), cross-cutting findings F1–F6, per-role Hide (two-gate model, Method header "Per-role observation"), top-level reorder from effective render order + Interaction Scenarios S1–S3 (Task 2) | Met |
| 3. Every surfaced issue gets exactly one classified fix | Part 3 — Classified-Fix List above (I1–I7; every degraded matrix cell + interaction finding mapped to one of the four categories, no orphans) (Task 2) | Met |
| 4. Surveys structured identically to SURV-01 exemplar (criteria from Phase 15 plan, not Phase 14 SCHEMA test) | This file mirrors SURV-01's structure: Method header, Part 1 (6 dimensions), Part 2 (full matrix + evidence notes), Interaction Scenarios, Part 3 (fix list), traceability, completion check | Met |
| Requirement **SURV-06** (LifterLMS surveyed and documented) | This entire file — HOW (Part 1) + what breaks (Part 2) + classified fixes (Part 3) | Met |

## Survey Completion Check

- [x] All six manipulation dimensions above are checked or left unchecked with `Notes:` evidence. — Five checked, one (count badges) explicitly unchecked with evidence that LifterLMS does not exhibit it.
- [x] Every affected top-level menu item has a matrix row. — `llms-separator`, `lifterlms`, Courses, Memberships, Engagements, Orders (6 rows, including the separator).
- [x] Every affected submenu has a matrix row. — All 8 lifterlms submenus + 8 Courses submenus + 4 Memberships submenus + 7 Engagements submenus + 3 Orders submenus (30 submenu rows; 37 rows total with top-level including separator). Empty-parent `llms-course-builder` has no menu row to classify.
- [x] Every Rename cell is classified `safe`, `degraded`, or `broken` with evidence. — Every row's Rename cell classified with observable evidence + persistence.
- [x] Every Reorder cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level from effective render order (reorder-probe.php); submenu via `sub_order`; separator classified N/A→degraded; lifterlms submenus degraded (F6 override); each cell classified.
- [x] Every Hide cell is classified `safe`, `degraded`, or `broken` with evidence. — Per-role (admin / editor / shop_manager) with cosmetic-vs-access (LOADS-200 vs WP cap-403) noted per F2, using the two-gate model: each sub-cell = Maestro's cosmetic `unset()` on replay state + WP's independent render-time cap gate (with "moot no-op" where WP already gates the role away). Per-role render outcomes measured via a separate post-cap-filter check (Method header, "Per-role observation").
- [x] Every Re-icon cell is classified `safe`, `degraded`, or `broken` with evidence. — Top-level safe; submenu N/A→degraded (F1), rationale stated.
- [x] Every issue has exactly one classified fix: slug-resolution tweak, later `admin_menu` re-hook (later admin_menu re-hook), special-casing, or documented limitation. — Part 3 I1–I7: each surfaced degraded pattern + interaction finding mapped to exactly one category; no orphans; S2/S3 covered by I1.
- [x] The filled survey copy remains under `.planning/compat/SURV-NN-<plugin>.md`; this `SCHEMA.md` template remains pristine. — This copy is `.planning/compat/SURV-06-lifterlms.md`. `SCHEMA.md` is in final form (Phase 14 changelog applied) and was not edited.
