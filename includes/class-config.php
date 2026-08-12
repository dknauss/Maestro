<?php
/**
 * Storage layer for the menu overrides.
 *
 * The config is a *sparse diff* layered on top of whatever WordPress naturally
 * builds each request. We never store the full menu — only the deltas. That is
 * what makes "reset" trivial: delete the option and the natural menu shines
 * through. No snapshot of defaults to capture or keep in sync.
 *
 * Shape:
 * [
 *   'schema_version' => 2,                               // see SCHEMA_VERSION
 *   'items'     => [
 *       '<slug>' => [
 *           'title'        => 'Custom Title',          // optional
 *           'icon'         => 'dashicons-foo',          // optional, top-level only
 *           'hidden_roles'        => [ 'author', 'editor' ], // optional, roles that DON'T see it
 *           'child_hidden_roles'  => [ 'editor' ],           // optional, top-level only: hides
 *                                                             // ALL live children from these
 *                                                             // roles, independent of whether
 *                                                             // this parent is itself hidden.
 *       ],
 *   ],
 *   'top_order' => [ '<slug>', '<slug>', ... ],          // desired top-level order
 *   'sub_order' => [ '<parent_slug>' => [ '<slug>', ... ] ],
 * ]
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Storage and sanitisation layer for the sparse menu-override config.
 *
 * @package Maestro
 */
class Config {

	/**
	 * Maximum byte length of a stored title (strlen, not mb_strlen — storage-truthful).
	 *
	 * @var int
	 */
	const MAX_TITLE_BYTES = 200;

	/**
	 * Maximum number of items stored in the 'items' map.
	 *
	 * @var int
	 */
	const MAX_ITEMS = 200;

	/**
	 * Maximum number of entries in 'top_order'.
	 *
	 * @var int
	 */
	const MAX_ORDER_ENTRIES = 200;

	/**
	 * Maximum number of children per parent in 'sub_order'.
	 *
	 * @var int
	 */
	const MAX_SUB_ORDER_CHILDREN = 200;

	/**
	 * Maximum number of parent entries in 'sub_order' (bounds the outer loop the
	 * same way MAX_ITEMS bounds 'items' — a real admin has well under 200 menus).
	 *
	 * @var int
	 */
	const MAX_SUB_ORDER_PARENTS = 200;

	/**
	 * Maximum byte length of any single stored slug (item key, top_order entry,
	 * or sub_order parent/child). A real WP admin slug — even a query-arg URL —
	 * is well under 256 bytes; the ceiling is generous headroom while still
	 * bounding a hostile multi-KB slug.
	 *
	 * @var int
	 */
	const MAX_SLUG_BYTES = 512;

	/**
	 * Maximum number of hidden roles per item (far above any real site's role count).
	 *
	 * @var int
	 */
	const MAX_HIDDEN_ROLES = 50;

	/**
	 * Maximum number of hidden users per item, per axis (ROLE-02).
	 *
	 * Deliberately the same ceiling as MAX_HIDDEN_ROLES. Unlike roles, a site can
	 * legitimately have far more users than this cap — but per-user hiding targets
	 * named individuals, and a rule naming more than 50 of them is a role rule
	 * expressed the hard way. The cap bounds the stored payload the same way
	 * MAX_HIDDEN_ROLES does, and the picker is an async search precisely so it
	 * never invites bulk-selecting a whole user base.
	 *
	 * @var int
	 */
	const MAX_HIDDEN_USERS = 50;

	/**
	 * Maximum byte length of a data-URI icon (128 KB raw string).
	 * ~57x the largest bundled Bootstrap icon (2,242 bytes). A truncated
	 * base64 string is corrupt, so over-limit data-URIs are dropped to ''.
	 *
	 * @var int
	 */
	const MAX_DATA_URI_BYTES = 131072;

