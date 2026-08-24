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
