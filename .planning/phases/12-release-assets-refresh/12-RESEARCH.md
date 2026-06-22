# Phase 12: Release Assets Refresh — Research

**Researched:** 2026-06-22
**Domain:** WordPress.org plugin asset regeneration (banner pipeline) + Playwright screenshot capture
**Confidence:** HIGH — primary sources are the in-repo build script, the existing spec, official wp.org docs, and verified tooling state.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **REL-07 banner:** regenerate via the existing REL-06 pipeline (`npm run assets:banners` → `build_final.py` → Inkscape render → Pillow downscale). **Design target (locked):** the MAESTRO wordmark, the "THE INLINE ADMIN MENU EDITOR" subtitle, the tagline, AND the gold underline rule occupy approximately the same horizontal width — balanced/justified to a common measure — rather than the current mismatched line widths. Replace `.wordpress-org/banner-772x250.png` + `banner-1544x500.png` only after visual review.
- **REL-08 screenshots:** recapture against the final v1.2 editor UI (includes Phase 9 Edit Mode label + first-run pulse + rename placeholder, Phase 11 mobile entry toggle + fixed reorder/badge, Phase 11.2 icon-only unified toolbar redesign). Higher quality; captions that explain the interface/workflow; update `== Screenshots ==` captions in `readme.txt` to match.
- **Assets-only phase.** No plugin code changes. The release cut (version bump / Stable tag / tag / `wp-deploy.yml` dispatch) happens AFTER this phase.

### Claude's Discretion

- Exact screenshot list/order and caption copy (subject to visual review).
- Set consistency decision: uniform grid vs. deliberately mixed/masonry.

### Deferred Ideas (OUT OF SCOPE)

- None stated. All deferred items from Phase 8 are exactly the two REL items now implemented here.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REL-07 | Refreshed banner graphic via REL-06 pipeline, with text rows + gold underline rule balanced to a common horizontal measure. | build_final.py anatomy fully mapped below; the `fit` parameter in the `desc="below"` branch is the change point; VARIANT_SUFFIX env var enables side-by-side comparison without clobbering the live assets. |
| REL-08 | Recaptured directory screenshots against final v1.2 editor UI; higher-quality captures; explanatory captions; update `== Screenshots ==` in readme.txt to match. | Capture pattern from existing Phase 7 / Phase 11 specs documented below; screenshot set design decision guided by current 4-screenshot set and v1.2 UI features list; readme.txt caption numbering scheme documented. |
</phase_requirements>

---

## Summary

Phase 12 has two orthogonal tracks — a banner redesign and a screenshot recapture — that share no runtime dependency on each other. Both are assets-only: no plugin PHP/JS touches.

**REL-07** (banner) is a pure Python edit to `build_final.py` followed by `npm run assets:banners`. The design problem is that three rows of text (MAESTRO wordmark, subtitle "THE INLINE ADMIN MENU EDITOR", tagline) plus the gold underline rule each have a different rendered width because each is sized/fit independently. The fix is to constrain all of them to a single common measure — the MAESTRO wordmark width (`ww`) — and let the gold rule and tagline also span that same width. The tooling is already installed (Inkscape 1.4.4, Pillow 11.3.0) and the pipeline reproducibly generates exact-dimension assets.

**REL-08** (screenshots) requires a running wp-env Docker environment (Colima) to capture the live editor UI. The existing MAESTRO_CAPTURE-gated pattern from Phases 7 and 11 is the right model: a spec inside `tests/e2e/specs/` or an inline section of `editor.spec.ts`, guarded by `if (CAPTURE)`, writing PNGs to a committed phase directory. The wp.org directory currently lists 4 screenshots that predate the v1.2 UI; they all show a pre-Phase-11.2 toolbar. The current 4-caption structure in `readme.txt` is the starting point for the updated captions.

**Primary recommendation:** implement REL-07 first (no Docker needed), establish the balanced-measure layout iteratively with `VARIANT_SUFFIX` staging, do a visual review before committing. Then tackle REL-08 with wp-env running; write the spec first (MAESTRO_CAPTURE=0 gate), capture with `npm run screenshots`, do visual review, update readme.txt captions last.

