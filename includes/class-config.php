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
 *           'hidden_roles' => [ 'author', 'editor' ],   // optional, roles that DON'T see it
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
				$slug  = $this->clean_slug( $slug );
				$entry = array();

				if ( isset( $item['title'] ) && '' !== trim( (string) $item['title'] ) ) {
					$entry['title'] = sanitize_text_field( $item['title'] );
				}

				if ( isset( $item['icon'] ) ) {
					$icon = self::sanitize_icon( $item['icon'] );
					if ( '' !== $icon ) {
						$entry['icon'] = $icon;
					}
				}

				if ( ! empty( $item['hidden_roles'] ) && is_array( $item['hidden_roles'] ) ) {
					$roles = array_values(
						array_intersect( array_map( 'sanitize_key', $item['hidden_roles'] ), $valid_roles )
					);
					if ( $roles ) {
						$entry['hidden_roles'] = $roles;
					}
				}

				if ( $entry ) {
					$out['items'][ $slug ] = $entry;
				}
			}
		}

		if ( ! empty( $raw['top_order'] ) && is_array( $raw['top_order'] ) ) {
			$out['top_order'] = array_values( array_map( array( $this, 'clean_slug' ), $raw['top_order'] ) );
		}

		if ( ! empty( $raw['sub_order'] ) && is_array( $raw['sub_order'] ) ) {
			foreach ( $raw['sub_order'] as $parent => $children ) {
				if ( is_array( $children ) ) {
					$out['sub_order'][ $this->clean_slug( $parent ) ] =
						array_values( array_map( array( $this, 'clean_slug' ), $children ) );
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
		$slug = wp_strip_all_tags( (string) $slug );
		return trim( $slug );
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
				return $icon; // Format-validated above; safe as a background-image source.
			case 'url':
				$url = esc_url_raw( $icon, array( 'http', 'https' ) );
				return $url ? $url : '';
			default:
				return '';
		}
	}
}
