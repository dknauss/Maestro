<?php
/**
 * Gated e2e fixture (COMPAT-10, 20-06): registers ONE childless top-level menu
 * item so the cascade-hide "also hide children" checkbox's "absent on a
 * childless item" gating rule (20-CONTEXT.md) has something real to assert
 * against. Every native WP core top-level item (Dashboard, Posts, Media,
 * Comments, ...) always registers at least one submenu row (see
 * wp-admin/menu.php) — there is no naturally childless item on a vanilla
 * install.
 *
 * Gated behind the `maestro_e2e_childless` option so it never affects any
 * other spec's menu shape; only cascade-hide.spec.ts turns the option on.
 * Mirrors the gating pattern established by
 * tests/e2e/fixtures/maestro-e2e-shared-slug.php (20-03).
 */

add_action(
	'admin_menu',
	function () {
		if ( ! get_option( 'maestro_e2e_childless' ) ) {
			return;
		}

		add_menu_page(
			'E2E Childless',
			'E2E Childless',
			'read',
			'maestro-e2e-childless',
			function () {
				echo '<div class="wrap"><h1>E2E Childless</h1></div>';
			},
			'dashicons-marker',
			99
		);
	}
);