---

## Standard Stack

### Core (REL-07)

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| Python 3 + Pillow | Pillow 11.3.0 | Compositing, downscale (LANCZOS), output PNG | Installed — `python3 -c "import PIL"` confirmed |
| Inkscape | 1.4.4 (2026-05-05) | SVG rasterization at 2× | Installed — `inkscape --version` confirmed |
| Fonts (bundled) | — | PoiretOne-Regular.ttf, Poppins-Light.ttf, Poppins-Medium.ttf | Live in `.wordpress-org/source/fonts/` |
| `npm run assets:banners` | — | Sets `OUT_DIR=.wordpress-org`, runs `python3 .wordpress-org/source/build_final.py` | Reproduced byte-identical assets in Phase 8 |

### Core (REL-08)

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| Playwright | ^1.61.0 | Browser automation, screenshot capture | devDependency, used by existing specs |
| wp-env | ^11.8.1 | Docker-based WordPress test environment | Requires Colima running; tests port configurable via `WP_ENV_TESTS_PORT` |
| `npm run screenshots` | — | Runs `MAESTRO_CAPTURE=1 playwright test capture-screenshots.spec.ts editor.spec.ts` | Existing script; extend by adding a Phase 12 capture spec |

### Supporting

| Library | Purpose | Notes |
|---------|---------|-------|
| `VARIANT_SUFFIX` env var | Lets `build_final.py` write `banner-*-<suffix>.png` instead of overwriting live assets | Built into `build_final.py` line 189; use for iterative design review |
| `DESC` env var | Controls subtitle placement: `"below"` (current, brand-first), `"above"`, `"none"` | Built into `build_final.py` line 147; current default is `"below"` |

### Installation

No new installs required. All dependencies are already present:

```bash
# Verify before starting
inkscape --version        # expect 1.4.x
python3 -c "import PIL; print(PIL.__version__)"   # expect 11.x
```

---

## Architecture Patterns

### REL-07: build_final.py Layout Anatomy

The banner is built at 2× scale (`S=2`, so the master is 3088×1000) and then downsampled. Understanding the coordinate system is essential for the "balanced measure" fix.

**Key layout variables (all in 2× pixel space):**

```python
S = 2                 # scale factor
W, H = 1544, 500      # final 1× target dimensions
tx = 512 * S          # left edge of the text column (x=1024 in 2× space)
maxw = (1486 - 512) * S  # maximum text column width (974 × 2 = 1948px in 2×)
```

**Text row rendering order (top to bottom):**

1. `"MAESTRO"` — Poiret One, amber gradient, auto-fits between `size=176*S` and `110*S`, tracked at `tr_hero=14*S`. Renders as a Pillow `Image` object; actual pixel width is `ww` (varies ~1400–1500px at 2×). Composited at `(tx, y)`.
2. `"THE INLINE ADMIN MENU EDITOR"` (when `DESC="below"`) — Poppins Medium, coral. Auto-fits to `fit` where **`fit=ww`** (the MAESTRO wordmark width). Drawn via `tracked()` at `(tx, y)`. This is already constrained to `ww`.
3. **Gold underline rule** — drawn `[(tx+2*S, ry), (word_right-2*S, ry)]` where `word_right = tx + ww`. So the rule already spans exactly the MAESTRO wordmark width. Diamond terminals at both ends.
4. Tagline — Poppins Light, `tlen` auto-fits to `maxw` (NOT `ww`). Drawn at `(tx, y)`.

**The current mismatch:** the tagline ("Orchestrate your menu in place, inside the dashboard.") is fit to `maxw` (the full column width, ~974px at 1×), while MAESTRO + subtitle + gold rule are all bounded by `ww` (the wordmark rendered width, narrower). The tagline therefore extends further right than the other three elements.

**Where to make the change:**

