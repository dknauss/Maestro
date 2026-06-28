<?php
/**
 * Effective top-level ORDER probe for SURV-01 (the top-level-reorder exception).
 *
 * Maestro's Replay applies top-level order through the `custom_menu_order` +
 * `menu_order` filters at render time, NOT in the admin_menu replay pass — so a
 * raw $menu dump does not reflect it. This probe reproduces the render-time order
 * resolution: it hooks admin_menu @ PHP_INT_MAX (after Maestro's own replay has
 * registered its filters), then applies the SAME core pipeline WP uses
 * (custom_menu_order gate + menu_order filter over the top-level slugs), and
 * prints the resulting effective order. It exits before wp-admin/menu.php's
 * privilege filtering (which wp_die()s under WP-CLI).
 *
 * Usage (from tests/compat), with maestro_config set to the desired top_order:
 *   npx wp-env run cli -- php -d memory_limit=512M /usr/local/bin/wp \
 *     --exec="define('WP_ADMIN', true);" \
 *     eval-file wp-content/plugins/maestro-menu-editor/.planning/compat/SURV-01-assets/reorder-probe.php \
 *     --user=admin
 */

global $menu, $submenu;

add_action(
	'admin_menu',
	function () {
		global $menu;

		$slugs = array();
		foreach ( (array) $menu as $row ) {
			if ( ! empty( $row[2] ) ) {
				$slugs[] = $row[2];
			}
		}

		// Reproduce core's render-time decision: only reorder if a plugin claims
		// custom_menu_order, then run the menu_order filter (Maestro hooks both).
		$custom = apply_filters( 'custom_menu_order', false );
		$order  = $custom ? apply_filters( 'menu_order', $slugs ) : $slugs;

		echo 'custom_menu_order claimed: ' . ( $custom ? 'YES' : 'no' ) . "\n";
		echo "EFFECTIVE top-level order:\n";
		foreach ( $order as $i => $s ) {
			echo "$i\t$s\n";
		}
		exit;
	},
	PHP_INT_MAX - 1 // Just before nothing else; Maestro registers its filters in its constructor, already active.
);

$GLOBALS['pagenow'] = 'index.php';
require_once ABSPATH . 'wp-admin/includes/admin.php';
require ABSPATH . 'wp-admin/menu.php';
