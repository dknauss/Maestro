<?php
/**
 * Asset loader. Enqueues the editor only in edit mode, only for capable users,
 * and hands the JS everything it needs in one localized blob so it never has to
 * guess: the REST endpoint + nonce, the role list, a curated dashicon set, the
 * current saved config, the effective menu model (with DOM ids), and the
 * pristine defaults for per-item reset.
 *
 * @package AdminMenuCustomizer
 */

namespace AMX;

defined( 'ABSPATH' ) || exit;

class Assets {

	/**
	 * @var Config
	 */
	private $config;

	/**
	 * @var Replay
	 */
	private $replay;

	/**
	 * @param Config $config Shared config.
	 * @param Replay $replay Shared replay engine (for pristine + model).
	 */
	public function __construct( Config $config, Replay $replay ) {
		$this->config = $config;
		$this->replay = $replay;
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * @return void
	 */
	public function enqueue() {
		if ( ! is_edit_mode() ) {
			return;
		}

		wp_enqueue_style(
			'amx-edit',
			AMX_URL . 'assets/amx-edit.css',
			array(),
			AMX_VERSION
		);

		// jquery-ui-sortable is registered in wp-admin out of the box.
		wp_enqueue_script(
			'amx-edit',
			AMX_URL . 'assets/amx-edit.js',
			array( 'jquery', 'jquery-ui-sortable', 'wp-i18n' ),
			AMX_VERSION,
			true
		);

		wp_localize_script(
			'amx-edit',
			'amxData',
			array(
				'restUrl'   => esc_url_raw( rest_url( Rest::NS . '/config' ) ),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'exitUrl'   => esc_url_raw( remove_query_arg( 'amx_edit' ) ),
				'roles'     => wp_roles()->get_names(),
				'iconSets'  => $this->icon_sets(),
				'config'    => $this->config->get(),
				'menu'      => $this->replay->get_menu_model(),
				'pristine'  => $this->replay->get_pristine(),
				'i18n'      => array(
					'idle'       => __( 'Editor active — click an item to edit.', 'amx-inline-menu-editor' ),
					'saving'     => __( 'Saving…', 'amx-inline-menu-editor' ),
					'saved'      => __( 'Saved ✓', 'amx-inline-menu-editor' ),
					'saveError'  => __( 'Save failed. Retrying on next change.', 'amx-inline-menu-editor' ),
					'rename'     => __( 'Title', 'amx-inline-menu-editor' ),
					'icon'       => __( 'Icon', 'amx-inline-menu-editor' ),
					'iconDialog' => __( 'Choose an icon', 'amx-inline-menu-editor' ),
					'iconSearch' => __( 'Search icons', 'amx-inline-menu-editor' ),
					'iconNone'   => __( 'No icon', 'amx-inline-menu-editor' ),
					'iconNoneHint' => __( 'Remove the icon (uses the menu default).', 'amx-inline-menu-editor' ),
					'visibility' => __( 'Visibility', 'amx-inline-menu-editor' ),
					'resetItem'  => __( 'Reset this item', 'amx-inline-menu-editor' ),
					'resetAll'   => __( 'Reset all', 'amx-inline-menu-editor' ),
					'exit'       => __( 'Exit', 'amx-inline-menu-editor' ),
					'hideFrom'   => __( 'Hide from these roles:', 'amx-inline-menu-editor' ),
					'confirmAll' => __( 'Reset ALL menu customizations to WordPress defaults? This cannot be undone.', 'amx-inline-menu-editor' ),
					'drag'       => __( 'Drag to reorder', 'amx-inline-menu-editor' ),
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
		$bootstrap = require AMX_DIR . 'includes/icons-bootstrap.php';
		$bi        = array();
		foreach ( $bootstrap as $id => $src ) {
			$bi[] = array(
				'id'    => $src,                                  // stored value = the data-URI
				'src'   => $src,                                  // preview source
				'label' => ucwords( str_replace( array( 'bi-', '-' ), array( '', ' ' ), $id ) ),
			);
		}

		return array(
			array(
				'id'    => 'dashicons',
				'label' => __( 'Dashicons', 'amx-inline-menu-editor' ),
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
				'label' => __( 'Bootstrap', 'amx-inline-menu-editor' ),
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
			'dashicons-admin-home', 'dashicons-admin-site', 'dashicons-dashboard',
			'dashicons-admin-post', 'dashicons-admin-media', 'dashicons-admin-links',
			'dashicons-admin-page', 'dashicons-admin-comments', 'dashicons-admin-appearance',
			'dashicons-admin-plugins', 'dashicons-admin-users', 'dashicons-admin-tools',
			'dashicons-admin-settings', 'dashicons-admin-network', 'dashicons-admin-generic',
			'dashicons-admin-collapse', 'dashicons-welcome-write-blog', 'dashicons-welcome-view-site',
			'dashicons-format-image', 'dashicons-format-gallery', 'dashicons-format-video',
			'dashicons-format-audio', 'dashicons-camera', 'dashicons-images-alt',
			'dashicons-media-document', 'dashicons-media-spreadsheet', 'dashicons-media-code',
			'dashicons-chart-bar', 'dashicons-chart-pie', 'dashicons-chart-line',
			'dashicons-calendar-alt', 'dashicons-clock', 'dashicons-location',
			'dashicons-products', 'dashicons-cart', 'dashicons-money-alt',
			'dashicons-store', 'dashicons-megaphone', 'dashicons-email-alt',
			'dashicons-groups', 'dashicons-businessperson', 'dashicons-id',
			'dashicons-shield', 'dashicons-lock', 'dashicons-privacy',
			'dashicons-database', 'dashicons-cloud', 'dashicons-rss',
			'dashicons-book', 'dashicons-archive', 'dashicons-tag',
			'dashicons-category', 'dashicons-portfolio', 'dashicons-layout',
			'dashicons-screenoptions', 'dashicons-tickets-alt', 'dashicons-star-filled',
		);
	}
}
