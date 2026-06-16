# Phase 8: Docs & Brand Assets - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Source:** Roadmap + REQUIREMENTS (DOC-01, REL-06) + user directive ("plan 7 then 8; find tasks for sonnet")

<domain>
## Phase Boundary

Documentation link hygiene, plus confirming the already-shipped banner pipeline.

- **DOC-01** (from V2-13): In-prose references to **project files** become markdown
  links (not bare paths) across README, SPEC, TESTING, user guide, and planning
  docs — "where relative links make sense."
- **REL-06** (from V2-14): The wp.org/GitHub banner is rebuilt from an editable
  source with a repeatable `npm run assets:banners` pipeline. **This is already
  marked Complete** (shipped during the wp.org rename). Phase 8's REL-06 work is
  **verify + reconcile**, NOT rebuild.

Out of scope: rewriting doc content, new docs, any banner redesign, plugin code.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### DOC-01 — link only real project files, in prose, where links make sense
- **Linkify** an inline-code path ref only when it resolves to a file that
  **actually exists in this repo** and a relative link is meaningful in that doc.
- **Do NOT linkify** (leave as inline code):
  - **WordPress core / external files** — confirmed absent from the repo:
    `common.js`, `menu-header.php`, `wp-admin/menu-header.php`. These are core
    references, not project files.
  - **`readme.txt`** prose — it renders on the WordPress.org listing where
    relative file links are meaningless. Default: leave its path refs as inline
    code (linkify only if the target is a public URL). Planner confirms.
- **Resolve stale refs found during the pass:** `maestro.php` (the real main file
  is `maestro-menu-editor.php`) and bare `icon.svg` (real path
  `.wordpress-org/icon.svg`) do not exist at the referenced path — fix the path so
  the link is valid, or note it. Do not invent links to non-existent files.

### REL-06 — verify the shipped pipeline; reconcile the criterion wording
- The shipped pipeline is **Python/Pillow** (`.wordpress-org/source/build_final.py`
  + `fonts/` + `HOW-TO-REGENERATE.md`), driven by
  `npm run assets:banners` → `OUT_DIR=.wordpress-org python3 .wordpress-org/source/build_final.py`.
  Both `banner-772x250.png` and `banner-1544x500.png` exist.
- The roadmap's literal criteria name an **SVG master + Inkscape render** — the
  shipped mechanism differs (Python/Pillow). The **intent** (editable source +
  repeatable single-command regeneration + leader line removed) is met. Phase 8
  must: (1) verify `npm run assets:banners` regenerates both banners
  deterministically from the committed source, and (2) **reconcile** the wording —
  record that the SVG/Inkscape mechanism was replaced by the Python/Pillow
  pipeline, so REL-06's "Done" status is accurate and auditable. No banner redesign.

### Methodology — TDD for the doc-link check (it's a verifiable transformation)
- DOC-01 has a testable success contract (roadmap criterion #1: "a grep for common
  bare-path patterns returns no results"). Build it **test-first**: a repeatable
  checker (script or test) that enumerates inline-code refs resolving to existing
  project files but not yet links, in the in-scope docs. RED = N offenders; convert
  them; GREEN = 0. Reuse the existing test runner seam where practical.
- Pure prose edits beyond link conversion are not in scope; no logic to unit-test
  there.

### Zero-regression bar
- Doc/asset-only changes: PHP unit 44/44, integration 29/29, e2e green, Plugin
  Check 0 errors, `composer lint` clean all remain unaffected and green. The
  bundled `readme.txt`/docs still validate (Plugin Check readme parsing).

### Executor-model guidance (per user "find tasks for sonnet")
Tag every task. **sonnet** for: writing the link checker from the explicit rule,
mechanical link conversions, running `npm run assets:banners` and diffing output,
doc/status reconciliation edits, verification greps. **opus** only for the two real
judgment calls: (1) the "where relative links make sense" / readme.txt policy, and
(2) the REL-06 criterion-reconciliation wording. Default sonnet.
</decisions>

<specifics>
## Specific Ideas — codebase anchors

- **In-scope docs (linkify project-file refs):** `README.md` (~20 refs),
  `SPEC.md` (~11), `TESTING.md` (~1), `docs/user-guide.md` (0), and `.planning/*`
  prose where relative links make sense.
- **Out-of-scope-for-links:** `readme.txt` (wp.org listing — default leave as code),
  and any ref to WP core (`common.js`, `menu-header.php`, `wp-admin/*`).
- **Existence check:** a ref is linkable iff the path resolves to a real repo file.
  Confirmed existing: `SPEC.md`, `TESTING.md`, `docs/user-guide.md`,
  `docs/archive/FIXES.md`, `composer.json`, `package.json`, `.wp-env.json`,
  `bin/build.sh`, `includes/class-*.php`. Confirmed absent (do not link as-is):
  `common.js`, `menu-header.php`, `wp-admin/menu-header.php`, `maestro.php`
  (→ `maestro-menu-editor.php`), bare `icon.svg` (→ `.wordpress-org/icon.svg`).
- **Banner pipeline (REL-06, shipped):** `.wordpress-org/source/build_final.py`,
  `.wordpress-org/source/fonts/`, `.wordpress-org/source/HOW-TO-REGENERATE.md`;
  outputs `.wordpress-org/banner-772x250.png` + `banner-1544x500.png`; command
  `npm run assets:banners`.
- **Markdown linking style:** project convention (see global instruction) is
  `[\`SPEC.md\`](SPEC.md)` — keep the code-formatted filename inside the link text,
  with a correct relative href from the linking doc.
</specifics>

<deferred>
## Deferred Ideas
- No banner redesign, no new SVG master if the Python pipeline already satisfies
  the intent (planner reconciles wording instead).
- Broader doc rewrites / restructuring — out of scope; this is link hygiene only.
- This is the final v1.1 phase; on completion the milestone can be audited/closed.
</deferred>

---

*Phase: 08-docs-brand-assets*
*Context gathered: 2026-06-15*
