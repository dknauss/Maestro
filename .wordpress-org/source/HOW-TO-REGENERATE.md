# Maestro: WordPress.org art ("Score")

`build.py` draws the full WordPress.org asset set from one set of shapes, so you
can re-tint, re-letter or resize it without redrawing anything.

| File | Size | Purpose |
|------|------|---------|
| `banner-1544x500.png` | 1544×500 | retina header |
| `banner-772x250.png` | 772×250 | standard header |
| `icon.svg` | vector | wp.org icon (takes precedence) |
| `icon-256x256.png` | 256×256 | retina icon / SVG fallback |
| `icon-128x128.png` | 128×128 | standard icon |

`favicon.svg` (in this folder) is a hand-tuned 32×32 version of the mark, with
three rows instead of four so it stays readable at 16px. `bin/build-ux-gallery.mjs`
inlines it as the favicon of the UX gallery site.

## Run

From the repo root: `npm run assets:banners`. That writes into `.wordpress-org/`.
Set `OUT_DIR=/some/path` to write somewhere else, for example to preview a change.

Only **Pillow** is needed (`pip3 install pillow`, 9.2 or later for variable fonts).
Every PNG is drawn at 4× and LANCZOS-downsampled, and `icon.svg` is written from
the same geometry, so the SVG and PNG icons always match.

## Design

The layout follows the minimal style of the Keel banner: a square mark panel on
the left behind a hairline divider, a letterspaced all-caps wordmark, one short
accent bar, and a single tagline.

- **Mark:** four admin-menu rows, one picked out in the accent colour, with a
  conductor's baton cutting across them.
- **Wordmark:** Fraunces (variable: opsz 144, wght 300, SOFT 50), tracked +22px.
- **Tagline:** Figtree (variable: wght 400).

Both fonts are bundled in `./fonts/` under the SIL Open Font License (texts
alongside them).

## Palette: "Score" (edit the `P = dict(...)` block)

| Token | Hex | Used for |
|-------|-----|----------|
| paper | `#f7f3ec` | ground |
| rule | `#ddd5c7` | hairline frame and panel divider |
| ink | `#1f2340` | wordmark, menu rows, baton |
| mute | `#9a97a8` | unselected row chips |
| accent | `#d9472b` | selected row, baton tip, accent bar |
| tag | `#4a4d63` | tagline |

## Common tweaks

- **Tagline:** edit `TAGLINE`.
- **Wordmark size or spacing:** the `font("Fraunces-Variable.ttf", 132, ...)`
  call and the tracking value passed to `tracked()` in `build_banner()`.
- **RTL banner:** mirror the layout (panel on the right, text right-aligned) and
  save as `banner-1544x500-rtl.png` / `banner-772x250-rtl.png`.

## Notes

- Banners must be PNG or JPG; wp.org doesn't accept SVG banners.
- This `source/` folder is excluded from the plugin build (`bin/build.sh` copies
  an allowlist) and from the assets sync (`wp-deploy.yml` rsyncs with
  `--exclude 'source/'`).
- The previous "Peacock & Coral" art and its Inkscape pipeline are archived in
  `docs/archive/branding/peacock-coral/`.
