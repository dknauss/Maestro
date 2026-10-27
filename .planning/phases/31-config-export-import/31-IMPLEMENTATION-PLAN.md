# Phase 31: Config export/import implementation plan

Status: implemented on `feat/config-export-import`; verification/PR review in progress.
Execution update: local access restored, actual repository found under `Code/dknauss`;
all local branches/worktrees checked before creating the isolated feature branch.
Reviewed: 2026-10-24 against GitHub main d34a576 (#260).
Requirements: PORT-01, PORT-02. Issue: https://github.com/dknauss/Maestro/issues/216

## Goal and scope

Export one site's portable menu configuration to a versioned JSON file and
import it on another site, showing exactly what cannot be applied. Keep this
inside the existing editor Settings dialog. No presets, preset registry,
bundled templates, user matching, network-wide defaults, or new settings page.
Do not depend on the draft selected-row prototype (#261).

## Existing work and evidence

- Phase 31 is defined in ROADMAP.md but has no implementation plans or source
  files. PORT-01 and PORT-02 are pending in REQUIREMENTS.md.
- Issue #216 and the 2026-07-03 config-presets-export-import todo contain the
  original request. PR #217 scheduled it; PR #253 recorded D4: missing target
  menu items must be dropped and reported. D5 is a release decision, not an
  implementation blocker.
- GitHub branches are main, phase-27-05-verify, and
  proto/selected-row-controls. Searches of import/export PRs and export commit
  history found planning changes, not feature implementation. Local untracked
  files, unpublished branches, and worktrees could not be inspected because
  the local command runner is unavailable. Inspect them before starting code.
- Config already has SCHEMA_VERSION = 2. The old todo's claim that it lacks a
  schema version is obsolete. Its meaning controls legacy submenu resolution;
  it must not be repurposed as a file-format version.
- Config::sanitize(), Config::save(), Slug normalization, Replay, REST cookie
  authentication tests, privacy tests, serialized autosave, and Settings modal
  machinery are reusable. No separate configuration option is needed.

Authoritative sources on main:

- .planning/ROADMAP.md, Phase 31 and decisions D4/D5
- .planning/REQUIREMENTS.md, PORT-01/PORT-02
- .planning/DECISION-settings-surface.md
- includes/class-config.php: schema, limits, save(), protected user axes,
  absent-profiles preservation, profile compilation
- includes/class-replay.php: pre-replay capture and qualified menu identity
- includes/class-rest.php; tests/integration/RestConfigTest.php
- tests/integration/ProfilesPrivacyTest.php
- assets/maestro.js: openSettings(), flushAutosave(), doAutosave()
- CONTRIBUTING.md and TESTING.md

## Proposed behavior

1. Export downloads the latest successfully saved portable configuration.
   Flush and await the complete autosave chain first; a failed save blocks
   transfer and keeps the existing error visible.
2. Import replaces portable settings, rather than merging them. The dialog
   states that rename/icon/role rules, ordering, separators, and menu width
   will be replaced. A missing portable field resets that portable setting.
3. Export omits hidden_users, child_hidden_users, all profiles (including names,
   IDs, memberships and hide lists), and compiled hidden_profiles and
   child_hidden_profiles axes. No source user/site identifiers are metadata.
4. Import accepts only portable fields. A crafted file cannot supply person or
   profile data, even when imported by an administrator with list_users.
5. Preserve existing destination people rules and complete visibility-group
   authoring data for ALL importing users. This is a proposed product choice
   extending Phase 31's minimum delegated-editor protection. Describe it plainly
   in the dialog and docs. Preserve normalized identity and reserved item-cap
   capacity using the existing protection mechanism, not a second ad hoc merge.
   Recompile groups from the preserved registry; never trust compiled input.
6. D4 applies to incoming portable data. Existing destination-private rules
   are not deleted when the incoming file lacks their menu items.
7. Cancel, validation failure, stale context, oversize input, and failed writes
   leave storage unchanged. Import is explicit; selecting a file never saves.
8. After successful import, reload from authoritative PHP before allowing
   further autosave. Retain a bounded, privacy-safe result summary for display
   after reload. No file contents or people data in URL parameters.

## File contract

Use an independent envelope:

```json
{
  "format": "maestro-menu-config",
  "schema_version": 1,
  "config": {
    "schema_version": 2,
    "items": {},
    "top_order": [],
    "sub_order": {}
  }
}
```

Outer schema_version versions the transfer format. Inner schema_version keeps
Config's existing identity semantics. Export current files in the shown form;
reject unsupported/missing versions and raw option dumps with a helpful error.
Do not silently stamp an old config v2: canonicalize legacy bare submenu keys
against the source menu inventory first, or refuse export with an actionable
request to open/re-save in the current editor. Test the chosen migration path
against shared parent/child slugs before shipping.

Portable optional keys: separators, removed_separators, menu_width. Item keys
are qualified parent>child for submenu items; portable item fields are title,
icon, hidden_roles, child_hidden_roles, subject to current sanitizer rules.
Use an explicit allowlist for export, not a blacklist that leaks future fields.
Emit maps as JSON objects, including when empty. Keep list order stable and
format the file readably for version control. Do not export timestamps by
default. Do not rewrite/fetch external icon URLs; explain their source-site
dependency. No arbitrary SVG-upload feature is introduced.

Parse JSON as data only. Bound request bytes and decoding depth BEFORE further
processing. Define separate transport-file and stored-config ceilings because
JSON bytes and serialized PHP bytes differ. Use current Config limits for
collections and fields; reject excessive collection counts instead of silently
truncating an import. Preserve object-vs-list validation, reject malformed root
types, and refuse duplicate/ambiguous normalized item identities.

## Target menu inventory: first implementation gate

REST requests do not construct the admin menu. Do not include wp-admin/menu.php
inside a REST handler, replay admin_menu manually, or trust browser-supplied
menu keys. Existing Replay::get_pristine() is insufficient: it flattens submenu
keys by child slug and is only captured in edit mode.

Proposed architecture: capture a separate bounded inventory from the real
site-admin request immediately before Maestro changes globals in replay().
Keep raw top-level identity, qualified parent/child identity, separator kind,
normalized matching indexes, and collision information; no names or people.
Publish an opaque short-lived context token to the editor. The server keeps
the inventory behind that token, bound to current user, session and blog.
REST import loads that server-owned inventory, checks expiry/context and
configuration revision, then validates every incoming reference against it.
Missing/expired context fails closed and asks for an editor reload.

At the start of import, use a newly loaded normal editor request to refresh
inventory when needed; never silently proceed using an arbitrarily old page.
Invalidate tokens for changed plugin/theme/role context and bind the analysis
and apply stages to the same file digest and destination revision. These
checks prevent changed inputs or intervening writes from applying a stale
analysis. Scope the claim honestly: inventory describes the actual current
editor request; request-dependent plugin registrations need compatibility
tests. No claim of discovering every menu of every user is made.

31-01 must prove this in a real disposable WordPress site before the REST/UI
implementation proceeds. If the snapshot approach cannot satisfy D4 reliably,
record the evidence and revise the transport to validate during a real admin
request; do not ship client-authoritative filtering as a shortcut.

## Server pipeline

- GET /maestro/v1/config/export: capability-gated, no-store response, always
  redacted portable envelope. Return JSON suitable for browser download.
- POST /maestro/v1/config/import with explicit analyze/apply mode: capability
  plus REST cookie nonce, bounded JSON file text, and server inventory token.
  Analyze parses, validates, reconciles and returns a portable change summary
  without writing config. Apply repeats validation and rejects changed context.
  Analysis tokens/context are bounded and private; no permanent uploaded file.
- Share a Transfer service (new includes/class-transfer.php) between endpoints;
  keep transport/auth in Rest and matching in a pure, testable helper where
  practical. Register required classes from maestro-menu-editor.php.
- Pipeline: authorization -> size/depth/shape/version -> strip/reject private
  input -> identity reconciliation -> role reconciliation -> sanitizer ->
  checked save. Authorization is checked again on apply.
- Match identities using Slug's existing entity, host-move and query semantics.
  Re-key incoming references to the target's unambiguous current raw keys.
  Retain parent qualification; never match a submenu merely by child slug.
- Check items, top_order, each sub_order parent and child,
  removed_separators, and added separators. New synthetic separator IDs in the
  file are valid additions, not missing target items; reject collisions with
  real menu rows. Removal references must actually be separator rows.
- Drop/report absent roles, missing/ambiguous menu references and refused field
  values. Report codes, counts and escaped source references; never HTML from
  the file, target-private slugs, profile names, memberships, or user IDs.
- Refuse an import whose intended changes all disappear unless the user
  explicitly confirms a clearly described portable reset. An intentionally
  empty config remains a supported explicit reset of portable settings.
- Use Config::sanitize() for every stored field, including preserved axes.
  Extend its existing protection mechanism with an explicit transfer policy
  if needed; do not impersonate a different user or bypass capability checks.
- Config::save() currently returns existing config on aggregate-size refusal,
  while Rest::save_config() returns saved=true. Add a checked save seam that
  returns WP_Error on oversize/write failure for import. Preserve existing save
  callers unless deliberately migrating them with regression coverage. Avoid
  duplicate sanitization with user-dependent side effects. Unchanged legitimate
  imports are successful no-ops; update_option() false is not always an error.
- Recheck destination revision before mutation. Keep one configuration option
  write; no partial settings/profile writes. Preserve non-autoloaded storage.

## 31-01: Contract, inventory proof and reconciliation core

Files: new includes/class-transfer.php and inventory helper as needed;
includes/class-replay.php; tests/unit/TransferTest.php;
tests/integration/TransferInventoryTest.php; unit bootstrap if necessary.

1. Add failing tests for the envelope, portable allowlist, strict shapes and
   versions, limits, legacy shared slugs, host moves, qualified sibling keys,
   collisions, separator adds/removals, missing roles/items and report contents.
2. Implement export projection and pure import reconciliation from supplied
   server inventory. Test source export -> target resolution without storage.
3. Capture typed identities before replay, including rules-hidden items;
   prove capture is server-owned in a real admin request on the local lab.
4. Add bounded token/session/blog/expiry/revision binding and invalidation;
   test wrong viewer, wrong site, tampering, expired context and missing data.
5. Record the inventory limitation and evidence. Done only when D4 is enforced
   by authoritative server data, including parent-qualified children.

## 31-02: Authenticated REST transport and checked persistence

Files: includes/class-rest.php, includes/class-config.php,
maestro-menu-editor.php; tests/integration/RestTransferTest.php;
tests/integration/TransferPrivacyTest.php; extend relevant existing tests.

1. Add red tests for unauthorized export/import, missing/invalid nonce through
   actual cookie-auth filters, bad versions, malformed/oversized JSON, stale
   analysis, atomic failure, unchanged import and accurate failure responses.
2. Implement analyze/apply/export endpoints and service wiring.
3. Add transfer-specific preservation of all destination-private axes and
   profiles using the common normalized protection map and item-cap reservation.
4. Attack malicious people/group fields, equivalent-key collisions, omitted
   items, MAX_ITEMS starvation, profile compilation, and both list_users lanes.
   Compare full stored config before/after; inspect public responses for leaks.
5. Test single-site/multisite site isolation, super-admin ordinary editing,
   network/user-admin exclusion and no role-preview write path. Existing direct
   REST editing semantics remain as documented.
6. Run focused tests, lint and PHPStan. Obtain deep review of the server diff
   before integrating it with the user workflow.

## 31-03: Editor Settings transfer workflow

Files: assets/maestro.js, assets/maestro.css, includes/class-assets.php;
assets/maestro-logic.js only for reusable pure logic;
tests/e2e/config-transfer.spec.ts; focused JS tests where useful.

1. Generalize the existing Menu width dialog to Settings with distinct Menu
   width and Export/import sections. Reuse its toolbar icon. Make Settings
   reachable at narrow widths; retain the <961px exclusion for width controls
   and edge drag only. Update labels, tour and affected layout tests.
2. Export: flush pending saves, check lastSaveOk (a resolved promise alone is
   insufficient), fetch the redacted envelope and download a .json Blob.
3. Import: labelled file picker -> read-only analysis -> clear replacement and
   preserved-people explanation -> explicit Import configuration action.
   Show drops before apply and the final server result after it. Selecting or
   canceling a file changes nothing.
4. Suspend local mutating actions/autosave during transfer, drain any pending
   chain, block double submission and handle failed saves. Reload after apply
   before resuming edits, preventing stale in-memory model or profileCarry from
   overwriting imported data. Keep an actionable recovery path if reload fails.
5. Reuse #260's focus/Close handling, both-direction Tab containment, Escape,
   focus restoration, mobile scroll body and touch keyboard behavior. Use
   textContent for file/result text and translatable messages.
6. E2E: download/read/import across different menu/role fixtures, persisted
   results after reload, missing item report, input cancellation, malformed
   files, delayed/failed autosave, duplicate apply, conflict and retry.
   Verify a real signed-in lower-role user's menu plus direct URL access.

## 31-04: Verification, docs and planning reconciliation

1. Update docs/user-guide.md, README/readme where applicable, SPEC.md,
   TESTING.md, Phase 31 verification record and PORT requirement traceability.
   Explain portable replacement, preserved destination people/groups,
   schema refusal, dropped references, icon URL limits and cosmetic-only hiding.
2. Correct stale v1.7 references for Phase 31 and the obsolete missing-schema
   claim in the old todo; keep named presets deferred. Link this plan from
   ROADMAP.md and STATE.md, recording actual build/acceptance separately.
   Do not mark D5 decided or invent a release tag.
3. Run composer test:unit, composer lint, composer analyse:phpstan,
   npm run test:js, npm run check:doc-links, npm run audit:npm,
   npm run test:php, npm run test:php:multisite, npm run test:e2e,
   and bash bin/build.sh plus Plugin Check against the built ZIP.
4. Perform a real two-site lab transfer with intentionally different active
   menus/roles, existing destination private rules, separators and menu width.
   Verify both stored values and rendered behavior, then reset/retest.
5. Capture desktop/RTL/mobile screenshots; manually check keyboard and screen
   reader summaries. Keep real iPhone/iPad acceptance explicit and separate
   from emulation. Require deep review of the final combined import diff and
   re-review any P1/P2 fixes before merge.

## Start-of-implementation checklist

- Restore local command access; read user AGENTS.md, WORDPRESS-ACCESS.md and
  applicable local skills/instructions before WordPress operations.
- Inspect git status, all worktrees and unpublished branches for existing work;
  preserve uncommitted changes. Fetch current main and rebase this design on
  whatever has merged since d34a576.
- Use isolated local development and disposable WordPress sites. No remote
  WordPress writes are authorized by this plan.
- Confirm the proposed transfer semantics and inventory proof in 31-01;
  implementation is not authorized by the planning artifact itself.

## Planning-session limitations

The local command process could not start, so this review used the connected
GitHub source, branches, issue/PR searches and history. Local skills and user
policy files could not be read; no WordPress operation was performed. Tests
listed above are planned, not claimed as run. This document is a proposed
implementation plan, not evidence of feature completion.