```python
# Line 140 in build_final.py — the tagline auto-fit loop:
while dr.textlength(tag, font=ftag) > maxw and ts > 20*S:
#                                    ^^^^
# Change maxw → ww to constrain the tagline to the wordmark width.
# Then also change line 187 (tagline draw position is already tx, so x-start is fine;
# only the fit constraint needs updating — the while loop condition).
```

The subtitle (`fit=ww`, line 151) and the gold rule (`word_right = tx+ww`, line 182) are already keyed to `ww`. Only the tagline loop needs updating to close the gap.

**Tagline text may also need shortening** if constraining to `ww` makes it wrap or force a very small font. The current tagline is 54 characters. The minimum font is `20*S=40px` at 2× — at that size, 54 chars will be substantially narrower than `ww`. So the constraint is safe, but visual review is essential.

**Iterative design workflow:**

```bash
# Write a staging variant (does not overwrite live assets)
VARIANT_SUFFIX=-v2 npm run assets:banners
# Writes: .wordpress-org/banner-772x250-v2.png + banner-1544x500-v2.png
# Open in Preview, compare with the live assets, iterate build_final.py, repeat
# Once approved: npm run assets:banners  (no suffix → overwrites live)
```

### REL-08: Screenshot Capture Pattern

**Established pattern (Phase 7 + Phase 11):**

1. A spec file (or inline describe block) with a `CAPTURE` boolean guard:
   ```typescript
   const CAPTURE = Boolean(process.env.MAESTRO_CAPTURE);
   test.skip(!CAPTURE, 'Set MAESTRO_CAPTURE=1 to regenerate.');
   ```
2. Tests navigate to specific wp-admin pages/states, wait on Maestro-specific anchors, then call `page.screenshot({ path })` writing to a committed directory.
3. Normal `test:e2e` / CI never triggers regeneration.
4. Screenshots committed to `.planning/phases/12-release-assets-refresh/screenshots/` (planning artifacts) AND to `.wordpress-org/screenshot-N.png` (wp.org publish target).

**The two destinations are different:**
- **Planning artifacts** (`.planning/phases/12-.../screenshots/`) — intermediate visual review PNGs, same as Phase 7/11 pattern. Committed as evidence.
- **wp.org publish targets** (`.wordpress-org/screenshot-N.png`) — the files that `wp-deploy.yml` deploys to SVN. These must be overwritten with the final captures.

**The `npm run screenshots` script** currently runs `capture-screenshots.spec.ts` (Phase 11 UX-08a artifacts) AND `editor.spec.ts` (Phase 7 ICON-01 artifacts). A Phase 12 spec can be added as a third file in that command, or added as a new standalone script entry in `package.json`.

**Note on Phase 7 hygiene issue:** STATE.md flags that the Phase 7 screenshot specs in `editor.spec.ts` overwrite committed PNGs on every full e2e run (not `CAPTURE_07`-gated for those describes). This is a pre-existing issue the planner should note but Phase 12 should not fix; just make the Phase 12 capture spec correctly CAPTURE-gated.

**Environment dependency:** capturing the editor UI requires a running wp-env tests instance (Docker/Colima). The tests port defaults to 8889 but is configurable via `WP_ENV_TESTS_PORT` (see Phase 11.1-p1-review-hardening context — port 8899 was used when 8889 was taken). This is the sandbox gap: the GSD executor cannot run Docker in sandbox mode; the capture step must be run sandbox-disabled or delegated to a human-verify checkpoint.

### Recommended Directory Structure

