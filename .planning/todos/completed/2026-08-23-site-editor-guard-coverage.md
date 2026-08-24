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

## Follow-on: I reported a bug here that does not exist

Codex asked (on #178) for the dirty-template test to prove navigation waits for
the autosave to *complete*. Trying to write that assertion produced a reading of
**28ms** for `maestroPostGuard.save()` against a response held open for 4000ms,
which I took to mean `wp.data`'s `dispatch( 'core/editor' ).autosave()` settles on
dispatch rather than on the response. I filed #180 on that basis and wrote a fix
for it.

**Re-measured, it is wrong.** Holding the response 4000ms and counting the
interception, the shipped code resolves in **4102ms with exactly one POST
intercepted**. It waits for the request to land. #180 is closed as not
reproducible and the fix — a `wp.data.subscribe` loop with a 5000ms ceiling — was
discarded unshipped. It would have added a way to *stop* waiting where none was
needed, capping a legitimately slow autosave at 5s.

The original reading was almost certainly `save()` resolving without a request of
its own, with the POST I saw belonging to the editor's own autosave timer. The
corrected test now asserts `intercepted === 1` alongside the timing, so a save
that sends nothing can no longer look like a save that waited.

### What the detour was worth

Three framings of the navigation-level assertion passed against a deliberately
broken build before one failed, and the reason is worth keeping:

1. **hold, wait, assert `page.url()` unchanged** — `url()` does not update until
   the new document commits, so a navigation already under way looks like no
   navigation;
2. **assert total elapsed time to the new URL** — the Dashboard takes longer to
   load than the delay under test, so page-load time met the floor by itself;
3. **assert when the navigation REQUEST is issued** — measured ~3.1s against a 3s
   hold for *both* a correct and a broken build. Holding a route delays the
   page's navigation regardless of what the JS does, so nothing at that level
   discriminates.

The contract lives on `save()`, so that is where it is asserted. And the general
lesson is the one this whole file is about: a green test against a build you have
deliberately broken is the only proof that a test guards anything.
