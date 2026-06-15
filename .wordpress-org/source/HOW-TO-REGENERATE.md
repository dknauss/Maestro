# Admin Menu Maestro — asset regeneration

`build_final.py` regenerates the full WordPress.org asset set (icon + banners)
from one vector source, so you can re-tint, re-letter, or add an `-rtl` banner
without redrawing anything.

## Output
Writes to `./assets/` (override with `OUT_DIR=/path python3 build_final.py`):

| File | Size | Purpose |
|------|------|---------|
| `icon.svg` | vector | wp.org icon (takes precedence) |
| `icon-256x256.png` | 256×256 | retina icon / SVG fallback |
| `icon-128x128.png` | 128×128 | standard icon |
| `banner-1544x500.png` | 1544×500 | retina header |
| `banner-772x250.png` | 772×250 | standard header |

These go in the **top-level `assets/` folder of your SVN checkout** (sibling to
`trunk/` and `tags/`, never inside `trunk/`).

## Dependencies
- **Inkscape** — rasterizes the SVG (no cairo/cairosvg needed; works on macOS): `brew install inkscape`
- **Pillow** — compositing + downscale: `pip3 install pillow`

Fonts (all bundled in `./fonts/`, no system install needed):
- **Poiret One** (`PoiretOne-Regular.ttf`) — the "MAESTRO" wordmark.
- **Poppins Light** (`Poppins-Light.ttf`) — the tagline.

(The "ADMIN MENU" overline was removed — the brand wordmark leads. `POPPINS_DIR`
still overrides the font dir if you relocate the fonts.)

## Run
From the repo root: `npm run assets:banners`
Or directly:
```bash
OUT_DIR=../.. python3 build_final.py        # writes to .wordpress-org/ when run from source/
# or: OUT_DIR=/abs/path POPPINS_DIR=~/fonts python3 build_final.py
```

## Palette — "Peacock & Coral" (edit the `P = dict(...)` block)
| Token | Hex | Used for |
|-------|-----|----------|
| deep | `#0c2f3a` | ground (deepest) |
| facet | `#124152` | ground (upper facet) |
| shadow | `#04161c` | hard offset shadows, keylines, fold |
| bone | `#f2e7cf` | menu bars |
| bone_dk | `#d8c79f` | bar right facet |
| lit | `#f0b24a` | baton (lit plane), grip, amber wordmark |
| bronze | `#8a4a22` | baton (shadow plane) |
| chip | `#ef6f53` | coral icon chips, accents, overline |

To try another colorway, swap those hex values — the boards explored
**Noir & Champagne**, **Oxblood & Brass**, **Emerald & Gold**, and this one.

## Common tweaks
- **Tagline:** edit `tag = "Orchestrate your menu in place, inside the dashboard."`
- **Overline:** edit `over = "ADMIN MENU"`.
- **Wordmark face:** change the `PoiretOne-Regular.ttf` path in the hero block
  (drop a different TTF into `./fonts/`).
- **RTL banner:** mirror the layout (mark on the right, text right-aligned) and
  save as `banner-772x250-rtl.png` / `banner-1544x500-rtl.png`. Ask and I'll
  add an `rtl=True` branch.

## Notes
- Banners are PNG only — wp.org does **not** accept SVG or GIF for banners.
- The icon ships as SVG **and** PNG so every surface (incl. older browsers and
  Facebook) is covered.
- Master renders are built at 2× then downsampled (LANCZOS) for crisp edges.
