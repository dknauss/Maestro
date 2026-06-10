<?php
/**
 * The replay engine.
 *
 * The in-place editor is just a capture mechanism. The menu is rebuilt
 * server-side on every admin load, so the *real* work is replaying stored
 * overrides onto the $menu / $submenu globals each request.
 *
 * Division of labour:
 *   - Rename, icon, visibility, submenu order  -> mutate the globals in replay()
 *     on a late `admin_menu` pass (after every other plugin has registered).
 *   - Top-level order                          -> the proper core API:
 *     `custom_menu_order` + `menu_order`, which run just after admin_menu.
 *
 * @package AdminMenuMaestro
 */

namespace AdminMenuMaestro;

defined( 'ABSPATH' ) || exit;

class Replay {

	/**
	 * @var Config
	 */
	private $config;

	/**
	 * Natural (pre-override) titles and icons, captured only in edit mode so the
	 * editor can offer "reset this item to default". Keyed by slug.
	 *
	 * @var array
	 */
	private $pristine = array(
		'top' => array(),
		'sub' => array(),
	);

	/**
	 * @param Config $config Shared config instance.
	 */
	public function __construct( Config $config ) {
		$this->config = $config;

		// Late enough that all other admin_menu registrations have happened.
		add_action( 'admin_menu', array( $this, 'replay' ), PHP_INT_MAX );

		// Top-level ordering goes through the dedicated core filters.
		add_filter( 'custom_menu_order', '__return_true' );
		add_filter( 'menu_order', array( $this, 'reorder_top' ) );
	}

	/**
	 * Apply rename / icon / visibility to the globals and reorder submenus.
	 * Runs with $menu / $submenu in their natural, fully-registered state.
	 *
	 * @return void
	 */
	public function replay() {
		global $menu, $submenu;

		// Snapshot the natural state BEFORE we touch anything (edit mode only).
		if ( is_edit_mode() ) {
			$this->capture_pristine( $menu, $submenu );
		}

		$cfg = $this->config->get();
		if ( empty( $cfg ) ) {
			return;
		}

		$items = isset( $cfg['items'] ) ? $cfg['items'] : array();

		// --- Top-level: rename, icon, visibility -------------------------------
		if ( is_array( $menu ) ) {
			foreach ( $menu as $pos => $row ) {
				if ( empty( $row[2] ) ) {
					continue; // separators and malformed rows.
				}
				$slug = $row[2];

				if ( ! isset( $items[ $slug ] ) ) {
					continue;
				}
				$ovr = $items[ $slug ];

				if ( isset( $ovr['title'] ) ) {
					$menu[ $pos ][0] = $ovr['title'];
				}
				if ( isset( $ovr['icon'] ) ) {
					$menu[ $pos ][6] = $ovr['icon']; // index 6 is top-level only.
				}
				if ( $this->is_hidden_for_current_user( $ovr ) ) {
					unset( $menu[ $pos ] ); // cosmetic removal; page still loads by URL.
				}
			}
		}

		// --- Submenus: rename, visibility, then reorder ------------------------
		if ( is_array( $submenu ) ) {
			foreach ( $submenu as $parent => $children ) {
				foreach ( $children as $pos => $row ) {
					if ( empty( $row[2] ) ) {
						continue;
					}
					$slug = $row[2];

					if ( isset( $items[ $slug ] ) ) {
						$ovr = $items[ $slug ];
						if ( isset( $ovr['title'] ) ) {
							$submenu[ $parent ][ $pos ][0] = $ovr['title'];
						}
						if ( $this->is_hidden_for_current_user( $ovr ) ) {
							unset( $submenu[ $parent ][ $pos ] );
						}
					}
				}

				// Reorder this parent's surviving children.
				if ( ! empty( $cfg['sub_order'][ $parent ] ) ) {
					$submenu[ $parent ] = Ordering::submenu(
						$submenu[ $parent ],
						$cfg['sub_order'][ $parent ]
					);
				}
			}
		}
	}

	/**
	 * `menu_order` filter callback. Receives the array of top-level slugs in
	 * natural order and returns it re-sorted to our stored preference. The
	 * resilience rules live in Ordering::top().
	 *
	 * @param array $menu_order Slugs in current order.
	 * @return array
	 */
	public function reorder_top( $menu_order ) {
		$cfg     = $this->config->get();
		$desired = isset( $cfg['top_order'] ) ? $cfg['top_order'] : array();
		return Ordering::top( $desired, (array) $menu_order );
	}

