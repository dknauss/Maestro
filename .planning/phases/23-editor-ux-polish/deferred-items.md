# Deferred Items — Phase 23 Plan 05

Out-of-scope discoveries surfaced during the Task 3 full-suite gate. Logged
per the executor's scope-boundary rule (pre-existing issues unrelated to this
plan's changes) — not fixed here.

## Plugin Check: dev-tree root files flagged (pre-existing, not Phase 23 scope)

Running `wp plugin check maestro-menu-editor --exclude-directories=tests,bin,docs,build,vendor,node_modules,playground,.planning,.claude,.github,test-results`
against the wp-env tests-cli container (which maps the full working tree, not
a built distribution ZIP) reports 4 errors + 6 warnings, all against files at
the plugin root that predate Phase 23 and are untouched by any Phase 23 plan:

**Errors (`hidden_files` / `application_detected`):**
- `.lycheeignore`, `.wp-env.json` — hidden dotfiles at plugin root
- `phpunit-integration.xml.dist`, `phpunit-unit.xml.dist`, `phpcs.xml.dist`,
  `phpstan.neon.dist` — dev tooling config detected as "application files"

**Warnings (`hidden_files` / `unexpected_markdown_file` / `upgrade_notice_limit`):**
- `.gitignore`, `.distignore` — hidden dotfiles
- `CODE_OF_CONDUCT.md`, `TESTING.md`, `SUPPORT.md`, `SPEC.md` — non-standard
  markdown files at plugin root
- `readme.txt` — the 1.3.0 upgrade notice exceeds Plugin Check's 300-character
  limit

Prior phase gates (e.g. 17-03-SUMMARY.md) recorded "Plugin Check 0 errors" with
this exact same `--exclude-directories` invocation against this exact same set
of root files (all were already tracked in the repo well before Phase 17). The
most likely explanation is Plugin Check ruleset/version drift between then and
now (the wp-env container currently ships plugin-check 2.0.0) surfacing new
`hidden_files`/`application_detected` checks that didn't previously fire, or
that the historical "0 errors" runs were against a built release ZIP (which
excludes all of these dev-only files structurally) rather than the raw
dev-tree checkout `wp plugin check` sees under wp-env.

**Not fixed here** because:
- None of these files were created or modified by any Phase 23 plan (01-05).
- `--exclude-directories` has no sibling `--exclude-files` flag to scope this
  further from the dev-tree checkout; the historical gate pattern already
  represents this project's best-known invocation.
- Resolving this properly (build-then-check pipeline, or an upstream
  Plugin Check config exclusion) is a release-tooling change, matching the
  REL-10 (Phase 24) release pipeline's scope, not an editor-UX-polish plan.

**Recommendation:** Phase 24 (REL-10) should re-run Plugin Check against the
actual built release ZIP (per `bin/build.sh` / the v1.2/v1.3 release pipeline)
before tagging v1.4.0, rather than against the dev-tree checkout, to get an
accurate 0-error shippable-source result.

## i18n: new "Exit Menu Editor" string not yet in translation catalogs (PR #87, Codex P2)

Phase 23 introduced the admin-bar label `Exit Menu Editor` (in
`includes/class-admin-bar.php`, correctly wrapped in `esc_html__()` /
`esc_attr__()`, so it is translation-*ready*). It has not yet been extracted
into the POT or the six bundled locale PO/MO catalogs (`languages/`), which
still carry the older `Exit` / `Exit Editor` msgids. On a non-English locale
the new label therefore falls back to English.

**Deferred to Phase 24 (REL-10), not fixed on PR #87**, because catalog
regeneration is release-cut work, not editor-UX-polish work:
- The string is already correctly localised in code (proper i18n wrappers +
  `maestro-menu-editor` text domain); only the extracted catalogs lag.
- Regenerating the POT and refreshing all six PO/MO files is part of the
  standard release pipeline (the v1.2/v1.3 cuts regenerated catalogs at tag
  time); doing it mid-PR would churn seven catalog files outside this branch's
  scope.

**Phase 24 action:** regenerate `languages/maestro-menu-editor.pot` and update
the `es_ES / de_DE / ja / fr_FR / pt_BR / it_IT` PO/MO files so `Exit Menu
Editor` (and any other v1.4 string add/removes — e.g. the dropped `Exit` key)
are extracted before tagging v1.4.0.
