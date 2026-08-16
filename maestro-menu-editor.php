<?php
/**
 * Plugin Name:       Maestro: The Inline Admin Menu Editor
 * Plugin URI:        https://github.com/dknauss/Maestro/
 * Description:        In-place editing of the WordPress admin menu — rename items, reorder them, swap top-level icons, and hide items per role. Cosmetic only: hiding declutters, it does not lock access.
 * Version:           1.3.1
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Dan Knauss
 * Author URI:        https://dan.knauss.ca/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       maestro-menu-editor
 * Domain Path:       /languages
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

define( 'MAESTRO_VERSION', '1.3.1' );
define( 'MAESTRO_FILE', __FILE__ );
define( 'MAESTRO_DIR', plugin_dir_path( __FILE__ ) );
define( 'MAESTRO_URL', plugin_dir_url( __FILE__ ) );
define( 'MAESTRO_OPTION', 'maestro_config' );

require_once MAESTRO_DIR . 'includes/class-config.php';
require_once MAESTRO_DIR . 'includes/class-slug.php';
require_once MAESTRO_DIR . 'includes/class-ordering.php';
require_once MAESTRO_DIR . 'includes/class-title.php';
require_once MAESTRO_DIR . 'includes/class-cascade.php';
require_once MAESTRO_DIR . 'includes/class-replay.php';
require_once MAESTRO_DIR . 'includes/class-rest.php';
require_once MAESTRO_DIR . 'includes/class-admin-bar.php';
require_once MAESTRO_DIR . 'includes/class-assets.php';

/**
 * The capability required to edit the menu. Filterable so a role/cap manager
 * can hand this to a custom cap (e.g. 'maestro_edit_menu') instead of the default.
 *
 * @return string
 */
function capability() {
	return (string) apply_filters( 'maestro_capability', 'manage_options' );
}

/**
 * Are we currently in edit mode? Gated on capability so the flag alone is inert
 * for anyone who can't edit. Edit mode is driven by a URL param — stateless,
 * nothing persisted, nothing to clean up.
 *
 * @return bool
 */
function is_edit_mode() {
	return isset( $_GET['maestro_edit'] ) && current_user_can( capability() ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
}

/**
 * Is the current screen the Post Editor or the Site Editor?
 *
 * Maestro has nothing to offer there: the admin menu is hidden behind the
 * editor's fullscreen chrome, so entering edit mode would bind sortables to an
 * invisible #adminmenu and float our toolbar over the block canvas. Before
 * WordPress 7.1 that was unreachable in practice — the Post Editor hid the
 * toolbar in fullscreen (the default) and the Site Editor never rendered one.
 * 7.1 shows the toolbar persistently in both, which is what exposes it.
 *
 * Called from admin_bar_menu and admin_enqueue_scripts, both of which run from
 * admin-header.php after set_current_screen(). A missing screen means we are
 * too early or outside a normal admin request; neither is an editor, so the
 * safe answer is false — the capability and edit-mode checks still apply.
 *
 * Both conditions are tested: is_block_editor() covers the Post Editor and any
 * other block-editor screen, and the id match covers the Site Editor, which
 * does not set that flag.
 *
 * @return bool
 */
function is_editor_screen() {
	if ( ! function_exists( 'get_current_screen' ) ) {
		return false;
	}

	$screen = get_current_screen();

	if ( ! $screen instanceof \WP_Screen ) {
		return false;
	}

	return $screen->is_block_editor() || 'site-editor' === $screen->id;
}

/**
 * Register bundled translations with WordPress' just-in-time loader.
 */
function register_translation_path() {
	global $l10n, $wp_textdomain_registry;

	if ( ! is_object( $wp_textdomain_registry ) || ! method_exists( $wp_textdomain_registry, 'set_custom_path' ) ) {
		return;
	}

	$wp_textdomain_registry->set_custom_path( 'maestro-menu-editor', MAESTRO_DIR . 'languages' );

	if ( isset( $l10n['maestro-menu-editor'] ) && $l10n['maestro-menu-editor'] instanceof \NOOP_Translations ) {
		unset( $l10n['maestro-menu-editor'] );
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_translation_path' );

/**
 * Boot the plugin. One Config instance is shared by everyone so the pristine
 * snapshot captured during the replay pass is reachable at asset-enqueue time.
 */
function boot() {
	$config = new Config();
	$replay = new Replay( $config );

	new Rest( $config );
	new Admin_Bar();
	new Assets( $config, $replay );
}
add_action( 'plugins_loaded', __NAMESPACE__ . '\\boot' );
