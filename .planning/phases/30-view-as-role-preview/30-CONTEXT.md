# Phase 30 — View-as-Role Preview decisions

Approved by Dan on 2026-10-23, following the discussion of D2, super-admin
handling and picker placement. All three recommendations were explicitly
approved. This records design decisions, not an implemented or verified feature.

## D2 — narrow capability-filter exception

Maestro never changes stored user or role permissions. Read-only role preview
may temporarily restrict the viewing user's capability checks during menu
construction, without changing page authorization.

- Check `Maestro\capability()` and a valid nonce before enabling preview.
- Affect only the authorized viewer and only subtract capabilities: never grant
  a capability the viewer lacks, change identity, or persist permissions.
- Restrict filtering to menu construction; remove it before
  `user_can_access_admin_page()` and page callbacks run. REST, AJAX, cron and
  ordinary browsing are outside this exception.
- Preview has no selection, editing, autosave, reset or configuration writes.
- Prove authorization, viewer isolation, subtraction, cleanup and no-write
  boundaries with regression tests. Subtraction alone is not proof of safety.

Describe preview as an approximation of one role's menu. User-specific grants,
multiple roles, person/profile hiding rules, direct role/identity checks and
plugins registering menus outside the filtering window can differ. Unsupported
fidelity must be explained rather than presented as exact simulation.

## Super-admin handling — unsupported in the first release

Disable role preview for multisite super-admin viewers. Explain that they must
use a site administrator account to preview site roles. Reject crafted preview
requests server-side too. Ordinary editing remains available wherever Maestro
already supports it; do not add network/user-admin editing support here.

Do not add a `map_meta_cap` workaround for this release. Supporting super-admin
preview is a separate follow-up requiring its own design and review.

## Picker placement and transitions

Updated 2026-10-24 by Dan's approved desktop-refinement request: use one
accessible **Preview as** toolbar button opening the picker dialog at every
width. This supersedes the 2026-10-23 inline-toolbar placement decision:

1. In the dialog, a visible **Preview as** label, native single-role selector
   populated from the site's roles, and explicit **Preview** button. Selecting
   alone does not reload.
2. Before entering preview, finish any pending edit save successfully. A failed
   save must not silently discard edits by navigating into preview.
3. Entry reloads to the server-rendered preview. Replace editing controls with a
   persistent **Previewing menu as Editor — read-only** banner, the role picker
   and **Exit preview** control.
4. Keep those controls available independently of the simulated role's access to
   Maestro's normal menu entry. Exit restores the ordinary menu without changing
   hiding rules.

Editing within role scope and previewing a specific person remain out of scope.

## Next step and acceptance

D2 and the two accompanying decisions are settled. Phase 30 is ready for
implementation planning; implementation plans and runtime verification remain
outstanding. Require deep review before merging capability-resolution changes.
D4 (import behavior) and D5 (release timing) remain open for their later gates.

The Phase 27–29 desktop sign-off remains accepted. **Real touch-device testing
remains outstanding**; this decision record does not close it or claim any
Phase 30 human acceptance.
