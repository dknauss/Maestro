# Phase 9: Editor UX Polish — Research

**Researched:** 2026-06-19
**Domain:** Vanilla JS DOM, CSS animations, WCAG accessibility, WordPress dashicons
**Confidence:** HIGH — all findings grounded in the actual codebase; no speculative claims

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UX-03 — Status indicator copy + mode signal**
- Idle copy: "Edit Mode" (replaces `'idle' => 'Editor active — click an item to edit.'` at `includes/class-assets.php:97`). Reconciliation: roadmap reads "Menu Edit Mode" but user chose the shorter "Edit Mode"; treat this as satisfying the intent.
- Non-colour signal: a leading dashicon beside the green status (WCAG 1.4.1). Recommended glyph `dashicons-edit`; final glyph is planner's discretion.
- Supersedes the `assets/maestro.css:285` comment ("idle deliberately has NO icon"). The idle indicator is now: green + dashicon + "Edit Mode" text.
- Save states: "Edit Mode" indicator persists; transient `Saving…` / `Saved` / `Save failed` states render as a SEPARATE element beside it (mode is always legible). Keep existing `wp.a11y.speak()` plumbing.

**UX-03 — First-run attention cue**
- Keep the existing text banner (`buildFirstRunCue()` / `.maestro-firstrun`) AND add a subtle one-shot pulse/outline on the FIRST EDITABLE top-level menu item.
- Duration: one short animation (~1–2s), then stops. Under `prefers-reduced-motion: reduce` degrades to a static outline or nothing. Reuse the existing `@media (prefers-reduced-motion)` block at `assets/maestro.css:307`.
- Same localStorage first-run gate as the banner (cue shows once, key `maestroFirstRunDone`).

**UX-04 — Rename placeholder + accessible name**
- Field stays pre-filled with the item's current title. Placeholder ("Menu label") shows only when the field is empty. Rename / commit-on-Enter / revert-on-Escape logic UNCHANGED.
- Remove the visible "Rename " text label (`assets/maestro.js:380` — `document.createTextNode( I.rename + ' ' )`).
- Keep a programmatic accessible name: visually-hidden `<label class="screen-reader-text">` tied to the input.
- Placeholder text must meet WCAG AA contrast.

**UX-07 — Mobile / small-screen pass**
- Density-first: reduce control and input padding and font-size at narrow widths. Restructure toolbar layout only if density alone overflows.
- Breakpoint: 782px (WP admin mobile breakpoint).
- ≥44px floor on ALL real tap targets: rename input and every interactive button.

**Methodology**
- TDD strict (red → green → refactor). Behavioral JS seams that produce pure/observable output are test-first via `node:test` (same `tests/js/` seam, `npm run test:js`). CSS/visual work → e2e + screenshots, not unit TDD.
- Three test-first seams: (1) mode-indicator state transitions, (2) first-run cue localStorage gate, (3) placeholder empty-vs-filled wiring.

**Zero-regression bar**
- PHP unit 44/44, integration 29/29, Playwright e2e green, Plugin Check 0 errors, `composer lint` clean, `npm run test:js` green.
- New tests are additive; they raise counts, never lower the passing set.

**Executor-model guidance**
- **sonnet**: CSS density/responsive work to a checklist, mechanical i18n/string edits, writing tests from explicit assertions, DOM markup tweaks to spec, screenshot capture, lint/format fixes, read-only verification.
- **opus**: only genuine judgment calls (final dashicon choice if it needs a visual call, deciding whether toolbar restructuring is warranted from screenshots).

### Claude's Discretion (planner decides, justify in plan)
- Exact dashicon glyph for the mode signal (recommended `dashicons-edit`).
- Pulse/outline visual treatment (colour token, outline vs box-shadow, exact timing within ~1–2s one-shot bound) — must pass reduced-motion + e2e checks.
- Exact narrow-width padding/font values and whether any single control needs a layout tweak beyond density.
- Placeholder contrast implementation details (which admin colour token).

### Deferred Ideas (OUT OF SCOPE)
None from discussion — scope is strictly UX-03, UX-04, UX-07. Larger backlog items (reparenting, separators, custom icon upload, import/export, multisite, configurable menu width) remain in the post-1.0 backlog.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-03 | Replace verbose idle status with short "Edit Mode" indicator (dashicon + text + green, WCAG 1.4.1), plus a one-shot first-run pulse on the first editable menu item, localStorage-gated | Status DOM in `buildToolbar()` lines 362–367; i18n `idle` key at `class-assets.php:97`; first-run gate in `buildFirstRunCue()` lines 1060–1098; first editable item selector documented below |
| UX-04 | Move visible "Rename " label into a placeholder; keep a visually-hidden `<label>` for accessible name; placeholder shows only when input is empty | Rename field at `maestro.js:379–392`; `I.rename` string at `class-assets.php:101`; `screen-reader-text` pattern already in `maestro.css:57–67` |
| UX-07 | Dense padding/font at ≤782px; ≥44px tap-target floor on all interactive controls; restructure layout only if density alone overflows | Existing `@media (max-width: 782px)` block at `maestro.css:418–437`; toolbar flex-wrap already on (BUG-03 fix); current responsive rules documented below |
</phase_requirements>

---

## Summary

Phase 9 is a contained polish phase — three independent CSS/JS/i18n changes to the existing edit-mode toolbar surface. No new architecture, no REST contract changes, no storage changes. The codebase is well-mapped and the prior phases (6–8) have established every pattern this phase needs.

The most technically nuanced change is UX-03's two-part status redesign: splitting the status element into a persistent mode indicator plus a transient save-state indicator. This is the only structural DOM change in the phase. The first-run pulse requires a new `@keyframes` animation and a reliable "first editable top-level item" selector (documented below). UX-04 is largely a string + markup swap. UX-07 is CSS-only for the density pass, with potential structural adjustments reserved for after a screenshot review.

The TDD seam is an extension of the `assets/maestro-logic.js` + `tests/js/` infrastructure from Phase 6. Three pure functions need to be extracted and test-driven: `modeStatusLabel(state)` (state→{label,icon} mapping), `firstRunSeen()` (localStorage gate boolean), and `placeholderForValue(value)` (empty-vs-filled decision). All three are writable as `expect(fn(input)).toBe(output)` before implementation.