```
.planning/phases/12-release-assets-refresh/
├── 12-CONTEXT.md
├── 12-RESEARCH.md          ← this file
├── 12-01-PLAN.md           ← REL-07 banner layout change + visual review
├── 12-02-PLAN.md           ← REL-08 screenshot spec + capture + review
├── 12-03-PLAN.md           ← readme.txt caption update + phase sign-off
└── screenshots/            ← review artifacts (intermediate PNGs)

.wordpress-org/
├── banner-772x250.png      ← replaced by REL-07 (after visual review)
├── banner-1544x500.png     ← replaced by REL-07 (after visual review)
├── screenshot-1.png        ← replaced by REL-08
├── screenshot-2.png        ← replaced by REL-08
├── screenshot-3.png        ← replaced by REL-08
├── screenshot-4.png        ← replaced by REL-08
└── screenshot-5.png        ← added if set expands (optional)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Banner SVG rasterization | Custom cairo/wand/ImageMagick pipeline | Inkscape via `subprocess.run(["inkscape", ...])` already in `build_final.py` | Already proven byte-identical in Phase 8; cairosvg has no macOS system dependency; Inkscape handles the complex SVG gradients/clips correctly |
| 2× → 1× downscale | Manual resize logic | Pillow `Image.resize((w,h), Image.LANCZOS)` already in `build_final.py` | LANCZOS is the correct resampling filter for asset downscaling; already used |
| Screenshot auth | Bespoke login in capture spec | Playwright `storageState` from `playwright.config.ts` (`global-setup` logs in once) | Every existing spec uses this; no per-spec login needed |
| Banner staging/comparison | Overwriting live assets during iteration | `VARIANT_SUFFIX` env var already wired into `build_final.py` | Built-in; zero risk to live assets during iteration |
| Screenshot dimensions | Hardcoding pixel assertions | Pillow dimension check script | Simple post-capture verification |

**Key insight:** the entire REL-07 pipeline is a Python script edit. Do not externalize any step — Inkscape is the rasterizer, Pillow is the compositor, and `build_final.py` is the single source of truth for the layout.

---

## Common Pitfalls

### Pitfall 1: Tagline wrapping after constraining to `ww`

**What goes wrong:** changing the tagline fit from `maxw` to `ww` causes the auto-fit loop to reduce font size significantly if the tagline string is long relative to `ww`. At `20*S` (minimum), the text may look too small or may visually "vanish" on the 1× banner.
**Why it happens:** `ww` is the rendered MAESTRO wordmark width at the current auto-fitted size (nominally ~700px at 1×, depending on the font render), while the tagline is 54 characters of Poppins Light. The ratio of character count to available width is tighter at `ww` than at `maxw`.
**How to avoid:** shorten the tagline string first, or test with `VARIANT_SUFFIX=-test` before committing. Consider breaking the tagline into a shorter phrase (e.g., "Orchestrate your menu in place, inside the dashboard." → "Edit your admin menu, in place.").
**Warning signs:** the generated 1× PNG shows a very small tagline font, or the auto-fit loop hits `ts <= 20*S`.

### Pitfall 2: Gold rule width does not change when `ww` changes

**What goes wrong:** if you adjust the tagline or subtitle sizing in a way that re-runs the MAESTRO wordmark auto-fit (changing font size), `ww` will change and the gold rule will track with it — which is the desired behavior. But if you hardcode a target `ww` for the tagline without re-running the wordmark render, the measurements will diverge.
**Why it happens:** `ww` is a live variable set from the composited `word.size[0]` — it reflects the actual rendered width of the MAESTRO gradient image, not a fixed design unit.
**How to avoid:** always let `ww` be derived from the render; never hardcode it. The layout is self-consistent if you just change the `maxw` → `ww` substitution on line 140 and nothing else.

### Pitfall 3: VARIANT_SUFFIX → live asset swap timing

**What goes wrong:** running `npm run assets:banners` without a suffix during iteration accidentally overwrites `.wordpress-org/banner-772x250.png` and `banner-1544x500.png`, then a git add-all commits the intermediate (not-yet-approved) versions.
**Why it happens:** `OUT_DIR=.wordpress-org` is hardcoded in the npm script and the suffix defaults to `""`.
**How to avoid:** always use `VARIANT_SUFFIX=-review npm run assets:banners` during iteration; only drop the suffix when the visual review is approved. Make the visual review checkpoint explicit in the plan before the overwrite step.

### Pitfall 4: Capturing screenshots before Phase 11.2 branch is merged

**What goes wrong:** if the screenshot capture runs against a wp-env instance that does not have the Phase 11.2 commits (icon-only unified toolbar), the toolbar will look pre-11.2 and the captures will show an outdated UI.
**Why it happens:** wp-env mounts the plugin from the working tree, but the Phase 11.2 branch (`gsd/editor-toolbar-redesign`) may not be merged to main yet when this phase runs.
**How to avoid:** confirm Phase 11.2 is merged to main (or the working branch is Phase 11.2's branch) before running any capture. STATE.md says Phase 11.2 is complete and awaiting its own PR to main — verify the merge is complete before Phase 12 capture.

### Pitfall 5: Screenshot spec accidentally runs in CI / full e2e suite

**What goes wrong:** forgetting `test.skip(!CAPTURE, ...)` in the Phase 12 spec means `npm run test:e2e` regenerates and overwrites committed PNGs, producing noisy diffs or stale captures.
**Why it happens:** the Phase 7 ICON-01 screenshots in `editor.spec.ts` have this exact bug (flagged in STATE.md hygiene note — captures regenerate on every full e2e run when `MAESTRO_CAPTURE` is not set, but are still gated via `if (CAPTURE_07)`). The spec MUST have `test.skip(!CAPTURE)` at the describe level, not just `if (CAPTURE)` guards around the `page.screenshot()` calls.
**Warning signs:** `git status` shows `.wordpress-org/screenshot-*.png` as modified after a routine `npm run test:e2e`.

### Pitfall 6: wp.org SVN assets/ folder vs trunk/ confusion

**What goes wrong:** placing screenshots or banners inside `trunk/` of the SVN repository instead of the `assets/` folder that sits beside it.
**Why it happens:** the local repo puts everything under `.wordpress-org/`; the SVN layout separates `assets/` from `trunk/`. `wp-deploy.yml` / `prep-release.sh` handle the mapping — so as long as files are in `.wordpress-org/` in the Git repo, the deploy script puts them in the right SVN location. Do not manually manipulate SVN.
**How to avoid:** place all files in `.wordpress-org/` and let the existing deploy pipeline handle SVN.

---

## Code Examples

### How `build_final.py` builds the banner (annotated key lines)

```python
# Source: .wordpress-org/source/build_final.py — build_banners()

