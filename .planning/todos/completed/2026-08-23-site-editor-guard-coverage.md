# The Site Editor's entry guard is now the only user of maestroPostGuard, and it is untested

**Raised:** 2026-08-23, during WP71-05.

WP71-05 removed the Post Editor toggle, which was the only place `maestro-entry.js`
and `maestro-post-guard.js` did observable work. `autosave-on-entry.spec.ts` was
retired with it — its own header said it only covered the fullscreen-OFF Post
Editor path, which no longer exists.

The scripts survive, narrowed to `is_site_editor_screen()`, because the Site
Editor toggle (UX-11) still leaves the screen and could still strand unsaved work.

**What is unverified:** whether the guard does anything there at all.
`needsSave()` reads `core/editor`'s `isEditedPostDirty()` and
`isEditedPostAutosaveable()`, and `save()` dispatches `core/editor.autosave()` —
all post-shaped. The Site Editor edits template entities, so both may be false or
meaningless, in which case the guard is inert and the scripts should be deleted
rather than narrowed.

This was **already** the situation before WP71-05; that change only removed the
other caller and left this one exposed. So it is not a regression — it is a
pre-existing gap that stopped being hidden.

**To settle it:** in the Site Editor, dirty a template, click the Maestro toggle,
and observe whether an autosave request fires and whether the edit survives. If
nothing fires, delete both scripts and their enqueues.

---

## ✅ Settled 2026-08-23 — by measurement, and the guess above was wrong

Measured on a running `7.1.1-alpha-63326` Site Editor.

**The guard is not inert.** `core/editor` is registered there, with
`getCurrentPostType()` `'wp_template'` and an id like `twentytwentyfive//home`:

| State | `isEditedPostDirty()` | `isEditedPostAutosaveable()` | `needsSave()` |
|---|---|---|---|
| clean template | false | false | **false** |
| dirty template | true | **true** | **true** |

So it declines correctly on a clean pass-through, and on a dirty template it
fires a real `POST /wp-json/wp/v2/templates/<id>/autosaves`.

**But the attempt cannot succeed for a theme-file template** — the common case on
a fresh block theme. Core answers:

```
400 rest_invalid_template
"Templates based on theme files can't have revisions."
```

`save()` swallows that by design and resolves, the template stays dirty, and the
browser's own beforeunload warning stands. That is precisely the fallback
`maestro-post-guard.js` documents: *"A failure is not swallowed: the post stays
dirty, so beforeunload still fires."*

**Decision: keep both scripts.** The "delete if nothing fires" branch does not
apply — something fires, the contract holds, and the failure mode is the designed
one. A user-customised template (a real `wp_template` row rather than a theme
file) may well autosave successfully; that was not tested and is the obvious
next question if this is ever revisited.

**Coverage added:** `tests/e2e/specs/site-editor-guard.spec.ts` — the guard loads
in the Site Editor and not the Post Editor, a clean template is not written to,
and a dirty one triggers a preservation attempt before the toggle navigates. It
deliberately does not assert core's 400, which is core's to change.

Worth recording as method: the fixed-sleep version of this spec raced, because
`getCurrentPostId()` is null while the editor resolves. Waiting on the condition
made it both stable across repeats and roughly twice as fast.

---

## Follow-on found while writing the coverage: `save()` does not await the network

Codex asked (on #178) for the dirty-template test to prove navigation waits for
the autosave to *complete*, not merely that a request went out. Trying to write
that assertion showed the code does not meet it.

**Measured on `7.1.1-alpha-63326`:** with the autosave response held open for
**4000ms**, `maestroPostGuard.save()` resolved in **28ms**.

`wp.data.dispatch( 'core/editor' ).autosave()` settles when the action is
dispatched, not when the HTTP round-trip lands. So:

- `maestro-post-guard.js`'s `save()` docblock — *"Resolves once the attempt has
  finished"* — is inaccurate;
- `maestro-entry.js` awaits `save()` and then navigates, so it navigates with the
  autosave still in flight, where the navigation can abort it.

This is **not** WP71-05 fallout. It predates it and applied equally to the Post
Editor path UX-13 was written for, which means UX-13's protection has always been
weaker than its comments claim.

**Not fixed here.** The fix is to wait on `isAutosavingPost()` with a bounded
ceiling — unbounded would strand the toggle if the store never settles — and that
is a change to a navigation path that deserves its own PR and its own review.
Recorded as `test.fixme` in `tests/e2e/specs/site-editor-guard.spec.ts` so the
gap sits in the suite rather than only in prose.

**Second thing that test caught:** REST reaches the same route by two URL shapes
— `/wp-json/wp/v2/...` under pretty permalinks and
`index.php?rest_route=%2Fwp%2Fv2%2F...` under plain ones, which is what wp-env
uses. The first predicate only matched the pretty form and silently captured
nothing; decoding the URL before matching covers both.