	/**
	 * Maximum byte length of a 'url'-form icon (http(s)/protocol-relative/
	 * root-relative image URL). 2 KB is above the practical browser URL limit,
	 * so it never rejects a real image URL while bounding a hostile multi-KB
	 * string the url branch would otherwise store without any length check.
	 *
	 * @var int
	 */
	const MAX_ICON_URL_BYTES = 2048;

	/**
	 * Aggregate ceiling on the serialized size of a stored config (1 MB).
	 *
	 * Generous by design: a realistic power-user config with a handful of
	 * data-URI icons (each capped at MAX_DATA_URI_BYTES = 128 KB) stays well
	 * under this — five 128 KB icons plus titles/roles is ~0.65 MB. The ceiling
	 * exists only to refuse the pathological multi-MB payload (e.g. 200 max
	 * items each carrying a 128 KB icon ≈ 25 MB) that would bloat the option
	 * and every admin-request read of it. (The option is stored non-autoloaded —
	 * see save() — so it is never part of the `alloptions` bundle; the cost the
	 * ceiling bounds is the per-admin-request get_option + unserialize, not a
	 * front-end tax.) An over-ceiling save is rejected whole rather than
	 * truncated — a partial config is worse than the prior one.
	 *
	 * @var int
	 */
	const MAX_CONFIG_BYTES = 1048576;

	/**
	 * Schema version stamped onto every config this plugin writes.
	 *
	 * What it gates (v1 → v2, COMPAT-04 completion):
	 *
	 * - **v1 (absent key)** — written by <= 1.4.0. A BARE item key is ambiguous:
	 *   the editor of that era stored a submenu edit under the child's own bare
	 *   slug, so replay must keep letting a bare key fall through to a same-slug
	 *   submenu row. That is the zero-regression contract for configs saved
	 *   before qualified `parent>child` keys existed.
	 * - **v2** — written by every later version. The editor addresses every
	 *   submenu row by its qualified `parent>child` key, so a bare key that
	 *   COLLIDES with its parent's own key can only ever have meant the
	 *   top-level row. Replay stops applying such a key to the child, which is
	 *   what makes a top-level-only edit stop propagating to a same-slug child.
	 *   A bare key that does NOT collide with its parent names exactly one
	 *   rendered row and keeps applying — the narrowing is only about ambiguity.
	 *
	 * The migration is self-healing and needs no upgrade routine: the editor
	 * model is built from the ALREADY-REPLAYED globals, so a legacy bare key
	 * that is currently renaming both rows shows up on both nodes, and the next
	 * full-replace save writes a bare top-level key AND a qualified submenu key.
	 * The visible menu is therefore identical across the version bump; only the
	 * stored representation becomes unambiguous.
	 *
	 * @var int
	 */
	const SCHEMA_VERSION = 2;

	/**
	 * In-request cache of the option.
	 *
	 * @var array|null
	 */
	private $cache = null;

	/**
	 * Read the full config.
	 *
	 * @return array
	 */
	public function get() {
		if ( null === $this->cache ) {
			$stored      = get_option( MAESTRO_OPTION, array() );
			$this->cache = is_array( $stored ) ? $stored : array();
		}
		return $this->cache;
	}

	/**
	 * Overwrite the config wholesale with a sanitized payload.
	 *
	 * Save semantics are "full replace": the editor sends the complete desired
	 * config and we store exactly that (after sanitizing). Predictable — what you
	 * saved is what you get.
	 *
	 * @param array $raw Unsanitized incoming config.
	 * @return array The sanitized config that was stored.
	 */
	public function save( array $raw ) {
		$clean = $this->sanitize( $raw );

		// Aggregate ceiling: even with every per-field cap in place, a hostile
		// payload could combine many large-but-legal fields into a multi-MB
		// option. Refuse such a save whole (a truncated config is worse than the
		// prior one) and leave the existing stored config untouched.
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize -- Byte-size measurement only; $clean is our own sanitized scalar/array data (never unserialized), and serialize() mirrors how WP stores the option, so this is the truthful stored-size check.
		if ( strlen( serialize( $clean ) ) > self::MAX_CONFIG_BYTES ) {
			return $this->get();
		}

		update_option( MAESTRO_OPTION, $clean, false );
		$this->cache = $clean;
		return $clean;
	}