S = 2                         # 2× master scale
W, H = 1544, 500              # final 1× target
master = ...                  # 3088×1000 RGBA master image

tx = 512 * S                  # text column left edge (1024 at 2×)
maxw = (1486 - 512) * S       # max column width (1948 at 2×; ~974px at 1×)

# MAESTRO wordmark — renders as a gradient image, actual width is ww
word = grad_text("MAESTRO", fh, ...)
ww, wh = word.size            # ww is the rendered wordmark pixel width

# Subtitle ("THE INLINE ADMIN MENU EDITOR") when DESC="below"
# fit=ww means subtitle is already constrained to wordmark width
fit = ww if desc == "below" else maxw

# TAGLINE — currently fits to maxw (the full column), NOT ww
# This is the source of the width mismatch
while dr.textlength(tag, font=ftag) > maxw and ts > 20*S:
    ts -= 1; ftag = fnt(...)
# ↑ Change maxw → ww here to fix the "balanced common measure" goal

# Gold underline rule — already anchored to ww
word_right = tx + ww
dr.line([(tx+2*S, ry), (word_right-2*S, ry)], ...)
# Diamond terminals also anchored to tx+2*S and word_right-2*S

# Tagline draw — x-start is already tx (left-aligned, correct)
dr.text((tx, y - tb[1]), tag, font=ftag, fill=...)

# Output: resize master (3088×1000) to both output sizes
master.resize((1544, 500), Image.LANCZOS).convert("RGB").save(...)
master.resize((772, 250), Image.LANCZOS).convert("RGB").save(...)
```

### VARIANT_SUFFIX staging workflow

```bash
# Iterate without touching live assets:
VARIANT_SUFFIX=-v2 npm run assets:banners
# Produces: .wordpress-org/banner-772x250-v2.png + banner-1544x500-v2.png

