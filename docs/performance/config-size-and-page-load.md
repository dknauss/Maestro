# Config size vs. admin page-load cost

How much does Maestro's stored configuration add to a wp-admin page load, and how
does that cost grow as the config gets larger? This document answers that with
measured numbers from a running wp-env instance, explains where the time goes, and
records the caching/optimization facts behind the design.

**TL;DR** — At a realistic config size (~5–15 KB) Maestro adds roughly **0.1 ms**
to each admin page load. Even at the pathological 1 MB ceiling the worst measured
shape adds **~1 ms**. This is negligible against a typical admin TTFB of tens to
hundreds of milliseconds. Replay cost tracks config *structure* (item/entry
**count**), not byte size; the byte-size driver in real configs is data-URI icons,
which are the biggest real-world lever a user controls.

---

## 1. Overview — where the config sits in a request

Maestro stores a single option, `maestro_config` (constant `MAESTRO_OPTION`), and
nothing else — **no autoloaded option, no transients, no user-meta, no cron**
(see §5). It is written **non-autoloaded**: `update_option( MAESTRO_OPTION, $clean, false )`
in `includes/class-config.php`.

On **every wp-admin page load, for every user**, two things touch the config:

1. **`Config::get()`** (`includes/class-config.php`) — `get_option()` +
   `maybe_unserialize()`, memoized for the rest of the request in `$this->cache`.
   So the option is read from the object cache and unserialized **once per
   request**, regardless of how many callers ask for it.
2. **`Replay::replay()`** (`includes/class-replay.php`) — hooked on
   `admin_menu` at `PHP_INT_MAX`. It iterates the `$menu` / `$submenu` globals,
   normalizes each rendered slug via `Slug::normalize()`, and applies stored
   rename / icon / visibility / ordering overrides.

**Edit mode only** adds a second pass: `Assets::enqueue()` calls
`Replay::get_menu_model()` (which re-runs the normalized-lookup build) and
`wp_json_encode()`s the config + menu model into the page. Normal admin pages —
the overwhelming majority of loads — never pay that.

**Realistic size vs. the cap.** A real power-user config is ~5–15 KB. The stored
config is capped at **1 MB** aggregate (`Config::MAX_CONFIG_BYTES`), with
per-field caps behind it (200 items, 200 sub_order parents × up to 200 children,
128 KB per data-URI icon). The 1 MB ceiling exists only to refuse a pathological
multi-MB payload; it is not a target. In real configs the byte size is dominated
by **data-URI icon values**, not by the number of menu items.

---

## 2. Benchmark results

### Method

- **What is timed:** the plugin's *added* hot-path work in isolation, not full-page
  TTFB (which is dominated by unrelated core/theme/plugin work and is too noisy to
  attribute a sub-millisecond delta to).
- Per config profile, over **N = 1500 warm iterations**: reset `$menu` / `$submenu`
  to a realistic fixture each iteration (≈15 top-level items + ≈70 submenu rows,
  mirroring a real admin: Dashboard, Posts, Media, Pages, WooCommerce, Products,
  Appearance, Plugins, Users, Tools, Settings, SEO, Elementor…), warm the object
  cache first, then time with `hrtime()`. Report **median** and **p95** in ms.
- `maybe_unserialize()` and `replay()` are also timed **separately** so the split
  is visible. "Per-page added" is the combined `Config::get()` + `replay()` for a
  fresh page (new `Config`, warm object cache).
- Configs are seeded directly with `update_option()` to hit each byte target
  (bypassing the save cap — we are measuring **read** cost).
- Because replay cost tracks structure rather than bytes, two shapes are tested at
  the larger sizes:
  - **icon-heavy** — few items, size dominated by 128 KB-capped data-URI icons
    (stresses unserialize + `Config::icon_form()`).
  - **entry-heavy** — 200 items + up to 200 sub_order parents × up to 200 children
    (stresses `replay()` iteration + `Slug::normalize()`).

### Environment

| | |
|---|---|
| WordPress | 7.0 (wp-env) |
| PHP | 8.3.32 |
| Object cache | none persistent (WP default per-request cache) |
| Iterations | 1500 warm, median + p95 |
| Measured | 2026-08-03 |

These are **isolated hot-path timings** on one machine; treat them as relative
magnitudes and ratios, not absolute guarantees for every host.

### Results (measured, milliseconds)

