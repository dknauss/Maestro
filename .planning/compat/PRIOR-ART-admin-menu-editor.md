# Prior-Art Analysis — Admin Menu Editor (Jānis Elsts / w-shadow)

**Status:** Research spike complete — pulled forward from v1.5 backlog to feed **Phase 20 (COMPAT-04/07/10)**.
**Date:** 2026-08-01
**AME version studied:** free `admin-menu-editor` **1.15.1** (source read from the official zip; line refs below are to that build's `includes/`).
**Framing:** adopt / avoid / differentiate — per the captured todo `todos/completed/2026-07-05-research-admin-menu-editor-prior-art.md`.
**Maestro baseline:** v1.3.1 (WP 6.4+, PHP 7.4). Architecture per `SPEC.md` + `includes/class-{replay,slug,ordering,config}.php`.

---

## TL;DR verdict

AME is the deepest prior art in this space (300k+ installs, ~10 yrs), and it has already
solved — or paid for the sharp corners of — most of Maestro's hard problems. Three findings dominate:

1. **AME keys menu items by `parent>child`, server-side — never by DOM index.** This gives it two
   things Maestro lacks: (a) a level-qualified override key that resolves shared-slug top/submenu
   collisions (**COMPAT-04**), and (b) freedom from any DOM-index association. These are *two
   distinct fixes*: Maestro should adopt the qualified key **and** separately harden its
   index-based `.wp-submenu` DOM-join — the qualified key alone does not fix the DOM side.
2. **AME conflates hiding with access control** (it rewrites caps to `do_not_allow` and can
   `wp_die()` a page). That conflation is its #1 recurring user-confusion category. Maestro's
   provably **cosmetic-only** guarantee is its cleanest **differentiate** — do not follow AME here.
3. **AME's "full rebuild, but only live during menu paint, then restore the originals"** is a
   genuinely clever technique worth understanding — Maestro's sparse-splice + delegate-to-core
   model is far simpler and should stay. But "delegate to core" is not automatically coexistence-
   safe: `has_top_order()` currently overrides other plugins' `custom_menu_order` (see table +
   Phase 20 note). Keep the delta model; fix the pass-through.

---

## Architecture comparison (7 dimensions)

