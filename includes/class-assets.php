<?php
/**
 * Asset loader. Enqueues the editor only in edit mode, only for capable users,
 * and hands the JS everything it needs in one localized blob so it never has to
 * guess: the REST endpoint + nonce, the role list, a curated dashicon set, the
 * current saved config, the effective menu model (with DOM ids), and the
 * pristine defaults for per-item reset.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Asset loader — enqueues the editor JS/CSS and passes all runtime data to JS.
 *
 * @package Maestro
 */
class Assets {

	/**
	 * Shared config instance.
	 *
	 * @var Config
	 */
	private $config;

	/**
	 * Shared replay engine, used to obtain the menu model and pristine snapshot.
	 *
	 * @var Replay
	 */
	private $replay;

	/**
	 * Store dependencies and register the enqueue hook.
	 *
	 * @param Config $config Shared config.
	 * @param Replay $replay Shared replay engine (for pristine + model).
	 */
	public function __construct( Config $config, Replay $replay ) {
		$this->config = $config;
		$this->replay = $replay;
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Enqueue the editor script and stylesheet, and pass runtime data to JS.
	 *
	 * @return void
	 */
	public function enqueue() {
		if ( ! is_edit_mode() ) {
			return;
		}

		wp_enqueue_style(
			'maestro',
			MAESTRO_URL . 'assets/maestro.css',
			array(),
			MAESTRO_VERSION
		);

		// jquery-ui-sortable is registered in wp-admin out of the box.
		wp_enqueue_script(
			'maestro',
			MAESTRO_URL . 'assets/maestro.js',
			array( 'jquery', 'jquery-ui-sortable', 'wp-a11y', 'wp-i18n' ),
			MAESTRO_VERSION,
			true
		);

		wp_localize_script(
			'maestro',
			'maestroData',
			array(
				'restUrl'  => esc_url_raw( rest_url( Rest::NS . '/config' ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'exitUrl'  => esc_url_raw( remove_query_arg( 'maestro_edit' ) ),
				'roles'    => wp_roles()->get_names(),
				'iconSets' => $this->icon_sets(),
				'config'   => $this->config->get(),
				'menu'     => $this->replay->get_menu_model(),
				'pristine' => $this->replay->get_pristine(),
				'i18n'     => array(
					'idle'         => __( 'Editor active — click an item to edit.', 'maestro-menu-editor' ),
					'saving'       => __( 'Saving…', 'maestro-menu-editor' ),
					'saved'        => __( 'Saved ✓', 'maestro-menu-editor' ),
					'saveError'    => __( 'Save failed. Retrying on next change.', 'maestro-menu-editor' ),
					'rename'       => __( 'Title', 'maestro-menu-editor' ),
					'icon'         => __( 'Icon', 'maestro-menu-editor' ),
					'iconDialog'   => __( 'Choose an icon', 'maestro-menu-editor' ),
					'iconSearch'   => __( 'Search icons', 'maestro-menu-editor' ),
					'iconNone'     => __( 'No icon', 'maestro-menu-editor' ),
					'iconNoneHint' => __( 'Remove the icon (uses the menu default).', 'maestro-menu-editor' ),
					'visibility'   => __( 'Visibility', 'maestro-menu-editor' ),
					'resetItem'    => __( 'Reset this item', 'maestro-menu-editor' ),
					'resetAll'     => __( 'Reset all', 'maestro-menu-editor' ),
					'exit'         => __( 'Exit', 'maestro-menu-editor' ),
					'hideFrom'     => __( 'Hide from these roles:', 'maestro-menu-editor' ),
					'confirmAll'   => __( 'Reset ALL menu customizations to WordPress defaults? This cannot be undone.', 'maestro-menu-editor' ),
					'drag'         => __( 'Drag to reorder', 'maestro-menu-editor' ),
				),
			)
		);
	}

	/**
	 * Icon sets for the picker. Each set declares how its cells render:
	 *   - 'class' : the icon id IS a CSS class (dashicons), rendered as a glyph.
	 *   - 'data'  : the icon id maps to a base64 data-URI image src.
	 * The stored value is the icon id for a class set, or the data-URI for a data
	 * set — both pass Config::sanitize_icon(). The picker is presentational; the
	 * validator (not this list) is the authority on what may be saved.
	 *
	 * @return array
	 */
	private function icon_sets() {
		$bootstrap = require MAESTRO_DIR . 'includes/icons-bootstrap.php';
		$bi        = array();
		foreach ( $bootstrap as $id => $src ) {
			$bi[] = array(
				'id'    => $src,  // Stored value is the data-URI.
				'src'   => $src,  // Preview source.
				'label' => ucwords( str_replace( array( 'bi-', '-' ), array( '', ' ' ), $id ) ),
			);
		}

		return array(
			array(
				'id'    => 'dashicons',
				'label' => __( 'Dashicons', 'maestro-menu-editor' ),
				'type'  => 'class',
				'icons' => array_map(
					function ( $cls ) {
						return array(
							'id'    => $cls,
							'class' => $cls,
							'label' => ucwords( str_replace( array( 'dashicons-', '-' ), array( '', ' ' ), $cls ) ),
						);
					},
					$this->dashicon_set()
				),
			),
			array(
				'id'    => 'bootstrap',
				'label' => __( 'Bootstrap', 'maestro-menu-editor' ),
				'type'  => 'data',
				'icons' => $bi,
			),
		);
	}

	/**
	 * A curated, working set of dashicons for the picker. Not exhaustive — the
	 * config validator accepts any well-formed dashicons-* class, so this list
	 * can be extended freely.
	 *
	 * @return string[]
	 */
	private function dashicon_set() {
		return array(
			'dashicons-admin-home',
			'dashicons-admin-site',
			'dashicons-dashboard',
			'dashicons-admin-post',
			'dashicons-admin-media',
			'dashicons-admin-links',
			'dashicons-admin-page',
			'dashicons-admin-comments',
			'dashicons-admin-appearance',
			'dashicons-admin-plugins',
			'dashicons-admin-users',
			'dashicons-admin-tools',
			'dashicons-admin-settings',
			'dashicons-admin-network',
			'dashicons-admin-generic',
			'dashicons-admin-collapse',
			'dashicons-welcome-write-blog',
			'dashicons-welcome-view-site',
			'dashicons-format-image',
			'dashicons-format-gallery',
			'dashicons-format-video',
			'dashicons-format-audio',
			'dashicons-camera',
			'dashicons-images-alt',
			'dashicons-media-document',
			'dashicons-media-spreadsheet',
			'dashicons-media-code',
			'dashicons-chart-bar',
			'dashicons-chart-pie',
			'dashicons-chart-line',
			'dashicons-calendar-alt',
			'dashicons-clock',
			'dashicons-location',
			'dashicons-products',
			'dashicons-cart',
			'dashicons-money-alt',
			'dashicons-store',
			'dashicons-megaphone',
			'dashicons-email-alt',
			'dashicons-groups',
			'dashicons-businessperson',
			'dashicons-id',
			'dashicons-shield',
			'dashicons-lock',
			'dashicons-privacy',
			'dashicons-database',
			'dashicons-cloud',
			'dashicons-rss',
			'dashicons-book',
			'dashicons-archive',
			'dashicons-tag',
			'dashicons-category',
			'dashicons-portfolio',
			'dashicons-layout',
			'dashicons-screenoptions',
			'dashicons-tickets-alt',
			'dashicons-star-filled',
		);
	}
}
