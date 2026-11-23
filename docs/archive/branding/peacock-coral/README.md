# Archived: "Peacock & Coral" WordPress.org art

This is the Art Deco banner and icon set that shipped on WordPress.org until
November 2026, when it was replaced by the minimalist "Score" art,
whose source is in `.wordpress-org/source/`.

Kept here for reference only. Nothing in this folder ships:

- `/docs` is listed in `.distignore`, and `bin/build.sh` builds the plugin from an
  allowlist that doesn't include it.
- The WordPress.org assets deploy only syncs `.wordpress-org/` (minus `source/`).

`source/build_final.py` still renders the set (it needs Inkscape and Pillow). See
`source/HOW-TO-REGENERATE.md`. Run it with `OUT_DIR` set so it doesn't overwrite
the live assets.