**Primary recommendation:** Follow the locked decisions exactly. Implement in plan order: (1) UX-04 first (simplest, no animation, ground truth for the rename field), (2) UX-03 status split (DOM structural change), (3) UX-03 first-run pulse (new animation), (4) UX-07 mobile density pass (CSS-only, ends with a screenshot-gate plan step).

---

## Exact Code Locations (per requirement)

### UX-03 — Status indicator

**i18n string to change (`includes/class-assets.php:97`):**
```php
// CURRENT (line 97):
'idle' => __( 'Editor active — click an item to edit.', 'maestro-menu-editor' ),

// TARGET:
'idle' => __( 'Edit Mode', 'maestro-menu-editor' ),
```

**New i18n strings to add (after line 100, in the same array):**
```php
// Add after 'saveError' (line 100):
'modeLabel'  => __( 'Edit Mode', 'maestro-menu-editor' ),  // persistent mode indicator text
```

**DOM structure to change (`assets/maestro.js:362–367` inside `buildToolbar()`):**

Current (lines 362–367):
```javascript
statusEl = el( 'span', 'maestro-status maestro-status-idle' );
statusEl.setAttribute( 'role', 'status' );
statusEl.setAttribute( 'aria-live', 'polite' );
statusEl.setAttribute( 'aria-atomic', 'true' );
statusEl.textContent = I.idle;
bar.appendChild( statusEl );
```

Target structure — two sibling elements: a static mode label + a transient save-state span:
```javascript
// Mode indicator — always visible, never changes text
var modeEl = el( 'span', 'maestro-mode-label' );
var modeIcon = el( 'span', 'maestro-mode-icon dashicons dashicons-edit' );
modeIcon.setAttribute( 'aria-hidden', 'true' );
modeEl.appendChild( modeIcon );
modeEl.appendChild( document.createTextNode( I.modeLabel ) );
bar.appendChild( modeEl );

// Save-state indicator — transient, aria-live
statusEl = el( 'span', 'maestro-status maestro-status-idle' );
statusEl.setAttribute( 'role', 'status' );
statusEl.setAttribute( 'aria-live', 'polite' );
statusEl.setAttribute( 'aria-atomic', 'true' );
bar.appendChild( statusEl );
```

**`setStatus()` function change (`assets/maestro.js:955–966`):**

Current: sets `statusEl.textContent` with `I.idle` for idle state, and transient copy for saving/saved/error.

Target: the save-state element shows nothing at idle (empty / `display:none` / aria-hidden), and shows the transient message only during save states. Mode label is never touched by `setStatus()`.

**CSS change (`assets/maestro.css:285–298` — idle-no-icon comment block):**

Current comment at line 285:
```
/* Idle has NO icon: the visible toolbar and "Editor active" text already signal
 * edit mode, and a leading idle dot read as a fake control. The icon appears
 * only while saving / saved / error. */
```

The idle icon block must be added (with the new `.maestro-mode-label` + dashicon structure handled in CSS rather than the `::before` pseudo-element approach). The existing `::before` pseudo-element mechanism on `.maestro-status` stays for saving/saved/error states. The idle dashicon is supplied via a real `<span class="dashicons dashicons-edit">` child element in the DOM (not CSS `content:`), which avoids the BUG-04 fake-control appearance while giving a real, aria-hidden glyph.

**LocalizationTest impact:** `LocalizationTest::expected_i18n_keys()` (`tests/integration/LocalizationTest.php:57–75`) asserts specific keys. The `idle` key still exists (its value changes); add `modeLabel` as a new key. The test must be updated to include `modeLabel` in its list. The payload-size budget in `PerformanceTest` (256 KiB ceiling) will not be affected — the new key adds fewer than 20 bytes.

---

### UX-03 — First-run pulse on first editable item

**Current first-run gate (`assets/maestro.js:1060–1098`):**

`buildFirstRunCue()` reads `localStorage.getItem('maestroFirstRunDone') === '1'`, returns early if seen, otherwise builds and appends `.maestro-firstrun`.

**Addition: after building the text banner, add the pulse:**
```javascript
// Inside buildFirstRunCue(), after the banner is built and appended:
var firstItem = document.querySelector( '#adminmenu > li.menu-top.maestro-item' );
if ( firstItem ) {
    firstItem.classList.add( 'maestro-firstrun-pulse' );
    // One-shot: remove after animation completes
    firstItem.addEventListener( 'animationend', function handler() {
        firstItem.classList.remove( 'maestro-firstrun-pulse' );
        firstItem.removeEventListener( 'animationend', handler );
    } );
}
```

**Selector reliability:** `#adminmenu > li.menu-top.maestro-item` is the established project selector (used in e2e tests at `editor.spec.ts:33`, and in `initSortables()` at `maestro.js:884`). It finds exactly the editable top-level items. The `querySelector` (first match) gives the topmost item, which is the correct target. This selector is only called after `init()` has run `D.menu.forEach(...)` which stamps `dataset.maestroSlug` and adds `maestro-item` to all editable items, so the class is guaranteed present.

**CSS additions for the pulse (add to first-run block, `maestro.css:373+`):**
```css
@keyframes maestro-pulse-item {
    0%   { outline: 2px solid transparent; outline-offset: 2px; }
    30%  { outline: 2px solid #2271b1;     outline-offset: 2px; }
    70%  { outline: 2px solid #2271b1;     outline-offset: 2px; }
    100% { outline: 2px solid transparent; outline-offset: 2px; }
}
#adminmenu li.maestro-firstrun-pulse {
    animation: maestro-pulse-item 1.5s ease-in-out 1 forwards;
}
@media ( prefers-reduced-motion: reduce ) {
    #adminmenu li.maestro-firstrun-pulse {
        animation: none;
        outline: 2px solid #2271b1;
        outline-offset: 2px;
    }
}
```

The `prefers-reduced-motion` rule degrades the animation to a static outline (visible but not moving), consistent with the existing `@media (prefers-reduced-motion: reduce)` block at `maestro.css:307` which already neutralises the saving-spinner animation.

**Dismiss integration:** The existing `dismiss()` function in `buildFirstRunCue()` removes `.maestro-firstrun` from the DOM and sets the localStorage flag. The pulse class should also be removed on dismiss (in case the user dismisses before the animation completes):
```javascript
function dismiss() {
    try { window.localStorage.setItem( 'maestroFirstRunDone', '1' ); } catch (e) {}
    cue.remove();
    // Also clear the pulse if it's still animating
    if ( firstItem ) { firstItem.classList.remove( 'maestro-firstrun-pulse' ); }
}
```

