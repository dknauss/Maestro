# Phase 6: Accessibility & Interaction — Research

**Researched:** 2026-06-15
**Domain:** Keyboard-accessible list reordering, AT announcements, modified-state UX, JS unit-test seam
**Confidence:** HIGH (all major findings verified against official sources or multiple credible references)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **TDD strict (red-green-refactor)** for all pure logic (reorderMove, diffItem, resetItem). DOM glue and styling are NOT unit-TDD.
- **Zero regression bar:** PHP unit 44/44, integration 29/29, Playwright e2e 9/9 must hold; new tests are additive only.
- **No new architecture:** Build on the existing in-place editor, sparse-delta storage, `Maestro\Ordering`, and the existing keyboard-selection model (`Enter`/`Space`), focus handling, and `wp.a11y.speak()` plumbing from v1.0.

### Claude's Discretion
1. **Keyboard interaction model:** Modifier+arrow (Alt/Ctrl + Up/Down on selected item) vs ARIA grab/drop. Recommended default: modifier+arrow with `wp.a11y.speak()` move announcements.
2. **TDD seam for frontend logic:** JS unit runner (node:test) vs PHP-side logic. The decision must not ship test tooling inside the runtime zip.
3. **Modified indicator + reset visual:** Native WP-admin styling, non-color-only (WCAG), keyboard-reachable per-item reset discoverable without documentation.

### Deferred Ideas (OUT OF SCOPE)
- Reparenting, separator management, custom-icon upload, import/export
- Full pointer drag-drop redesign
- Phases 7 (Visual Polish & Icons) and 8 (Docs & Brand Assets)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| A11Y-06 | Menu items can be reordered with the keyboard (move up/down, closing the documented v1 mouse-only gap) | Alt+Arrow pattern confirmed; JAWS/NVDA conflict analysis done; Dragon Drop pattern studied; wp.a11y.speak announcement model confirmed |
| UX-01 | Each changed item shows a clear "modified" indicator; per-item reset is a discoverable, keyboard-reachable affordance | WCAG 1.4.1 non-color pattern confirmed; screen-reader-text + glyph approach confirmed; reset button discoverability via panel presence confirmed |
</phase_requirements>

---

## Summary

The three plans cover the right territory. Research confirms the core choices (Alt+Arrow, `wp.a11y.speak()`, `node:test` dual-export seam, glyph + `.screen-reader-text` indicator) with specific refinements needed on the **JAWS conflict** with Alt+Arrow, the **announcement wording and polite/assertive choice**, the **focus-retention after DOM reorder**, and **one node:test path gotcha**.

The most important finding that could change plan behavior: **Alt+Down has a real conflict with JAWS in forms/browse mode** (it opens combo boxes). The plan's guard (`e.target.closest('.maestro-popover, input, button') === null`) partially mitigates it, but the handler guard must be tighter — it must only fire when a `maestro-item` or `maestro-subitem` row itself is the active context, not merely "outside a popover". A second finding: **JAWS Alt+Up is "say prior sentence"** in JAWS desktop layout, but modern JAWS (25+) passes Alt+Arrow through to the application in application/focus mode. The `#adminmenu` is not a form control, so AT will be in browse/virtual mode unless the item row actively receives focus — the handler must call `e.preventDefault()` before AT can intercept.

The `node:test` directory-path pattern (`node --test tests/js/`) reliably finds `*.test.mjs` files in Node 22+ and Node 24 (confirmed). No glob needed. The `createRequire` interop pattern for importing CJS files from `.mjs` test files is the correct approach and is stable across Node 20-24.

**Primary recommendation:** Ship Alt+Arrow as planned, but harden the keydown guard to `e.target.closest('li.maestro-item, li.maestro-subitem')` (not just popover exclusion), always call `e.preventDefault()` first, and announce with polite `wp.a11y.speak()` including item name + ordinal position + total.

---

## Plan Verdict by Key Choice

### CONFIRM or CHALLENGE verdict for each plan decision

