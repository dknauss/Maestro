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

		/*
		 * UX-11: in the Site Editor there is nothing to edit in place — it is
		 * permanently fullscreen with no way to reveal #adminmenu. Hiding the
		 * toggle there (which the .is-fullscreen-mode rule would otherwise do)
		 * would leave those users no route to menu editing at all. So it stays,
		 * and takes them to the Dashboard already in edit mode.
		 *
		 * The Post Editor is deliberately NOT treated this way: fullscreen is a
		 * preference there, so the menu is one toggle away and hiding costs the
		 * user nothing.
		 */
		$offsite = is_site_editor_screen();

		if ( $offsite ) {
			$href = add_query_arg( 'maestro_edit', '1', admin_url( 'index.php' ) );
		} else {
			// Toggle target: current URL with maestro_edit added or removed.
			$current = remove_query_arg( 'maestro_edit' );
			$href    = $editing ? $current : add_query_arg( 'maestro_edit', '1', $current );
		}

		// Edit mode cannot be active in the Site Editor, so it always offers to
		// enter, never to exit.
		$show_exit = $editing && ! $offsite;

		$meta = array(
			'title' => $show_exit
				? esc_attr__( 'Exit Menu Editor', 'maestro-menu-editor' )
				: ( $offsite
					? esc_attr__( 'Edit Admin Menu on the Dashboard', 'maestro-menu-editor' )
					: esc_attr__( 'Edit Admin Menu', 'maestro-menu-editor' ) ),
		);

		if ( $offsite ) {
			// Exempts this variant from the .is-fullscreen-mode hide in
			// assets/maestro-admin-bar.css.
			$meta['class'] = 'maestro-toggle-offsite';
		}

		$bar->add_node(
			array(
				'id'    => 'maestro-toggle',
				'title' => $show_exit
					? '<span class="ab-icon dashicons dashicons-exit" style="margin-top:2px;"></span><span class="maestro-ab-label">' . esc_html__( 'Exit Menu Editor', 'maestro-menu-editor' ) . '</span>'
					: '<span class="ab-icon dashicons dashicons-edit" style="margin-top:2px;"></span><span class="maestro-ab-label">' . esc_html__( 'Edit Menu', 'maestro-menu-editor' ) . '</span>',
				'href'  => esc_url( $href ),
				'meta'  => $meta,
			)
		);
	}
}