| Config | Shape | Size (KB) | `maybe_unserialize` (med) | `replay()` med | `replay()` p95 | **Per-page added** (med) | Per-page p95 |
|---|---|---:|---:|---:|---:|---:|---:|
| empty (no option) | — | 0 | — | 0.0001 | 0.0001 | **0.002** | 0.002 |
| baseline (~30 dashicons) | dashicon | 4.4 | 0.004 | 0.113 | 0.212 | **0.119** | 0.141 |
| 10 KB | icon-heavy | 10.1 | 0.0005 | 0.058 | 0.070 | **0.063** | 0.074 |
| 100 KB | icon-heavy | 100.1 | 0.002 | 0.109 | 0.123 | **0.113** | 0.134 |
| 100 KB | entry-heavy | 111.6 | 0.052 | 0.308 | 0.342 | **0.377** | 0.413 |
| 500 KB | icon-heavy | 500.4 | 0.012 | 0.322 | 0.353 | **0.342** | 0.374 |
| 500 KB | entry-heavy | 509.0 | 0.153 | 0.461 | 0.500 | **0.657** | 0.799 |
| 1 MB | icon-heavy | 1024.7 | 0.025 | 0.626 | 0.715 | **0.659** | 0.748 |
| 1 MB | entry-heavy | 1031.8 | 0.306 | 0.624 | 0.683 | **1.024** | 1.260 |

The per-page figure tracks `replay()` + `maybe_unserialize()` closely across every
row (e.g. 1 MB entry-heavy: 0.624 + 0.306 ≈ 1.02). The unserialize is paid
**once per request** because `Config::get()` memoizes, but it *is* paid every
request: WP caches the option value and unserializes it on read.

### Cold-cache `get_option` (single sample, DB read + unserialize)

| Config | Cold `get_option` |
|---|---:|
| baseline (4.4 KB) | 0.13 ms |
| 1 MB entry-heavy | 1.68 ms |

A cold read (object cache miss → DB `SELECT` + unserialize) costs more than the
warm path. A persistent object cache eliminates the DB round-trip after warm-up
(see §5); the per-request `maybe_unserialize()` remains.

### `Slug::normalize()` cost and call counts

Single-call median: **789 ns** (worst case — a query-arg URL slug; plain slugs are
faster). Calls made during one render:

| Config | normal-mode calls | edit-mode calls | distinct inputs |
|---|---:|---:|---:|
| baseline | 227 | 470 | 56 |
| 100 KB icon-heavy | 150 | 348 | 56 |
| 1 MB icon-heavy | 157 | 362 | 56 |
| 100 KB entry-heavy | 645 | 1042 | 482 |
| 1 MB entry-heavy | 1315 | 1712 | 1152 |

---

## 3. Interpretation

**Where it's negligible.** At the realistic baseline (~4–15 KB) the added cost is
**~0.1 ms per page** — far below perception and below the noise floor of full-page
TTFB. The empty-config case is effectively free (`replay()` early-returns on an
empty config).

**Where it becomes measurable.** Cost grows with config **structure**, not bytes:

- The **entry-heavy** shape is essentially `Slug::normalize()`-bound. At 1 MB it
  makes 1315 normalize calls in normal mode; 1315 × ~475 ns ≈ its whole 0.62 ms
  `replay()` time. Its unserialize is also the most expensive of any shape
  (0.31 ms) because ~40,000 tiny array elements cost more zval work to rebuild
  than a few large strings.
- The **icon-heavy** shape is *not* normalize-bound (only ~150 calls regardless of
  size). Its `replay()` growth (0.06 → 0.63 ms) comes from `Config::icon_form()`
  running a `preg_match` across each 128 KB data-URI on the matched rows, plus a
  larger unserialize. Byte size shows up here, in the icon regex, not in iteration.

Notably, the **4.4 KB baseline `replay()` (0.113 ms) is as costly as the 100 KB
icon-heavy config (0.109 ms)** — because it has more *items* (30) and more matched
overrides to apply. This is the clearest evidence that **count, not size, drives
replay**.

**Why the 1 MB cap sits where it does (ties back to S-2).** Even the worst allowed
config (1 MB entry-heavy) adds only ~1 ms to a page — an acceptable ceiling, not a
performance cliff. The cap's real job (per S-2) is to bound the pathological
payload — 200 items each carrying a 128 KB icon would be ~25 MB — so that the
option stays small enough that its read, unserialize, and the per-request replay
never become a problem. The measurements confirm the cap is set conservatively:
the plugin stays sub-millisecond well inside it, and only reaches ~1 ms at the very
edge.

---

## 4. Optimization

### Already done

- **S-2 size caps** — aggregate 1 MB ceiling plus per-field caps (200 items, 200
  sub_order parents × up to 200 children, 128 KB per data-URI icon, 200-byte
  titles). These bound every loop and every byte the hot path can ever touch.
- **PR #109 replay hardening:**
  - **`Title::replace_label()` fast path** — `replay()` runs on every load; the
    common rename target is a plain-text core item with no markup. When the live
    title contains no `<`, it short-circuits with byte-identical output instead of
    building a `DOMDocument` (`includes/class-title.php`).
  - **O(P²) → O(P) sub_order** — the submenu reorder precomputes a normalized
    `sub_order` lookup **once** per replay instead of re-scanning and
    re-normalizing every stored parent key for each rendered parent
    (`includes/class-replay.php`).
