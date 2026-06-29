<?php
/**
 * Natural-state $menu / $submenu dump for the Yoast SEO compat survey (SURV-03).
 *
 * Reproduces the menu exactly as Maestro's Replay::replay() sees it: hooks
 * `admin_menu` at PHP_INT_MAX (the same priority Maestro uses) and dumps the
 * globals BEFORE WordPress's per-user privilege filtering in
 * wp-admin/includes/menu.php runs (we exit first to avoid that filtering's
 * CLI-incompatible wp_die()). Run with maestro_config deleted for the natural
 * (pre-override) baseline.
 *
 * Usage (from tests/compat):
 *   npx wp-env run cli -- php -d memory_limit=512M /usr/local/bin/wp \
 *     --exec="define('WP_ADMIN', true);" \
 *     eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-03-assets/dump-menu.php \
 *     --user=<admin|compat_editor|compat_shop_manager>
 *
 * IMPORTANT — the --exec="define('WP_ADMIN', true);" is REQUIRED. Without it
 * is_admin() is false, so Yoast SEO's menu registration (which is gated on
 * admin-context init paths) may not fire, producing a silently incomplete dump.
 * --exec runs before WP bootstraps, so the constant is set in time for the
 * admin-only init paths to fire.
 *
 * NOTE: the .planning tree is inside the repo, which is mapped into the
 * container at wp-content/plugins/maestro-menu-editor, so eval-file can reach it.
 */

global $menu, $submenu; // Bind to the real globals before wp-admin/menu.php assigns to them.

add_action(
	'admin_menu',
	function () {
		global $menu, $submenu;

		echo "===== TOP-LEVEL \$menu (count: " . count( (array) $menu ) . ") =====\n";
		echo "pos\tslug\ttitle\ticon\tcss\n";
		foreach ( (array) $menu as $pos => $row ) {
			printf(
				"%s\t%s\t%s\t%s\t%s\n",
				$pos,
				$row[2] ?? '',
				str_replace( "\n", ' ', (string) ( $row[0] ?? '' ) ),
				$row[6] ?? '',
				$row[4] ?? ''
			);
		}

		echo "\n===== \$submenu (parent => children) =====\n";
		foreach ( (array) $submenu as $parent => $children ) {
			echo "PARENT: {$parent}\n";
			foreach ( (array) $children as $pos => $row ) {
				printf(
					"   %s\t%s\t%s\t%s\n",
					$pos,
					$row[2] ?? '',
					str_replace( "\n", ' ', (string) ( $row[0] ?? '' ) ),
					$row[1] ?? ''
				);
			}
		}

		exit; // Stop before includes/menu.php privilege filtering (CLI wp_die()).
	},
	PHP_INT_MAX
);

$GLOBALS['pagenow'] = 'index.php';
require_once ABSPATH . 'wp-admin/includes/admin.php';
require ABSPATH . 'wp-admin/menu.php';
