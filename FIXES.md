# FIXES — handoff brief

Four reported problems from first install/testing. **All four are now fixed in
this tree.** #1 and #2 (packaging, slug collision) were resolved earlier; #3 and
#4 (autosave/icon persistence, heavy UI + folded-mode breakage) are resolved by
the editor rework on `feature/autosave-click-to-select`. Run the existing harness
(`TESTING.md`) as the red/green target — the E2E `editor.spec.ts` encodes both the
rename and icon persistence repros.

---

## ✅ #1 — Incomplete zip / won't install  (FIXED)

**Cause:** two errors stacked. A filesystem I/O error dropped a file mid-build,
*and* the test harness was shipped inside the installable zip (wrong hygiene —
`tests/`, `composer.json`, `package.json`, `.wp-env.json`, Playwright config do
not belong in an installed plugin).

**Fix applied:**
- Install artifact (`amx-inline-menu-editor.zip`) now contains **runtime only**:
  main file, `includes/`, `assets/`, `readme.txt`. Integrity-verified with
  `unzip -t`.
- Dev repo is a **separate** archive (`amx-inline-menu-editor-dev.zip`).
- Build rule going forward: the install zip excludes everything dev-only.

## ✅ #2 — Slug collision with the real "Admin Menu Customizer"  (FIXED)

**Cause:** the folder slug `admin-menu-customizer` matches a plugin in the
WordPress.org directory, so core's update check overwrote the local code with
the .org plugin (the documented "plugin confusion" risk).

**Fix applied:**
- Renamed slug → `amx-inline-menu-editor`; display name → "Inline Admin Menu
  Editor (AMX)"; text domain updated to match across all PHP.
- Added `Update URI: false` to the plugin header. Per WP 5.8+, any Update URI
  value other than the canonical w.org URL for the slug makes core skip updates
  entirely — this is the real protection. **Keep this header set** if the slug
  is ever changed to something more generic.

---

## ✅ #3 — Menu changes do not persist / no autosave  (FIXED)

**Root cause (hypothesis checked):** the `init()`-throws-in-folded-mode theory
did *not* hold — `init()` is fully null-guarded and does not abort in folded
mode, so #3 and #4 were **separate** bugs. The persistence miss was specific to
the icon path under the new cadence: the old manual `doSave` did include the
icon, but once autosave replaced the button, the icon-pick handler had to fire
the same debounced save as rename/reorder/visibility.

**Fix applied — debounced autosave, no Save button** (`assets/amx-edit.js`):
- `scheduleAutosave()` debounces ~500ms and coalesces rapid changes into one
  POST. Wired into `sortstop` (reorder), rename commit, **icon pick**,
  visibility toggle, and per-item reset.
- Payload unchanged — full config (`POST /amx/v1/config`, full replace).
- **No reload on autosave**; the live DOM preview already reflects the change.
  Exit flushes any pending save, then reloads to reconcile. "Reset all" reloads.
- A subtle "Saving… / Saved ✓ / error" status indicator replaces the Save
  button. A monotonic save id guards against out-of-order in-flight responses.
- `applyIconPreview` keeps the earlier fix — splits on whitespace and re-adds
  the `dashicons-before` marker rather than the old regex that stripped it.

Acceptance: `editor.spec.ts` covers rename-persists-across-reload-then-reset
**and** a new icon spec — pick a dashicon → assert the autosave POST carries
`items["edit.php"].icon` → reload → assert `.wp-menu-image` keeps the
`dashicons-book` class.

## ✅ #4 — Editing UI too heavy; breaks in folded (minimized) menu mode  (FIXED)

**Cause:** the old model injected a control cluster (icon + visibility + reset
buttons) into *every* item's `<a>` and force-expanded all submenus. In
`body.folded` mode — 36px icon column with hover flyouts — the injected controls
and the `display:block !important` submenu override broke the layout.

**Fix applied — click-to-select with one shared panel** (`assets/amx-edit.js`,
`assets/amx-edit.css`):
1. **Folded mode neutralized.** `forceUnfold()` strips `body.folded` /
   `body.auto-fold` on init; a `MutationObserver` re-strips them if `common.js`
   writes them back; the collapse button click is intercepted in the capture
   phase. Editing always happens against the stable expanded menu. Defensive CSS
   pins the column to 160px even if the class flickers in for a frame.
2. **One shared panel.** Per item, only a drag handle (revealed on row
   hover/focus) and a selection target. Clicking an item selects it (navigation
   suppressed) and applies a `.amx-selected` highlight; exactly one at a time.
   The shared toolbar panel reflects the selection: rename field, icon picker
   (top-level only — hidden for submenu items), per-role visibility, and
   reset-this-item. Rename is now a single field bound once, dissolving the old
   double-bind smell.
3. **No chrome until selection.** On entering edit mode the panel is `hidden`;
   the menu shows only the faint per-row drag affordance. E2E asserts the panel
   is hidden and that `#adminmenu .amx-controls` count is 0.

Acceptance: editor renders in both expanded and folded modes; no per-item
clusters; the shared panel is empty/hidden until an item is selected. The
remaining manual check (visual confirmation in WP Studio, and a menu with
WooCommerce-class submenu depth) is recommended but the automated E2E layer now
covers the gating, selection, and persistence flows.

---

## Resolved code smell

The old `amx-edit.js` bound the rename click handler in **two** places —
`decorateTop`/`decorateSub` and `renderLabel`'s `{ once: true }` listener —
risking double-binding. The selection redesign replaced this with a single
rename `<input>` in the shared panel, bound once on build.

## Runtime + targets

- **Runtime:** WP Studio (local). Activate from the dev tree or the install zip.
- **Red/green:** `composer test:unit` (pure, fast), `npm run test:php`
  (integration, wp-env), `npm run test:e2e` (Playwright). See `TESTING.md`.
- The unit + integration suites are unaffected by the UI redesign; lean on them
  to confirm the replay/REST core stays correct while the editor is reworked.