	/**
	 * Wipe all customizations. The natural menu returns on the next load.
	 *
	 * @return void
	 */
	public function reset() {
		// ROLE-02 — "Reset All" is still gated only by capability(), so a
		// delegated editor without `list_users` can reach it. Wiping wholesale
		// would let them destroy per-user rules they are not permitted to write,
		// which is the same authorization boundary sanitize() enforces on save —
		// and a boundary that holds on one endpoint and not the other is not a
		// boundary. Reset All therefore means "reset everything you can affect".
		//
		// An administrator is unaffected: they hold `list_users`, so $protected is
		// empty and this is the plain wipe it has always been.
		$protected = current_user_can( 'list_users' )
			? array()
			: $this->protected_user_axes( function_exists( 'admin_url' ) ? admin_url( '' ) : '' );

		if ( $protected ) {
			$items = array();
			foreach ( $protected as $entry ) {
				$items[ $entry['slug'] ] = $entry['axes'];
			}
			update_option(
				MAESTRO_OPTION,
				array(
					'schema_version' => self::SCHEMA_VERSION,
					'items'          => $items,
					'top_order'      => array(),
					'sub_order'      => array(),
				),
				false
			);
			$this->cache = null;
			return;
		}

		delete_option( MAESTRO_OPTION );
		$this->cache = array();
	}

	/**
	 * Stored per-user axes the CURRENT user has no authority to write, indexed by
	 * normalized slug. (ROLE-02)
	 *
	 * Returns `[ normalized_key => [ 'slug' => stored_slug, 'axes' => [...] ] ]`,
	 * carrying the original slug so a restored entry lands under the key it was
	 * stored with rather than a canonicalised one.
	 *
	 * Indexed by NORMALIZED key on purpose: a payload may name the same item in
	 * an equivalent-but-different form (`upload.php?ver=9` for a rule stored as
	 * `upload.php`), which is the expected state after a plugin bumps a cache
	 * buster — slug drift is precisely what Slug::normalize() exists for. Keying
	 * raw would let both spellings survive into storage, and two keys normalizing
	 * to one item are ambiguous, which the Axis-1 guard resolves to "apply
	 * nothing": the rule would be present but inert while the config looked fine.
	 *
	 * @param string $base Admin base for Slug::normalize_qualified().
	 * @return array<string, array{slug: string, axes: array}>
	 */
	private function protected_user_axes( $base ) {
		$existing = $this->get();
		$items    = isset( $existing['items'] ) ? $existing['items'] : array();
		$out      = array();

		foreach ( $items as $slug => $entry ) {
			$axes = array();
			if ( ! empty( $entry['hidden_users'] ) ) {
				$axes['hidden_users'] = $entry['hidden_users'];
			}
			if ( ! empty( $entry['child_hidden_users'] ) ) {
				$axes['child_hidden_users'] = $entry['child_hidden_users'];
			}
			if ( ! $axes ) {
				continue;
			}

			$nk = Slug::normalize_qualified( (string) $slug, $base );
			if ( '' === $nk || isset( $out[ $nk ] ) ) {
				continue; // Unresolvable or already claimed by an earlier key.
			}
			$out[ $nk ] = array(
				'slug' => $slug,
				'axes' => $axes,
			);
		}

		return $out;
	}

	/**
	 * Whether the STORED config predates qualified submenu keys.
	 *
	 * A config with no `schema_version` was written by <= 1.4.0, where a submenu
	 * edit was stored under the child's own bare slug. Replay must keep applying
	 * bare keys to submenu rows for those. Anything we wrote ourselves carries
	 * SCHEMA_VERSION and is unambiguous. See SCHEMA_VERSION.
	 *
	 * An unrecognised FUTURE version is treated as non-legacy: a newer Maestro
	 * writes qualified submenu keys too, so the strict reading is the safe one.
	 *
	 * @return bool
	 */
	public function is_legacy_bare_key_schema() {
		$cfg = $this->get();
		if ( ! isset( $cfg['schema_version'] ) ) {
			return true;
		}
		return (int) $cfg['schema_version'] < 2;
	}