| Dimension | Maestro (v1.3.1) | Admin Menu Editor (1.15.1) |
|---|---|---|
| **Menu identity** | Raw `menu_slug` (globals idx 2) as opaque key; `Slug::normalize()` at **resolve time only** (host-move, `ver=`, `utm_*`, `&amp;` drift), storage stays raw. Two-axis collision guards (`class-replay.php`). | **Template ID string** `parent_file . '>' . item_file` (`menu-item.php: template_id()`), computed and **stored**; strips site-URL, `return=`, maps alternate parents, `[ame-no-slug]` sentinel. Separators get a counter `separator_N`. |
| **Apply model** | **Sparse overlay/delta**. Splice `$menu`/`$submenu` in place on `admin_menu` @ `PHP_INT_MAX`; top-order delegated to core's `custom_menu_order`/`menu_order` filters. Reset = `delete_option`. | **Full rebuild**. Snapshot on `admin_menu` @ `PHP_INT_MAX-10`, merge stored tree vs live defaults, but swap globals **only at render time** (`submenu_file` filter @1001 → `replace_wp_menu`, `restore_wp_menu` on `adminmenu`). Originals stay live the rest of the request. |
| **Submenu targeting** | **Index-based DOM-join** — client zips localized submenu array to `.wp-submenu > li` by index (`assets/maestro.js`). E2E-only tested; **the fragile seam** (`TESTING.md`, `SPEC.md`). | **Slug-within-parent**, server-side (`merge_children()` via `template_id`). No index reliance. Moved items get `file` rewritten to fully-qualified default URL. |
| **Visibility / access** | **Cosmetic-only**, enforced by omission. `hidden_roles` per-role; `is_hidden_for_current_user()` → `unset()` the row. Never touches caps or page gates. | **Both.** Cosmetic `hidden` flag **and** real access control: `set_final_menu_capability()` rewrites to `do_not_allow`; `user_can_access_current_page()` → `admin_page_access_denied` + `wp_die()`. Per-role/user **grant** = virtual caps via `user_has_cap` (grant is Pro). |
| **Hook order / coexistence** | Runs last (`PHP_INT_MAX`); routes top-order through core's `custom_menu_order`/`menu_order`. **Caveat (found in review):** `has_top_order()` ignores the incoming filter value and returns a hardcoded `! empty(top_order)` (`class-replay.php:274-277`) — its docblock's "pass through" intent is *not* implemented, so with no stored order it forces `false` and **can override** an earlier plugin that enabled custom ordering. Splices, never rebuilds. | Snapshots on `admin_menu` @ `PHP_INT_MAX-10` (captures plugins hooking *earlier*), then swaps globals only at render and restores after — avoiding permanent clobber. **Caveat:** anything hooking *later* — including Maestro's own replay @ `PHP_INT_MAX` — mutates after AME's snapshot; if both are installed, AME re-swaps its rebuilt menu at paint over Maestro's changes (untested interaction). Ships **named compat shims** (Shopp, WooCommerce, bbPress, Divi, UIPress, Ozh…). |
| **Highlighting (reparent)** | N/A — reparenting is deliberately out of scope in v1 (`SPEC.md:194`, gated on a highlighting strategy). | **Dual**: server `get_current_menu_item()` best-URL match + client `js/menu-highlight-fix.js` re-applies `current`/`wp-has-current-submenu` after DOM ready. |
| **Storage** | Single `maestro_config` option; sparse `{items:{slug:{title?,icon?,hidden_roles?}}, top_order, sub_order}`. | Single `ws_menu_editor` option; **full serialized tree** (`ameMenu` format v8.0), delta-compressed against defaults, optional zlib; carries prebuilt virtual caps. |

**Code mass:** AME is one ~5,900-line central class `WPMenuEditor` + ~89 classes (modules, CSS parser, actors, customizables). Maestro is ~8 small single-responsibility classes. Maestro's simplicity is a maintenance asset; AME's changelog is a long tail of one-off compat patches (see below).

**Requirements:** AME 1.15.1 = WP 5.9+ / PHP 7.4+ (floors raised repeatedly to shed deprecation churn). Maestro = WP 6.4+ / PHP 7.4 — same PHP floor.

---

## Adopt

- **A1 — Parent-scoped override identity (`parent>child`).** AME's `template_id` proves the robust
  pattern: a submenu item's identity includes its parent, so a top-level slug and a same-named
  submenu slug are *distinct override keys*. This fixes the **override-namespace** collision
  (COMPAT-04). It does **not** fix Maestro's *DOM-association* problem — the client still zips
  `node.submenu` to `.wp-submenu` rows by index, so a qualified key attached to a mis-zipped row
  still lands wrong. Treat as two separate fixes (A1 + A1b). See **Phase 20** below.
