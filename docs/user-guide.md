# Maestro User Guide

Maestro edits the WordPress admin menu in place. It stores global,
cosmetic menu customizations as a sparse delta over the menu WordPress already
builds.

## Enter Edit Mode

After activating the plugin, open any admin page and choose **Edit Menu** in the
admin bar. The admin menu stays expanded while editing so the available items
are visible and stable.

Choose **Exit Menu Editing** when you are done. If an autosave is pending, the
plugin finishes it before reloading the page.

## Select A Menu Item

Click a top-level or submenu item to select it. A shared controls panel opens for
the selected item.

Keyboard users can focus a menu item and press `Enter` or `Space` to select it.
Once selected, focus moves into the controls panel.

## Rename Items

Select an item and edit its label in the controls panel. Press `Enter` to commit
the new label, or `Escape` to restore the previous label.

Renames are saved automatically after a short pause. The status indicator shows
when a save is in progress and when it has finished.

## Reorder Items

Drag menu rows to reorder them.

Top-level items can be reordered among other top-level items. Submenu items can
be reordered within their current parent menu. Moving items between top-level and
submenu positions is not included in this version.

### Reordering with the keyboard

You can reorder without a mouse:

1. Select an item by clicking it or pressing `Enter` / `Space` on its row.
2. Bring focus back to the menu row anchor (press `Shift+Tab` from the rename
   field, or click the row).
3. Press `Alt+ArrowUp` or `Alt+ArrowDown` to move the item one position.
4. Listen for the position announcement ("Posts moved down, position 3 of 8").
   Pressing the shortcut again moves the item further; focus stays on the row
   so you can chain multiple presses.
5. If the item is already at the top or bottom, you will hear an assertive
   announcement ("Posts is already last") and the order will not change.

The shortcut is also exposed as `aria-keyshortcuts` on the selected row, so
screen readers that surface shortcut metadata can discover it automatically.
Changes are autosaved after each move.

## Change Icons

Top-level menu items can use custom icons. Select a top-level item and open the
icon picker.

The picker includes Dashicons, bundled Bootstrap Icons, search, and a **No icon**
option. The saved icon value is validated server-side and may use any native
WordPress icon form:

- a Dashicon class
- `none`
- a base64 image data URI
- an image URL

Submenu items do not have separate WordPress admin menu icons, so the icon
control appears only for top-level items.

## Configure Role Visibility

Select an item and open the visibility control. Check the roles that should not
see the selected item in the admin menu.

Visibility settings are global. If an item is hidden from the Author role, it is
hidden from all Author users. Custom roles registered by other plugins appear in
the same control.

## Preview The Menu As A Role

To check what a role still sees, open **Preview as** using the eye button in the
editor toolbar, choose a role, then press **Preview**. Changing the selection
alone does not start a preview. Maestro saves anything still pending first; if
the save fails, the preview does not open.

On desktop, Visibility groups and Menu width save changes automatically. Use
the close icon or Escape to dismiss them; closing does not cancel queued saves.
Preview uses the same close icon; closing it leaves you in edit mode. Its role
selector stays labelled for assistive technology without repeating the heading.
Adding a new group still requires **Add group**. Save feedback appears above the
toolbar, and a failed save remains visible until a successful retry. Its ×
hides the message without clearing the failure: your next change retries the
save and shows the message again if it still fails, and **Preview** stays
unavailable until a save succeeds.

The Dashboard then shows the menu that role gets, with your rules for that role
applied, under a "Previewing menu as Editor — read-only" banner. Use the
banner's picker to try another role, and **Exit preview** (in the banner or the
WordPress toolbar) to go back to editing. Nothing can be changed or saved while
previewing, and you stay signed in as yourself.

The preview is an approximation. It narrows your own capabilities to the
role's while the menu is built, then hands them back, so the page itself still
opens as you. It does not show:

- rules for specific people or Visibility groups;
- capabilities given to an individual user rather than to their role;
- people who hold more than one role;
- plugins that build their menu from the user's ID rather than capabilities.

The preview runs on the Dashboard only, and only for roles that can reach the
admin (`read`). Network super admins on multisite cannot preview: WordPress
grants them every capability before any filter can narrow it. Use a site
administrator account to preview that site's roles.

