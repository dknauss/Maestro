<?php
/**
 * Maestro E2E fixture: shared-slug CPT (test-only, gated).
 *
 * Registers a custom post type whose admin menu top-level item and its
 * default "All Widgets" submenu item render the SAME slug
 * (edit.php?post_type=maestro_e2e_widget) — WordPress core's native
 * self-link convention for post-type menus. This is the exact shape
 * COMPAT-04 targets (the WooCommerce Products top-level + "All Products"
 * submenu collision), reproduced here without depending on any real
 * third-party plugin so tests/e2e/specs/shared-slug.spec.ts can run in the
 * plain (non-compat) wp-env used by `npm run test:e2e`.
 *
 * Gated behind the `maestro_e2e_shared_slug` option so this mu-plugin (always
 * loaded) never affects any other e2e spec's menu shape unless a spec
 * explicitly turns the option on.
 *
 * @package Maestro
 */

add_action(
	'init',
	function () {
		if ( ! get_option( 'maestro_e2e_shared_slug' ) ) {
			return;
		}

		register_post_type(
			'maestro_e2e_widget',
			array(
				'label'        => 'Widgets',
				'labels'       => array(
					'name'      => 'Widgets',
					'all_items' => 'All Widgets',
				),
				'public'       => true,
				'show_in_menu' => true,
				'supports'     => array( 'title' ),
			)
		);
	}
);
