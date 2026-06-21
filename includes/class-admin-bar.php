<?php
/**
 * The edit-mode toggle.
 *
 * Deliberately hung off the admin bar, NOT the admin menu — it would be absurd
 * (and fragile) for the toggle to live inside the very menu it rearranges and
 * can hide. The toggle just flips a URL param; nothing is persisted.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the edit-mode toggle node in the WordPress admin bar.
 *
 * @package Maestro
 */
class Admin_Bar {

	/**
	 * Register the admin-bar hook.
	 */
	public function __construct() {
		add_action( 'admin_bar_menu', array( $this, 'node' ), 100 );
	}

	/**
	 * Add the toggle node.
	 *
	 * @param \WP_Admin_Bar $bar Admin bar instance.
	 * @return void
	 */
	public function node( $bar ) {
		if ( ! is_admin() || ! current_user_can( capability() ) ) {
			return;
		}

		$editing = is_edit_mode();

		// Toggle target: current URL with maestro_edit added or removed.
		$current = remove_query_arg( 'maestro_edit' );
		$href    = $editing ? $current : add_query_arg( 'maestro_edit', '1', $current );

		$bar->add_node(
			array(
				'id'    => 'maestro-toggle',
				'title' => $editing
					? '<span class="ab-icon dashicons dashicons-exit" style="margin-top:2px;"></span><span class="maestro-ab-label">' . esc_html__( 'Exit', 'maestro-menu-editor' ) . '</span>'
					: '<span class="ab-icon dashicons dashicons-edit" style="margin-top:2px;"></span><span class="maestro-ab-label">' . esc_html__( 'Edit Menu', 'maestro-menu-editor' ) . '</span>',
				'href'  => esc_url( $href ),
				'meta'  => array(
					'title' => $editing
						? esc_attr__( 'Exit Editor', 'maestro-menu-editor' )
						: esc_attr__( 'Edit Admin Menu', 'maestro-menu-editor' ),
				),
			)
		);
	}
}