- **A1b — Stable submenu DOM association (distinct from A1).** The index-zip in `assets/maestro.js`
  is the residual fragility. A durable fix binds each localized submenu entry to its rendered
  `<li>` by a *stable attribute* (e.g. the child anchor's `href`/resolved slug) rather than array
  position. AME sidesteps this entirely by never touching the DOM (server-side render swap);
  Maestro's inline model needs an explicit DOM key of its own.
- **A2 — Separate the editable label from surrounding title markup.** AME keeps the WP-generated
  title (with count bubbles) in `defaults` and only substitutes a *custom* title when set; its
  editor field strips tags (`sanitizeMenuTitle`) for display only. The transferable idea for
  **COMPAT-07**: edit only the human-readable **text node(s)** and preserve the markup *around*
  them — not merely a trailing suffix, since some fixtures *wrap* the label (e.g. WPForms
  `<span style="color:#f18500">Addons</span>`).
- **A3 — Client-side highlight-fix as a known technique** (`menu-highlight-fix.js`) — bank this for
  the v2 reparenting work `SPEC.md:194` already gates on a highlighting strategy. Not needed now.
- **A4 — Snapshot-last, restore-after as a mental model.** AME's swap-only-during-paint trick is
  the reference solution *if* Maestro ever needs a full rebuild. It shows how to get rebuild
  semantics without permanently clobbering other plugins' page callbacks.

## Avoid

- **V1 — Do NOT conflate hiding with access control.** AME's `do_not_allow` rewrite + `wp_die()`
  page-blocking is the root of its most common user-confusion complaints ("menu item disappeared",
  "Forbidden editing menus", "Profile vanished for non-admins"). Maestro's cosmetic-only guarantee
  is a feature, not a limitation — keep hiding = `unset()` the row, never a cap change. This is the
  ROLE-01/ROLE-02 guardrail and it is *correct*.
- **V2 — Do NOT adopt a stored full-tree.** AME must serialize the whole menu, then delta-compress
  it, then reconcile `missing`/`unused` templates every load. Maestro's sparse overlay gets reset,
  churn-resilience, and "upstream label changes shine through untouched items" for free
  (`SPEC.md:210`). Don't trade that away.
- **V3 — Do NOT accrete per-plugin compat shims.** AME hard-codes named workarounds (Shopp, Divi,
  UIPress…). Maestro's `Slug::normalize()` + `Ordering` degrade-gracefully contract is the more
  durable strategy; invest there instead of a shim list.

## Differentiate

- **D1 — Inline, on-the-real-menu editing.** AME edits on a separate settings screen. Maestro's
  premise (edit the live sidebar in place) is a genuine UX gap AME does not fill — the core story.
- **D2 — Provably-cosmetic per-user hiding (Phase 21).** AME's per-user is a Pro *grant* feature
  (access control). Maestro can ship per-user hiding that is *safe by construction* — the opposite
  market position, and a cleaner one.
- **D3 — Free parity on AME's paywalled basics.** Market-gap signals (below): import/export,
  drag-between-levels (reparenting), and per-role deny are all either Pro-gated or fragile in AME.
  Maestro's own backlog (`config-presets-export-import`, reparenting v2) lines up to undercut these
  for free.

---

## Phase 20 direct inputs (COMPAT-04 / 07 / 10)

- **COMPAT-04 (shared-slug top-level/submenu collision).** Per `BACKLOG.md` COMPAT-04, when a CPT
  top-level and its first submenu share a slug (e.g. `edit.php?post_type=product`), the single
  `items[slug]` override **lands on both**: `Replay::replay()` scans the top-level scope and each
  submenu-parent scope separately, so a bare-slug key matches in *both* (apply-to-both, **not** a
  mutual veto). The collision guards address *different* cases and neither is this one: **Axis-1**
  vetoes two *distinct stored keys* that normalize to one key (`class-replay.php:90-93`); **Axis-2**
  vetoes a *single stored key* that matches 2+ *distinct rendered slugs* within one scope
  (`:96-117` top-level, `:158-173` submenu). A level-qualified key resolves the shared-slug
  top/submenu case but does **not** eliminate Axis-2 rendered-slug ambiguity — keep both guards.
  **Recommendation:** adopt a **level-qualified match key**
  (`parent>child` for submenu overrides, bare slug for top-level) — exactly the "level-aware match"
  BACKLOG already names as the future direction — so a top-level and submenu sharing a slug get
  independent overrides. Highest-leverage COMPAT-04 move, matching proven prior art. (Pair with
  A1b for the DOM-association side.)
- **COMPAT-07 (badge/HTML-in-title preservation).** `BACKLOG.md` COMPAT-07 spans 4/6 plugins whose
  titles carry baked-in HTML: *trailing* count spans (WooCommerce/Yoast), but **also** markup that
  *wraps* the label (WPForms `<span style="color:#f18500">Addons</span>`; Yoast Upgrade / AI Brand
  Insights upsell wrappers). A `text + trailing_suffix` split fails the wrap cases. **Recommendation
  (A2):** represent a title as its DOM text node(s) plus the surrounding markup, and on rename
  replace only the text node(s) — a text-node-replacement strategy preserving markup *before and
  after* the label. This is what the required 4/6-plugin coverage bar demands.
- **COMPAT-10 (optional cascade-hide to children).** **No strong prior art** — AME hides per-item;
  it has no parent→children cosmetic cascade toggle. Maestro's proposed default-off cascade is a
  genuine addition; design it as a pure visibility computation over existing `hidden_roles`
  semantics (children inherit only when the toggle is on), preserving the cosmetic-only guarantee.
- **Bonus defect (found in review) — `custom_menu_order` clobber.** `has_top_order()` returns a
  hardcoded `! empty(top_order)` and ignores the incoming filter value (`class-replay.php:274-277`),
  so when Maestro has no stored top-order it can override an earlier plugin that enabled custom
  ordering — contradicting its own docblock and adjacent to the COMPAT-05/06 `custom_menu_order`
  collisions already in `BACKLOG.md`. Small, well-scoped fix (accept + pass through the value):
  fold into Phase 20's compatibility work or a standalone `fix(replay)`.

---

## v1.5 product-scoping signals (market)

- **Vitals:** 300k+ installs, 4.6★ (312 reviews), WP 5.9+/PHP 7.4+, tested to WP 7.0.x; support
  responsiveness is weak (listing shows 1/2 recent issues resolved; many stale forum threads).
- **Free vs Pro:** Free = reorder/rename/icons/custom items/**restrict**-only permissions/content
  permissions/redirects/plugin-visibility. **Pro-gated:** per-role/user **granting**, hide-from-all-
  except-one-user, **import/export**, **drag between menu levels**, new-window/iframe items,
  shortcodes-in-fields, colors, 600+ icons, Branding & Toolbar add-ons. Pricing $49–$179/yr.
- **Recurring pain (opportunity):** (1) endless third-party conflict patches — fragile detection;
  (2) submenu highlighting/current-item bugs; (3) capability/role confusion (the access-vs-cosmetic
  conflation); (4) PHP-deprecation churn; (5) "menu changed / reset to default" user confusion.
- **Gaps to exploit for free:** import/export, reparenting drag, per-role *deny*, and above all a
  true **inline** editing UX — none well-served by AME free.

---

## Sources

- **AME source (read):** free `admin-menu-editor` **1.15.1** zip, `includes/menu-editor-core.php`
  (`WPMenuEditor`), `includes/menu.php` (`ameMenu`), `includes/menu-item.php` (`ameMenuItem`),
  `includes/actors.php`. Downloaded from `downloads.wordpress.org/plugin/admin-menu-editor.zip`.
- **Listing / readme / changelog:** <https://wordpress.org/plugins/admin-menu-editor/>,
  <https://plugins.svn.wordpress.org/admin-menu-editor/trunk/readme.txt>
- **Support forum (recurring-bug mining):** <https://wordpress.org/support/plugin/admin-menu-editor/>
- **Pro feature split:** <https://adminmenueditor.com/>, <https://adminmenueditor.com/upgrade-to-pro/>
- **Maestro side:** `SPEC.md`, `TESTING.md`, `includes/class-{replay,slug,ordering,config}.php`,
  `assets/maestro.js`.
- Unverified: no official Pro comparison table published; a `Priyank57/admin-menu-editor-pro`
  GitHub mirror appeared in search but was **not** confirmed as Elsts-authored — do not cite.