	/**
	 * Per-item override, or null if untouched.
	 *
	 * @param string $slug Menu slug.
	 * @return array|null
	 */
	public function item( $slug ) {
		$cfg = $this->get();
		return isset( $cfg['items'][ $slug ] ) ? $cfg['items'][ $slug ] : null;
	}

	/**
	 * Validate and normalize an incoming config payload.
	 *
	 * Note: we do NOT verify that slugs still correspond to live menu items.
	 * The replay engine applies only what it finds and ignores orphans, so a
	 * stale slug degrades silently rather than erroring.
	 *
	 * @param array $raw Raw payload.
	 * @return array
	 */
	public function sanitize( array $raw ) {
		$out = array(
			// Stamped, never read from the incoming payload: the schema of what we
			// are about to WRITE is decided here, not by the client. See
			// SCHEMA_VERSION for what the version gates.
			'schema_version' => self::SCHEMA_VERSION,
			'items'          => array(),
			'top_order'      => array(),
			'sub_order'      => array(),
		);

		$valid_roles = array_keys( wp_roles()->get_names() );

		// ROLE-02 — SERVER-SIDE gate on the per-user axes.
		//
		// Hiding the picker in the editor is not a control: the REST save is
		// gated by capability(), not by `list_users`, so a delegated editor
		// without `list_users` could POST guessed IDs directly and then read the
		// display names back out of the decorated editor model — enumerating
		// users through Maestro that core would not let them enumerate. The gate
		// therefore lives here, where the write actually happens.
		//
		// Such a saver does not have their existing rules DELETED either: the
		// autosave is full-replace, so silently dropping the axes would let any
		// unrelated edit wipe an administrator's per-user rules. Stored values
		// are preserved verbatim instead — the saver can neither add nor destroy.
		//
		// The protection is ONE mechanism, deliberately. It was three (preserve
		// the submitted item, restore the omitted one, merge an equivalent key)
		// and each was added to patch a path the previous one missed — which is
		// exactly why a fourth path (starving the item cap with junk entries)
		// still got through. A single map, keyed by NORMALIZED slug and given
		// reserved capacity below, has no seams for the next path to slip
		// between.
		$base             = function_exists( 'admin_url' ) ? admin_url( '' ) : '';
		$can_target_users = current_user_can( 'list_users' );
		$protected        = $can_target_users ? array() : $this->protected_user_axes( $base );

		// Validate the incoming IDs with ONE bounded query rather than loading
		// every user ID on the site. The payload caps each axis at
		// MAX_HIDDEN_USERS, so `include` stays small — whereas an unbounded
		// get_users() would make every later autosave pay for a full user-table
		// scan on a large site, forever, once a single per-user rule exists.
		$valid_users = $can_target_users
			? $this->valid_user_ids( self::candidate_user_ids( $raw ) )
			: array();

		// RESERVE capacity for the protected rules before the payload loop runs.
		// Without this, a payload of MAX_ITEMS junk entries fills every slot and
		// the protected rules have nowhere to land — silent destruction by a
		// saver with no authority to write them, achieved with a single crafted
		// POST. Reserving keeps the stored total bounded by MAX_ITEMS exactly as
		// before, and simply means abusive filler is what gets dropped rather
		// than an administrator's rules.
		$item_budget = self::MAX_ITEMS - count( $protected );

		if ( ! empty( $raw['items'] ) && is_array( $raw['items'] ) ) {
			foreach ( $raw['items'] as $slug => $item ) {
				// Qualified `parent>child` submenu keys: clean each half
				// independently and recompose, rather than tag/trim-cleaning
				// the raw string as a whole (Slug::is_qualified() is the same
				// '>' contract used at resolve time in class-slug.php).
				// Decide qualification on the ENTITY-DECODED key, and split that.
				//
				// Slug::is_qualified() looks for a literal '>', but Slug::normalize()
				// html_entity_decodes before it does anything else. So a key written
				// as `a&gt;b` used to be stored as a BARE key here and then resolve
				// as a QUALIFIED one later — silently becoming a different kind of
				// key than the one that was validated, and able to collide with a
				// genuine `a>b`. Deciding on the decoded form makes storage and
				// resolution agree, which is the property the Axis-1 guard assumes.
				//
				// Only the DECISION and the SPLIT use the decoded value. A bare key
				// is still stored exactly as sent — "storage stays raw" is the
				// contract normalize() is written against, and widening the decode
				// to every key would rewrite `&amp;` slugs that FIX-03 already
				// resolves correctly in either form.
				$decoded_key  = html_entity_decode( (string) $slug, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
				$is_qualified = Slug::is_qualified( $decoded_key );
				if ( $is_qualified ) {
					list( $parent_half, $child_half ) = Slug::split_qualified( $decoded_key );
					$parent_half                      = $this->clean_slug( $parent_half );
					$child_half                       = $this->clean_slug( $child_half );

					if ( '' === $parent_half || '' === $child_half ) {
						continue; // Malformed qualified key — skip, mirroring an empty bare slug.
					}

					$slug = $parent_half . Slug::QUALIFIED_SEPARATOR . $child_half;
				} else {
					$slug = $this->clean_slug( $slug );
				}

				$entry = array();

				if ( isset( $item['title'] ) && '' !== trim( (string) $item['title'] ) ) {
					$title          = self::truncate_bytes( sanitize_text_field( $item['title'] ), self::MAX_TITLE_BYTES );
					$entry['title'] = $title;
				}

				// Icons stay top-level only — WP submenu rows have no icon
				// slot, so a qualified (submenu) key never carries one even
				// if the incoming payload sent one.
				if ( isset( $item['icon'] ) && ! $is_qualified ) {
					$icon = self::sanitize_icon( $item['icon'] );
					if ( '' !== $icon ) {
						$entry['icon'] = $icon;
					}
				}

				if ( ! empty( $item['hidden_roles'] ) && is_array( $item['hidden_roles'] ) ) {
					$roles = array_values(
						array_intersect( array_map( 'sanitize_key', $item['hidden_roles'] ), $valid_roles )
					);
					if ( count( $roles ) > self::MAX_HIDDEN_ROLES ) {
						$roles = array_slice( $roles, 0, self::MAX_HIDDEN_ROLES );
					}
					if ( $roles ) {
						$entry['hidden_roles'] = $roles;
					}
				}

				// COMPAT-10 (REVISED): child_hidden_roles is a per-PARENT
				// (top-level) concept only — a qualified submenu key never
				// carries it, mirroring the icon rule above. Independent of
				// the parent's own hidden_roles: hides ALL of the parent's
				// live children from these roles, with the parent left
				// visible. Same shape/caps as hidden_roles.
				if ( ! $is_qualified && ! empty( $item['child_hidden_roles'] ) && is_array( $item['child_hidden_roles'] ) ) {
					$roles = array_values(
						array_intersect( array_map( 'sanitize_key', $item['child_hidden_roles'] ), $valid_roles )
					);
					if ( count( $roles ) > self::MAX_HIDDEN_ROLES ) {
						$roles = array_slice( $roles, 0, self::MAX_HIDDEN_ROLES );
					}
					if ( $roles ) {
						$entry['child_hidden_roles'] = $roles;
					}
				}

				// ROLE-02: the per-user analog of hidden_roles. Valid at BOTH key
				// scopes (bare top-level and qualified submenu), exactly as
				// hidden_roles is — only the child_* axis below is parent-only.
				if ( ! $can_target_users ) {
					// Saver cannot target users: attach whatever was stored for
					// this item and ignore what the payload claims. Matched on the
					// NORMALIZED key so an equivalent spelling of the same slug
					// (`upload.php?ver=9` vs `upload.php`) lands here rather than
					// producing a second entry later — two keys normalizing to one
					// item are ambiguous, and the Axis-1 guard resolves ambiguity
					// to "apply nothing", which would leave the rule stored but
					// inert while the config still looked healthy.
					$nk = Slug::normalize_qualified( (string) $slug, $base );
					if ( '' !== $nk && isset( $protected[ $nk ] ) ) {
						$entry = array_merge( $entry, $protected[ $nk ]['axes'] );
						unset( $protected[ $nk ] ); // Claimed; do not re-add below.
					}
				} else {
					if ( ! empty( $item['hidden_users'] ) && is_array( $item['hidden_users'] ) ) {
						$users = $this->clean_user_ids( $item['hidden_users'], $valid_users );
						if ( $users ) {
							$entry['hidden_users'] = $users;
						}
					}

					// ROLE-02: the per-user analog of child_hidden_roles. Per-PARENT
					// (top-level) only — a qualified submenu key has no children, so
					// the axis is dropped there under the same guard.
					if ( ! $is_qualified && ! empty( $item['child_hidden_users'] ) && is_array( $item['child_hidden_users'] ) ) {
						$users = $this->clean_user_ids( $item['child_hidden_users'], $valid_users );
						if ( $users ) {
							$entry['child_hidden_users'] = $users;
						}
					}
				}

				if ( $entry ) {
					$out['items'][ $slug ] = $entry;
					if ( count( $out['items'] ) >= $item_budget ) {
						break; // Deterministic: first N slugs in incoming object order win.
					}
				}
			}
		}

		// Anything still unclaimed names an item the payload never mentioned (in
		// any spelling). Its entry exists only to hold the rule, so re-create it.
		// The budget reserved above guarantees room.
		foreach ( $protected as $unclaimed ) {
			$out['items'][ $unclaimed['slug'] ] = $unclaimed['axes'];
		}

		if ( ! empty( $raw['top_order'] ) && is_array( $raw['top_order'] ) ) {
			$out['top_order'] = array_slice(
				array_values( array_map( array( $this, 'clean_slug' ), $raw['top_order'] ) ),
				0,
				self::MAX_ORDER_ENTRIES
			);
		}

		if ( ! empty( $raw['sub_order'] ) && is_array( $raw['sub_order'] ) ) {
			foreach ( $raw['sub_order'] as $parent => $children ) {
				if ( is_array( $children ) ) {
					$out['sub_order'][ $this->clean_slug( $parent ) ] = array_slice(
						array_values( array_map( array( $this, 'clean_slug' ), $children ) ),
						0,
						self::MAX_SUB_ORDER_CHILDREN
					);
					if ( count( $out['sub_order'] ) >= self::MAX_SUB_ORDER_PARENTS ) {
						break; // Deterministic: first N parents in incoming object order win.
					}
				}
			}
		}

		return $out;
	}

	/**
	 * Slugs can be query-arg URLs ("edit.php?post_type=page"), so we can't run
	 * them through sanitize_key. We strip tags/encode-nasties but preserve the
	 * ? = . / characters that legitimately appear in core slugs.
	 *
	 * @param string $slug Raw slug.
	 * @return string
	 */
	private function clean_slug( $slug ) {
		$slug = trim( wp_strip_all_tags( (string) $slug ) );
		// Bound a hostile multi-KB slug; a real admin slug is far shorter.
		return self::truncate_bytes( $slug, self::MAX_SLUG_BYTES );
	}

	/**
	 * Every user ID the incoming payload mentions on either per-user axis.
	 *
	 * Read straight off the raw payload so the validating query below can be
	 * bounded by what was actually submitted (at most MAX_HIDDEN_USERS per axis
	 * per item) instead of by the size of the site's user table.
	 *
	 * @param array $raw Raw payload.
	 * @return int[]
	 */
	private static function candidate_user_ids( array $raw ) {
		$ids = array();
		if ( empty( $raw['items'] ) || ! is_array( $raw['items'] ) ) {
			return $ids;
		}
		foreach ( $raw['items'] as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			foreach ( array( 'hidden_users', 'child_hidden_users' ) as $axis ) {
				if ( empty( $item[ $axis ] ) || ! is_array( $item[ $axis ] ) ) {
					continue;
				}
				foreach ( $item[ $axis ] as $id ) {
					if ( is_scalar( $id ) && (int) $id > 0 ) {
						$ids[] = (int) $id;
					}
				}
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * Which of the given candidate IDs belong to a live user (ROLE-02).
	 *
	 * Bounded by the candidate list via `include`, NOT a full user-ID scan. The
	 * autosave is full-replace and preserves existing per-user axes, so an
	 * unbounded query would make every later save on a large site pay for a
	 * whole-user-table read once a single per-user rule exists anywhere.
	 *
	 * @param int[] $candidates IDs mentioned by the payload.
	 * @return int[]
	 */
	private function valid_user_ids( array $candidates ) {
		if ( ! $candidates ) {
			return array(); // No per-user axis in the payload — no query at all.
		}
		return array_map(
			'intval',
			(array) get_users(
				array(
					'include' => $candidates,
					'fields'  => 'ID',
					'number'  => count( $candidates ),
				)
			)
		);
	}

	/**
	 * Clean a raw per-user axis into stored form (ROLE-02).
	 *
	 * Mirrors the hidden_roles pipeline — coerce, intersect against what is live,
	 * then cap — so both axes self-heal identically: an ID whose user is deleted
	 * simply stops matching, and nothing is ever written to the user.
	 *
	 * Order matters. The intersect runs BEFORE the cap so the ceiling counts
	 * usable IDs; capping first could spend all 50 slots on IDs that resolve to
	 * nobody and silently drop the real targets.
	 *
	 * @param array $raw_ids     Incoming IDs (ints or numeric strings).
	 * @param int[] $valid_users Live user IDs from live_user_ids().
	 * @return int[]
	 */
	private function clean_user_ids( $raw_ids, array $valid_users ) {
		$ids = array();
		foreach ( (array) $raw_ids as $id ) {
			// Arrays/objects/null never coerce meaningfully — (int) would turn
			// them into 1 or 0 and invent a target the client never sent.
			if ( ! is_scalar( $id ) ) {
				continue;
			}
			$id = (int) $id;
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}

		$ids = array_values( array_unique( $ids ) );
		$ids = array_values( array_intersect( $ids, $valid_users ) );

		if ( count( $ids ) > self::MAX_HIDDEN_USERS ) {
			$ids = array_slice( $ids, 0, self::MAX_HIDDEN_USERS );
		}

		return $ids;
	}

	/**
	 * Truncate to a BYTE ceiling without splitting a UTF-8 character.
	 *
	 * The bounds here are deliberately byte-based (storage-truthful — they cap
	 * what lands in wp_options), but a bare substr() at a byte offset can cut a
	 * multibyte character in half and leave invalid UTF-8 in the stored config.
	 * That is not merely cosmetic downstream: Title::replace_label()'s
	 * markup-free fast path runs the stored label through htmlspecialchars()
	 * with an explicit flag set, and htmlspecialchars() returns an EMPTY STRING
	 * for invalid UTF-8 — so a CJK/emoji label truncated mid-character rendered
	 * as a BLANK menu item rather than a slightly-clipped one.
	 *
	 * mb_strcut() is exactly this operation (byte ceiling, character boundary).
	 * mbstring is near-universal but not guaranteed by WordPress, so the
	 * fallback chops back at most three bytes until the string is valid UTF-8,
	 * tested with a PCRE /u match (no mbstring dependency). The bound keeps an
	 * already-invalid input from being eaten byte by byte.
	 *
	 * @param string $value     Value to truncate.
	 * @param int    $max_bytes Byte ceiling.
	 * @return string
	 */
	private static function truncate_bytes( $value, $max_bytes ) {
		if ( strlen( $value ) <= $max_bytes ) {
			return $value;
		}

		if ( function_exists( 'mb_strcut' ) ) {
			return mb_strcut( $value, 0, $max_bytes, 'UTF-8' );
		}

		$cut = substr( $value, 0, $max_bytes );
		for ( $i = 0; $i < 3 && '' !== $cut; $i++ ) {
			if ( preg_match( '//u', $cut ) ) {
				break;
			}
			$cut = substr( $cut, 0, -1 );
		}
		return $cut;
	}

	/**
	 * The dashicon-only predicate. A well-formed lowercase dashicons-* class.
	 *
	 * Public + static so it is unit-testable in isolation (it is pure). Kept as a
	 * building block; the broader four-form contract lives in icon_form().
	 *
	 * @param string $icon Candidate icon class.
	 * @return bool
	 */
	public static function is_valid_icon( $icon ) {
		return (bool) preg_match( '/^dashicons-[a-z0-9\-]+$/', (string) $icon );
	}

	/**
	 * Classify an icon candidate into one of WordPress's four native menu-icon
	 * forms (the value that lands at $menu[*][6]), or '' if it doesn't safely
	 * match any of them. This is the security allowlist — pure (preg only),
	 * so it carries dense unit coverage and never trusts an unrecognised string.
	 *
	 *   - 'dashicon' : a dashicons-* class.
	 *   - 'none'     : the literal "none" (blank icon, styled via CSS).
	 *   - 'data'     : a base64 image data-URI (svg+xml / png / gif / jpeg / webp).
	 *                  Rendered as a CSS background-image — a non-executing context,
	 *                  so an SVG's internal markup cannot run script. Deep SVG
	 *                  sanitisation is only needed if we ever inline it (roadmap).
	 *   - 'url'      : an http(s), protocol-relative, or root-relative image URL.
	 *                  Whitespace/quote/angle chars are rejected to forbid CSS or
	 *                  attribute break-out before esc_url_raw() ever runs.
	 *
	 * @param string $icon Candidate icon value.
	 * @return string One of 'dashicon'|'none'|'data'|'url', or '' if rejected.
	 */
	public static function icon_form( $icon ) {
		$icon = (string) $icon;

		if ( '' === $icon ) {
			return '';
		}
		if ( self::is_valid_icon( $icon ) ) {
			return 'dashicon';
		}
		if ( 'none' === $icon ) {
			return 'none';
		}
		if ( preg_match( '#^data:image/(?:svg\+xml|png|gif|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$#', $icon ) ) {
			return 'data';
		}
		if ( preg_match( '#^(?:https?://|//|/)[^\s"\'<>]+$#', $icon ) ) {
			return 'url';
		}
		return '';
	}

	/**
	 * Validate + sanitise an icon to its safe stored form, or '' to drop it.
	 *
	 * Classification is pure (icon_form); only the url branch needs WordPress
	 * (esc_url_raw), which is why the full method is exercised by integration
	 * tests while icon_form() is unit-tested.
	 *
	 * @param string $icon Raw icon value.
	 * @return string Sanitised icon, or '' if invalid.
	 */
	public static function sanitize_icon( $icon ) {
		$icon = (string) $icon;

		switch ( self::icon_form( $icon ) ) {
			case 'dashicon':
				return sanitize_html_class( $icon );
			case 'none':
				return 'none';
			case 'data':
				if ( strlen( $icon ) > self::MAX_DATA_URI_BYTES ) {
					return ''; // Over-limit: a truncated base64 string is corrupt — drop the icon.
				}
				return $icon; // Format-validated above; safe as a background-image source.
			case 'url':
				if ( strlen( $icon ) > self::MAX_ICON_URL_BYTES ) {
					return ''; // Over-limit: a real image URL is far shorter — reject the hostile string.
				}
				$url = esc_url_raw( $icon, array( 'http', 'https' ) );
				return $url ? $url : '';
			default:
				return '';
		}
	}
}
