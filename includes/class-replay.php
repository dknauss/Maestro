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
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Replay engine — applies stored menu overrides onto the WP menu globals each request.
 *
 * @package Maestro
 */
class Replay {

	/**
	 * Shared config instance.
	 *
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
	 * Store config and register admin_menu / menu_order hooks.
	 *
	 * @param Config $config Shared config instance.
	 */
	public function __construct( Config $config ) {
		$this->config = $config;

		// Late enough that all other admin_menu registrations have happened.
		add_action( 'admin_menu', array( $this, 'replay' ), PHP_INT_MAX );

		// Top-level ordering goes through the dedicated core filters.
		add_filter( 'custom_menu_order', array( $this, 'has_top_order' ) );
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

		// --- Build normalized lookup for stored override keys ------------------
		// Normalize once per replay() so both the stored key and every rendered
		// slug are compared in their canonical form (WP-coupled admin_url call
		// lives here, keeping Slug itself WP-free).
		$base = function_exists( 'admin_url' ) ? admin_url( '' ) : '';

		// Axis-1 collision guard: two distinct stored keys that normalize to the
		// same key are ambiguous → apply nothing for that key. Shared with the
		// editor model (get_menu_model) so apply and display agree.
		list( $norm_items, $norm_skip ) = $this->normalized_items( $items, $base );

		// --- Top-level: rename, icon, visibility -------------------------------
		// Axis-2 collision guard: track which normalized key matched which distinct
		// rendered slug. If a normalized key would match 2+ different rendered slugs
		// in the same pass, apply nothing for that key.
		$top_rendered_matches = array(); // normalized_key => first rendered slug matched.
		$top_skip_rendered    = array(); // normalized_key => true (matched 2+ distinct rendered).

		if ( is_array( $menu ) ) {
			// Pre-scan to detect axis-2 rendered collisions before mutating.
			foreach ( $menu as $row ) {
				if ( empty( $row[2] ) ) {
					continue;
				}
				$nk = Slug::normalize( (string) $row[2], $base );
				if ( '' === $nk || isset( $norm_skip[ $nk ] ) || ! isset( $norm_items[ $nk ] ) ) {
					continue;
				}
				if ( ! isset( $top_rendered_matches[ $nk ] ) ) {
					$top_rendered_matches[ $nk ] = $row[2];
				} elseif ( $top_rendered_matches[ $nk ] !== $row[2] ) {
					$top_skip_rendered[ $nk ] = true;
				}
			}

			foreach ( $menu as $pos => $row ) {
				if ( empty( $row[2] ) ) {
					continue; // separators and malformed rows.
				}

				$nk = Slug::normalize( (string) $row[2], $base );
				if ( '' === $nk || isset( $norm_skip[ $nk ] ) || isset( $top_skip_rendered[ $nk ] ) ) {
					continue;
				}
				if ( ! isset( $norm_items[ $nk ] ) ) {
					continue;
				}
				$ovr = $norm_items[ $nk ];

				if ( isset( $ovr['title'] ) ) {
					$menu[ $pos ][0] = $ovr['title']; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: mutating $menu via admin_menu hook is the documented WP API for menu customization.
				}
				if ( isset( $ovr['icon'] ) ) {
					$menu[ $pos ][6] = $ovr['icon']; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: mutating $menu via admin_menu hook is the documented WP API for menu customization. Index 6 is top-level only.

					// Custom image icons (data-URI / URL) render as a background on
					// div.wp-menu-image. Core gives its own items a `menu-icon-*`
					// class whose CSS sets `background-image:none !important`, which
					// would hide the custom icon. Drop that class so it shows; a
					// dashicon (which renders via ::before) is unaffected and keeps it.
					if ( isset( $menu[ $pos ][4] ) && in_array( Config::icon_form( $ovr['icon'] ), array( 'data', 'url' ), true ) ) {
						$stripped        = preg_replace( '/\bmenu-icon-[\w-]+/', '', (string) $menu[ $pos ][4] );
						$menu[ $pos ][4] = trim( preg_replace( '/\s+/', ' ', $stripped ) ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: see above.
					}
				}
				if ( $this->is_hidden_for_current_user( $ovr ) ) {
					unset( $menu[ $pos ] ); // Cosmetic removal; the page still loads by direct URL.
				}
			}
		}

		// --- Submenus: rename, visibility, then reorder ------------------------
		if ( is_array( $submenu ) ) {
			foreach ( $submenu as $parent => $children ) {
				// Axis-2 collision guard for this parent's children: pre-scan before mutating.
				$sub_rendered_matches = array(); // normalized_key => first rendered slug matched.
				$sub_skip_rendered    = array(); // normalized_key => true (matched 2+ distinct rendered).
				foreach ( $children as $row ) {
					if ( empty( $row[2] ) ) {
						continue;
					}
					$nk = Slug::normalize( (string) $row[2], $base );
					if ( '' === $nk || isset( $norm_skip[ $nk ] ) || ! isset( $norm_items[ $nk ] ) ) {
						continue;
					}
					if ( ! isset( $sub_rendered_matches[ $nk ] ) ) {
						$sub_rendered_matches[ $nk ] = $row[2];
					} elseif ( $sub_rendered_matches[ $nk ] !== $row[2] ) {
						$sub_skip_rendered[ $nk ] = true;
					}
				}

				foreach ( $children as $pos => $row ) {
					if ( empty( $row[2] ) ) {
						continue;
					}

					$nk = Slug::normalize( (string) $row[2], $base );
					if ( '' === $nk || isset( $norm_skip[ $nk ] ) || isset( $sub_skip_rendered[ $nk ] ) ) {
						continue;
					}
					if ( isset( $norm_items[ $nk ] ) ) {
						$ovr = $norm_items[ $nk ];
						if ( isset( $ovr['title'] ) ) {
							$submenu[ $parent ][ $pos ][0] = $ovr['title']; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: mutating $submenu via admin_menu hook is the documented WP API for submenu customization.
						}
						if ( $this->is_hidden_for_current_user( $ovr ) ) {
							unset( $submenu[ $parent ][ $pos ] ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: unsetting $submenu entries via admin_menu hook is the documented WP API for hiding menu items.
						}
					}
				}

				// Reorder this parent's surviving children.
				// Normalize the sub_order parent key so an absolute/encoded stored
				// key resolves against the (possibly different form) rendered parent.
				$norm_parent   = Slug::normalize( (string) $parent, $base );
				$desired_order = null;
				if ( ! empty( $cfg['sub_order'] ) ) {
					foreach ( $cfg['sub_order'] as $sp => $sd ) {
						if ( Slug::normalize( (string) $sp, $base ) === $norm_parent ) {
							$desired_order = $sd;
							break;
						}
					}
				}

				if ( ! empty( $desired_order ) ) {
					// Normalize desired child slug list.
					$norm_desired = array();
					foreach ( $desired_order as $ds ) {
						$norm_desired[] = Slug::normalize( (string) $ds, $base );
					}

					// Build normalized-slug copies of children for Ordering::submenu
					// matching, and maintain a map from normalized slug → original row
					// (first occurrence) so we can restore original rows afterwards.
					//
					// Collision guard: if two live children normalize to the same key
					// (they differ only by data normalize() removes, e.g. ver= or utm_*),
					// Ordering::submenu indexes/emits each slug once and would DROP the
					// later live row. Skip the reorder for this parent entirely and leave
					// the children in natural order — consistent with the rename/visibility
					// collision guards: when resolution is ambiguous, apply nothing.
					$norm_children = array();
					$orig_by_norm  = array(); // normalized_child_slug => original row.
					$collision     = false;
					foreach ( $submenu[ $parent ] as $cr ) {
						if ( empty( $cr[2] ) ) {
							$norm_children[] = $cr;
							continue;
						}
						$cnk = Slug::normalize( (string) $cr[2], $base );
						if ( isset( $orig_by_norm[ $cnk ] ) ) {
							$collision = true;
							break;
						}
						$orig_by_norm[ $cnk ] = $cr;
						$cr[2]                = $cnk; // Temporarily normalize for Ordering.
						$norm_children[]      = $cr;
					}

					if ( $collision ) {
						continue; // Ambiguous child slugs — skip reorder so no live row is dropped.
					}

					// Let Ordering::submenu sort the normalized copies (its resilience
					// contract: desired-in-order first, newcomers appended, orphans skipped,
					// dup honoured once).
					$norm_ordered = Ordering::submenu( $norm_children, $norm_desired );

					// Map returned rows back to originals (non-destructive: keep raw slugs).
					$restored = array();
					foreach ( $norm_ordered as $nr ) {
						$cnk        = isset( $nr[2] ) ? $nr[2] : '';
						$restored[] = isset( $orig_by_norm[ $cnk ] ) ? $orig_by_norm[ $cnk ] : $nr;
					}

					$submenu[ $parent ] = $restored; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: reordering $submenu entries via admin_menu hook is the documented WP API for submenu ordering.
				}
			}
		}
	}

	/**
	 * `custom_menu_order` filter callback. Only claim core's menu-order machinery
	 * when we actually have a stored top-level order; otherwise pass through so other
	 * plugins/themes that hook custom_menu_order/menu_order are not overridden.
	 *
	 * @return bool
	 */
	public function has_top_order() {
		$cfg = $this->config->get();
		return ! empty( $cfg['top_order'] );
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
	 * Build the normalized stored-override lookup with the Axis-1 collision guard:
	 * two distinct stored keys that normalize to the same key are ambiguous and
	 * resolve to nothing. Shared by replay() (which applies overrides) and
	 * get_menu_model() (which shows them in the editor) so the two never drift.
	 *
	 * @param array  $items Stored items keyed by raw override key.
	 * @param string $base  Admin base for Slug::normalize().
	 * @return array{0: array<string, array>, 1: array<string, bool>} [ norm_items, norm_skip ]
	 */
	private function normalized_items( array $items, $base ) {
		$norm_items = array(); // normalized_key => override.
		$norm_skip  = array(); // normalized_key => true (ambiguous, skip).
		foreach ( $items as $stored_key => $override ) {
			$nk = Slug::normalize( (string) $stored_key, $base );
			if ( '' === $nk ) {
				continue;
			}
			if ( isset( $norm_items[ $nk ] ) ) {
				$norm_skip[ $nk ] = true;
				unset( $norm_items[ $nk ] );
			} elseif ( ! isset( $norm_skip[ $nk ] ) ) {
				$norm_items[ $nk ] = $override;
			}
		}
		return array( $norm_items, $norm_skip );
	}

	/**
	 * Resolve a rendered slug's stored hidden_roles through the normalized lookup,
	 * mirroring how replay() decides which override applies. Returns an empty
	 * array when the slug has no (unambiguous) stored override.
	 *
	 * @param string $slug       Rendered slug.
	 * @param array  $norm_items Normalized override map from normalized_items().
	 * @param array  $norm_skip  Ambiguous normalized keys from normalized_items().
	 * @param string $base       Admin base for Slug::normalize().
	 * @return array
	 */
	private function resolved_hidden_roles( $slug, array $norm_items, array $norm_skip, $base ) {
		$nk = Slug::normalize( (string) $slug, $base );
		if ( '' === $nk || isset( $norm_skip[ $nk ] ) || ! isset( $norm_items[ $nk ]['hidden_roles'] ) ) {
			return array();
		}
		return $norm_items[ $nk ]['hidden_roles'];
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

		// Resolve hidden_roles through the SAME normalized lookup replay() applies,
		// not a raw $items[$slug] hit. A stored key that only matches after
		// normalization (host move, ver=/utm_ drift, &amp; encoding) would
		// otherwise show an empty visibility panel in the editor, and the next
		// full-replace autosave would silently drop the working rule.
		$base                           = function_exists( 'admin_url' ) ? admin_url( '' ) : '';
		list( $norm_items, $norm_skip ) = $this->normalized_items( $items, $base );

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
				'hiddenRoles' => $this->resolved_hidden_roles( $slug, $norm_items, $norm_skip, $base ),
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
						'hiddenRoles' => $this->resolved_hidden_roles( $sub[2], $norm_items, $norm_skip, $base ),
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
