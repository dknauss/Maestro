<?php
/**
 * Plugin Name:       Admin Menu Maestro
 * Plugin URI:        https://newlocal.media/admin-menu-maestro
 * Description:        In-place editing of the WordPress admin menu — rename items, reorder them, swap top-level dashicons, and hide items per role. Global config, no separate settings screen. Cosmetic only: hiding declutters, it does not lock access.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Dan Knauss
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       admin-menu-maestro
 * Update URI:        false
 *
 * The unique slug + "Update URI: false" together prevent a similarly-named
 * plugin in the WordPress.org directory from silently overwriting this local
 * code on update (the "plugin confusion" risk). Do not change the slug to a
 * generic term without keeping Update URI set.
 *
 * @package AdminMenuMaestro
 */

namespace AdminMenuMaestro;

defined( 'ABSPATH' ) || exit;

define( 'ADMIN_MENU_MAESTRO_VERSION', '1.0.0' );
define( 'ADMIN_MENU_MAESTRO_FILE', __FILE__ );
define( 'ADMIN_MENU_MAESTRO_DIR', plugin_dir_path( __FILE__ ) );
define( 'ADMIN_MENU_MAESTRO_URL', plugin_dir_url( __FILE__ ) );
define( 'ADMIN_MENU_MAESTRO_OPTION', 'admin_menu_maestro' );

require_once ADMIN_MENU_MAESTRO_DIR . 'includes/class-config.php';
require_once ADMIN_MENU_MAESTRO_DIR . 'includes/class-ordering.php';
require_once ADMIN_MENU_MAESTRO_DIR . 'includes/class-replay.php';
require_once ADMIN_MENU_MAESTRO_DIR . 'includes/class-rest.php';
require_once ADMIN_MENU_MAESTRO_DIR . 'includes/class-admin-bar.php';
require_once ADMIN_MENU_MAESTRO_DIR . 'includes/class-assets.php';

/**
 * The capability required to edit the menu. Filterable so a role/cap manager
 * can hand this to a custom cap (e.g. 'amm_edit_menu') instead of the default.
 *
 * @return string
 */
function capability() {
	return (string) apply_filters( 'admin_menu_maestro_capability', 'manage_options' );
}

/**
 * Are we currently in edit mode? Gated on capability so the flag alone is inert
 * for anyone who can't edit. Edit mode is driven by a URL param — stateless,
 * nothing persisted, nothing to clean up.
 *
 * @return bool
 */
function is_edit_mode() {
	return isset( $_GET['amm_edit'] ) && current_user_can( capability() ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
}

/**
 * One-time migration from the pre-1.0 option key. Harmless if the legacy option
 * is absent. Runs before Config reads the new key.
 */
function migrate_legacy_option() {
	if ( false !== get_option( ADMIN_MENU_MAESTRO_OPTION, false ) ) {
		return; // already on the new key.
	}
	$legacy = get_option( 'amx_config', false );
	if ( false !== $legacy ) {
		update_option( ADMIN_MENU_MAESTRO_OPTION, $legacy, false );
		delete_option( 'amx_config' );
	}
}

/**
 * Boot the plugin. One Config instance is shared by everyone so the pristine
 * snapshot captured during the replay pass is reachable at asset-enqueue time.
 */
function boot() {
	migrate_legacy_option();
	$config = new Config();
	$replay = new Replay( $config );

	new Rest( $config );
	new Admin_Bar();
	new Assets( $config, $replay );
}
add_action( 'plugins_loaded', __NAMESPACE__ . '\\boot' );