# View (macOS Quick Look):
open .wordpress-org/banner-772x250-v2.png

# After approval, overwrite live:
npm run assets:banners
# Produces: .wordpress-org/banner-772x250.png + banner-1544x500.png
```

### Phase 12 screenshot capture spec skeleton

```typescript
// tests/e2e/specs/capture-directory-screenshots.spec.ts
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const CAPTURE = Boolean(process.env.MAESTRO_CAPTURE);
const SCREENSHOTS_DIR = path.join(process.cwd(), '.planning', 'phases',
  '12-release-assets-refresh', 'screenshots');
const WP_ORG_DIR = path.join(process.cwd(), '.wordpress-org');

test.describe('Phase 12 — directory screenshot capture', () => {
  test.skip(!CAPTURE,
    'Set MAESTRO_CAPTURE=1 (npm run screenshots) to regenerate the directory PNGs.');

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test('screenshot 1: editor active — item selected, controls panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 });
    await page.goto('/wp-admin/index.php?maestro_edit=1');
    // Select an item so the panel is visible
    await page.locator('.maestro-item').first().click();
    await expect(page.locator('.maestro-toolbar .maestro-panel')).toBeVisible();
    // Capture for planning review
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-1.png') });
    // Overwrite wp.org publish target
    await page.screenshot({ path: path.join(WP_ORG_DIR, 'screenshot-1.png') });
  });

  // ... additional screenshot tests per decided set
});
```

### Dimension verification post-capture

```python
from PIL import Image

checks = [
  ('.wordpress-org/banner-772x250.png',  (772, 250)),
  ('.wordpress-org/banner-1544x500.png', (1544, 500)),
]
for path, expected in checks:
    img = Image.open(path)
    assert img.size == expected, f"{path}: got {img.size}, want {expected}"
    print(f"OK: {path} {img.size}")