---

### UX-04 — Rename placeholder + accessible name

**Current rename field structure (`assets/maestro.js:379–392`):**
```javascript
var renameField = el( 'label', 'maestro-panel-field' );
renameField.appendChild( document.createTextNode( I.rename + ' ' ) );  // line 380 — REMOVE THIS
var rename = el( 'input', 'maestro-rename-input' );
rename.type = 'text';
// ... event handlers ...
renameField.appendChild( rename );
```

The `<label>` element (`renameField`) currently wraps both the text node and the input, making it a valid implicit label. After the change it must become an EXPLICIT label with `for` + a matching `id`, so the screen-reader-text label can be placed correctly.

**Target structure:**
```javascript
// Visually-hidden label for the rename input (accessible name)
var renameLabel = el( 'label', 'screen-reader-text' );
renameLabel.setAttribute( 'for', 'maestro-rename-field' );
renameLabel.textContent = I.rename;  // "Rename" — the action, for SR users

var rename = el( 'input', 'maestro-rename-input' );
rename.type = 'text';
rename.id = 'maestro-rename-field';
rename.placeholder = I.renamePlaceholder;  // "Menu label" — new i18n key

// ... event handlers unchanged ...

// Append in order: label (SR-only), then input
p.appendChild( renameLabel );
p.appendChild( rename );
```

The old `renameField` wrapping `<label>` element is removed. The `panel.rename` reference still points to the `rename` input element — no change to the `panel` object structure, no change to `populatePanel()`, no change to `commitRename()`.

**New i18n key to add (`includes/class-assets.php`, after line 101):**
```php
'rename'            => __( 'Rename', 'maestro-menu-editor' ),           // unchanged — now used for SR label
'renamePlaceholder' => __( 'Menu label', 'maestro-menu-editor' ),       // NEW — input placeholder
```

The `I.rename` string is unchanged in value ("Rename") and is now used as the SR label text rather than a visible text node. The old visible usage is removed. `LocalizationTest` asserts the `rename` key exists — that still holds. Add `renamePlaceholder` as a new key (update `expected_i18n_keys()` in the test).

**`maestro.css` — placeholder contrast.** The rename input (`maestro.css:353–362`) uses `color: #1d2327` on `background: #fff`. Placeholder text in browsers renders at ~60% opacity of `color` by default, yielding roughly `#8c8f94`-equivalent contrast. WCAG 2.1 SC 1.4.3 applies to placeholder text in some interpretations (WCAG 3 makes it explicit). WP admin uses `#8c8f94` for muted text on white background (~3.9:1 against `#fff`) — sufficient for AA. The simplest approach is to set `::placeholder` colour explicitly:
```css
.maestro-rename-input::placeholder {
    color: #8c8f94;  /* WP admin muted-text token — 3.9:1 on #fff, AA compliant */
    opacity: 1;      /* Firefox reduces ::placeholder opacity to 0.54 by default */
}
```

WCAG 2.5.8 (Target Size Minimum, Level AA in WCAG 2.2): requires 24×24px minimum for targets where spacing is non-adjustable. WCAG 2.5.5 (Target Size Enhanced, Level AAA) requires 44×44px. The project targets the 44px floor per the locked UX-07 decision, which exceeds both thresholds.

---

### UX-07 — Mobile density pass

**Existing `@media (max-width: 782px)` block (`maestro.css:418–437`):**
```css
@media screen and ( max-width: 782px ) {
    .maestro-toolbar { left: 0; }
    .maestro-firstrun { left: 0; }
    .maestro-panel-label { max-width: 120px; }
    .maestro-rename-input { width: 120px; }

    /* Icon picker touch targets */
    .maestro-icon-popover { width: 92vw; }
    .maestro-icon-grid { grid-template-columns: repeat( auto-fill, minmax( 44px, 1fr ) ); max-height: 50vh; }
    .maestro-icon-cell { min-height: 44px; padding: 12px; }
    .maestro-icon-tab { padding: 10px 12px; }
    .maestro-vis-row { padding: 8px 0; }
}
```

**What is missing:** The existing 782px block only narrows the rename input width and the panel label max-width. It does NOT reduce button padding/font-size or enforce ≥44px on the rename input or toolbar buttons. The toolbar buttons (Icon, Visibility, Reset Item, Reset All, Exit) and the rename input need explicit touch-target sizing.

**Additions to the `@media (max-width: 782px)` block:**
```css
/* Density: reduce padding and font size at narrow widths */
.maestro-toolbar {
    gap: 6px 10px;
    padding: 8px 10px;
}
.maestro-toolbar .button {
    padding: 4px 8px;
    font-size: 12px;
    min-height: 44px;  /* tap-target floor */
}
.maestro-rename-input {
    padding: 0 6px;
    font-size: 12px;
    min-height: 44px;  /* tap-target floor */
}
```

The toolbar already has `flex-wrap: wrap` (BUG-03 fix). Density-first is the correct approach — wrapping already handles overflow; the density rules just reduce the size of each element so the rows are shorter.

