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
	 * and every autoloaded read of it. An over-ceiling save is rejected whole
	 * rather than truncated — a partial config is worse than the prior one.
	 *
	 * @var int
	 */
	const MAX_CONFIG_BYTES = 1048576;

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
		delete_option( MAESTRO_OPTION );
		$this->cache = array();
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
			'items'     => array(),
			'top_order' => array(),
			'sub_order' => array(),
		);

		$valid_roles = array_keys( wp_roles()->get_names() );

		if ( ! empty( $raw['items'] ) && is_array( $raw['items'] ) ) {
			foreach ( $raw['items'] as $slug => $item ) {
				// Qualified `parent>child` submenu keys: clean each half
				// independently and recompose, rather than tag/trim-cleaning
				// the raw string as a whole (Slug::is_qualified() is the same
				// '>' contract used at resolve time in class-slug.php).
				$is_qualified = Slug::is_qualified( $slug );
				if ( $is_qualified ) {
					list( $parent_half, $child_half ) = Slug::split_qualified( $slug );
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
					$title = sanitize_text_field( $item['title'] );
					if ( strlen( $title ) > self::MAX_TITLE_BYTES ) {
						$title = substr( $title, 0, self::MAX_TITLE_BYTES );
					}
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

				if ( $entry ) {
					$out['items'][ $slug ] = $entry;
					if ( count( $out['items'] ) >= self::MAX_ITEMS ) {
						break; // Deterministic: first N slugs in incoming object order win.
					}
				}
			}
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
		if ( strlen( $slug ) > self::MAX_SLUG_BYTES ) {
			$slug = substr( $slug, 0, self::MAX_SLUG_BYTES ); // Bound a hostile multi-KB slug; a real admin slug is far shorter.
		}
		return $slug;
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
