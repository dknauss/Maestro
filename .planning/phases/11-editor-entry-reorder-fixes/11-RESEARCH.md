# Phase 11: Editor Entry & Reorder Fixes - Research

**Researched:** 2026-06-21
**Domain:** WordPress admin-bar responsive CSS / vanilla DOM manipulation / badge placement
**Confidence:** HIGH (all key findings verified against source code or authoritative docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UX-08a — mobile visibility:** Add a scoped CSS override that keeps `#wp-admin-bar-maestro-toggle` visible at ≤782px (target the specific node, not a broad rule). At narrow widths render the node icon-only (dashicon only). The node MUST keep an accessible name even when icon-only — full label text stays in `meta.title` / `aria-label`.

**UX-08b — compact toggle label:** Visible label: "Edit Menu" (enter) / "Exit" (exit), keeping the leading dashicon. Full phrasing "Edit Admin Menu" / "Exit Editor" retained as `meta.title` / `aria-label` for screen readers and tooltip.

**BUG-06 — single-node insertBefore:** Fix the DOM-application step (L296–303) only. Move only the selected node by one position using `insertBefore` relative to its computed neighbour. Leave `wp-menu-separator` and other non-`maestro-item` nodes physically untouched. Separator *management* (V2-02) is out of scope.

**BUG-07 — badge to anchor/label:** Append `.maestro-modified-badge` and `.maestro-modified-sr` to `a.menu-top` / `.wp-menu-name` instead of the `<li>`. Keep the existing inline CSS approach (no absolute positioning). Keep the `screen-reader-text` span behavior unchanged.

### Claude's Discretion

- Whether BUG-06's single-node move warrants a new pure helper + node:test, or is pure DOM glue verified by e2e — decide at plan time per the project TDD rule.
- Exact breakpoint/selector mechanics for the UX-08a override and icon-only rendering.
- Exact CSS for inline badge spacing.

### Deferred Ideas (OUT OF SCOPE)

- UX-09 — pin toolbar "Edit Mode" zone to admin-menu column (reopened as standalone item).
- BUG-08 — first-run banner text/dismiss not vertically centered.
- Separator management (V2-02).
- Reparenting (V2-01).
- Single-site privileged editor tier (V2-17).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-08 | Admin-bar editor entry — mobile visibility + compact label | WP core responsive mechanism documented; exact override selector and icon-only approach confirmed |
| BUG-06 | Keyboard reorder (Alt+Arrow) must preserve wp-menu-separator nodes | DOM structure of top-level menu confirmed; single-node insertBefore algorithm designed; separator fixture gap identified |
| BUG-07 | Modified-state badge must render on the changed row, not after the submenu | DOM structure of items-with-submenus understood; correct append target (`.wp-menu-name`) confirmed from existing code at L517 |
</phase_requirements>

---

## Summary

Phase 11 is three narrow, contained fixes to existing editor surfaces. None introduces new architecture. The design decisions are already fully locked in CONTEXT.md; research here answers the "how exactly do we implement and verify" questions.

**UX-08** is blocked by WordPress core's admin-bar responsive CSS, which hides ALL top-level admin-bar nodes at ≤782px via `#wp-toolbar > ul > li { display: none; }` and then whitelists a fixed set of core nodes back to `display: block`. The fix is a single scoped override that adds `#wpadminbar li#wp-admin-bar-maestro-toggle` to the visible set, then applies an icon-only treatment at that breakpoint. This is the same mechanism used by all third-party admin-bar nodes that need mobile visibility. The accessible name is already supplied by `meta.title` on the node; the visible label text (`title` HTML arg) just needs the text span hidden visually.

**BUG-06**'s pure `reorderMove()` is correct and already tested (7 tests in `reorder-move.test.mjs`). The DOM application step is pure DOM glue with no extractable index logic — all index arithmetic is already done by `reorderMove()` before the DOM step runs. The fix is: given `newOrder` from `reorderMove()`, compute which slug moved (there are exactly two candidates: the selected slug, and the slug it swapped with), find the new neighbour in the DOM (by iterating `parentUl.children` for the next/previous `maestro-item`), and call `selectedNode.parentNode.insertBefore(selectedNode, neighbourNode)` or `appendChild`. The `wp-menu-separator` (and any other non-`maestro-item` child) is untouched because only one node is moved. **No new pure helper is needed** — the TDD heuristic is "can you write `expect(fn(input)).toBe(output)` before writing `fn`?" and the answer is no for a DOM-mutation with no extractable return value. E2e covers this.

**BUG-07** is already half-explained by existing code: `updateMenuLabel()` at L517 already targets `li.querySelector('.wp-menu-name')` for top-level items. The badge append should target the same node. The `screen-reader-text` span appended to `.wp-menu-name` is fine — it will not be read as part of the visual label because it uses WP's `screen-reader-text` class (which clips off-screen). Badge spacing already works via `margin-left: 4px; vertical-align: middle` in `maestro.css:82`; no CSS change is needed to the badge rules themselves, just the JavaScript append target.

**Primary recommendation:** Three atomic plans — UX-08 (PHP label change + CSS responsive override), BUG-06 (JS DOM-application step + e2e with separator fixture), BUG-07 (JS append target + e2e assertion on badge location) — plus a zero-regression gate plan.

---

## Standard Stack

No new libraries. This phase modifies existing files only.

### Core files touched

| File | Change | Purpose |
|------|--------|---------|
| `includes/class-admin-bar.php` | UX-08b label strings + UX-08a class/aria hook if needed | PHP: node title, meta.title |
| `assets/maestro.css` | UX-08a mobile visibility + icon-only; BUG-07 (if badge spacing needs adjustment on anchor) | CSS: responsive override |
| `assets/maestro.js` | BUG-06 DOM-application step; BUG-07 badge/sr-text append target | JS: DOM mutations |
| `tests/integration/LocalizationTest.php` | UX-08b: if new i18n keys are added, add them to `expected_i18n_keys()` | PHP integration test |
| `tests/e2e/editor.spec.ts` | BUG-06: separator e2e; BUG-07: badge-location assertion | Playwright e2e |

### No new dependencies

All dashicons, WP admin bar CSS, and existing helpers (`el()`, `liForSlug()`, `reorderMove()`) are already available. No npm install needed.

---

## Architecture Patterns

### WP Core Admin-Bar Responsive Mechanism (UX-08a)

**Source:** Verified against `develop.svn.wordpress.org/trunk/src/wp-includes/css/admin-bar.css` (HIGH confidence)

WordPress core uses a two-step deny/allow pattern at `max-width: 782px`:

```css
/* Step 1 — hide all top-level nodes */
@media screen and (max-width: 782px) {
    #wp-toolbar > ul > li {
        display: none;
    }
}

/* Step 2 — whitelist specific nodes back */
@media screen and (max-width: 782px) {
    #wpadminbar li#wp-admin-bar-menu-toggle,
    #wpadminbar li#wp-admin-bar-wp-logo,
    #wpadminbar li#wp-admin-bar-my-sites,
    #wpadminbar li#wp-admin-bar-updates,
    #wpadminbar li#wp-admin-bar-site-name,
    #wpadminbar li#wp-admin-bar-site-editor,
    #wpadminbar li#wp-admin-bar-customize,
    #wpadminbar li#wp-admin-bar-new-content,
    #wpadminbar li#wp-admin-bar-edit,
    #wpadminbar li#wp-admin-bar-comments,
    #wpadminbar li#wp-admin-bar-my-account,
    #wpadminbar li#wp-admin-bar-command-palette {
        display: block;
    }
}
```

`#wp-admin-bar-maestro-toggle` is NOT in this whitelist, so it becomes invisible at ≤782px.

**Fix pattern:** Add a scoped override in `maestro.css` inside the existing `@media screen and (max-width: 782px)` block:

```css
@media screen and (max-width: 782px) {
    /* Keep the editor toggle reachable on mobile — WP core hides all top-level
     * admin-bar nodes via #wp-toolbar > ul > li { display:none } and whitelists
     * only built-in nodes back. Override for our node only. */
    #wpadminbar li#wp-admin-bar-maestro-toggle {
        display: block;
    }
}
```

The ID-based selector `#wpadminbar li#wp-admin-bar-maestro-toggle` has specificity (0,2,1) which matches the whitelist selectors core uses — no `!important` needed.

**Icon-only at narrow widths:** The node's visible content is controlled by the `title` HTML argument passed to `$bar->add_node()`. The dashicon is inside a `<span class="ab-icon dashicons dashicons-edit">` and the label text follows as a text node or within the `ab-label` span that WP wraps it in. The icon-only treatment hides the text span, not the icon:

```css
@media screen and (max-width: 782px) {
    #wpadminbar li#wp-admin-bar-maestro-toggle .ab-label {
        display: none; /* visually hide label text; aria-label/meta.title remains */
    }
}
```

The `meta.title` field already supplies the accessible name via the `title` attribute on the `<a>` element that WP core generates. No additional `aria-label` attribute injection in PHP is needed. Verify by inspecting the rendered HTML: WP wraps the node's `title` property (from `$args['title']`) inside an `<a>` with a `title` attribute set from `meta.title`.

**UX-08b label change:** In `class-admin-bar.php` at L51–52:

```php
'title' => $editing
    ? '<span class="ab-icon dashicons dashicons-exit" style="margin-top:2px;"></span>'
      . esc_html__( 'Exit', 'maestro-menu-editor' )
    : '<span class="ab-icon dashicons dashicons-edit" style="margin-top:2px;"></span>'
      . esc_html__( 'Edit Menu', 'maestro-menu-editor' ),
'meta'  => array(
    'title' => $editing
        ? esc_attr__( 'Exit Editor', 'maestro-menu-editor' )
        : esc_attr__( 'Edit Admin Menu', 'maestro-menu-editor' ),
),
```

The `meta.title` changes from the generic "Toggle in-place admin menu editing" to the explicit long form, so AT users get the full phrase as tooltip/accessible name.

These are new translatable strings. `LocalizationTest` does not currently assert on admin-bar strings (they are PHP-side only, not in the JS `i18n` payload), so no `LocalizationTest` update is needed for UX-08. Verify this is still the case when implementing — if a new JS key is added for the toggle label, add it to `expected_i18n_keys()`.

### BUG-06: Single-Node insertBefore Algorithm

**Source:** Verified against actual `maestro.js` L265–331 (HIGH confidence)

Current buggy pattern (L296–303):
```javascript
// Moves ALL editable items to the end — past any separators.
menu.querySelectorAll( 'li.menu-top.maestro-item[data-maestro-slug]' ).forEach( function ( n ) {
    slugToNode[ n.dataset.maestroSlug ] = n;
} );
newOrder.forEach( function ( slug ) {
    var node = slugToNode[ slug ];
    if ( node ) { parentUl.appendChild( node ); }
} );
```

**Why it fails:** `appendChild` detaches `node` from its current position and re-attaches at the end of `parentUl`. After re-appending every `maestro-item`, all editable items end up clustered after any `wp-menu-separator` (and after any other non-`maestro-item` children like `li.wp-menu-separator`). This breaks on any real WP install since core always registers at least one separator.

**Correct replacement — single-node move:**

`reorderMove()` returns a full new order array, but only two positions changed: the selected slug moved one step, and the slug it swapped with moved the other step. The only physical DOM change needed is to move the selected node by one position relative to its new neighbours, leaving every other node (including separators) where it was.

Algorithm:

```javascript
// After newOrder = reorderMove(currentSlugs, selectedSlug, dir):

// 1. Find the selected node.
var selectedNode = slugToNode[ selectedSlug ];

// 2. Determine the target position from newOrder.
var newIdx = newOrder.indexOf( selectedSlug );

// 3. Find the next maestro-item sibling in parentUl at the new position
//    (i.e. the item that was at newIdx before the move, now at newIdx+1).
//    Walk parentUl.children to find the (newIdx+1)-th maestro-item.
var maestroChildren = Array.prototype.filter.call(
    parentUl.children,
    function ( c ) { return c.classList.contains( 'maestro-item' ); }
);

// 4. Insert before the maestro-item that will sit AFTER us in the new order,
//    or append if we are moving to the last position.
if ( newIdx < maestroChildren.length - 1 ) {
    // The item currently at newIdx in maestroChildren is our new following sibling.
    // After we remove ourselves from our old position and insert before it,
    // the indices shift by 1 for items after our old position — account for that.
    var followingSibling = maestroChildren[ newIdx < currentIdx ? newIdx + 1 : newIdx ];
    parentUl.insertBefore( selectedNode, followingSibling );
} else {
    parentUl.appendChild( selectedNode );
}
```

**Note on index arithmetic:** Because `reorderMove()` moves by exactly one step, `newIdx === currentIdx - 1` (up) or `newIdx === currentIdx + 1` (down). For `dir === 'up'`: the selected node needs to land before the node currently at `newIdx` (which is `currentIdx - 1`). For `dir === 'down'`: it needs to land after the node currently at `currentIdx + 1`.

A simpler formulation avoids index math entirely by querying the current `maestroChildren` array (which still reflects the old DOM order at this point, since `selectedNode` hasn't moved yet), finding our current position, and calling `insertBefore` or `appendChild`:

```javascript
// Simpler: re-query the current ordered list of maestro items (before the move)
var maestroChildren = Array.prototype.slice.call(
    parentUl.querySelectorAll( dir === 'up'
        ? 'li.menu-top.maestro-item[data-maestro-slug]'
        : 'li.menu-top.maestro-item[data-maestro-slug]' )
);
var currentIdx = maestroChildren.indexOf( selectedNode );

if ( dir === 'up' && currentIdx > 0 ) {
    // Insert before the node that is currently one position above us.
    parentUl.insertBefore( selectedNode, maestroChildren[ currentIdx - 1 ] );
} else if ( dir === 'down' && currentIdx < maestroChildren.length - 1 ) {
    // Insert after the node that is currently one position below us.
    // "After X" = insertBefore(X.nextSibling) or appendChild if X is last.
    var after = maestroChildren[ currentIdx + 1 ];
    if ( after.nextSibling ) {
        parentUl.insertBefore( selectedNode, after.nextSibling );
    } else {
        parentUl.appendChild( selectedNode );
    }
}
```

This formulation is clean and directly uses `dir` (already in scope), avoids re-deriving from `newOrder`, and leaves separators and other non-`maestro-item` nodes untouched. **The planner should choose the most readable formulation; both are correct.**

**TDD decision (Claude's Discretion):** This is pure DOM glue. The only testable "logic" is: given a `dir` and a position in a list, which DOM call is made? That logic is trivially simple (one conditional) and already fully exercised by the existing boundary-clamping check (the `newOrder.join('\n') === currentSlugs.join('\n')` check at L281 handles no-op). A new pure helper would be contrived — there is no `expect(fn(input)).toBe(output)` to write for a function whose output is a DOM mutation with no return value. **Use e2e coverage only.** The existing `keyboard-only reorder` e2e test at L355 covers the happy path; a new separator-bearing test is needed for BUG-06 specifically (see Validation Architecture).

**Subitem scope:** The same DOM-application step applies for submenu reorder (the `m.isSub` branch uses `parentUl = parentLi.querySelector('.wp-submenu')` and `li.maestro-subitem`). The fix pattern is identical — single-node insertBefore. Submenus do not have `wp-menu-separator` children in practice, but the fix is correct either way.

### BUG-07: Badge Placement on Anchor

**Source:** Verified against `maestro.js` L68–120 and `maestro.css` L79–90 (HIGH confidence)

**WordPress admin menu DOM structure** for a top-level item with a submenu:

```html
<li id="menu-posts" class="menu-top maestro-item" data-maestro-slug="edit.php">
  <a href="..." class="menu-top menu-icon-posts">
    <div class="wp-menu-arrow"><div></div></div>
    <div id="..." class="wp-menu-image dashicons-before dashicons-admin-post">
      <br>
    </div>
    <div class="wp-menu-name">Posts</div>  <!-- <-- label is here -->
  </a>
  <ul class="wp-submenu wp-submenu-wrap">
    <li class="wp-submenu-head" aria-hidden="true">Posts</li>
    <li class="maestro-subitem" data-maestro-slug="edit.php">
      <a href="...">All Posts</a>
    </li>
    ...
  </ul>
  <!-- BUG-07: badge currently lands HERE, after <ul> -->
</li>
```

For a top-level item **without** a submenu, the `<ul class="wp-submenu">` is absent or empty, so the badge appears immediately after the `<a>`, which reads visually as "on the row." This explains why the bug is only visible for parent items.

**Correct append target:** `.wp-menu-name` for top-level items (matching the existing pattern at L517 in `updateMenuLabel()`). For submenu items, the anchor `<a>` is the label container (same pattern at L515–516). The badge is `aria-hidden="true"` so it doesn't need to be inside a focusable element.

**Current code at L103–113:**
```javascript
if ( ! li.querySelector( '.maestro-modified-badge' ) ) {
    var badge = el( 'span', 'maestro-modified-badge' );
    badge.setAttribute( 'aria-hidden', 'true' );
    badge.textContent = '•';
    li.appendChild( badge );  // <-- BUG: goes to <li> end, after <ul class="wp-submenu">
}
if ( ! li.querySelector( '.maestro-modified-sr' ) ) {
    var srText = el( 'span', 'screen-reader-text maestro-modified-sr' );
    srText.textContent = I.modified;
    li.appendChild( srText );  // <-- same bug for sr-text
}
```

**Fixed version (UX-01 pattern from `updateMenuLabel()`):**
```javascript
// Target the label element (same selector used by updateMenuLabel).
var labelTarget = m.isSub
    ? li.querySelector( 'a' )
    : li.querySelector( '.wp-menu-name' );

if ( labelTarget && ! labelTarget.querySelector( '.maestro-modified-badge' ) ) {
    var badge = el( 'span', 'maestro-modified-badge' );
    badge.setAttribute( 'aria-hidden', 'true' );
    badge.textContent = '•';
    labelTarget.appendChild( badge );
}
if ( labelTarget && ! labelTarget.querySelector( '.maestro-modified-sr' ) ) {
    var srText = el( 'span', 'screen-reader-text maestro-modified-sr' );
    srText.textContent = I.modified;
    labelTarget.appendChild( srText );
}
```

**CSS impact:** The `.maestro-modified-badge` CSS at L82–90 uses `margin-left: 4px; vertical-align: middle` — these work correctly when the badge is inside `.wp-menu-name` (which is an inline-block or block element). No CSS change needed.

**Removal code (L115–120) must be updated to match:** The current removal queries `li.querySelector('.maestro-modified-badge')` — since the badge is now inside `.wp-menu-name`, `li.querySelector` still finds it (it is still a descendant of `li`). No change needed to the removal logic. Verify this.

**The deduplication guard** (`if ( ! li.querySelector('.maestro-modified-badge') )`) also continues to work correctly since `li.querySelector` searches descendants recursively.

**SR-text note:** The `.screen-reader-text` span appended to `.wp-menu-name` is correct — WP's screen-reader-text class positions the element off-screen with clip, so it does not affect the visual label but is read by AT. The badge is `aria-hidden="true"` so AT skips it and reads the sr-text instead. This is unchanged by the fix.

### Anti-Patterns to Avoid

- **Broad `#wp-toolbar li { display: block }` override:** Too wide — would re-show ALL hidden admin-bar nodes on mobile, breaking core's responsive layout. Always target the specific node ID.
- **Appending badge to `<a class="menu-top">` for top-level items:** The `<a>` contains the icon `<div>` and `.wp-menu-name`. Appending to `<a>` rather than `.wp-menu-name` would put the badge after the label text but still before `</a>`, which may render correctly but is less precise — and the submenu-items path correctly targets `li.querySelector('a')` since those `<a>` elements contain the label directly.
- **Using `!important` for the admin-bar override:** Not needed; matching specificity with the `#wpadminbar li#id` pattern (0,2,1) is sufficient since the whitelist restore rule also uses this specificity.
- **Re-appending only the moved node (without considering separator hops):** The CONTEXT.md decision is "hop over separators" — Alt+Arrow = "move me one position among the editable items." The `reorderMove()` function operates on the `currentSlugs` array (editable items only, no separators). This is already correct. The DOM step just needs to physically position the node among its editable peers, skipping over any separator DOM nodes naturally via `insertBefore`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible admin-bar toggle | A custom toggle outside the admin bar | `$bar->add_node()` + `meta.title` | WP handles focus, keyboard, ARIA for admin-bar nodes |
| Icon-only accessible toggle | aria-label in JS | `meta.title` attribute set in PHP | WP core renders `title` as the `<a title="...">` attribute, which serves as accessible name when visible label is hidden |
| Badge position for items-with-submenus | Absolute/fixed positioning | Inline append to `.wp-menu-name` | Matches how WP core count bubbles (e.g., plugin update count) work; no overlap risk |

---

## Common Pitfalls

### Pitfall 1: Fighting Core's Specificity for Admin-Bar Visibility
**What goes wrong:** Using a low-specificity selector like `#wp-admin-bar-maestro-toggle { display: block }` (specificity 0,1,0) that loses to core's `#wp-toolbar > ul > li { display: none }` (0,1,1) or the parent cascade.
**Why it happens:** The `display: none` is on the `<li>` (the direct child of `#wp-toolbar > ul`), and core's whitelist uses `#wpadminbar li#wp-admin-bar-...` (0,2,1).
**How to avoid:** Match or exceed core's whitelist specificity: `#wpadminbar li#wp-admin-bar-maestro-toggle { display: block }` — two IDs + one element tag = (0,2,1).
**Warning signs:** At ≤782px the node is still invisible in the Playwright screenshot even after the CSS is added.

### Pitfall 2: `.ab-label` vs. Text Node — WP Admin Bar Label Structure
**What goes wrong:** Hiding `.ab-label` for icon-only display, but the label text renders as a text node outside `.ab-label`, or vice versa.
**Why it happens:** WP core's `WP_Admin_Bar::_render_item()` wraps the `title` HTML in an `<a>` with `.ab-item`, and may or may not wrap label text in `.ab-label` depending on whether an icon is present.
**How to avoid:** Inspect the rendered HTML of `#wp-admin-bar-maestro-toggle` in the running wp-env at execute time before writing the CSS. The dashicon span already carries `class="ab-icon"`. Confirm whether WP wraps the label text in `.ab-label` or leaves it as a raw text node. If raw text node, use a different technique (e.g., add a wrapper `<span class="maestro-toggle-label">` in the PHP `title` arg) to target it with CSS.
**Warning signs:** At ≤782px the icon disappears instead of the text, or both disappear.

### Pitfall 3: Badge Removal Path Not Updated
**What goes wrong:** After BUG-07 fix, the badge is appended to `.wp-menu-name`, but the removal code at L115–120 still queries `li.querySelector('.maestro-modified-badge')`. If the selectors differ (e.g., checking on the wrong parent), badge removal fails and the bullet stays on reset.
**Why it happens:** `li.querySelector` IS a recursive descendant search, so it will still find the badge inside `.wp-menu-name`. This is not a bug — but if the dedup guard changes `labelTarget.querySelector(...)` while removal stays `li.querySelector(...)`, a mismatch may cause double-injection on toggle.
**How to avoid:** Keep removal queries as `li.querySelector()` (still correct since badge is a descendant of `li`) but verify by running the existing `modified indicator` e2e test after the fix.

### Pitfall 4: Separator Fixture Absent in wp-env
**What goes wrong:** BUG-06 e2e test passes trivially because `#adminmenu` has no `li.wp-menu-separator`, so the bug is never reproduced.
**Why it happens:** `.wp-env.json` loads `"plugins": []` — no WooCommerce, no built-in separators.
**How to avoid:** Inject a separator via a mu-plugin or `add_action('admin_menu', ...)` test fixture. The simplest approach is an `mu-plugins/maestro-test-separator.php` file mapped via `.wp-env.json`'s `mappings` or the `muPlugins` array — or registered inside `global-setup.ts` via `wp-cli`. A PHP snippet like:

```php
add_action( 'admin_menu', function () {
    global $menu;
    // Insert a separator after Posts (position 6) for test purposes.
    $menu[5] = array( '', 'read', 'separator-maestro-test', '', 'wp-menu-separator' );
} );
```

Alternatively, WordPress core itself registers separators at positions 4, 9, 25, 59, 99 in `admin.php`. Check whether the test wp-env's menu array already has separators present even without extra plugins — it may, since WP always registers them in `wp-admin/admin.php`. Confirm at execute time by `console.log`-ing `document.querySelectorAll('#adminmenu > li.wp-menu-separator').length` in a Playwright test.

### Pitfall 5: Focus Restoration After Single-Node Move
**What goes wrong:** `insertBefore` or `appendChild` detaches and re-attaches the node, which drops focus to `<body>` — same as the current `appendChild` loop. The focus-restoration code at L306–312 already handles this.
**How to avoid:** Keep the existing focus-restoration block (L306–312) unchanged — it runs after the DOM mutation and targets `movedLi.querySelector('a') || movedLi`. No change needed.

---

## Code Examples

### UX-08a: Admin-Bar Responsive Override

```css
/* Source: maestro.css — append inside the existing @media screen and (max-width: 782px) block */
/* Keep the editor toggle reachable on mobile.
 * WP core hides all top-level admin-bar nodes via:
 *   #wp-toolbar > ul > li { display: none; }
 * and only whitelists built-in nodes back. Add our node explicitly.
 * Specificity matches WP's whitelist: #wpadminbar li#id = (0,2,1). */
#wpadminbar li#wp-admin-bar-maestro-toggle {
    display: block;
}
/* Icon-only at narrow widths — hide the visible label text; the accessible
 * name is supplied by the <a title="..."> (from meta.title in PHP).
 * Inspect rendered markup to confirm .ab-label is the text wrapper. */
#wpadminbar li#wp-admin-bar-maestro-toggle .ab-label {
    display: none;
}
```

### UX-08b: PHP Label Strings

```php
// Source: includes/class-admin-bar.php — replace L51–55
$bar->add_node(
    array(
        'id'    => 'maestro-toggle',
        'title' => $editing
            ? '<span class="ab-icon dashicons dashicons-exit" style="margin-top:2px;"></span>'
              . esc_html__( 'Exit', 'maestro-menu-editor' )
            : '<span class="ab-icon dashicons dashicons-edit" style="margin-top:2px;"></span>'
              . esc_html__( 'Edit Menu', 'maestro-menu-editor' ),
        'href'  => esc_url( $href ),
        'meta'  => array(
            'title' => $editing
                ? esc_attr__( 'Exit Editor', 'maestro-menu-editor' )
                : esc_attr__( 'Edit Admin Menu', 'maestro-menu-editor' ),
        ),
    )
);
```

### BUG-06: Single-Node DOM Move

```javascript
// Source: maestro.js — replace the "Physically reorder" block at L289–303
// Move only the selected node by one step. All other nodes (including
// wp-menu-separator) stay exactly where they are.
var selectedNode = slugToNode[ selectedSlug ];
// Re-query the current ordered list of maestro items (DOM order before the move).
var maestroChildren = Array.prototype.slice.call(
    parentUl.querySelectorAll(
        m.isSub
            ? 'li.maestro-subitem[data-maestro-slug]'
            : 'li.menu-top.maestro-item[data-maestro-slug]'
    )
);
var currentIdx = maestroChildren.indexOf( selectedNode );
if ( dir === 'up' && currentIdx > 0 ) {
    parentUl.insertBefore( selectedNode, maestroChildren[ currentIdx - 1 ] );
} else if ( dir === 'down' && currentIdx < maestroChildren.length - 1 ) {
    var after = maestroChildren[ currentIdx + 1 ];
    parentUl.insertBefore( selectedNode, after.nextSibling );
}
// (The boundary-clamp check at L281 already returns early if no move would occur.)
```

### BUG-07: Badge Appended to Label Element

```javascript
// Source: maestro.js — replace the badge-injection block at L102–113
// Append to the label element, not the <li>, so the badge sits beside
// the item title even when a <ul class="wp-submenu"> follows.
var labelTarget = m.isSub
    ? li.querySelector( 'a' )
    : li.querySelector( '.wp-menu-name' );

if ( labelTarget && ! labelTarget.querySelector( '.maestro-modified-badge' ) ) {
    var badge = el( 'span', 'maestro-modified-badge' );
    badge.setAttribute( 'aria-hidden', 'true' );
    badge.textContent = '•'; // bullet •
    labelTarget.appendChild( badge );
}
if ( labelTarget && ! labelTarget.querySelector( '.maestro-modified-sr' ) ) {
    var srText = el( 'span', 'screen-reader-text maestro-modified-sr' );
    srText.textContent = I.modified;
    labelTarget.appendChild( srText );
}
// Removal at L115-120: li.querySelector() still finds badge/sr as descendants — no change needed.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin-bar toggle visible at all widths | Hidden at ≤782px by core whitelist pattern | WP has done this for many years | Third-party nodes that need mobile visibility must self-override |
| `li.appendChild(badge)` → badge after submenu `<ul>` | `labelTarget.appendChild(badge)` → badge on the row | BUG-07 fix (this phase) | Badge visible beside label for all item types |
| `forEach(slug => appendChild(node))` → all items after separators | Single `insertBefore` on selected node only | BUG-06 fix (this phase) | Separators and other non-editable children preserved |

---

## Open Questions

1. **`.ab-label` vs. raw text node in WP admin-bar markup**
   - What we know: WP core's `WP_Admin_Bar::_render_item()` outputs the `title` arg HTML inside `<a class="ab-item">`. Whether label text is wrapped in `.ab-label` may depend on WP version.
   - What's unclear: The exact rendered HTML for a node that has both an `ab-icon` span and label text — specifically whether WP wraps the text in `.ab-label` (confirmed for nodes registered without an icon, unclear for icon-bearing nodes).
   - Recommendation: At execute time, add a temporary `console.log(document.querySelector('#wp-admin-bar-maestro-toggle').innerHTML)` to a test page or inspect in Playwright's DOM snapshot before writing the icon-only CSS. If `.ab-label` does not wrap the text, add a `<span class="maestro-ab-label">` wrapper inside the PHP `title` arg and target that instead.

2. **Are wp-menu-separator nodes present in the default wp-env?**
   - What we know: WordPress core registers separators in `wp-admin/admin.php` at menu positions 4, 9, 25, 59, 99.
   - What's unclear: Whether the wp-env test instance (which loads a minimal WP install without extra plugins) retains these separators or strips them during test setup.
   - Recommendation: At the start of the BUG-06 e2e test, assert `document.querySelectorAll('#adminmenu > li.wp-menu-separator').length` is >= 1. If it is, no fixture is needed. If it is 0, add a mu-plugin fixture (see Pitfall 4).

3. **Browser handoff timing for UX-08a mobile screenshot**
   - What we know: Playwright can be used at ≤782px viewport in the existing e2e suite (Phase 9 set viewport to 900px for the folded-mode test at L43).
   - What's unclear: Whether the UX-08a visibility assertion can be automated in Playwright (asserting `#wp-admin-bar-maestro-toggle` is visible at ≤782px) or requires a manual visual screenshot review.
   - Recommendation: Write a Playwright test that sets `page.setViewportSize({ width: 782, height: 600 })` and asserts `expect(page.locator('#wp-admin-bar-maestro-toggle')).toBeVisible()`. This CAN be automated. A manual screenshot is a nice-to-have for the phase gate, but automated visibility assertion is sufficient for the zero-regression bar.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PHP/PHPUnit (unit + integration), Playwright (e2e), node:test (JS logic) |
| Config file | `phpunit.xml.dist` (unit), `phpunit-integration.xml.dist` (integration), `playwright.config.ts` (e2e) |
| Quick run — JS only | `npm run test:js` |
| Quick run — PHP unit | `wp-env run tests-cli --env-cwd=... vendor/bin/phpunit` (no Docker: sandbox-disabled) |
| Full suite command | `npm run test:js && npm run test:php && npm run test:e2e` |
| Baseline (Phase 11.1) | PHP unit 61/61, JS 53/53, integration 33/33, e2e 28/28 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-08b | PHP label strings changed ("Edit Menu"/"Exit") | Unit (PHP) | `phpunit tests/unit/AdminBarTest.php` (if exists) | Unknown — verify at plan time |
| UX-08b | i18n: no new JS keys added → LocalizationTest unchanged | Integration | `phpunit tests/integration/LocalizationTest.php` | ✅ |
| UX-08a | Toggle visible at ≤782px | E2e (Playwright) | New test in `editor.spec.ts`: `setViewportSize({width:782})` + `toBeVisible()` | ❌ Wave 0 |
| UX-08a | Icon-only (label text hidden) at ≤782px | E2e or screenshot | Playwright `boundingBox` or screenshot assertion at 782px | ❌ Wave 0 (or manual) |
| BUG-06 | Single-node move leaves separators in place | E2e (Playwright) | New test: assert `li.wp-menu-separator` positions unchanged after Alt+Arrow | ❌ Wave 0 |
| BUG-06 | Existing keyboard reorder happy path still passes | E2e (Playwright) | `playwright test --grep "keyboard-only reorder"` | ✅ |
| BUG-07 | Badge renders next to label on item-with-submenu | E2e (Playwright) | New assertion: `.maestro-modified-badge` inside `#menu-posts .wp-menu-name` | ❌ Wave 0 |
| BUG-07 | Existing modified indicator test still passes | E2e (Playwright) | `playwright test --grep "modified indicator"` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run test:js` (fast, no Docker) — catches JS logic regressions immediately
- **Per wave merge / before e2e tasks:** Full Playwright suite (`npm run test:e2e`) — sandbox-disabled for Docker
- **Phase gate:** Full suite green (JS 53+/53, PHP unit 61+/61, integration 33+/33, e2e 28+/28 + new tests) before traceability flip

### Wave 0 Gaps

- [ ] `tests/e2e/editor.spec.ts` — add UX-08a viewport visibility test (new `test()` block)
- [ ] `tests/e2e/editor.spec.ts` — add BUG-06 separator-preservation test (new `test()` block; confirm whether separator fixture is needed first)
- [ ] `tests/e2e/editor.spec.ts` — add BUG-07 badge-location assertion (new assertion inside existing or new `test()` block)
- [ ] Confirm `tests/unit/AdminBarTest.php` exists or create it for UX-08b PHP string change (LOW priority — existing integration coverage via LocalizationTest may be sufficient; confirm at plan time)

---

## Sources

### Primary (HIGH confidence)
- `develop.svn.wordpress.org/trunk/src/wp-includes/css/admin-bar.css` — exact `#wp-toolbar > ul > li { display: none }` + whitelist selectors at 782px
- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/assets/maestro.js` — lines 68–120 (badge code), 265–331 (reorder DOM step), 510–518 (updateMenuLabel pattern)
- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/assets/maestro.css` — lines 79–90 (badge CSS), 470–511 (existing 782px block), 250–265 (toolbar positioning)
- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/includes/class-admin-bar.php` — current node title/meta strings
- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/tests/integration/LocalizationTest.php` — expected i18n keys list
- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/tests/e2e/editor.spec.ts` — existing e2e coverage map

### Secondary (MEDIUM confidence)
- github.com/mgibbs189/admin-cleanup/issues/5 — confirms `#wp-toolbar > ul > li { display:none }` whitelist pattern at 782px (corroborated by SVN source)

### Tertiary (LOW confidence)
- General WebSearch results on admin bar breakpoints — used for orientation only; all key claims verified against primary sources

---

## Metadata

**Confidence breakdown:**
- WP core admin-bar responsive mechanism: HIGH — verified against SVN source
- DOM structure (badge placement, separator nodes): HIGH — verified against project source code
- BUG-06 algorithm: HIGH — derived directly from existing code logic with no external dependencies
- BUG-07 fix: HIGH — direct consequence of DOM structure + existing `updateMenuLabel` pattern
- UX-08a `.ab-label` target: MEDIUM — confirmed as the typical WP pattern but must be verified against actual rendered HTML at execute time
- Separator presence in wp-env: MEDIUM — WP core registers separators by default but needs execute-time confirmation

**Research date:** 2026-06-21
**Valid until:** 2026-08-01 (stable — WP admin-bar CSS changes rarely; DOM structure is project-internal)
