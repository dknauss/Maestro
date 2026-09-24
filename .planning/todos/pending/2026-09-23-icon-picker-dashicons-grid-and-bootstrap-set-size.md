---
created: 2026-09-23T00:00:00.000Z
title: Icon picker — Dashicons grid is not square, and the Bootstrap set is a quarter the size
area: editor-ux
files:
  - assets/maestro.js (~line 1139 — builds each picker cell)
  - assets/maestro.css (~line 399 — .maestro-icon-grid / .maestro-icon-cell)
  - bin/generate-bootstrap-icons.mjs (CURATED list)
  - includes/icons-bootstrap.php (generated, 87 icons, ~55 KB)
  - tests/integration/PerformanceTest.php (256 KiB localized-payload budget)
---

Raised by Dan after 1.6.0 shipped, with screenshots of both tabs.

**Approved by Dan, 2026-09-23:** the fixes and recommendations below: glyph
in a child element for the Dashicons tab, one icon colour for both tabs,
on-demand loading for the Bootstrap set, and roughly Dashicons parity chosen by
admin-menu usage.

## 1. The Dashicons tab is not a square grid

**Cause, from the CSS (matches the screenshot; measure when fixing).** Each
Dashicons cell is a `<button>` that carries core's `dashicons dashicons-*`
classes itself (`maestro.js` ~line 1139). Core's `.dashicons` rule sets
`width: 20px; height: 20px` on that element. `.maestro-icon-cell` sets a
`min-height` (40px) but no width, so the cell is held to 20px wide and 40px
tall: narrow, tall cells that don't fill their grid tracks. A Bootstrap cell
puts its icon in a child `<img>`, so the button itself keeps the grid size.

The two tabs also differ in colour: Dashicons render in the cell's `#1d2327`,
Bootstrap icons in their baked-in `#a7aaad`.

**Fix.** Render the glyph in a child element, as the Bootstrap tab already
does: `<button class="maestro-icon-cell"><span class="dashicons dashicons-*"
aria-hidden="true"></span></button>`. The cell then takes its size from the
grid, and core's 20px rule applies only to the glyph. Update anything that
reads the class off the button (the click handler at ~line 1190, the
`is-current` marking, search filtering, the e2e specs that locate
`.maestro-icon-cell.dashicons-*`). Decide one icon colour for both tabs.

## 2. 87 Bootstrap icons against 342 Dashicons

**Why it is small.** Each Bootstrap icon ships as a base64 SVG data URI inside
the edit-mode localized payload, about 640 bytes each (87 icons ≈ 55 KB).
Dashicons cost almost nothing, since each is a class name on a font already
loaded. Growing the inline set to ~340 would add ~220 KB, which with a large
menu model breaks the 256 KiB budget `PerformanceTest` enforces, and it would
be paid on every edit-mode page load whether or not the picker opens.

**Options.**
1. **Load the set on demand.** Build a static, versioned JSON file (or a
   `<symbol>` SVG sprite) and fetch it the first time the Bootstrap tab
   opens. It stays out of the localized payload, is cached by the browser
   across page loads, and can hold 300+ icons at no cost to pages where the
   picker is never opened. **Recommended.**
2. **Grow the inline set a little.** Stay under budget by adding maybe 40–60
   more, with no loading change. Cheap, but it doesn't reach parity.
3. **Tie it to the mask-image plan in ROADMAP (#172).** Stored icons move to
   `'none'` + a mask coloured by `currentColor`. That fixes the frozen grey,
   but changes storage, so do it separately from the size change; option 1
   works for either rendering.

**Choosing which icons ("most used/useful").** Aim for about as many as
Dashicons (~340), picked for admin-menu use rather than taken wholesale:
- Cover every concept Dashicons covers (so a user switching tabs finds a
  counterpart), then admin-menu concepts common in plugins that Dashicons
  lacks: analytics/charts, security/shield/lock/key, forms/inputs, email/
  newsletter, SEO/search, cache/speed, backup/cloud, code/terminal, database,
  API/plug, AI/sparkles, translation, accessibility, calendar/booking,
  membership/people, payments/wallet, shipping, notifications, support/help.
- Prefer filled variants where they exist (the ICON-01 policy in the
  generator), for weight parity with Dashicons.
- Source a usage signal rather than guessing: the icons plugins actually
  register with `add_menu_page()` (a survey of the top WordPress.org plugins,
  as for the R1 compatibility research), plus Bootstrap Icons' own category
  tags.
- Keep search working: each icon's search terms come from its name plus
  Bootstrap's `tags`.

## Check when doing it

- Both tabs render the same cell size (measure: width = height, same as the
  grid track), at desktop and at the 44px touch size below 782px.
- `PerformanceTest` payload budget still passes; add a check that the
  Bootstrap data is not in the localized payload if it moves to a file.
- `icons-bundle.test.mjs` still covers every curated name resolving.
- Recapture screenshot 2 (the icon picker).