	/**
	 * Does the current user fall into a role this item is hidden from?
	 *
	 * @param array $ovr Item override.
	 * @return bool
	 */
	private function is_hidden_for_current_user( array $ovr ) {
		if ( empty( $ovr['hidden_roles'] ) ) {
			return false;
		}
		$user = wp_get_current_user();
		if ( ! $user || empty( $user->roles ) ) {
			return false;
		}
		return (bool) array_intersect( (array) $user->roles, (array) $ovr['hidden_roles'] );
	}

	/**
	 * Snapshot natural titles/icons before any override is applied.
	 *
	 * @param array $menu    The $menu global.
	 * @param array $submenu The $submenu global.
	 * @return void
	 */
	private function capture_pristine( $menu, $submenu ) {
		if ( is_array( $menu ) ) {
			foreach ( $menu as $row ) {
				if ( empty( $row[2] ) ) {
					continue;
				}
				$this->pristine['top'][ $row[2] ] = array(
					'title' => isset( $row[0] ) ? wp_strip_all_tags( $row[0] ) : '',
					'icon'  => isset( $row[6] ) ? $row[6] : '',
				);
			}
		}
		if ( is_array( $submenu ) ) {
			foreach ( $submenu as $parent => $children ) {
				foreach ( $children as $row ) {
					if ( empty( $row[2] ) ) {
						continue;
					}
					$this->pristine['sub'][ $row[2] ] = array(
						'title' => isset( $row[0] ) ? wp_strip_all_tags( $row[0] ) : '',
					);
				}
			}
		}
	}

	/**
	 * Pristine snapshot for the editor (edit mode only; empty otherwise).
	 *
	 * @return array
	 */
	public function get_pristine() {
		return $this->pristine;
	}

	/**
	 * Build the effective menu model for the editor: the current, override-applied
	 * state in render order, with the DOM <li> id for each top-level item so the
	 * JS can locate nodes precisely instead of scraping hrefs.
	 *
	 * Called at asset-enqueue time, after the order filters have run, so $menu is
	 * already in effective order.
	 *
	 * @return array
	 */
	public function get_menu_model() {
		global $menu, $submenu;

		$model = array();
		if ( ! is_array( $menu ) ) {
			return $model;
		}

		$cfg   = $this->config->get();
		$items = isset( $cfg['items'] ) ? $cfg['items'] : array();

		foreach ( $menu as $row ) {
			if ( empty( $row[2] ) || ( isset( $row[4] ) && false !== strpos( (string) $row[4], 'wp-menu-separator' ) ) ) {
				continue; // skip separators in v1.
			}
			$slug = $row[2];

			$node = array(
				'slug'        => $slug,
				'liId'        => $this->li_id( $row ),
				'title'       => isset( $row[0] ) ? wp_strip_all_tags( $row[0] ) : '',
				'icon'        => isset( $row[6] ) ? $row[6] : '',
				'hiddenRoles' => isset( $items[ $slug ]['hidden_roles'] ) ? $items[ $slug ]['hidden_roles'] : array(),
				'submenu'     => array(),
			);

			if ( ! empty( $submenu[ $slug ] ) ) {
				foreach ( $submenu[ $slug ] as $sub ) {
					if ( empty( $sub[2] ) ) {
						continue;
					}
					$node['submenu'][] = array(
						'slug'        => $sub[2],
						'title'       => isset( $sub[0] ) ? wp_strip_all_tags( $sub[0] ) : '',
						'hiddenRoles' => isset( $items[ $sub[2] ]['hidden_roles'] ) ? $items[ $sub[2] ]['hidden_roles'] : array(),
					);
				}
			}

			$model[] = $node;
		}

		return $model;
	}

	/**
	 * Reproduce the <li> id that menu-header.php assigns to a top-level item.
	 * Core uses index 5 (the menu id) run through this exact preg_replace.
	 *
	 * @param array $row A $menu row.
	 * @return string
	 */
	private function li_id( array $row ) {
		if ( ! empty( $row[5] ) ) {
			return preg_replace( '|[^a-zA-Z0-9_:.]|', '-', $row[5] );
		}
		return '';
	}
}