Plugins that suppress all WordPress admin notices can also hide the preview
banner and its picker. **Exit preview** remains available in the WordPress
toolbar to return to the ordinary menu.

## Editing on a phone

The toolbar uses touch-sized controls in portrait and landscape. Tapping a menu
item selects it without opening the keyboard; tap its name field to rename it.
Visibility, the icon picker, Preview and Visibility groups open in dialogs that
fit their content and scroll when needed. Use the header close icon to dismiss
them; tapping the page behind leaves them open. Opening a dialog focuses Close
instead of a text field. Tap a search or name field when ready to type. The
header stays outside the scrolling body as the dialog follows the space above
the keyboard. Width-only Menu width controls appear only at desktop widths.

## Visibility Is Not Access Control

Role visibility only declutters the menu. It does not prevent access to the
underlying admin page.

WordPress protects admin pages with capabilities registered by WordPress core,
themes, and plugins. If a user has the required capability and knows the URL,
that page can still load even when its menu item is hidden.

For real access control, pair Maestro with a capability manager such
as [User Role Editor](https://wordpress.org/plugins/user-role-editor/) or
[PublishPress Capabilities](https://wordpress.org/plugins/capability-manager-enhanced/).

## Widen The Menu

Renaming creates its own problem: WordPress's admin menu is 160px wide, so a
longer label wraps onto two lines. Maestro can widen the menu to fit.

- **Drag the menu's edge.** In edit mode, a handle runs down the right edge of
  the menu. Drag it and the menu resizes under your pointer.
- **Or set an exact width.** Choose **Menu settings** (the gear in the toolbar's
  right zone) and use the **Menu width** slider or number field. The menu
  previews each change as you make it.
- **With the keyboard,** focus the edge handle and use the arrow keys (`Shift`
  for bigger steps, `Home` for the WordPress default, `End` for the widest
  setting), or use the slider and number field in **Menu settings**.

The width is a global setting, like everything else in Maestro: it applies on
every admin page, for everyone, not only while you are editing. It goes from
160px (the WordPress default) to 320px and applies on screens 961px and wider.
Below that, WordPress folds the menu to icons or turns it into an overlay, and
the width does not apply, so the edge handle and **Menu settings** are not
shown there. Folding still works at any width.

If another plugin already sets the menu width, that plugin wins. **Menu
settings** tells you when this happens, so a value that has no effect never
looks like it does.

To go back to WordPress's width, choose **Use default** in **Menu settings**.
**Reset this item** never changes the width. **Reset all** does, because it
returns everything to WordPress's defaults.

## Language Support

Maestro is translation-ready with the `maestro` text
domain. The plugin ships a translation template plus starter language packs for
Spanish (`es_ES`), German (`de_DE`), Japanese (`ja`), French (`fr_FR`),
Portuguese (Brazil) (`pt_BR`), and Italian (`it_IT`). These catalogs cover the
admin-bar toggle, editor buttons, picker labels, save status messages, and reset
prompts. WordPress.org language packs can still override and extend the bundled
translations; native-speaker and WordPress Polyglots review is welcome.

## Seeing What You Changed

In edit mode, any item that differs from its WordPress default shows a small
bullet indicator (•) on its row. The indicator uses a visible glyph plus
screen-reader text, so it is perceivable without relying on color alone.

The indicator refreshes live as you make and undo changes: it appears the
moment you commit a rename, change an icon, or toggle a visibility role, and
it disappears when you reset that item.

## Resetting One Item

Use **Reset this item** in the controls panel to remove customizations for the
currently selected item. The button is visible whenever an item is selected and
is highlighted when the item has been modified.

To reset with the keyboard: select the item, then `Tab` to the **Reset this
item** button and press `Enter` or `Space`. The modified indicator will clear
and the item's overrides will be removed from the saved configuration.

## Resetting Everything

Use **Reset all** to delete the saved Maestro configuration and return
the menu to the defaults generated by WordPress and active plugins.

Because the plugin stores sparse deltas instead of a rebuilt menu, reset is safe:
when the saved option is removed, the natural menu returns automatically.
