<?php
/**
 * Warn in edit mode when another admin-menu editor is active.
 *
 * Plugins like Admin Menu Editor rebuild $menu from their own saved settings,
 * so the two editors can fight over order, titles, icons and visibility. Each
 * one's changes can then look ignored. Maestro cannot tell which of the other
 * plugin's settings are in force, so it names the plugin and leaves the call to
 * the user.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Edit-mode admin notice for a conflicting menu editor.
 */
class Conflict_Notice {

	/**
	 * Hook the notice.
	 */
	public function __construct() {
		add_action( 'admin_notices', array( $this, 'render' ) );
	}

	/**
	 * Known menu editors, as a main class => display name map. Filterable so a
	 * site can add another editor, or silence one it has made to coexist.
	 *
	 * @return array<string,string>
	 */
	public static function known() {
		return (array) apply_filters(
			'maestro_menu_editor_conflicts',
			array(
				'WPMenuEditor' => 'Admin Menu Editor', // Free and Pro share this core class.
			)
		);
	}

	/**
	 * Print the notice when a known editor is loaded. Only while editing, and
	 * only where the editor actually runs (it does not on the post editor).
	 */
	public function render() {
		if ( ! is_edit_mode() || is_post_editor_screen() ) {
			return;
		}

		foreach ( self::known() as $class => $label ) {
			if ( ! class_exists( $class, false ) ) {
				continue;
			}

			wp_admin_notice(
				sprintf(
					/* translators: %s: name of another admin-menu editor plugin, e.g. "Admin Menu Editor". */
					esc_html__( '%s is also active. It rebuilds the admin menu too, so its settings can override or hide the changes you make here.', 'maestro-menu-editor' ),
					'<strong>' . esc_html( $label ) . '</strong>'
				),
				array(
					'type'        => 'warning',
					'dismissible' => true,
				)
			);
		}
	}
}