```

---

## State of the Art

| Old Approach | Current Approach | Source |
|--------------|------------------|--------|
| Standalone `.svg` master file | In-code SVG master in `build_final.py` (`banner_svg()` builder) | Phase 8 reconciliation (REQUIREMENTS.md REL-06) |
| Decorative leader line before "ADMIN MENU" | Removed; brand-first layout with subtitle below wordmark | REL-06 (Phase 8) |
| Manual PNG edits | Fully scripted `npm run assets:banners` pipeline | REL-06 (Phase 8) |
| Pre-v1.2 toolbar screenshots (pre-Phase 7 UI) | Need recapture for Phase 11.2 icon-only unified toolbar | This phase |
| Screenshots: 4 items (pre-v1.2 UI) | Need recapture + set review (still 4, or expand?) | Claude's discretion per CONTEXT.md |

**Deprecated/outdated:**
- The current four `.wordpress-org/screenshot-*.png` files (1440×980 RGB, ~200KB each) show pre-Phase-7 / pre-Phase-11.2 toolbar UI. They will be entirely replaced.
- The Phase 7 `toolbar-700.png` and `toolbar-1200.png` in `.planning/phases/07-.../screenshots/` and `.planning/phases/09-.../screenshots/` are internal planning artifacts, not the wp.org screenshots. They are not replaced here.

---

## wp.org Asset Constraints (official)

| Asset | Dimensions | Format | File size limit | Notes |
|-------|-----------|--------|-----------------|-------|
| Banner (standard) | 772×250 | JPG or PNG | 4 MB | Must be present; retina is add-on only |
| Banner (retina) | 1544×500 | JPG or PNG | 4 MB | Cannot be used alone without 772×250 |
| Screenshots | Not specified (convention is browser-width) | PNG or JPG | 10 MB each | Numbered `screenshot-1.png` … `screenshot-N.png` |

**Current banner sizes:** 101 KB (772×250) and 227 KB (1544×500) — well within 4 MB.
**Current screenshot sizes:** ~200 KB each — well within 10 MB.
**No dimension constraint on screenshots** from official docs. The current 1440×980 convention (already in place) is appropriate for showing a full desktop wp-admin view.

Source: [Plugin Assets — developer.wordpress.org](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/)

---

## Current Screenshots Inventory

**Existing `.wordpress-org/screenshot-*.png` — all 1440×980 RGB, ~200 KB each. All pre-Phase-11.2:**

| # | Current caption (readme.txt `== Screenshots ==`) | What it shows |
|---|--------------------------------------------------|---------------|
| 1 | Editing the admin menu in place — the Posts item selected, with the shared controls panel (rename, icon, visibility, reset) open. | Selected item + panel open |
| 2 | The icon picker: searchable Dashicons and bundled Bootstrap Icons tabs for swapping a top-level admin menu icon. | Icon picker open |
| 3 | Per-role visibility — hiding an admin menu item from selected roles (a cosmetic declutter, not access control). | Visibility dropdown open |
| 4 | A renamed admin menu item, saved automatically by debounced autosave. | Renamed item, saved state |

**What v1.2 adds that must appear in captures:**
- **Phase 9:** "Edit Mode" indicator (green zone), first-run pulse on first menu item, rename placeholder text in the input
- **Phase 11:** mobile-visible admin-bar toggle (icon-only at ≤782px), corrected reorder button behavior
- **Phase 11.2:** Icon-only unified toolbar — gray square buttons, semantic colour, flat indicator glyphs, palette icon-picker glyph, back-arrow Exit, auto-clearing "Saved", disabled Reset Item when unmodified

The current caption for screenshot 4 ("saved automatically by debounced autosave") maps naturally to the new auto-clearing "Saved → idle" behavior introduced in Phase 11.2.

---

## Open Questions

1. **Screenshot set expansion (Claude's discretion)**
   - What we know: current set is 4; wp.org now has a lightbox gallery viewer; up to ~10 screenshots is reasonable.
   - What's unclear: whether adding screenshots for the icon-only toolbar at 700px/mobile width would constitute a 5th screenshot, and whether a "before vs. after" concept is appropriate.
   - Recommendation: plan for 4–5 screenshots; add a 5th only if the mobile entry toggle or toolbar is significantly different from the main 1440px view. The planner should decide the exact set in the plan.

2. **Phase 11.2 PR merge status**
   - What we know: Phase 11.2 is complete and on branch `gsd/editor-toolbar-redesign`, awaiting PR to main (per STATE.md).
   - What's unclear: whether the PR (#? — not numbered in STATE.md) is merged before Phase 12 planning/execution.
   - Recommendation: the plan MUST include a pre-flight check — verify Phase 11.2 is merged to main before starting capture. If not, the plan should have a blocking dependency step.

3. **Tagline copy for balanced-measure layout**
   - What we know: current tagline is "Orchestrate your menu in place, inside the dashboard." (54 chars). At `ww` constraint the font may auto-fit to a noticeably smaller size.
   - What's unclear: whether the tagline needs shortening to look right at the MAESTRO wordmark width.
   - Recommendation: the plan should include a visual review checkpoint after the `maxw → ww` change before committing. An alternative short tagline (e.g., "Edit your admin menu, in place.") should be noted as a fallback option for the executor to try if the current string doesn't render well.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.61.0 |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npm run screenshots` (CAPTURE=1, captures only — no gate assertions) |
| Full suite command | `npm run test:e2e` (all specs, no capture) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| REL-07 | Banner dimensions are 772×250 and 1544×500 | Smoke | `python3 -c "from PIL import Image; [print(Image.open('.wordpress-org/'+f).size) for f in ['banner-772x250.png','banner-1544x500.png']]"` | No Docker needed |
| REL-07 | Banner visual review — balanced text widths | Manual-only | Visual inspection of staging PNG | Cannot be automated; by definition a human design judgment |
| REL-08 | Screenshots are captured against v1.2 UI (Phase 11.2 toolbar) | Manual-only | Visual inspection post-capture | Human must confirm toolbar shows icon-only controls |
| REL-08 | Screenshot files exist at correct paths | Smoke | `ls .wordpress-org/screenshot-{1..4}.png` | File presence |
| REL-08 | readme.txt `== Screenshots ==` caption count matches screenshot file count | Manual-only | Count caption lines vs. file count | Quick manual cross-check |