| Decision | Verdict | Notes |
|----------|---------|-------|
| **Alt+ArrowUp / Alt+ArrowDown** as the modifier-key binding | **CONFIRM with one CORRECTION** | Alt+Down conflicts with JAWS "open combo box" in forms mode AND NVDA sentence navigation in Word — but the admin menu is NOT a combo box or Word context. AT passes Alt+Arrow through to the application in application/focus mode. The guard in Plan 02 (no popover, no form control in focus) is the right approach; it must be the `li.maestro-item` / `li.maestro-subitem` ancestry check, NOT merely an absence check. See Pitfall 1. |
| **Gutenberg's precedent** (Ctrl+Shift+Alt+T/Y) as an alternative | **REJECT** | Gutenberg's 5-key combo (Ctrl+Shift+Alt+T/Y) was explicitly chosen to avoid conflicts but is notorious for AT not announcing moves (GitHub issue #61168). Alt+Arrow is simpler and the WP Customizer's reorder buttons also use simple arrow keys. Stick with Alt+Arrow. |
| **wp.a11y.speak() for move announcements** | **CONFIRM with one CORRECTION** | Correct approach. However: use **polite** (not assertive) for standard moves — assertive would interrupt reading. Use assertive ONLY for boundary clamping (item is already first/last), since a failed move is an error condition. The existing speak() wrapper in maestro.js already uses wp.a11y.speak() with no second arg (defaults to polite) — extend that. Repeated identical strings may not re-announce in Safari/VoiceOver (known WP core bug #36853); wp.a11y.speak() works around this by clearing the region before setting the new string. |
| **node:test + dual-export guard** for TDD seam | **CONFIRM with one CORRECTION** | `node --test tests/js/` correctly discovers `*.test.mjs` files on Node 24.14. The `createRequire` interop (`.mjs` test file + `createRequire(import.meta.url)` to load the CJS-style logic file) is verified stable. The CORRECTION: the npm script `"test:js": "node --test tests/js/"` is correct — do NOT use a glob in the npm script (e.g. `node --test **/*.test.mjs`) because npm does not shell-expand globs on all platforms. Directory path is the safe form. |
| **aria-grabbed / drag-drop ARIA** as the alternative | **REJECT** | `aria-grabbed` and `aria-dropeffect` are deprecated since ARIA 1.1. No AT ever fully implemented them. Confirmed by MDN and PowerMapper sources. Plan 02's note is accurate — skip this entirely. |
| **Modified indicator: glyph + `.screen-reader-text`** | **CONFIRM** | This is the WordPress canonical pattern (wp-accessibility SKILL.md, WCAG 1.4.1). The glyph + `screen-reader-text` sibling is the right structure. The `screen-reader-text` CSS clip-path pattern must be present in `maestro.css` — it is NOT currently present (confirmed by reading the CSS). Plan 03 must add it. |
| **Per-item reset in the shared panel (`.maestro-reset-item`)** | **CONFIRM** | The button already exists and is already keyboard-focusable. The panel approach avoids the "per-item chrome" antipattern. The plan to enable/emphasize it only when modified is the right discoverability strategy — a disabled or de-emphasized button is easier to discover than an absent one. |
| **`aria-keyshortcuts` on selected rows** | **CONFIRM with caveat** | `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"` is valid ARIA (Baseline 2023, broadly supported). Set it on the selected `<li>` row, not on every row. Caveat: the attribute is purely informational — AT will announce it when reading the element, but not at the moment of selection. Consider also adding a `.screen-reader-text` hint in the panel ("Use Alt+ArrowUp / Alt+ArrowDown to reorder") so keyboard users discover it without prior knowledge. |

---

## Standard Stack

### Core (already in use — confirm and extend)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `wp-a11y` | WP 6.4+ bundled | `wp.a11y.speak()` live-region announcements | Already a dependency of `maestro` in `class-assets.php` |
| `jquery-ui-sortable` | WP 6.4+ bundled | Existing drag-reorder layer | Already in use; the keyboard Alt+Arrow layer is independent of this |
| `node:test` + `node:assert` | Node 24.14 (installed) | JS unit runner for pure helpers | Zero new devDependency; built into Node |

### New in Phase 6

| Artifact | Purpose | Notes |
|----------|---------|-------|
| `assets/maestro-logic.js` | Exports `reorderMove`, `diffItem`, `resetItem` as side-effect-free helpers | Ships in the runtime build (in `assets/`); dual-export guard enables both node:test and browser consumption |
| `.screen-reader-text` CSS class | Hides "(modified)" text from visual display while exposing to AT | Must be added to `maestro.css`; the WP core implementation uses `clip-path: inset(50%)` |

### Alternatives Considered and Rejected

| Instead of | Rejected Alternative | Reason |
|------------|---------------------|--------|
| Alt+Arrow | Ctrl+Shift+Alt+T/Y (Gutenberg-style) | Too many keys; Gutenberg itself has AT announcement failures with this combo |
| Alt+Arrow | aria-grabbed + drag targets | Deprecated in ARIA 1.1; zero AT implementation |
| node:test directory path | glob in npm script | npm does not shell-expand globs — directory path is portable and correct |
| `screen-reader-text` pattern | `aria-label` on the row | `aria-label` replaces the accessible name; SR-text alongside a glyph is additive and preserves the item name |

---

## Architecture Patterns

### Pattern 1: Dual-Export Guard (node:test + browser, no build step)

**What:** The logic file ends with a guard that exports to both CommonJS (for `require()` in node:test `.mjs` files via `createRequire`) and `window.maestroLogic` (for the browser).

**When to use:** Any vanilla-JS file that needs both unit-test coverage and browser consumption with no bundler.

```javascript
// Source: confirmed from Node.js docs + createRequire MDN
// End of assets/maestro-logic.js:
var api = { reorderMove: reorderMove, diffItem: diffItem, resetItem: resetItem };
if ( typeof module !== 'undefined' && module.exports ) { module.exports = api; }
if ( typeof window !== 'undefined' ) { window.maestroLogic = api; }
```

```javascript
// In a .mjs test file (tests/js/reorder-move.test.mjs):
import { createRequire } from 'node:module';
const require = createRequire( import.meta.url );
const { reorderMove } = require( '../../assets/maestro-logic.js' );
```

**Confirmed:** Node 24 picks up `*.test.mjs` in `tests/js/` when running `node --test tests/js/`. No glob needed in the npm script.

### Pattern 2: Keyboard Reorder Handler Guard (critical)

**What:** The Alt+Arrow keydown handler must verify the event context before acting. The existing `bindMenuSelection` `keydown` listener uses `e.target.closest('li.maestro-item, li.maestro-subitem')` — mirror that structure exactly.

```javascript
// Source: adapted from existing bindMenuSelection pattern in maestro.js lines 168-180
menu.addEventListener( 'keydown', function ( e ) {
    if ( ! e.altKey ) { return; }
    if ( e.key !== 'ArrowUp' && e.key !== 'ArrowDown' ) { return; }
    // Guard: must be on a maestro item row, not inside a popover or form control
    var li = e.target.closest( 'li.maestro-item, li.maestro-subitem' );
    if ( ! li ) { return; }
    if ( e.target.closest( '.maestro-popover' ) ) { return; }
    // JAWS/NVDA: preventDefault BEFORE AT can intercept
    e.preventDefault();
    // ... rest of handler
}, true ); // capture phase
```

**Critical:** The handler is already registered in capture phase (`true` on `addEventListener`) for the menu — add the Alt+Arrow handler in the same or a sibling capture listener so it fires before jQuery UI sortable can see it.

### Pattern 3: Move Announcement Format

**What:** Each successful move announces item name + new ordinal + total. Boundary clamps announce as assertive (error-type). This matches the "position N of M" pattern used by the Gutenberg block toolbar buttons (the only WP core component that gets AT announcements right for reordering).

```javascript
// Polite for normal moves — does not interrupt reading
speak( I.moved
    .replace( '%1$s', m.title )
    .replace( '%2$d', String( newPos ) )
    .replace( '%3$d', String( total ) ) );
// "Posts moved down, position 3 of 8"

// Assertive for boundary — it's a failed action (error-like feedback)
wp.a11y.speak( I.moveAtTop.replace( '%1$s', m.title ), 'assertive' );
// "Posts is already the first item"
```

**Note:** The existing `speak()` wrapper in maestro.js passes no second argument (defaults polite). For boundary messages, call `wp.a11y.speak()` directly with `'assertive'` OR update the `speak()` helper to accept an optional urgency parameter.

### Pattern 4: Non-Color Modified Indicator

**What:** The WordPress-canonical non-color indicator pattern: a decorative glyph (aria-hidden) plus a `.screen-reader-text` sibling, appended to the row. The row class `.maestro-modified` drives CSS.

```html
<!-- Rendered inside .maestro-item li when modified -->
<span class="maestro-modified-badge" aria-hidden="true">●</span>
<span class="screen-reader-text"> (modified)</span>
```

```css
/* Required screen-reader-text CSS (add to maestro.css — NOT currently present) */
.screen-reader-text {
    border: 0;
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    word-wrap: normal !important;
}
/* Source: WP Accessibility SKILL.md; WordPress core pattern */
```

**Contrast note:** The badge glyph must meet 3:1 against the menu background (WCAG 1.4.11 — UI component). The admin menu background is approximately `#1d2327` (dark). A light badge color (e.g. `#dba617` amber or `#fff`) against that dark background achieves 3:1 easily. The screen-reader-text carries the semantic meaning, so color alone is never the only signal (WCAG 1.4.1 compliant).

### Anti-Patterns to Avoid

- **Assertive speak() on every keypress:** Assertive interrupts the screen reader mid-sentence. Use polite for standard moves; only use assertive for boundary-clamp feedback (failed action).
- **Glob in npm test:js script:** `node --test **/*.test.mjs` in package.json will fail on CI because npm does not shell-expand globs. Use the directory form: `node --test tests/js/`.
- **Using aria-grabbed for the keyboard reorder:** Deprecated since ARIA 1.1; no AT supports it meaningfully.
- **Color-only modified indicator:** The existing `.maestro-has-hidden` styling uses `opacity: 0.55` (not color) — follow the same non-color-only discipline for `.maestro-modified`.
- **Forgetting to call refreshModifiedIndicator on init:** Pre-existing saved overrides must show their indicator on page load, not only after a new mutation in the current session.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screen-reader live announcements | Custom aria-live div management | `wp.a11y.speak()` (already enqueued as `wp-a11y` dep) | Handles clear-before-set for repeated identical strings (Safari VoiceOver workaround is built in) |
| Clip-path screen-reader-text hiding | `display:none` or `visibility:hidden` | `.screen-reader-text` class with `clip-path: inset(50%)` | `display:none` hides from AT; the clip-path pattern is the WP standard |
| JS unit runner | Vitest, Jest, or custom framework | `node:test` + `node:assert` (built-in, Node 24) | Zero new devDependency; no config file needed; `node --test tests/js/` discovers `.test.mjs` automatically |
| Keyboard shortcut discoverability | Custom tooltip system | `aria-keyshortcuts` attribute + `.screen-reader-text` hint in panel | `aria-keyshortcuts` is Baseline 2023; the panel already has the right structure |

---

## Common Pitfalls

### Pitfall 1: JAWS Alt+Arrow Conflict (MEDIUM severity, mitigated)

**What goes wrong:** JAWS (desktop layout) historically uses `Alt+Up` for "say prior sentence" and `Alt+Down` for "open combo box." If a JAWS user is in browse (virtual) mode on the menu, JAWS may intercept these before the DOM sees them.

**Root cause:** AT modes — browse/virtual mode intercepts most keystrokes before the page. The admin menu items are `<li>` elements with `<a>` children, not form controls, so JAWS does NOT auto-switch to forms/application mode. A user in browse mode may have `Alt+Down` intercepted.

**Mitigations already in the plan:**
1. The handler fires in capture phase and calls `e.preventDefault()` — this is the right approach and prevents the browser-level scroll, but cannot prevent AT from intercepting the key first in browse mode.
2. The guard ensures the handler only fires on a `maestro-item` or `maestro-subitem` row.

**Additional mitigation the plan should add:**
- Set `role="application"` on `#adminmenu` while in edit mode (or on a wrapping element), OR add `aria-keyshortcuts` to selected rows — this signals to AT that the element has its own keyboard interaction model, prompting AT to pass keys through in application mode.
- Document in the user guide that JAWS/NVDA users may need to ensure focus is on the menu item (Tab to it, then use AT's "forms/application mode" toggle if needed).

**Warning signs:** During manual testing, if Alt+Arrow does nothing for JAWS users, this is the cause. NVDA's Alt+Down ("open combo box") conflict is less severe in web contexts because NVDA only applies that shortcut in the context of a focused `<select>` or `[role="combobox"]` element.

**Confidence:** MEDIUM (derived from reading JAWS shortcut documentation and NVDA GitHub issues; definitive confirmation requires manual AT testing, which is in the VALIDATION.md manual section).

### Pitfall 2: Repeated Identical speak() Calls Not Re-Announced in Safari

**What goes wrong:** VoiceOver on Safari may not announce a repeated identical string in a live region if the content hasn't changed.

**Root cause:** Known browser/AT behavior. Safari requires the live region to be cleared before the new content is set, not just overwritten with the same string.

**Prevention:** `wp.a11y.speak()` already handles this — it clears the live region before setting the new message (WordPress core bug #36853 fix). The plan's approach of calling the existing `speak()` wrapper is safe. Do NOT build a custom live region.

**Warning sign:** If the same boundary message ("Posts is already first") is announced the first time but not subsequent presses, this is the cause.

### Pitfall 3: Focus Lost After DOM Reorder

**What goes wrong:** When `<li>` nodes are physically re-appended in the DOM to match `newOrder`, the focused element is moved in the DOM. In most browsers, `element.focus()` after the DOM manipulation is required — the browser may drop focus to `body` if the node is detached and re-attached, even briefly.

**Root cause:** Detaching a DOM node removes it from the focus stack. Re-attaching it does not restore focus automatically.

**Prevention (already noted in Plan 02 but needs emphasis):** After DOM reorder, explicitly call `liForSlug(selectedSlug).querySelector('a.menu-top, a').focus({ preventScroll: true })` — this must happen AFTER the re-append, not before.

**Warning sign:** In the Playwright e2e test, if subsequent Alt+Arrow keypresses after the first move do not continue moving the item (because focus jumped to body), this is the cause.

### Pitfall 4: `node --test` Glob in npm Script

**What goes wrong:** `"test:js": "node --test **/*.test.mjs"` in package.json fails on some platforms/CI because npm does not shell-expand globs.

**Prevention:** Use the directory form: `"test:js": "node --test tests/js/"`. Node 24 automatically discovers `*.test.mjs` files in the directory recursively.

**Confirmed:** Node.js docs (v26) confirm that `node --test dirname/` discovers `**/*.test.{mjs,js,cjs}` patterns recursively. This is the safe cross-platform approach.

### Pitfall 5: Build Inclusion of Test Files

**What goes wrong:** If `tests/` is ever copied into the zip, the WordPress plugin would ship test tooling, failing Plugin Check.

**Prevention:** The current `bin/build.sh` copies only `maestro.php`, `includes/`, `assets/`, `languages/`, `readme.txt` — `tests/` is never included. `assets/maestro-logic.js` IS in the build path (correct — it's runtime logic). No change to `bin/build.sh` is needed.

### Pitfall 6: diffItem Matching the Existing Inline Logic Exactly

**What goes wrong:** If `diffItem` uses different comparison logic than the inline diff in `buildConfig()`, the indicator will disagree with what actually gets saved.

**Root cause:** The existing inline diff has a nuanced rule: `if ( m.title && m.title !== def.title )` — an empty title is NOT "modified" even if the pristine also differs. The pure function must mirror this exactly.

**Prevention:** Plan 01's behavior spec already captures this case ("empty/absent current title equal to empty pristine → not modified"). The refactor step (routing `buildConfig()` through `maestroLogic.diffItem`) closes this divergence risk permanently.

---

## Code Examples

### node:test Import of CJS Logic File from .mjs Test
```javascript
// Source: Node.js ESM docs (https://nodejs.org/api/esm.html)
// tests/js/reorder-move.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { reorderMove } = require( '../../assets/maestro-logic.js' );

test( 'moves item up', () => {
    assert.deepStrictEqual( reorderMove( ['a','b','c'], 'b', 'up' ), ['b','a','c'] );
} );
```

### Speak Wrapper Extension (boundary as assertive)
```javascript
// Extend the existing speak() helper or call wp.a11y.speak() directly:
function speakMove( msg ) {
    if ( window.wp && window.wp.a11y ) { window.wp.a11y.speak( msg ); }
}
function speakBoundary( msg ) {
    if ( window.wp && window.wp.a11y ) { window.wp.a11y.speak( msg, 'assertive' ); }
}
```

### Focus Retention After DOM Reorder
```javascript
// After re-appending li nodes:
var movedLi = liForSlug( selectedSlug );
if ( movedLi ) {
    var focusTarget = movedLi.querySelector( 'a' ) || movedLi;
    focusTarget.focus( { preventScroll: true } );
}
```

### screen-reader-text CSS (must be added to maestro.css)
```css
/* Source: WordPress core pattern; wp-accessibility SKILL.md */
.maestro-editing .screen-reader-text {
    border: 0;
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    word-wrap: normal !important;
}
```

### aria-keyshortcuts on Selected Row
```javascript
// Set on selection; remove on deselection
li.setAttribute( 'aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown' );
// Source: MDN aria-keyshortcuts (Baseline 2023)
```

---

## State of the Art

| Old Approach | Current Approach | Status | Impact |
|--------------|------------------|--------|--------|
| `aria-grabbed` + `aria-dropeffect` | Keyboard modifier+arrow + live region announcements | Deprecated since ARIA 1.1; no AT implementation | aria-grabbed must NOT be used |
| Assertive speak() for all announcements | Polite for moves, assertive for errors/boundaries | Best practice | Avoids interrupting AT reading flow |
| Global AT-visible `<div role="status">` for all dynamic state | `wp.a11y.speak()` + clear-before-set | Already handles Safari VoiceOver repeated-string bug | Plan uses this correctly |

**Deprecated/outdated:**
- `aria-grabbed`: do not use; Plan 02 correctly notes this and rejects it.
- Positive `tabindex` values: never use; the existing keyboard model uses correct `tabindex` practices.

---

## Validation Architecture

> `nyquist_validation: true` in config.json — section required. A populated `06-VALIDATION.md` already exists. Research notes below are **deltas and confirmations** to that file, not a fresh creation.

### Confirmations to 06-VALIDATION.md

The existing validation map (06-VALIDATION.md) is **accurate and complete**. The following research findings confirm or add nuance:

| Finding | Impact on VALIDATION.md |
|---------|------------------------|
| `node --test tests/js/` discovers `*.test.mjs` in Node 24 | Confirms the quick run command; no change needed |
| JAWS Alt+Arrow conflict is a **manual-only** concern | The existing Manual-Only Verifications table already captures this correctly: "AT phrasing/UX judgment isn't meaningfully automatable" |
| wp.a11y.speak() already clears region before set | No additional debounce needed in the keyboard handler — the existing tool handles rapid successive calls |
| focus retention after DOM reorder must be verified | Add a sub-assertion to the Playwright e2e test (06-02 Task 2): after the move, assert the same item is still the active element or that a subsequent Alt+Arrow continues the chain |
| `screen-reader-text` CSS not yet in maestro.css | Wave 0 gap for Plan 03: the CSS class must be added as part of Task 1 |

### Delta: Wave 0 Gap Not Previously Listed

- [ ] `assets/maestro.css` needs the `.screen-reader-text` CSS rules before Plan 03 Task 1 can render the modified indicator correctly. This can be part of Plan 03 Task 1 or added as a preparatory step. It is NOT needed by Plans 01 or 02.

---

## Open Questions

1. **JAWS application-mode promotion**
   - What we know: JAWS in browse mode may intercept Alt+Arrow before the DOM sees it. `e.preventDefault()` cannot stop AT interception.
   - What's unclear: Whether `role="application"` on `#adminmenu` during edit mode is acceptable UX, or whether `aria-keyshortcuts` on the selected item is sufficient to prompt JAWS to pass through the keys.
   - Recommendation: Do not add `role="application"` — it is a large semantic change. Instead, add the `aria-keyshortcuts` attribute (Plan 02 already does this) and note in the user guide that JAWS users should press Enter or Space to select an item (which switches JAWS to application mode on the focused element) before using Alt+Arrow. Verify in manual AT testing.

2. **Boundary message assertive vs polite**
   - What we know: The plan uses `speak()` for all messages. Assertive is more appropriate for failed actions (boundary clamp).
   - What's unclear: User preference — some AT users find assertive interruptions jarring for simple "can't do that" feedback.
   - Recommendation: Use assertive for boundary clamps as proposed; the message is short and the failure needs immediate acknowledgment. This is the pattern used by accessible reorder libraries (Dragon Drop uses it for cancel announcements).

3. **Screen-reader-text placement within the menu item row**
   - What we know: Inserting a `.screen-reader-text` span into `#adminmenu li` rows that WordPress renders and manages could be fragile (e.g., WP scripts may rebuild the row).
   - What's unclear: Whether WordPress core ever mutates `.maestro-item` row children after Maestro's `init()`.
   - Recommendation: The plan's approach (inserting the badge span under JS control, idempotently in `refreshModifiedIndicator`) is correct. Since Maestro controls the row lifecycle during edit mode and the badge nodes are inserted after init, there is no re-render risk.

---

## Sources

### Primary (HIGH confidence)
- Node.js v26 Test Runner docs (https://nodejs.org/api/test.html) — directory discovery patterns, `.test.mjs` support
- Node.js ESM docs (https://nodejs.org/api/esm.html) — `createRequire` pattern
- MDN `aria-keyshortcuts` (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts) — Baseline 2023, format, caveats
- MDN `aria-grabbed` (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-grabbed) — deprecated since ARIA 1.1
- Apple Mac keyboard shortcuts (https://support.apple.com/en-us/102650) — Option+Arrow not reserved at system level without Shift modifier
- wp-accessibility SKILL.md (`/Users/danknauss/.claude/skills/wp-accessibility/SKILL.md`) — `.screen-reader-text` CSS, `wp.a11y.speak()` usage, WCAG AA contrast ratios
- Project `assets/maestro.js` and `assets/maestro.css` — confirmed existing patterns, existing speak() wrapper, existing bindMenuSelection guard structure

### Secondary (MEDIUM confidence)
- Smashing Magazine "Enter The Dragon (Drop)" (https://www.smashingmagazine.com/2018/01/dragon-drop-accessible-list-reordering/) — Dragon Drop pattern: Enter/Space to grab, Arrow to move, Escape to cancel; position announcement format
- WebAIM NVDA shortcuts (https://webaim.org/resources/shortcuts/nvda) — Alt+Down is "open combo box" for NVDA, but only in combo box context
- Deque JAWS shortcuts (https://dequeuniversity.com/screenreaders/jaws-keyboard-shortcuts) — Alt+Up "say prior sentence", Alt+Down "open combo box"
- NVDA GitHub issue #8541 (https://github.com/nvaccess/nvda/issues/8541) — Alt+Down conflict in NVDA (combo box vs SentenceNav); JAWS moved sentence navigation to Alt+Numpad in newer versions
- Gutenberg issue #61168 (https://github.com/WordPress/gutenberg/issues/61168) — Ctrl+Shift+Alt+T/Y doesn't announce to AT; toolbar buttons announce "position x to y" correctly
- WP core Trac #36853 — `wp.a11y.speak()` clear-before-set fix for Safari VoiceOver repeated strings
- PowerMapper SortSite rule (https://www.powermapper.com/products/sortsite/rules/w3cariadeprecateddraganddrop/) — confirms `aria-grabbed` / `aria-dropeffect` deprecated
- Node.js issue #50658 (https://github.com/nodejs/node/issues/50658) — glob in npm scripts not shell-expanded; directory path is the safe form

### Tertiary (LOW confidence — informational only)
- WP Customizer accessibility usertest (https://make.wordpress.org/accessibility/2015/06/12/accessibility-usertest-menu-customizer/) — historical pattern reference; simple Up/Down arrows used in Customizer reorder (no modifier, but different UI context)
- JAWS "application mode passes Alt+Arrow through" finding — derived from multiple JAWS documentation sources; definitive confirmation requires AT manual testing

---

## Metadata

**Confidence breakdown:**
- Alt+Arrow binding: MEDIUM (conflict analysis done; final confirmation is manual AT testing per VALIDATION.md)
- node:test seam: HIGH (Node.js official docs confirm; pattern is used and stable)
- speak() announcement pattern: HIGH (wp.a11y.speak() behavior confirmed; polite/assertive distinction confirmed)
- Modified indicator pattern: HIGH (WP canonical pattern, WCAG 1.4.1 compliant)
- focus retention after DOM reorder: MEDIUM (the requirement is clear; exact browser behavior under jQuery UI sortable DOM manipulation needs e2e verification)

**Research date:** 2026-06-15
**Valid until:** 2026-09-01 (stable domain; AT shortcut tables change slowly)
