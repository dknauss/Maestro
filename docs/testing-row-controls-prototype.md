# Try the new menu editing controls

Maestro lets you edit the WordPress admin menu right where it sits: rename
items, reorder them, change icons and hide them from some people. We are
testing a new way to do that, and we would like your opinion.

**Open the test site:**
[Maestro prototype in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/proto/selected-row-controls/playground/blueprint-row-controls.json)

It runs in your browser. Nothing is installed, nothing you do affects a real
site, and it resets when you close the tab. It opens with the menu editor
already on. Allow a minute for it to load the first time.

## What is new

Today, when you pick a menu item, its controls appear in a toolbar along the
bottom of the screen. In this version they appear on the menu item itself:

- A row of buttons right under the item: **rename** (pencil), **move up**,
  **move down**, and **more** (⋯).
- **More** holds Visibility (who can see the item), Reset item and Add
  separator below.
- Once an item is picked, its **icon** becomes a button for choosing a new
  icon.
- On a phone, the More options stay in the bottom toolbar, because four buttons would not
  fit.

The bottom toolbar still holds the settings that apply to the whole menu.

## Things to try

Spend five or ten minutes on whichever of these you can. You don't need to do
them all.

1. **Rename an item.** Click a menu item, then the pencil. Type a new name and
   press Enter, or click somewhere else. Press Escape to cancel.
2. **Reorder.** Move an item with the up and down arrows. Then try dragging an
   item instead.
3. **Change an icon.** Pick a top-level item such as Posts, then click its icon.
4. **Hide an item.** Pick an item, open More, choose Visibility and tick a role.
5. **Add and remove a separator.** Open More and choose Add separator below.
   Then pick the new line and use its trash button.
6. **On a phone, held upright,** rename an item and move it.
7. **On a phone, held sideways,** rename an item. The name field should appear
   just above the keyboard.
8. **With the keyboard only,** use Tab to reach the menu. Press Enter on an
   item to pick it, then Tab through its buttons. Press Enter again (or F2) to
   rename it.
9. **Optional:** use a screen reader (VoiceOver, NVDA or TalkBack), or set your
   WordPress profile to a right-to-left language such as Arabic.

## What we want to hear

- Was it clear what each button does?
- Did anything get in your way, cover something up, or behave in a way you
  didn't expect?
- Does this feel better or worse than a toolbar along the bottom? Why?
- Your device, browser and screen size, if anything went wrong.
- A screenshot is very welcome.

## Where to send it

[Open a feedback issue on GitHub](https://github.com/dknauss/Maestro/issues/new?template=02-feature-request.yml&title=%5BRow%20controls%20prototype%5D%3A%20)
(a free GitHub account is needed). Fill in what you can; short notes are fine.