**"Done" definition for assets:**
- REL-07: `banner-772x250.png` and `banner-1544x500.png` are exact dimensions (772×250 and 1544×500), under 4 MB, and visually reviewed/approved by the human. The text rows and gold rule share the same horizontal measure.
- REL-08: `screenshot-N.png` files are committed to `.wordpress-org/`, show the Phase 11.2 icon-only toolbar, and the `== Screenshots ==` captions in `readme.txt` match the new set in number and content.

### Sampling Rate

- **Per task commit:** dimension check script (automated, no Docker)
- **Per wave merge:** full e2e suite (`npm run test:e2e`) — zero regression bar; captures do not run
- **Phase gate:** visual review checkpoint (human) for both banner and screenshots before overwriting live assets; full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/specs/capture-directory-screenshots.spec.ts` — new Phase 12 MAESTRO_CAPTURE-gated spec; covers REL-08 capture. Must be added before running `npm run screenshots`.
- [ ] Update `package.json` `"screenshots"` script to include the new spec file (or add a `"screenshots:12"` alias).

*(Existing test infrastructure — `editor.spec.ts`, `capture-screenshots.spec.ts`, Playwright config, global-setup auth — covers all other needs. No framework install required.)*

---

## Sources

### Primary (HIGH confidence)

- `.wordpress-org/source/build_final.py` — complete in-code SVG master, `build_banners()` layout, env var wiring
- `.wordpress-org/source/HOW-TO-REGENERATE.md` — canonical regen instructions, dependency list, palette docs
- `package.json` — `assets:banners`, `screenshots` script definitions
- `tests/e2e/specs/capture-screenshots.spec.ts` — Phase 11 capture pattern (MAESTRO_CAPTURE guard, storageState auth, committed directory)
- `tests/e2e/editor.spec.ts` (lines 426–607) — Phase 7 CAPTURE_07 pattern
- `.planning/REQUIREMENTS.md` — REL-06, REL-07, REL-08 definitions; Phase 11.2 UX-10 record
- `.planning/STATE.md` — Release Binding section, Phase 11.2 status, Phase 7 screenshot hygiene note
- `readme.txt` — `== Screenshots ==` section (current 4 captions)
- [developer.wordpress.org/plugins/wordpress-org/plugin-assets/](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/) — official banner/screenshot constraints
- Tool versions verified: `inkscape --version` → 1.4.4; `python3 -c "import PIL; print(PIL.__version__)"` → 11.3.0
- Existing asset dimensions verified: `pillow` inspection → banner-772x250.png 772×250, banner-1544x500.png 1544×500, screenshot-*.png 1440×980

### Secondary (MEDIUM confidence)

- `.planning/phases/11.2-editor-toolbar-redesign/11.2-SUMMARY.md` — Phase 11.2 UX-10 delivery record (icon-only toolbar anatomy, accessibility approach, e2e gate result 32/0)
- `.planning/phases/09-editor-ux-polish/` — Phase 9 screenshot pattern (toolbar-700.png, toolbar-1200.png in planning screenshots dir; CAPTURE pattern for Phase 9 deliverables)

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- REL-07 pipeline anatomy: HIGH — read directly from `build_final.py`; the layout variables and the precise change point are code-verified
- REL-07 visual outcome: LOW (by nature) — the "balanced common measure" is a design judgment; the automated dimension check is HIGH but the visual approval is inherently manual
- REL-08 capture infrastructure: HIGH — pattern directly from existing working specs
- REL-08 screenshot set design: LOW (discretionary) — Claude's discretion per CONTEXT.md; planner must decide
- wp.org asset constraints: HIGH — fetched from official Plugin Handbook
- Tooling availability: HIGH — inkscape and pillow verified at runtime

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable domain; no fast-moving dependencies)