**Whether restructure is needed:** at 700px (the tightest e2e test viewport), the current toolbar has the panel-left zone (status + panel controls) and the toolbar-right zone (Reset All + Exit) both on a flex row. With the density reductions above, a 700px viewport has roughly: `mode-label (~90px) + save-status (~80px) + panel-divider (~18px) + rename-input (120px) + icon-btn (~60px) + vis-btn (~80px) + reset-item (~90px) + gap (~40px)` = ~578px, leaving ~122px for the right zone (Reset All ~80px + Exit ~50px = ~130px). This is marginal and a screenshot review at the plan stage should confirm. The restructure decision (planner's discretion) should be deferred to after the density CSS is applied and a screenshot is taken.

---

## Pure/Observable Logic Seams for TDD

These three functions can be extracted to `assets/maestro-logic.js` and tested with `expect(fn(input)).toBe(output)` before implementation. The planner must write RED `tests/js/` stubs for these first.

### Seam 1: `modeStatusLabel(state)` — state → display text mapping

**Contract:**
```javascript
/**
 * Maps a save-state string to the text content for the transient save-status element.
 * The mode indicator ("Edit Mode") is NEVER touched by this function — it always shows.
 * Returns '' (empty) for 'idle' state (the element should be hidden / aria-hidden).
 *
 * @param {'idle'|'saving'|'saved'|'error'} state
 * @param {{ saving: string, saved: string, saveError: string }} strings
 * @return {string}
 */
function modeStatusLabel( state, strings ) {
    if ( state === 'saving' ) { return strings.saving; }
    if ( state === 'saved'  ) { return strings.saved; }
    if ( state === 'error'  ) { return strings.saveError; }
    return '';  // idle: save-state element is empty/hidden
}
```

**Red tests to write first:**
```javascript
// tests/js/mode-status.test.mjs
const strings = { saving: 'Saving…', saved: 'Saved', saveError: 'Save failed. Retrying on next change.' };

test( 'idle state -> empty string', () => {
    assert.strictEqual( modeStatusLabel( 'idle', strings ), '' );
} );
test( 'saving state -> saving string', () => {
    assert.strictEqual( modeStatusLabel( 'saving', strings ), strings.saving );
} );
test( 'saved state -> saved string', () => {
    assert.strictEqual( modeStatusLabel( 'saved', strings ), strings.saved );
} );
test( 'error state -> saveError string', () => {
    assert.strictEqual( modeStatusLabel( 'error', strings ), strings.saveError );
} );
```

### Seam 2: `firstRunSeen(storage)` — localStorage gate abstraction

**Contract:**
```javascript
/**
 * Returns true if the first-run cue has already been seen.
 * Takes a storage object (must implement getItem()) so tests can pass a stub.
 *
 * @param {{ getItem: (key: string) => string|null }} storage
 * @return {boolean}
 */
function firstRunSeen( storage ) {
    try {
        return storage.getItem( 'maestroFirstRunDone' ) === '1';
    } catch ( e ) {
        return true;  // private-browsing or blocked — treat as seen (don't show cue)
    }
}
```

**Red tests to write first:**
```javascript
// tests/js/first-run-gate.test.mjs
test( 'key absent -> not seen (returns false)', () => {
    assert.strictEqual( firstRunSeen( { getItem: () => null } ), false );
} );
test( 'key set to "1" -> seen (returns true)', () => {
    assert.strictEqual( firstRunSeen( { getItem: () => '1' } ), true );
} );
test( 'key set to other value -> not seen', () => {
    assert.strictEqual( firstRunSeen( { getItem: () => '0' } ), false );
} );
test( 'storage.getItem throws -> treat as seen', () => {
    assert.strictEqual( firstRunSeen( { getItem: () => { throw new Error('blocked'); } } ), true );
} );
```

### Seam 3: `placeholderVisible(value)` — empty-vs-filled decision

**Contract:**
```javascript
/**
 * Returns true if the rename input should show its placeholder.
 * The placeholder is visible only when the value is empty (or whitespace-only).
 *
 * @param {string} value Current input value.
 * @return {boolean}
 */
function placeholderVisible( value ) {
    return value.trim() === '';
}
```

Note: in practice the browser handles `::placeholder` visibility natively — it shows when `input.value === ''`. This seam tests the LOGIC of when the field is "empty" (whether a whitespace-only value counts as empty for placeholder purposes, matching `commitRename()`'s `raw.trim()` logic). This is a minimal function but useful to document the contract explicitly. The planner may choose to skip this as a unit-tested seam if the contract is trivially obvious, keeping only Seams 1 and 2 as mandatory TDD targets.

**Red test:**
```javascript
test( 'empty string -> placeholder visible', () => {
    assert.strictEqual( placeholderVisible( '' ), true );
} );
test( 'whitespace-only -> placeholder visible (matches commitRename trim logic)', () => {
    assert.strictEqual( placeholderVisible( '   ' ), true );
} );
test( 'non-empty string -> placeholder not visible', () => {
    assert.strictEqual( placeholderVisible( 'Posts' ), false );
} );
```

**Export these three via the dual-export guard:**
```javascript
// Append to the api object in assets/maestro-logic.js:
var api = {
    reorderMove:       reorderMove,
    diffItem:          diffItem,
    resetItem:         resetItem,
    modeStatusLabel:   modeStatusLabel,   // NEW
    firstRunSeen:      firstRunSeen,      // NEW
    placeholderVisible: placeholderVisible, // NEW (optional)
};
```

---

## Standard Stack

### Core (already in use — extend, don't replace)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `wp.a11y.speak()` | WP 6.4+ bundled | Screen-reader announcements for save states | Already wired at `maestro.js:59–63`; `wp-a11y` is a listed script dependency |
| `node:test` + `node:assert` | Node 24+ built-in | JS unit runner for pure helpers | Zero new devDependency; already powering `tests/js/`; `npm run test:js` already in package.json |
| `assets/maestro-logic.js` | — | Pure helpers (dual-export, browser + node:test) | Established Phase 6 pattern; extend with three new functions |
| Dashicons | WP bundled | Status + mode icons | Already a CSS stylesheet dependency (`class-assets.php:59–63`); `dashicons` listed as style dep |

**Installation:** no new packages required. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure (no change)

The phase adds no new files to `assets/` or `includes/`. Changes are:
```
assets/
├── maestro-logic.js   # EXTEND: add modeStatusLabel, firstRunSeen, placeholderVisible
├── maestro.js         # MODIFY: buildToolbar status split, buildFirstRunCue pulse, rename field
└── maestro.css        # MODIFY: mode-label styles, pulse keyframes, responsive density
includes/
└── class-assets.php   # MODIFY: i18n strings (idle, modeLabel, renamePlaceholder)
tests/
├── js/
│   ├── mode-status.test.mjs      # NEW (UX-03 TDD)
│   ├── first-run-gate.test.mjs   # NEW (UX-03 TDD)
│   └── placeholder.test.mjs      # NEW (UX-04 TDD — optional)
└── integration/
    └── LocalizationTest.php      # MODIFY: add modeLabel, renamePlaceholder to expected_i18n_keys()
```

### Pattern 1: Persistent mode label + transient save-state element

**What:** Split the current single `statusEl` into two sibling DOM elements:
1. `.maestro-mode-label` — static text ("Edit Mode" + dashicon), never changes, no aria-live
2. `.maestro-status` — transient save state, aria-live="polite", hidden/empty at idle

**When to use:** When a surface must simultaneously communicate a persistent state (edit mode is active) AND transient feedback (save states). A single live-region element that alternates between "Edit Mode" and "Saving…" is confusing — every state change interrupts the screen reader with the idle label.

**Code structure:**
```javascript
// buildToolbar() — replace lines 362–367:
var modeEl = el( 'div', 'maestro-mode-label' );  // persistent, not a live region
var modeIcon = el( 'span', 'dashicons dashicons-edit maestro-mode-icon' );
modeIcon.setAttribute( 'aria-hidden', 'true' );
modeEl.appendChild( modeIcon );
modeEl.appendChild( document.createTextNode( I.modeLabel ) );

statusEl = el( 'span', 'maestro-status maestro-status-idle' );
statusEl.setAttribute( 'role', 'status' );
statusEl.setAttribute( 'aria-live', 'polite' );
statusEl.setAttribute( 'aria-atomic', 'true' );

bar.appendChild( modeEl );
bar.appendChild( statusEl );
```

**setStatus() target behaviour:**
```javascript
function setStatus( state ) {
    if ( ! statusEl ) { return; }
    statusEl.className = 'maestro-status maestro-status-' + state;
    var label = modeStatusLabel( state, I );
    statusEl.textContent = label;
    statusEl.hidden = ( label === '' );  // hide at idle; aria-live region emits nothing when hidden
    if ( state === 'saved' || state === 'error' ) {
        speak( statusEl.textContent );
    }
}
```

**Anti-pattern to avoid:** Do NOT use `aria-hidden="true"` on the status element at idle — `hidden` (HTML attribute) is the correct approach, as it fully removes the element from AT with no ambiguity.

### Pattern 2: One-shot CSS animation via class add + `animationend` cleanup

**What:** Add a class that triggers a `@keyframes` animation with `animation-iteration-count: 1` (`forwards` fill). Remove the class on `animationend` to leave a clean DOM state.

**Example:**
```javascript
firstItem.classList.add( 'maestro-firstrun-pulse' );
firstItem.addEventListener( 'animationend', function onEnd() {
    firstItem.classList.remove( 'maestro-firstrun-pulse' );
    firstItem.removeEventListener( 'animationend', onEnd );
} );
```

**Reduced-motion:** The `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and applies a static outline. The `animationend` event does NOT fire when `animation: none` is applied — the class stays on the element indefinitely. This means the dismiss `firstItem.classList.remove(...)` in the `dismiss()` function is critical for cleanup under reduced motion, since `animationend` won't fire.

**Safe pattern:** Remove the class in `dismiss()` unconditionally, not just in the `animationend` handler. The `animationend` handler is only for the motion case.

### Pattern 3: Screen-reader-text label for rename input

**What:** Explicit `<label for="...">` with `class="screen-reader-text"` tied to the input by `id`. This is the WP canonical pattern already in use for the panel breadcrumb label (`.maestro-panel-label.screen-reader-text`).

**Code:**
```javascript
var renameLabel = el( 'label', 'screen-reader-text' );
renameLabel.setAttribute( 'for', 'maestro-rename-field' );
renameLabel.textContent = I.rename;  // "Rename"

var rename = el( 'input', 'maestro-rename-input' );
rename.type  = 'text';
rename.id    = 'maestro-rename-field';
rename.placeholder = I.renamePlaceholder;  // "Menu label"
```

The `.screen-reader-text` CSS is already in `maestro.css:57–67` (added in Phase 6). No CSS change required for this pattern.

### Anti-Patterns to Avoid

- **`aria-hidden="true"` on a live region at idle:** Hides the region from AT but causes re-announcement when the attribute is removed. Use the `hidden` HTML attribute or `display:none` instead.
- **Placeholder as accessible name:** `input.placeholder` is not reliably announced as the accessible name by all AT/browser combinations. The visually-hidden `<label>` is required.
- **Looping animation for the first-run pulse:** `animation-iteration-count` must be `1` (or use the `forwards` shorthand). A looping pulse violates the locked decision ("one short animation, then stops") and would be a WCAG 2.3.3 failure (Animation from Interactions, AAA) — though that is AAA, the spirit of 2.3.3 and `prefers-reduced-motion` both argue against persistent motion.
- **Using the BUG-04 `::before` pseudo-element approach for the idle icon:** The BUG-04 fix deliberately removed the idle `::before` glyph because `○` read as a fake control. Adding the new idle icon as a DOM element (`<span class="dashicons dashicons-edit" aria-hidden="true">`) avoids this entirely — a real, sized, aria-hidden span inside a label element is clearly non-interactive.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screen-reader save announcements | Custom aria-live region | `wp.a11y.speak()` (already wired) | Handles clear-before-set for repeated identical strings (Safari VoiceOver bug); already a `wp-a11y` script dep |
| Idle icon rendering | CSS `content:` pseudo-element | Real `<span class="dashicons dashicons-edit" aria-hidden="true">` | Avoids BUG-04 recurrence; pseudo-elements can't be reliably aria-hidden; DOM element is explicit |
| Placeholder contrast enforcement | Custom colour calculation | Use WP admin `#8c8f94` token + `::placeholder { opacity: 1 }` | Known AA-compliant token; Firefox default 0.54 opacity must be reset or the effective colour fails |
| First-run item selector | Complex menu traversal | `document.querySelector('#adminmenu > li.menu-top.maestro-item')` | Exact selector already used by e2e tests and `initSortables()`; guaranteed to work after `init()` |

---

## Common Pitfalls

### Pitfall 1: animationend doesn't fire under prefers-reduced-motion

**What goes wrong:** When `@media (prefers-reduced-motion: reduce)` sets `animation: none` on `.maestro-firstrun-pulse`, the `animationend` event never fires. The class stays on the element after `dismiss()` unless it's also removed there.

**Why it happens:** The CSS animation is suppressed before it starts, so the event has nothing to announce.

**How to avoid:** Remove `maestro-firstrun-pulse` from the first item in BOTH the `animationend` handler AND the `dismiss()` function. The `animationend` handler serves the motion case; the `dismiss()` call serves the reduced-motion / early-dismiss case.

**Warning signs:** Under `prefers-reduced-motion`, the static outline never clears after the user dismisses the banner.

### Pitfall 2: E2E test for idle status currently asserts `content: 'none'`

**What goes wrong:** `editor.spec.ts` at line 632 asserts:
```javascript
expect( idleContent ).toBe( 'none' );
```
This was valid when the idle state had no icon (`::before { content: none }`). After UX-03, the idle state HAS a dashicon — but it will be in a DOM element, not a `::before`. The test actually checks the `::before` pseudo-element content on `.maestro-status`, not the mode label element. The assertion will remain valid IF the new mode icon is a DOM element child of `.maestro-mode-label`, not a `::before` on `.maestro-status`. Confirm this in the implementation, then update the e2e test to also assert `.maestro-mode-label` is visible and contains the dashicon.

**How to avoid:** Keep the dashicon as a real DOM `<span>` child of the mode label, not a CSS `::before`. The existing e2e test then continues to pass without modification for the idle `::before` check; add new assertions for `.maestro-mode-label` visibility.

### Pitfall 3: `I.rename` is used in two places after UX-04

**What goes wrong:** `I.rename` currently appears in `buildToolbar()` as a visible text node (the label to remove) AND is tested for in `LocalizationTest::expected_i18n_keys()`. After UX-04, `I.rename` is repurposed as the SR label text. If a developer assumes `I.rename` is "no longer used" and removes it from `class-assets.php`, the SR label breaks silently.

**How to avoid:** Keep the `rename` key in `class-assets.php` — it is still used, just now as the SR label's `textContent` rather than a visible text node. The LocalizationTest assertion on the `rename` key continues to enforce its presence. Add a code comment at the new usage site: `// I.rename: used as screen-reader-only accessible name for the rename input`.

### Pitfall 4: The e2e UX-05 test checks panel label visibility dimensions

**What goes wrong:** `editor.spec.ts` lines 652–669 assert `.maestro-panel-label` has `width <= 1` and `height <= 1` (it's screen-reader-text). After UX-04, a new `renameLabel` element is also `screen-reader-text`. The test will still pass (it only checks the one specific `.maestro-panel-label` locator), but any review should be aware two screen-reader-text elements exist in the panel.

**How to avoid:** No code change needed; just document it.

### Pitfall 5: LocalizationTest asserts exact key list

**What goes wrong:** `LocalizationTest::expected_i18n_keys()` returns a hardcoded array of key names. Adding `modeLabel` and `renamePlaceholder` to `class-assets.php` WITHOUT updating that array means the test only asserts old keys are present — it never verifies the new keys are in the payload, and a future removal would go undetected.

**How to avoid:** Add `modeLabel` and `renamePlaceholder` to `expected_i18n_keys()` in the same commit that adds them to `class-assets.php`. This is an additive change to the integration test (the 29/29 baseline is maintained; this raises the assertion count for the localization test specifically).

### Pitfall 6: The 782px media query affects `.maestro-firstrun` left positioning

**What goes wrong:** `maestro.css:420` sets `.maestro-firstrun { left: 0; }` at ≤782px. After UX-03 adds `.maestro-mode-label`, if any mode-label styles are positioned with `left:` in the normal flow, they must also be updated in the media query.

**How to avoid:** Keep `.maestro-mode-label` as a flex child of `.maestro-toolbar` (not absolutely positioned). No `left:` override is needed for it in the media query.

---

## WCAG / A11Y Specifics

### WCAG 1.4.1 — Use of Color (Level AA)

The locked decision adds a dashicon to the idle mode indicator so that edit mode is NOT signalled by colour alone. The current idle state (`maestro.css:321`: no colour class, default `color: #c3c4c7`) relies on green text + "Editor active" label. With "Edit Mode" text + a dashicon + green colour, all three signals are present: colour, shape (icon), and text. This satisfies 1.4.1 fully.

The save states (saving/saved/error) already satisfy 1.4.1 via the `::before` dashicon glyphs (Phase 7 / BUG-05 fix). No change needed to those states.

### WCAG 1.4.3 — Contrast Minimum (Level AA)

Placeholder text contrast: the `::placeholder` pseudo-element must achieve 4.5:1 against the background (`#fff`) under WCAG 1.4.3. Note: WCAG 2.1 does not explicitly apply 1.4.3 to placeholder text (it's "inactive UI component" territory), but WCAG 2.2 and APCA guidance strongly recommend it. Using `#8c8f94` gives ~3.9:1 against `#fff` — this meets the 3:1 threshold for non-text contrast (WCAG 1.4.11) and is the WP admin canonical muted-text colour. For stronger compliance use `#6c7075` (~4.6:1 against `#fff`). The planner should choose one and justify it.

### WCAG 2.5.8 — Target Size Minimum (Level AA, WCAG 2.2)

The 44px floor specified in UX-07 exceeds WCAG 2.5.8's 24×24px minimum and matches WCAG 2.5.5's AAA 44×44px enhanced target. The project's choice of 44px is correct and conservative.

### Placeholder is NOT an accessible name (UX-04)

This is a well-established principle: `input.placeholder` is not reliably announced by all AT as the accessible name, and it disappears as soon as the user types, leaving voice-control users ("Click 'Rename'") unable to target the field. The visually-hidden `<label for="...">` pattern is required. The existing `screen-reader-text` class in `maestro.css:57–67` is the correct mechanism — no additional CSS needed.

### prefers-reduced-motion — one-shot pattern

The `@media (prefers-reduced-motion: reduce)` block in `maestro.css:307–310` currently targets only the saving spinner. The new first-run pulse animation must also be covered in this block. The static outline fallback provides a visual cue (outline is visible but not animated) without any motion.

---

## Integration Payload Budget Contract

`PerformanceTest::test_edit_mode_localized_payload_stays_under_budget()` asserts:
- Lower bound: > 70 KiB (ensures the icon data is present, not an empty payload)
- Upper bound: < 256 KiB (for a synthetic 60-item × 6-child menu)

New i18n keys added in Phase 9:
- `modeLabel`: "Edit Mode" — ~13 bytes
- `renamePlaceholder`: "Menu label" — ~14 bytes

Total addition: ~27 bytes. Current payload is well under 256 KiB (the synthetic menu's icons dominate at ~65 KiB). No risk to the budget contract.

`LocalizationTest::expected_i18n_keys()` must be updated to include `modeLabel` and `renamePlaceholder`. This is a required additive change to the integration test (the test still passes after the update; it asserts more keys are present, which they will be).

---

## Code Examples

### Mode label DOM structure (UX-03)
```javascript
// Source: maestro.js buildToolbar() — replace lines 362–367
var modeEl = el( 'div', 'maestro-mode-label' );
var modeIcon = el( 'span', 'dashicons dashicons-edit' );
modeIcon.setAttribute( 'aria-hidden', 'true' );
modeEl.appendChild( modeIcon );
modeEl.appendChild( document.createTextNode( I.modeLabel ) );

statusEl = el( 'span', 'maestro-status maestro-status-idle' );
statusEl.setAttribute( 'role', 'status' );
statusEl.setAttribute( 'aria-live', 'polite' );
statusEl.setAttribute( 'aria-atomic', 'true' );
statusEl.hidden = true;  // empty at idle

bar.appendChild( modeEl );
bar.appendChild( statusEl );
```

### First-run pulse (UX-03)
```css
/* Source: maestro.css, append to first-run block */
@keyframes maestro-pulse-item {
    0%   { outline: 2px solid transparent; outline-offset: 2px; }
    40%  { outline: 2px solid #2271b1;     outline-offset: 2px; }
    60%  { outline: 2px solid #2271b1;     outline-offset: 2px; }
    100% { outline: 2px solid transparent; outline-offset: 2px; }
}
#adminmenu li.maestro-firstrun-pulse {
    animation: maestro-pulse-item 1.5s ease-in-out 1 forwards;
}
@media ( prefers-reduced-motion: reduce ) {
    #adminmenu li.maestro-firstrun-pulse {
        animation: none;
        outline: 2px solid #2271b1;
        outline-offset: 2px;
    }
}
```

### Rename field rebuild (UX-04)
```javascript
// Source: maestro.js buildToolbar(), replace lines 379–393
var renameLabel = el( 'label', 'screen-reader-text' );
renameLabel.setAttribute( 'for', 'maestro-rename-field' );
renameLabel.textContent = I.rename;  // "Rename" — SR only

var rename = el( 'input', 'maestro-rename-input' );
rename.type = 'text';
rename.id = 'maestro-rename-field';
rename.placeholder = I.renamePlaceholder;  // "Menu label"

rename.addEventListener( 'keydown', function ( e ) {
    if ( e.key === 'Enter' ) {
        e.preventDefault();
        rename.blur();
    } else if ( e.key === 'Escape' ) {
        if ( selectedSlug ) { rename.value = model[ selectedSlug ].title; }
        rename.blur();
    }
} );
rename.addEventListener( 'blur', commitRename );

p.appendChild( renameLabel );
p.appendChild( rename );
```

### Placeholder contrast (UX-04)
```css
/* Source: maestro.css, after .maestro-rename-input block */
.maestro-rename-input::placeholder {
    color: #8c8f94;  /* WP admin muted token — 3.9:1 on #fff */
    opacity: 1;      /* Firefox resets default 0.54 to full opacity */
}
```

### Mobile density additions (UX-07)
```css
/* Source: maestro.css, inside the @media (max-width: 782px) block */
.maestro-toolbar {
    gap: 6px 10px;
    padding: 8px 10px;
}
.maestro-toolbar .button {
    padding: 4px 8px;
    font-size: 12px;
    min-height: 44px;
}
.maestro-rename-input {
    font-size: 12px;
    min-height: 44px;
    padding: 0 6px;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unicode dingbats (○⏳✓⚠) for status icons | Dashicons via `::before` CSS content | Phase 7 (BUG-05) | Consistent rendering; no emoji substitution |
| `aria-grabbed` for reorder | Alt+Arrow keyboard handler | Phase 6 (A11Y-06) | Deprecated ARIA removed |
| Visible label "Title" for rename field (BUG-02) | Visible label moved right of input as breadcrumb | Phase 7 (BUG-02) | Input left edge stable; label provides item context |
| Idle dot `○` reading as fake control (BUG-04) | Idle `::before { content: none }` | Phase 7 (BUG-04/05) | No fake control appearance |

**Phase 9 state transitions:**

| Old | New | Requirement |
|-----|-----|-------------|
| Single status element with idle text "Editor active — click an item to edit." | Persistent mode label ("Edit Mode" + dashicon) + separate transient save-status element | UX-03 |
| No first-run attention on menu items | One-shot pulse/outline on first editable item (localStorage-gated) | UX-03 |
| Visible "Rename " text label wrapping the input | Visually-hidden `<label>` (SR only) + `placeholder="Menu label"` on input | UX-04 |
| Buttons/input at desktop density on mobile | Reduced padding/font at ≤782px; ≥44px tap-target floor | UX-07 |

---

## Open Questions

1. **`setStatus()` at idle: `hidden` attribute vs `aria-hidden` vs `display:none`**
   - What we know: `hidden` (HTML attribute) is the safest approach — it removes the element from AT and collapses its space; `aria-hidden="true"` keeps it in the visual flow; `display:none` via CSS is equivalent to `hidden`.
   - What's unclear: Whether a hidden aria-live region re-announces when un-hidden. MDN confirms that adding content to a live region that is hidden (`display:none`) and then made visible may not trigger an announcement in all AT. The safest pattern: keep the element visible but empty (no `hidden`), and rely on `textContent = ''` at idle — aria-live only fires when content changes and the content is non-empty.
   - Recommendation: At idle, set `statusEl.textContent = ''` (empty string) and remove the `maestro-status-*` class. Do NOT use `hidden`. Aria-live regions should never be hidden — only their content should be empty.

2. **Pulse outline vs box-shadow**
   - What we know: `outline` does not affect document flow (no reflow); `box-shadow` is also zero-reflow. Both are compatible with the existing `box-shadow: 0 -2px 10px ...` on the toolbar (different element). The menu item row (`#adminmenu > li.menu-top`) has its own background and borders — `outline` sits outside the border-box cleanly.
   - What's unclear: Whether an `outline` on an `#adminmenu > li` looks intentional vs accidental given the WP admin theme. The existing `.maestro-selected > a` already uses `box-shadow: inset 3px 0 0 #2271b1` for the selection accent. A consistent visual language uses outlines for the pulse and box-shadow for persistent selection.
   - Recommendation: Use `outline` for the one-shot pulse (it reads as temporary / attention-seeking); the planner decides the exact colour token.

3. **Dashboard for toolbar density — restructure or not?**
   - What we know: at 700px, the density reductions should make the toolbar fit without wrapping changes. The existing `flex-wrap: wrap` (BUG-03 fix) means wrapping is already available as a fallback.
   - Recommendation: Ship the density CSS, take a screenshot at 700px in the plan, and add a plan step to decide whether restructure is warranted based on that screenshot. The planner's note should say "restructure decision gated on 700px screenshot."

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (JS unit) · `phpunit` (PHP unit + integration) · Playwright (e2e) |
| Config file | `phpunit-unit.xml.dist`, `phpunit-integration.xml.dist`, `playwright.config.ts` — all existing |
| Quick run command | `npm run test:js` (JS logic, <2s) · `composer test:unit` (PHP pure, <10s) |
| Full suite command | `npm run test:js && composer test:unit && composer test:integration && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-03 | `modeStatusLabel(state, strings)` returns correct text per state | unit (node:test) | `node --test tests/js/mode-status.test.mjs` | ❌ Wave 0 |
| UX-03 | `firstRunSeen(storage)` returns true/false per localStorage value | unit (node:test) | `node --test tests/js/first-run-gate.test.mjs` | ❌ Wave 0 |
| UX-03 | Mode label element visible in toolbar with correct text and dashicon | e2e (Playwright) | `npm run test:e2e` | ✅ (extend editor.spec.ts) |
| UX-03 | Idle status `::before` has `content: none` (save-status element, not mode label) | e2e (Playwright) | `npm run test:e2e` | ✅ (existing test at line 625 — verify it still passes) |
| UX-03 | First-run pulse class present immediately after first-run cue shown | e2e (Playwright) | `npm run test:e2e` | ✅ (extend first-run test at line 586) |
| UX-03 | First-run pulse class absent after banner dismiss | e2e (Playwright) | `npm run test:e2e` | ✅ (extend first-run test) |
| UX-03 | `modeLabel` and `renamePlaceholder` keys present in localized payload | integration (phpunit) | `npm run test:php` | ✅ (update LocalizationTest.php) |
| UX-04 | Visible "Rename " text node absent from panel; SR label present | e2e (Playwright) | `npm run test:e2e` | ✅ (extend editor.spec.ts) |
| UX-04 | Input has accessible name (label `for` attribute wired) | e2e (Playwright, `getByLabel`) | `npm run test:e2e` | ✅ (new assertion) |
| UX-04 | Input placeholder shows when empty; field pre-filled with item title | e2e (Playwright) | `npm run test:e2e` | ✅ (new assertion) |
| UX-07 | No toolbar overflow at 700px viewport with panel visible | e2e (Playwright) | `npm run test:e2e` | ✅ (existing at line 508 — verify still passes) |
| UX-07 | Every button and rename input ≥44px tall at ≤782px | e2e (Playwright, bounding box) | `npm run test:e2e` | ❌ Wave 0 (new assertion) |
| UX-07 | No control overlap at 700px | e2e (Playwright) | `npm run test:e2e` | ✅ (existing overlap guard at line 557) |
| UX-03/04/07 | PHP unit 44/44 still green | phpunit | `composer test:unit` | ✅ |
| UX-03/04/07 | Integration 29/29 + new localization assertions still green | phpunit | `npm run test:php` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run test:js` (after any maestro-logic.js change) · `composer test:unit` (after any PHP change)
- **Per wave merge:** full suite — `npm run test:js && composer test:unit && composer test:integration && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/js/mode-status.test.mjs` — RED unit test for `modeStatusLabel()` (UX-03 save-state text mapping); must FAIL before implementation
- [ ] `tests/js/first-run-gate.test.mjs` — RED unit test for `firstRunSeen(storage)` (UX-03 localStorage gate abstraction); must FAIL before implementation
- [ ] `tests/js/placeholder.test.mjs` — RED unit test for `placeholderVisible(value)` (UX-04); optional (planner decides)
- [ ] New e2e assertions in `tests/e2e/editor.spec.ts`: touch-target size check (≥44px on buttons + input at 700px) — currently missing; needed for UX-07 verification
- [ ] `tests/integration/LocalizationTest.php` update: add `modeLabel` and `renamePlaceholder` to `expected_i18n_keys()` — must be updated in the same commit that adds these keys to `class-assets.php`

---

## Sources

### Primary (HIGH confidence)

- `assets/maestro.js` (read in full, 1109 lines) — all exact line numbers verified in-tree
- `assets/maestro.css` (read in full, 437 lines) — all rule locations verified in-tree
- `includes/class-assets.php` (read in full, 247 lines) — i18n array structure verified
- `tests/integration/LocalizationTest.php` (read in full) — `expected_i18n_keys()` contract verified
- `tests/integration/PerformanceTest.php` (read in full) — payload budget contract verified (70 KiB–256 KiB)
- `tests/e2e/editor.spec.ts` (read in full, 672 lines) — existing test assertions identified; the idle `::before` test at line 625 and first-run test at line 586 are the key guards to maintain
- `tests/js/modified-diff.test.mjs`, `reorder-move.test.mjs` (read in full) — node:test patterns confirmed, `createRequire` import confirmed
- `assets/maestro-logic.js` (read in full) — dual-export guard pattern confirmed; current exported API identified
- `.planning/phases/06-accessibility-interaction/06-RESEARCH.md` + `06-VALIDATION.md` — node:test seam patterns, VALIDATION.md format

### Secondary (MEDIUM confidence)

- WCAG 2.1 SC 1.4.1, 1.4.3, 1.4.11, 2.5.5, 2.5.8 — cited from W3C WCAG 2.1 and 2.2 specs (confirmed via prior Phase 6 research); placeholder contrast treatment confirmed via MDN and WP accessibility patterns
- MDN `animation` / `animationend` event — one-shot pattern (`animation-iteration-count: 1`) is a stable, cross-browser idiom
- MDN `prefers-reduced-motion` — confirmed that `animation: none` suppresses `animationend`; static fallback pattern is correct

### Tertiary (LOW confidence — validation recommended)

- `#8c8f94` contrast ratio (~3.9:1 on `#fff`) — computed from known WP admin colour values; not verified via automated contrast tool in this research session. Recommend verification with a contrast checker before committing the placeholder CSS.

---

## Metadata

**Confidence breakdown:**
- UX-03 status split DOM structure: HIGH — derived directly from the codebase; pattern is an extension of what exists
- UX-03 first-run pulse: HIGH — selector and animation pattern are well-established; only planner discretion is the exact visual treatment
- UX-04 rename field: HIGH — the screen-reader-text pattern is already in the CSS and JS; it's a structural swap with clear before/after
- UX-07 mobile density: MEDIUM — the CSS rules are well-specified; the "does the toolbar fit at 700px after density" question can only be answered by a screenshot (planner's discretion task)
- Validation architecture: HIGH — all commands confirmed from existing test infrastructure

**Research date:** 2026-06-19
**Valid until:** 2026-09-01 (stable domain; WP admin patterns and WCAG 1.4.x requirements are unlikely to change)
