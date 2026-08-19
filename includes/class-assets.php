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
		// Always-loaded: keep the editor ENTER/EXIT toggle reachable in the admin bar at <=782px,
		// regardless of edit mode (the heavy editor assets below stay edit-mode-gated). UX-08a.
		wp_enqueue_style(
			'maestro-admin-bar',
			MAESTRO_URL . 'assets/maestro-admin-bar.css',
			array( 'dashicons' ),
			MAESTRO_VERSION
		);

		if ( ! is_edit_mode() ) {
			/*
			 * UX-13: on block-editor screens the toggle navigates away from
			 * content that may be unsaved, which raises the browser's generic
			 * "Leave site?" prompt. This tiny script autosaves first.
			 *
			 * Scoped to block-editor screens and to NOT-editing, because that is
			 * the only case that leaves unsaved content behind — every other
			 * admin screen keeps the pre-existing zero-JS path.
			 */
			if ( is_block_editor_screen() ) {
				wp_enqueue_script(
					'maestro-entry',
					MAESTRO_URL . 'assets/maestro-entry.js',
					array( 'wp-data' ),
					MAESTRO_VERSION,
					true
				);
			}

			return;
		}

		wp_enqueue_style(
			'maestro',
			MAESTRO_URL . 'assets/maestro.css',
			array( 'dashicons' ),
			MAESTRO_VERSION
		);

		// Pure helpers consumed by maestro.js at runtime (no build step).
		wp_enqueue_script(
			'maestro-logic',
			MAESTRO_URL . 'assets/maestro-logic.js',
			array(),
			MAESTRO_VERSION,
			true
		);

		// jquery-ui-sortable is registered in wp-admin out of the box.
		wp_enqueue_script(
			'maestro',
			MAESTRO_URL . 'assets/maestro.js',
			array( 'jquery', 'jquery-ui-sortable', 'wp-a11y', 'wp-i18n', 'maestro-logic' ),
			MAESTRO_VERSION,
			true
		);

		wp_localize_script(
			'maestro',
			'maestroData',
			array(
				'restUrl'        => esc_url_raw( rest_url( Rest::NS . '/config' ) ),
				'nonce'          => wp_create_nonce( 'wp_rest' ),
				'exitUrl'        => esc_url_raw( remove_query_arg( 'maestro_edit' ) ),
				// ROLE-02: the per-user picker searches CORE's users endpoint
				// rather than a Maestro route — it is already capability-gated by
				// `list_users`, so we inherit core's authorization instead of
				// re-implementing it. The `nonce` above is a `wp_rest` nonce and
				// authenticates this endpoint too; no second nonce is needed.
				'usersUrl'       => esc_url_raw( rest_url( 'wp/v2/users' ) ),
				// Drives the self-target caution only. Never a permission check.
				'userId'         => get_current_user_id(),
				// ROLE-02: `maestro_capability` lets a site hand Maestro to a
				// custom role that may NOT hold `list_users`. Core's users
				// collection would then return only published authors — so the
				// picker would silently offer an incomplete, confusing set. The
				// person axes are hidden entirely for such a user rather than
				// shown broken, and rather than routing around core's gate with a
				// Maestro endpoint: widening who can enumerate site users would
				// trade away exactly the "zero risk to access" property the
				// plugin exists to protect. Role-based hiding still works.
				'canPickUsers'   => current_user_can( 'list_users' ),
				// Mirrors Config::MAX_HIDDEN_USERS so the picker can stop AT the
				// cap instead of letting the server silently truncate a save the
				// editor reported as successful.
				'maxHiddenUsers' => Config::MAX_HIDDEN_USERS,
				'roles'          => wp_roles()->get_names(),
				'iconSets'       => $this->icon_sets(),
				'config'         => $this->config->get(),
				'menu'           => $this->replay->get_menu_model(),
				'pristine'       => $this->replay->get_pristine(),
				'i18n'           => array(
					'saving'             => __( 'Saving…', 'maestro-menu-editor' ),
					'saved'              => __( 'Saved', 'maestro-menu-editor' ),
					'saveError'          => __( 'Save failed. Retrying on next change.', 'maestro-menu-editor' ),
					'modeLabel'          => __( 'Edit Mode', 'maestro-menu-editor' ),
					'renamePlaceholder'  => __( 'Menu label', 'maestro-menu-editor' ),
					'icon'               => __( 'Icon', 'maestro-menu-editor' ),
					'iconDialog'         => __( 'Choose an icon', 'maestro-menu-editor' ),
					'iconSearch'         => __( 'Search icons', 'maestro-menu-editor' ),
					'iconNone'           => __( 'No icon', 'maestro-menu-editor' ),
					'iconNoneHint'       => __( 'Remove the icon (uses the menu default).', 'maestro-menu-editor' ),
					'visibility'         => __( 'Visibility', 'maestro-menu-editor' ),
					'resetItem'          => __( 'Reset Item', 'maestro-menu-editor' ),
					'resetAll'           => __( 'Reset All', 'maestro-menu-editor' ),
					/* translators: Heading for the role-checkbox group that hides THIS menu item (parent or submenu row). */
					'hideFrom'           => __( 'Hide this item from:', 'maestro-menu-editor' ),
					/* translators: Heading for the role-checkbox group that cosmetically hides ALL of a parent's sub-items, independent of the parent's own visibility (COMPAT-10). Shown only for parents that have children. */
					'hideChildrenFrom'   => __( 'Hide its sub-items from:', 'maestro-menu-editor' ),
					/* translators: %s: role display name. Explains why a "Hide its sub-items from:" checkbox is shown checked and disabled — the parent is already hidden from this role in the "Hide this item from:" group above, so its sub-items are already gone too (WordPress core removes a hidden parent's whole rendered subtree). */
					'hideChildrenLocked' => esc_html__( 'Already hidden because this item is hidden from %s.', 'maestro-menu-editor' ),
					/* translators: Heading for the group that cosmetically hides THIS menu item from named individual people (ROLE-02), as opposed to whole roles. */
					'hideFromUsers'      => __( 'Hide this item from specific people:', 'maestro-menu-editor' ),
					/* translators: Heading for the group that cosmetically hides ALL of a parent's sub-items from named individual people (ROLE-02). Shown only for parents that have children. */
					'hideChildrenUsers'  => __( 'Hide its sub-items from specific people:', 'maestro-menu-editor' ),
					/* translators: Accessible label and placeholder for the type-ahead field used to find a person to hide a menu item from. */
					'userSearch'         => __( 'Search for a person', 'maestro-menu-editor' ),
					/* translators: Shown in the person picker when a search returns nobody. */
					'userSearchNone'     => __( 'No matching people found.', 'maestro-menu-editor' ),
					/* translators: Shown in the person picker when the search request fails. */
					'userSearchError'    => __( 'Could not search people. Please try again.', 'maestro-menu-editor' ),
					/* translators: %s: person's display name. Accessible label for the button that removes that person from a hide rule. */
					'userRemove'         => esc_html__( 'Remove %s', 'maestro-menu-editor' ),
					/* translators: Inline caution shown when an admin adds a hide rule against their OWN account. The rule is still permitted — this only warns. */
					'userSelfWarning'    => __( 'This hides the item from your own account. You can still reach the page by URL, and the editor stays available.', 'maestro-menu-editor' ),
					/* translators: %d: maximum number of people allowed per hide list. Shown when the editor tries to add one more than the limit. */
					'userLimitReached'   => esc_html__( 'Limit reached — up to %d people per list. Remove someone to add another.', 'maestro-menu-editor' ),
					'confirmAll'         => __( 'Reset ALL menu customizations to WordPress defaults? This cannot be undone.', 'maestro-menu-editor' ),
					'drag'               => __( 'Drag to reorder', 'maestro-menu-editor' ),
					/* translators: 1: item title, 2: direction ("up"/"down"), 3: new position number, 4: total items. */
					'moved'              => esc_html__( '%1$s moved %2$s, position %3$d of %4$d', 'maestro-menu-editor' ),
					/* translators: %s: item title. */
					'moveAtTop'          => esc_html__( '%s is already first', 'maestro-menu-editor' ),
					/* translators: %s: item title. */
					'moveAtBottom'       => esc_html__( '%s is already last', 'maestro-menu-editor' ),
					'dirUp'              => esc_html__( 'up', 'maestro-menu-editor' ),
					'dirDown'            => esc_html__( 'down', 'maestro-menu-editor' ),
					/* translators: Accessible label for the "move selected item up" button in the editor panel. */
					'moveUp'             => __( 'Move up', 'maestro-menu-editor' ),
					/* translators: Accessible label for the "move selected item down" button in the editor panel. */
					'moveDown'           => __( 'Move down', 'maestro-menu-editor' ),
					/* translators: Short label appended to modified menu items for screen readers. */
					'modified'           => esc_html__( '(modified)', 'maestro-menu-editor' ),
					/* translators: One-time hint shown to first-time users of the menu editor. */
					'firstRun'           => __( 'Click a menu item to start editing.', 'maestro-menu-editor' ),
					/* translators: Label for the button that dismisses the first-run hint. */
					'firstRunDismiss'    => __( 'Got it', 'maestro-menu-editor' ),
					/* translators: Accessible label / tooltip for the toolbar button that replays the guided tour. */
					'tourHelp'           => __( 'Show me around', 'maestro-menu-editor' ),
					/* translators: Title of the guided-tour tooltip dialog. */
					'tourTitle'          => __( 'Editing the menu', 'maestro-menu-editor' ),
					'tourNext'           => __( 'Next', 'maestro-menu-editor' ),
					'tourBack'           => __( 'Back', 'maestro-menu-editor' ),
					'tourDone'           => __( 'Done', 'maestro-menu-editor' ),
					'tourSkip'           => __( 'Skip', 'maestro-menu-editor' ),
					/* translators: 1: current step number, 2: total steps. e.g. "2 of 5". */
					'tourProgress'       => esc_html__( '%1$d of %2$d', 'maestro-menu-editor' ),
					'tourStep1'          => __( 'Click any menu item to edit it right here on the menu.', 'maestro-menu-editor' ),
					'tourStep2'          => __( 'Rename it, change its icon, or hide it from roles using these controls.', 'maestro-menu-editor' ),
					'tourStep3'          => __( 'Reorder items by dragging — or use the up and down arrows.', 'maestro-menu-editor' ),
					'tourStep4'          => __( 'Your changes save automatically. Reset one item, or Reset All to start over.', 'maestro-menu-editor' ),
					'tourStep5'          => __( 'Click Exit when you are done. Your changes stay live for everyone.', 'maestro-menu-editor' ),
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
