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
	 * The CSS that applies a stored admin menu width (Phase 28-02).
	 *
	 * Mirrors core's own 160px rules in admin-menu.css and common.css: the menu
	 * column, the open submenu, the flyout offset, and the content column's
	 * matching margin (setting the width without the margin overlaps or gaps the
	 * content). Scoped like core:
	 *
	 * - from 961px up, because at 960px and below core auto-folds the menu to
	 *   its 36px rail (and below 783px it becomes an overlay);
	 * - never on body.folded, so the collapse control still folds to 36px;
	 * - LTR and RTL separately, because core flips the offsets for RTL and an
	 *   inline style is not flipped for us.
	 *
	 * No !important, deliberately. `body:not(.folded) #adminmenu` outranks
	 * core's `#adminmenu`, and any plugin that forces a width with !important
	 * (Keel and PX both do) outranks Maestro with no detection code. Edit mode
	 * measures the rendered menu (28-01), so it follows whichever width won.
	 *
	 * @param int $width Bounded width in px, from Config::menu_width().
	 * @return string
	 */
	public static function menu_width_css( $width ) {
		$px = (int) $width . 'px';

		return '@media screen and (min-width: 961px){'
			. 'body:not(.folded) #adminmenuback,body:not(.folded) #adminmenuwrap,body:not(.folded) #adminmenu,'
			. 'body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu{width:' . $px . '}'
			. 'body:not(.rtl):not(.folded) #wpcontent,body:not(.rtl):not(.folded) #wpfooter{margin-left:' . $px . '}'
			. 'body.rtl:not(.folded) #wpcontent,body.rtl:not(.folded) #wpfooter{margin-right:' . $px . '}'
			. 'body:not(.rtl):not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{left:' . $px . '}'
			. 'body.rtl:not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{right:' . $px . '}'
			. '}';
	}

	/**
	 * Enqueue the editor script and stylesheet, and pass runtime data to JS.
	 *
	 * @return void
	 */
	public function enqueue() {
		// No toggle and no edit mode outside a site's own admin, so nothing to style.
		if ( is_outside_site_admin() ) {
			return;
		}

		// Always-loaded: keep the editor ENTER/EXIT toggle reachable in the admin bar at <=782px,
		// regardless of edit mode (the heavy editor assets below stay edit-mode-gated). UX-08a.
		wp_enqueue_style(
			'maestro-admin-bar',
			MAESTRO_URL . 'assets/maestro-admin-bar.css',
			array( 'dashicons' ),
			MAESTRO_VERSION
		);

		// Phase 28-02: a stored menu width applies while browsing, not only while
		// editing. It rides on the stylesheet above, so it costs no request, and
		// it reads the config Replay already loaded for this request, so it
		// costs no query. A site that never set a width gets nothing new.
		$menu_width = $this->config->menu_width();
		if ( null !== $menu_width ) {
			wp_add_inline_style( 'maestro-admin-bar', self::menu_width_css( $menu_width ) );
		}

		/*
		 * UX-13: the toggle navigates away from content that may be unsaved,
		 * raising the browser's generic "Leave site?" prompt. The shared guard
		 * autosaves first — never savePost, which on a published post would push
		 * in-progress edits live.
		 *
		 * WP71-05 narrowed this from every block-editor screen to the Site Editor
		 * alone. It covered both directions in the Post Editor because the toggle
		 * lived there; now it does not, so nothing to bind to and nothing to
		 * preserve. The Site Editor keeps its toggle (UX-11) and that toggle still
		 * leaves the screen, so it keeps the guard.
		 *
		 * Consumers feature-detect window.maestroPostGuard rather than declaring a
		 * dependency, so maestro.js stays loadable without it.
		 */
		if ( is_site_editor_screen() ) {
			wp_enqueue_script(
				'maestro-post-guard',
				MAESTRO_URL . 'assets/maestro-post-guard.js',
				array( 'wp-data' ),
				MAESTRO_VERSION,
				true
			);
		}

		if ( ! is_edit_mode() ) {
			// Entry side, Site Editor only since WP71-05. There is no exit side to
			// pair with any more: edit mode cannot run on a block-editor screen, so
			// maestro.js never binds an exit there.
			if ( is_site_editor_screen() ) {
				wp_enqueue_script(
					'maestro-entry',
					MAESTRO_URL . 'assets/maestro-entry.js',
					array( 'maestro-post-guard' ),
					MAESTRO_VERSION,
					true
				);
			}

			return;
		}

		/*
		 * WP71-05: edit mode never runs on a block-editor screen.
		 *
		 * Hiding the entry point does not retract a bookmarked ?maestro_edit=1,
		 * so the assets have to decline too — otherwise sortables bind to a menu
		 * behind the editor chrome and the tour, which is aria-modal and traps
		 * focus, opens over the block canvas.
		 *
		 * #156 did this in maestro.js by watching for hydration to strip
		 * `is-fullscreen-mode`. Deciding here instead means there is nothing to
		 * wait for and nothing to race: the file simply never loads. The Site
		 * Editor needs no exception — its toggle leaves for the Dashboard, so it
		 * is never in edit mode on its own screen.
		 *
		 * Post editor only. Blocking every block-editor screen also blocked a
		 * bookmarked ?maestro_edit=1 on widgets.php, where the menu is editable.
		 */
		if ( is_post_editor_screen() ) {
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
				'restUrl'         => esc_url_raw( rest_url( Rest::NS . '/config' ) ),
				'nonce'           => wp_create_nonce( 'wp_rest' ),
				'exitUrl'         => esc_url_raw( remove_query_arg( 'maestro_edit' ) ),
				// ROLE-02: the per-user picker searches CORE's users endpoint
				// rather than a Maestro route — it is already capability-gated by
				// `list_users`, so we inherit core's authorization instead of
				// re-implementing it. The `nonce` above is a `wp_rest` nonce and
				// authenticates this endpoint too; no second nonce is needed.
				'usersUrl'        => esc_url_raw( rest_url( 'wp/v2/users' ) ),
				// Drives the self-target caution only. Never a permission check.
				'userId'          => get_current_user_id(),
				// ROLE-02: `maestro_capability` lets a site hand Maestro to a
				// custom role that may NOT hold `list_users`. Core's users
				// collection would then return only published authors — so the
				// picker would silently offer an incomplete, confusing set. The
				// person axes are hidden entirely for such a user rather than
				// shown broken, and rather than routing around core's gate with a
				// Maestro endpoint: widening who can enumerate site users would
				// trade away exactly the "zero risk to access" property the
				// plugin exists to protect. Role-based hiding still works.
				'canPickUsers'    => current_user_can( 'list_users' ),
				// Mirrors Config::MAX_HIDDEN_USERS so the picker can stop AT the
				// cap instead of letting the server silently truncate a save the
				// editor reported as successful.
				'maxHiddenUsers'  => Config::MAX_HIDDEN_USERS,
				'roles'           => wp_roles()->get_names(),
				'iconSets'        => $this->icon_sets(),
				'config'          => $this->config->get(),
				'menu'            => $this->replay->get_menu_model(),
				// Separator slugs in rendered order; the editor pairs them with
				// core's id-less separator <li>s by position.
				'separators'      => $this->replay->get_separators(),
				// Including rows core trimmed, so the editor keeps their stored place.
				'knownSeparators' => $this->replay->get_known_separators(),
				'separatorPrefix' => Config::SEPARATOR_PREFIX,
				// Phase 28: the editor clamps exactly as Config::clean_menu_width() does.
				'menuWidth'       => array(
					'min'     => Config::MIN_MENU_WIDTH,
					'max'     => Config::MAX_MENU_WIDTH,
					'default' => Config::DEFAULT_MENU_WIDTH,
					'value'   => $this->config->menu_width(),
				),
				'pristine'        => $this->replay->get_pristine(),
				'i18n'            => array(
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
					'separator'          => __( 'Separator', 'maestro-menu-editor' ),
					'addSeparator'       => __( 'Add separator below', 'maestro-menu-editor' ),
					'removeSeparator'    => __( 'Remove separator', 'maestro-menu-editor' ),
					'separatorAdded'     => __( 'Separator added', 'maestro-menu-editor' ),
					'separatorRemoved'   => __( 'Separator removed', 'maestro-menu-editor' ),
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
					// Guided-tour steps, in the order the tour shows them: one per
					// editing control, so every toolbar glyph is named once.
					'tourStep1'          => __( 'Click any menu item to edit it right here on the menu.', 'maestro-menu-editor' ),
					'tourStep2'          => __( 'Type a new name for the selected item here.', 'maestro-menu-editor' ),
					'tourStep3'          => __( 'Reorder items by dragging — or use the up and down arrows.', 'maestro-menu-editor' ),
					'tourStepIcon'       => __( 'Change the item\'s icon. Pick one from Dashicons or Bootstrap, or choose no icon.', 'maestro-menu-editor' ),
					'tourStepVisibility' => __( 'Hide the item from chosen roles or people. Everyone else still sees it.', 'maestro-menu-editor' ),
					'tourStepResetItem'  => __( 'Undo every change to just this item.', 'maestro-menu-editor' ),
					'tourStepSeparator'  => __( 'Add a separator line below this item. To remove one, select the separator and use the trash button.', 'maestro-menu-editor' ),
					/* translators: Guided-tour step pointing at the draggable edge of the admin menu. */
					'tourStepWidth'      => __( 'Drag the menu\'s edge to make it wider or narrower. When the edge has focus, the arrow keys work too.', 'maestro-menu-editor' ),
					'tourStepSettings'   => __( 'Menu settings let you type an exact menu width or go back to the default.', 'maestro-menu-editor' ),
					'tourStepHelp'       => __( 'Want this tour again? Use the help button anytime.', 'maestro-menu-editor' ),
					'tourStep4'          => __( 'Your changes save automatically. Reset All returns the whole menu to the WordPress defaults.', 'maestro-menu-editor' ),
					'tourStep5'          => __( 'Click Exit when you are done. Your changes stay live for everyone.', 'maestro-menu-editor' ),
					/* translators: Accessible label / tooltip for the toolbar button, and title of the dialog, holding menu-wide settings. */
					'settings'           => __( 'Menu settings', 'maestro-menu-editor' ),
					'menuWidth'          => __( 'Menu width', 'maestro-menu-editor' ),
					'menuWidthPx'        => __( 'Menu width in pixels', 'maestro-menu-editor' ),
					'menuWidthHint'      => __( 'Widen the menu so longer labels fit on one line. Applies on every admin page, for everyone, on screens 961px and wider.', 'maestro-menu-editor' ),
					/* translators: %d: WordPress's default admin menu width in pixels. */
					'menuWidthDefault'   => __( 'Using the WordPress default (%dpx).', 'maestro-menu-editor' ),
					/* translators: %d: the stored admin menu width in pixels. */
					'menuWidthCustom'    => __( 'Custom width: %dpx.', 'maestro-menu-editor' ),
					/* translators: %d: the width in pixels another plugin is holding the admin menu at. */
					'widthOverridden'    => __( 'Another plugin sets the menu width (%dpx), so this setting has no effect while that plugin is active.', 'maestro-menu-editor' ),
					'widthUseDefault'    => __( 'Use default', 'maestro-menu-editor' ),
					'widthDefaultSet'    => __( 'Menu width reset to the WordPress default.', 'maestro-menu-editor' ),
					/* translators: Accessible label / tooltip for the handle on the admin menu's edge that resizes it. */
					'menuWidthHandle'    => __( 'Resize menu', 'maestro-menu-editor' ),
					/* translators: %d: a width in pixels, read out by screen readers. */
					'menuWidthValue'     => __( '%d pixels', 'maestro-menu-editor' ),
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
					require MAESTRO_DIR . 'includes/icons-dashicons.php'
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
}
