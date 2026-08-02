<?php
/**
 * COMPAT-10 e2e proof helper: dump the LIVE `$submenu['edit.php']` child slugs
 * for a given wp-cli `--user`, AFTER Maestro's `Replay::replay()` has applied
 * that user's effective hide/cascade rules to the real, saved plugin config.
 *
 * Reuses the exact `admin_menu` @ `PHP_INT_MAX` dump technique the R1 compat
 * surveys established (see `.planning/compat/SURV-01-assets/dump-menu.php`):
 * hooking the SAME action and priority `Replay::replay()` uses so this
 * callback runs AFTER it (same-priority callbacks run in registration order;
 * Maestro's own hook is registered at plugin-load time, earlier than this
 * eval-file's top-level code), then exiting before
 * `wp-admin/includes/menu.php`'s own privilege-stripping pass (which
 * `wp_die()`s under WP-CLI).
 *
 * This is genuinely end-to-end: it inspects the REAL PHP globals produced by
 * the REAL plugin code against whatever config the BROWSER actually saved via
 * the REST endpoint — not a re-assertion of the already-covered
 * ReplayTest.php PHPUnit contract (which calls Config::save() directly, never
 * through the live save-then-replay round trip a Playwright click exercises).
 *
 * The 20-06 plan text ("assert via reloaded model / replay state" as an
 * accepted alternative to viewing the sidebar as that role) licenses this
 * approach: hiding a TOP-LEVEL parent already `unset()`s its own $menu row,
 * which — per WordPress core's `_wp_menu_output()` (wp-admin/menu-header.php)
 * — means the entire dropdown (parent + every nested child) stops being
 * *rendered* the moment the parent's own row is hidden, cascade flag or not.
 * That structural fact makes the sidebar HTML unable to distinguish
 * cascade-off from cascade-on once the parent is ALSO hidden for that role
 * (both produce zero visible rows). The actual difference cascade makes lives
 * one level down, in the `$submenu` array's OWN CONTENTS at replay time —
 * exactly what this script observes, and exactly what `ReplayTest.php`
 * already unit/integration-proves in isolation. Dumping it here proves the
 * SAME contract end-to-end through the real save pipeline.
 *
 * Usage (see cascade-hide.spec.ts):
 *   wp --exec="define('WP_ADMIN', true);" eval-file \
 *     wp-content/plugins/maestro-menu-editor/tests/e2e/fixtures/dump-cascade-submenu.php \
 *     --user=<id|login>
 *
 * Prints one child slug per line for $submenu['edit.php'] as it exists after
 * replay() has run for that user. Empty output means every child was hidden.
 */

global $menu, $submenu; // Bind to the real globals before wp-admin/menu.php assigns to them.

add_action(
	'admin_menu',
	function () {
		global $submenu;
		foreach ( (array) ( $submenu['edit.php'] ?? array() ) as $row ) {
			echo ( $row[2] ?? '' ) . "\n";
		}
		exit; // Stop before includes/menu.php privilege filtering (CLI wp_die()).
	},
	PHP_INT_MAX
);

$GLOBALS['pagenow'] = 'index.php';
require_once ABSPATH . 'wp-admin/includes/admin.php';
require ABSPATH . 'wp-admin/menu.php';
