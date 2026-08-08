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
					// COMPAT-07: re-extract badge/wrapper markup from the LIVE title
					// each request and swap only the human-readable label into it,
					// instead of overwriting the row wholesale. Falls back to the
					// wholesale stored title when no replaceable text node exists
					// (today's behavior) — no fatal, no invented markup.
					$live_title      = isset( $row[0] ) ? (string) $row[0] : '';
					$retitled        = Title::replace_label( $live_title, $ovr['title'] );
					$menu[ $pos ][0] = ( null !== $retitled ) ? $retitled : $ovr['title']; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: mutating $menu via admin_menu hook is the documented WP API for menu customization.
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
				// Only ever cosmetically remove a row the current user could ALREADY
				// reach ($row[1] is the menu capability). Keeping a row the user
				// cannot access lets WP core build its own $_wp_menu_nopriv entry, so
				// core's user_can_access_admin_page() 403 gate still fires — hiding
				// can therefore never *widen* access, making the cosmetic-only
				// guarantee structural rather than merely conventional. A user who CAN
				// access still gets the item hidden (unchanged behavior).
				if ( $this->is_hidden_for_current_user( $ovr ) && current_user_can( $row[1] ) ) {
					unset( $menu[ $pos ] ); // Cosmetic removal; the page still loads by direct URL.
				}
			}
		}

		// --- Submenus: rename, visibility, then reorder ------------------------
		if ( is_array( $submenu ) ) {
			// Precompute a normalized sub_order lookup ONCE (O(P)) instead of
			// re-scanning and re-normalizing every stored sub_order key for each
			// rendered parent (O(P²)). First stored key wins per normalized key,
			// which reproduces the previous per-parent scan exactly — it broke on
			// its first normalized match in stored-key order.
			$norm_sub_order = array();
			if ( ! empty( $cfg['sub_order'] ) ) {
				foreach ( $cfg['sub_order'] as $sp => $sd ) {
					$snk = Slug::normalize( (string) $sp, $base );
					if ( ! isset( $norm_sub_order[ $snk ] ) ) {
						$norm_sub_order[ $snk ] = $sd;
					}
				}
			}

			// Resolved once for the whole submenu pass: whether the STORED config
			// predates qualified `parent>child` keys and therefore still expects a
			// bare key to reach a submenu row. See Config::SCHEMA_VERSION.
			$legacy_bare_keys = $this->config->is_legacy_bare_key_schema();

			foreach ( $submenu as $parent => $children ) {
				// COMPAT-04: a qualified `parent>child` override resolves ONLY this
				// submenu row, never a same-slug top-level item (level-qualified).
				// A legacy bare child key (schema v1 only — see $legacy_bare_keys)
				// keeps matching this row too, so an existing pre-v2 config's
				// effect does not change until it is re-saved.
				// Both Axis-2 collision guards below are independent: a rendered
				// collision on the qualified path does not veto the bare path or
				// vice versa.
				$norm_parent = Slug::normalize( (string) $parent, $base );

				// COMPAT-10 (REVISED): resolve the PARENT's own override (bare
				// top-level key only -- child_hidden_roles is a parent concept
				// and Config::sanitize() never stores it on a qualified submenu
				// key) so its child_hidden_roles can be unioned into each child
				// below. Independent of the parent's own hidden_roles (whether
				// the PARENT itself is hidden) -- that stays exactly the
				// existing top-level hide, untouched here. The same Axis-1
				// guard (norm_skip) and the top-level Axis-2 guard
				// (top_skip_rendered, computed above) apply here too: an
				// ambiguous parent resolves to no override, so child-hiding
				// never fires for it.
				$parent_ovr                = ( '' !== $norm_parent && ! isset( $norm_skip[ $norm_parent ] ) && ! isset( $top_skip_rendered[ $norm_parent ] ) && isset( $norm_items[ $norm_parent ] ) )
					? $norm_items[ $norm_parent ]
					: null;
				$parent_child_hidden_roles = ( null !== $parent_ovr && ! empty( $parent_ovr['child_hidden_roles'] ) ) ? $parent_ovr['child_hidden_roles'] : array();

				// Axis-2 collision guard for this parent's children: pre-scan before mutating.
				$sub_rendered_matches  = array(); // bare normalized_key => first rendered slug matched.
				$sub_skip_rendered     = array(); // bare normalized_key => true (matched 2+ distinct rendered).
				$qual_rendered_matches = array(); // qualified normalized_key => first rendered slug matched.
				$qual_skip_rendered    = array(); // qualified normalized_key => true (matched 2+ distinct rendered).
				foreach ( $children as $row ) {
					if ( empty( $row[2] ) ) {
						continue;
					}
					$nk = Slug::normalize( (string) $row[2], $base );
					if ( '' === $nk ) {
						continue;
					}

					if ( ! isset( $norm_skip[ $nk ] ) && isset( $norm_items[ $nk ] ) ) {
						if ( ! isset( $sub_rendered_matches[ $nk ] ) ) {
							$sub_rendered_matches[ $nk ] = $row[2];
						} elseif ( $sub_rendered_matches[ $nk ] !== $row[2] ) {
							$sub_skip_rendered[ $nk ] = true;
						}
					}

					if ( '' !== $norm_parent ) {
						$qnk = $norm_parent . Slug::QUALIFIED_SEPARATOR . $nk;
						if ( ! isset( $norm_skip[ $qnk ] ) && isset( $norm_items[ $qnk ] ) ) {
							if ( ! isset( $qual_rendered_matches[ $qnk ] ) ) {
								$qual_rendered_matches[ $qnk ] = $row[2];
							} elseif ( $qual_rendered_matches[ $qnk ] !== $row[2] ) {
								$qual_skip_rendered[ $qnk ] = true;
							}
						}
					}
				}

				foreach ( $children as $pos => $row ) {
					if ( empty( $row[2] ) ) {
						continue;
					}

					$nk = Slug::normalize( (string) $row[2], $base );
					if ( '' === $nk ) {
						continue;
					}

					$ovr = null;

					// Qualified key wins first: an unambiguous parent>child override
					// for THIS rendered parent+child pair. A stored qualified key
					// whose parent half matches no rendered parent here never builds
					// a matching $qnk in this loop, so it is skipped silently — no
					// extra check needed for the parent-half-miss rule.
					if ( '' !== $norm_parent ) {
						$qnk = $norm_parent . Slug::QUALIFIED_SEPARATOR . $nk;
						if ( ! isset( $norm_skip[ $qnk ] ) && ! isset( $qual_skip_rendered[ $qnk ] ) && isset( $norm_items[ $qnk ] ) ) {
							$ovr = $norm_items[ $qnk ];
						}
					}

					// Bare fallback: only when no qualified override applied.
					//
					// COMPAT-04 completion — the bare key is ambiguous exactly when it
					// ALSO names a rendered TOP-LEVEL row. The common shape is
					// WordPress's self-link convention (a CPT's "All Products" child
					// re-registering its own parent's slug), but it is NOT limited to
					// that: a plugin can park a submenu under one parent whose slug
					// equals an unrelated top-level row's, so testing
					// `$nk === $norm_parent` would miss it. $top_rendered_matches is
					// precisely the right set — it is keyed by normalized rendered
					// top-level slug and only populated for keys that HAVE a stored
					// override, which is the same condition this fallback requires.
					//
					// When the bare key names no rendered top-level row it is
					// unambiguous (only this submenu can carry it), so the fallback
					// stands untouched.
					//
					// For the colliding case the reading depends on who wrote the
					// config (see Config::SCHEMA_VERSION):
					// - v1 (<= 1.4.0): the editor of that era stored a submenu edit
					// under the child's own bare slug, so the key may well have
					// meant the child. Keep applying it — dropping it would
					// silently un-apply saved overrides.
					// - v2 (every later version): every submenu edit carries a qualified
					// `parent>child` key, so a colliding bare key can only have
					// meant the top-level row. Applying it here is what used to
					// drag the child along with a top-level-only rename or hide.
					//
					// The v1 -> v2 migration needs no upgrade routine: get_menu_model()
					// reads the already-replayed globals, so a legacy bare key that is
					// currently retitling both rows appears on both editor nodes, and
					// the next full-replace save writes the bare top key AND the
					// qualified child key. Nothing visible changes at the bump.
					$bare_names_a_top_row  = isset( $top_rendered_matches[ $nk ] );
					$bare_fallback_allowed = $legacy_bare_keys || ! $bare_names_a_top_row;

					if ( $bare_fallback_allowed && null === $ovr && ! isset( $norm_skip[ $nk ] ) && ! isset( $sub_skip_rendered[ $nk ] ) && isset( $norm_items[ $nk ] ) ) {
						$ovr = $norm_items[ $nk ];
					}

					// A child with no override of its own is NOT skipped outright any
					// more (COMPAT-10): the parent's child_hidden_roles may still hide
					// it below, even though there is nothing of its own to rename/hide.
					if ( null !== $ovr && isset( $ovr['title'] ) ) {
						// COMPAT-07: same live-title text-node swap as the top-level seam
						// above, applied to the submenu row.
						$live_title                    = isset( $row[0] ) ? (string) $row[0] : '';
						$retitled                      = Title::replace_label( $live_title, $ovr['title'] );
						$submenu[ $parent ][ $pos ][0] = ( null !== $retitled ) ? $retitled : $ovr['title']; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: mutating $submenu via admin_menu hook is the documented WP API for submenu customization.
					}

					// COMPAT-10 (REVISED): union the child's own hidden_roles with the
					// parent's child_hidden_roles (Cascade::effective_hidden_roles() is
					// pure -- it only merges role-slug lists, never touches a
					// capability). This is fully INDEPENDENT of whether the parent
					// itself is hidden -- a parent with no child_hidden_roles rule
					// contributes nothing, so an untouched parent is exactly the
					// child's own hidden_roles -- zero regression.
					// No capability gate here (unlike the top-level hide above): core
					// registers each submenu row's $_wp_submenu_nopriv entry BEFORE
					// this late admin_menu pass, so removing a submenu row cannot
					// remove core's own access denial — the nopriv gate is already
					// built. The top-level $_wp_menu_nopriv table, by contrast, is
					// finalized after admin_menu, so only the top-level hide needs the
					// current_user_can() guard to stay strictly cosmetic.
					$child_own_roles = ( null !== $ovr && ! empty( $ovr['hidden_roles'] ) ) ? $ovr['hidden_roles'] : array();
					$effective_roles = Cascade::effective_hidden_roles( $child_own_roles, $parent_child_hidden_roles );
					if ( $effective_roles && $this->is_hidden_for_current_user( array( 'hidden_roles' => $effective_roles ) ) ) {
						unset( $submenu[ $parent ][ $pos ] ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Intentional: unsetting $submenu entries via admin_menu hook is the documented WP API for hiding menu items.
					}
				}

				// Reorder this parent's surviving children.
				// $norm_parent (computed above) also resolves the sub_order parent
				// key so an absolute/encoded stored key matches the (possibly
				// different form) rendered parent. O(1) lookup into the map
				// precomputed once above.
				$desired_order = isset( $norm_sub_order[ $norm_parent ] ) ? $norm_sub_order[ $norm_parent ] : null;

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
	 * when we actually have a stored top-level order; otherwise pass the incoming
	 * value through unchanged so other plugins/themes that hook
	 * custom_menu_order/menu_order are not overridden.
	 *
	 * @param bool $enabled Current filter value from earlier callbacks.
	 * @return bool
	 */
	public function has_top_order( $enabled = false ) {
		$cfg = $this->config->get();
		return ! empty( $cfg['top_order'] ) ? true : $enabled;
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
	 * A stored key may be a bare top-level slug or a qualified `parent>child`
	 * submenu key (COMPAT-04); Slug::normalize_qualified() normalizes each form
	 * appropriately (bare keys behave exactly as Slug::normalize(), unchanged),
	 * so the Axis-1 guard applies equally to both key shapes in one pass.
	 *
	 * @param array  $items Stored items keyed by raw override key.
	 * @param string $base  Admin base for Slug::normalize().
	 * @return array{0: array<string, array>, 1: array<string, bool>} [ norm_items, norm_skip ]
	 */
	private function normalized_items( array $items, $base ) {
		$norm_items = array(); // normalized_key => override.
		$norm_skip  = array(); // normalized_key => true (ambiguous, skip).
		foreach ( $items as $stored_key => $override ) {
			$nk = Slug::normalize_qualified( (string) $stored_key, $base );
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
	 * Resolve a rendered slug's stored visibility list for a NAMED field, through
	 * the normalized lookup, mirroring how replay() decides which override applies:
	 * for a submenu child ($parent_slug given), a qualified `parent>child` override
	 * wins first, then a bare fallback — except a bare key that also names a
	 * rendered TOP-LEVEL row, which under schema v2 belongs to that top-level row
	 * alone (see Config::SCHEMA_VERSION); for a top-level row ($parent_slug null),
	 * only the bare key is consulted — never a same-slug submenu's qualified
	 * override. Returns an empty array when nothing (unambiguous) resolves.
	 *
	 * PARAMETERIZED BY FIELD (ROLE-02), deliberately. This function encodes three
	 * rules the per-user axis must inherit *identically* — qualified-first lookup,
	 * the schema-v2 bare-key gate (the v1.4.1 fix from PR #115), and the Axis-1
	 * ambiguity guard. A parallel resolved_hidden_users() would be a second place
	 * for all three to drift out of sync, which is exactly the defect class already
	 * logged against the editor model in
	 * `todos/pending/2026-08-02-editor-model-replay-axis2-drift.md`. One
	 * implementation, one audit point — per the feasibility note's §2 seam argument.
	 *
	 * @param string      $field             Override field to read ('hidden_roles' | 'hidden_users').
	 * @param string      $slug              Rendered slug (top-level or submenu child).
	 * @param array       $norm_items        Normalized override map from normalized_items().
	 * @param array       $norm_skip         Ambiguous normalized keys from normalized_items().
	 * @param string      $base              Admin base for Slug::normalize().
	 * @param string|null $parent_slug       Rendered parent slug for a submenu child, or
	 *                                       null for a top-level row.
	 * @param array       $top_rendered_keys Normalized keys of every rendered top-level
	 *                                       row, as a set. Mirrors replay()'s
	 *                                       $top_rendered_matches for the v2 gate.
	 * @return array
	 */
	private function resolved_override_list( $field, $slug, array $norm_items, array $norm_skip, $base, $parent_slug = null, array $top_rendered_keys = array() ) {
		$nk = Slug::normalize( (string) $slug, $base );
		if ( '' === $nk ) {
			return array();
		}

		if ( null !== $parent_slug ) {
			$norm_parent = Slug::normalize( (string) $parent_slug, $base );
			if ( '' !== $norm_parent ) {
				$qnk = $norm_parent . Slug::QUALIFIED_SEPARATOR . $nk;
				if ( ! isset( $norm_skip[ $qnk ] ) && isset( $norm_items[ $qnk ][ $field ] ) ) {
					return $norm_items[ $qnk ][ $field ];
				}
			}

			// A bare key that also names a rendered TOP-LEVEL row is ambiguous;
			// under schema v2 it belongs to that top-level row only. Must mirror
			// replay()'s $bare_fallback_allowed gate exactly, or the editor popover
			// would show targets checked that replay no longer applies.
			if ( isset( $top_rendered_keys[ $nk ] ) && ! $this->config->is_legacy_bare_key_schema() ) {
				return array();
			}
		}

		if ( isset( $norm_skip[ $nk ] ) || ! isset( $norm_items[ $nk ][ $field ] ) ) {
			return array();
		}
		return $norm_items[ $nk ][ $field ];
	}

	/**
	 * Resolve a top-level rendered slug's stored child-axis list for a NAMED field,
	 * through the SAME normalized bare-key lookup replay() consults for the parent's
	 * own override (the child axes are a parent-only concept — never resolved via a
	 * qualified submenu key). Returns an empty array when nothing (or something
	 * ambiguous) resolves — the untouched, no-op case.
	 *
	 * Parameterized by field for the same reason resolved_override_list() is: the
	 * per-user child axis must resolve through one implementation, not a copy.
	 *
	 * @param string $field      Override field to read ('child_hidden_roles' | 'child_hidden_users').
	 * @param string $slug       Rendered top-level slug.
	 * @param array  $norm_items Normalized override map from normalized_items().
	 * @param array  $norm_skip  Ambiguous normalized keys from normalized_items().
	 * @param string $base       Admin base for Slug::normalize().
	 * @return array
	 */
	private function resolved_child_override_list( $field, $slug, array $norm_items, array $norm_skip, $base ) {
		$nk = Slug::normalize( (string) $slug, $base );
		if ( '' === $nk || isset( $norm_skip[ $nk ] ) || empty( $norm_items[ $nk ][ $field ] ) ) {
			return array();
		}
		return $norm_items[ $nk ][ $field ];
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

		// Normalized keys of every rendered TOP-LEVEL row — the editor-side mirror
		// of replay()'s $top_rendered_matches. A bare key in this set names a
		// top-level row, so under schema v2 it must not resolve onto a submenu
		// child (see the $bare_fallback_allowed gate in replay()).
		$top_rendered_keys = array();
		foreach ( $menu as $row ) {
			if ( empty( $row[2] ) ) {
				continue;
			}
			$tnk = Slug::normalize( (string) $row[2], $base );
			if ( '' !== $tnk ) {
				$top_rendered_keys[ $tnk ] = true;
			}
		}

		foreach ( $menu as $row ) {
			if ( empty( $row[2] ) || ( isset( $row[4] ) && false !== strpos( (string) $row[4], 'wp-menu-separator' ) ) ) {
				continue; // skip separators in v1.
			}
			$slug = $row[2];

			$node = array(
				'slug'             => $slug,
				'liId'             => $this->li_id( $row ),
				'title'            => isset( $row[0] ) ? wp_strip_all_tags( $row[0] ) : '',
				'icon'             => isset( $row[6] ) ? $row[6] : '',
				'hiddenRoles'      => $this->resolved_override_list( 'hidden_roles', $slug, $norm_items, $norm_skip, $base ),
				// COMPAT-10 (REVISED): parent-only child_hidden_roles, resolved via
				// the SAME normalized bare-key lookup as hiddenRoles above, so the
				// editor popover reflects exactly what replay() will apply.
				// Independent of hiddenRoles above (whether the PARENT is hidden).
				'childHiddenRoles' => $this->resolved_child_override_list( 'child_hidden_roles', $slug, $norm_items, $norm_skip, $base ),
				'submenu'          => array(),
			);

			if ( ! empty( $submenu[ $slug ] ) ) {
				// Each child's qualified `parent>child` identity (COMPAT-04) — so the
				// client and the next full-replace save can address this submenu row
				// independently of a same-slug top-level item. Computed once per
				// parent since it only depends on the (already normalized) top slug.
				$norm_parent = Slug::normalize( (string) $slug, $base );

				foreach ( $submenu[ $slug ] as $sub ) {
					if ( empty( $sub[2] ) ) {
						continue;
					}
					$child_norm    = Slug::normalize( (string) $sub[2], $base );
					$qualified_key = ( '' !== $norm_parent && '' !== $child_norm )
						? $norm_parent . Slug::QUALIFIED_SEPARATOR . $child_norm
						: '';

					$node['submenu'][] = array(
						'slug'         => $sub[2],
						'qualifiedKey' => $qualified_key,
						'title'        => isset( $sub[0] ) ? wp_strip_all_tags( $sub[0] ) : '',
						'hiddenRoles'  => $this->resolved_override_list( 'hidden_roles', $sub[2], $norm_items, $norm_skip, $base, $slug, $top_rendered_keys ),
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