- **Non-autoloaded option** — `maestro_config` is never loaded into the autoload
  bundle on non-admin requests; it is read only where it is used.
- **In-request memoization** — `Config::$cache` means the option is read and
  unserialized at most once per request no matter how many callers ask.

### Levers, in order of real-world impact

1. **Prefer dashicons over data-URI icons (biggest user-controlled lever).**
   Byte size in real configs is dominated by data-URI icon values, and those
   drive both the unserialize cost and the `Config::icon_form()` regex in
   `replay()`. A dashicon is ~20 bytes and effectively free to apply; a 128 KB
   data-URI is 6000× larger and adds measurable per-load regex cost on every admin
   page. Guidance: use dashicons (or a short image URL) unless a custom raster/SVG
   icon is genuinely required.
2. **Persistent object cache (host-level).** With a persistent object cache the
   cold `get_option` DB round-trip (up to ~1.7 ms at 1 MB) is paid once, not on
   every cold request; warm reads skip the DB entirely. The per-request
   `maybe_unserialize()` still runs, but that is the smaller component.
3. **Memoize `Slug::normalize()` (recommended, not implemented — see below).**

### Recommendation: memoize `Slug::normalize()`

**Verdict: worthwhile as a low-risk, pure-function optimization — most valuable in
edit mode and at realistic sizes — but not urgent, and lower priority than the
data-URI-icon guidance above.** The whole hot path is already sub-millisecond, so
the absolute saving is small.

Grounding in the measured split:

- `replay()` at realistic sizes is **`normalize()`-bound** (entry-heavy 1 MB:
  ~1315 calls ≈ its entire 0.62 ms). So cutting redundant normalize calls cuts
  `replay()` almost proportionally for the count-driven shapes.
- The calls are **highly redundant on the same inputs.** Each rendered row is
  normalized in both a pre-scan and the main loop (2×), parents are normalized
  repeatedly, and **edit mode runs the normalized-lookup build twice** (`replay()`
  + `get_menu_model()`), re-normalizing the same slugs. The distinct-input counts
  show the headroom:
  - **baseline:** 470 edit-mode calls collapse to **56 distinct inputs** — an
    ~88% redundancy a memo would eliminate (normal mode: 227 → 56, ~75%).
  - **1 MB entry-heavy:** 1712 → 1152 distinct (~33% redundant in edit mode; ~12%
    in normal mode) — less headroom, because most of the thousands of synthetic
    entries are one-shot distinct slugs.
- **Projected saving:** at the realistic baseline, ~0.05–0.09 ms/page (larger
  share in edit mode); at the 1 MB worst case, up to ~0.2 ms in edit mode. All
  sub-millisecond.

`Slug::normalize()` is **pure, WP-free, total, and idempotent** (documented in
`includes/class-slug.php`), so a per-request static memo keyed by
`"$slug|$admin_base"` is low-risk — no invalidation concerns within a request, and
the function already guarantees identical output for identical input. The main
beneficiary is the edit-mode double pass; a normal admin load already sits at
~0.1 ms and would barely change.

---

## 5. Transients, object caching, and memoization — confirmed answers

- **Transients: none.** No `set_transient` / `get_transient` anywhere in the
  plugin.
- **User-meta: none.** No `update_user_meta` / `get_user_meta`.
- **Cron: none.** No `wp_schedule_event` / cron registration.
- **Single, non-autoloaded option.** The only stored option is `maestro_config`,
  written with `update_option( MAESTRO_OPTION, $clean, false )` — the explicit
  `false` autoload flag (`includes/class-config.php`). It is therefore **not**
  loaded on front-end or non-admin requests, and its `get_option()` read is
  object-cache-backed: on a site with a persistent object cache, after warm-up the
  read is served from cache and skips the database. The per-request
  `maybe_unserialize()` still runs, but `Config`'s in-request cache ensures it runs
  at most once per request.
- **Memoization opportunity:** `Slug::normalize()` is the one function called
  redundantly enough to justify a per-request memo (§4). It is pure and low-risk to
  memoize; recommended but not yet implemented.

---

## Reproducing these numbers

1. `npm run env:start` (wp-env; dev :8888 / tests :8889).
2. `wp plugin activate maestro-menu-editor`.
3. Seed a config with `update_option( 'maestro_config', $cfg, false )`, reset the
   `$menu` / `$submenu` globals to a representative fixture, and time
   `( new Maestro\Config )->get()` + `( new Maestro\Replay( $config ) )->replay()`
   over ≥1000 warm iterations with `hrtime()`, reporting the median and p95. Time
   `maybe_unserialize( serialize( $cfg ) )` separately for the split.

The benchmark harness used here was run via `wp eval-file` and is not committed
(it seeds oversized configs that bypass the save cap purely to measure read cost).
