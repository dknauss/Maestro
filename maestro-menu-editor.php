<?php
/**
 * Plugin Name:       Maestro: The Inline Admin Menu Editor
 * Plugin URI:        https://github.com/dknauss/Maestro/
 * Description:        In-place editing of the WordPress admin menu — rename items, reorder them, swap top-level icons, and hide items per role. Cosmetic only: hiding declutters, it does not lock access.
 * Version:           1.5.3
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

define( 'MAESTRO_VERSION', '1.5.3' );
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
 * Is the current screen the Site Editor?
 *
 * The Site Editor is the one admin screen where #adminmenu can never be
 * reached: it is permanently fullscreen and, unlike the Post Editor, offers no
 * fullscreen control to turn off (verified on 7.1-RC4 — forcing every
 * fullscreen preference to false leaves it fullscreen). Editing in place is
 * therefore impossible there, which is why the toggle points elsewhere instead
 * of being a dead end.
 *
 * Unlike fullscreen itself, this IS knowable server-side: it is a screen id,
 * not a client-side preference.
 *
 * @return bool
 */
function is_site_editor_screen() {
	if ( ! function_exists( 'get_current_screen' ) ) {
		return false;
	}

	$screen = get_current_screen();

	return $screen instanceof \WP_Screen && 'site-editor' === $screen->id;
}

/**
 * Is the current screen a block editor (Post Editor, Site Editor, or any other)?
 *
 * Used only to decide whether the entry guard is worth loading. Unlike
 * fullscreen — which core stamps unconditionally and resolves during hydration —
 * this is answerable server-side.
 *
 * @return bool
 */
function is_block_editor_screen() {
	if ( ! function_exists( 'get_current_screen' ) ) {
		return false;
	}

	$screen = get_current_screen();

	return $screen instanceof \WP_Screen && $screen->is_block_editor();
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
