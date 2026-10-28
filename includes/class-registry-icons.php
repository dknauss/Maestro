<?php
/**
 * The picker's WordPress icon set, read from core's icon registry (7.1+).
 *
 * Every registered icon (core's library plus any collection a plugin
 * registers) becomes an ordinary `data`-form icon: wp_get_icon()'s SVG,
 * base64-encoded. That is the form the Bootstrap set already uses, so the
 * stored value, Config::sanitize_icon(), Replay's mask path (#172) and
 * export/import need nothing new, and a saved icon keeps rendering if the
 * plugin that registered it goes away.
 *
 * The registry sanitises each icon to <svg>, <path> and <polygon>, so every
 * icon is monochrome path data, which the mask paints in the admin scheme's
 * colours.
 *
 * Route (namespace maestro/v1):
 *   GET /icons -> { icons: [ { label, terms, src } ] }, the Bootstrap file's shape
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the registry icon list and serves it to the picker.
 *
 * @package Maestro
 */
class Registry_Icons {

	/**
	 * The fill Bootstrap icons bake in: what a browser without CSS masks shows.
	 */
	const FALLBACK_FILL = '#a7aaad';

	/**
	 * The list, built once per request.
	 *
	 * @var array|null
	 */
	private $icons = null;

	/**
	 * Register the REST-init hook. Called once, from boot(); other instances
	 * (Assets' own, tests) only build the list.
	 *
	 * @return void
	 */
	public function hooks() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Whether this WordPress has an icon registry (7.1+).
	 *
	 * @return bool
	 */
	public static function available() {
		return function_exists( 'wp_get_icon' )
			&& class_exists( 'WP_Icons_Registry' )
			&& class_exists( 'WP_Icon_Collections_Registry' );
	}

	/**
	 * Register the /icons route.
	 *
	 * @return void
	 */
	public function register_routes() {
		if ( ! self::available() ) {
			return;
		}
		register_rest_route(
			Rest::NS,
			'/icons',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_icons' ),
				'permission_callback' => function () {
					return current_user_can( capability() );
				},
			)
		);
	}

	/**
	 * REST callback.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_icons() {
		return rest_ensure_response( array( 'icons' => $this->icons() ) );
	}

	/**
	 * Whether a stored icon value is one of the registry's icons.
	 *
	 * @param string $icon Icon value from $menu[6].
	 * @return bool
	 */
	public function has( $icon ) {
		if ( ! self::available() ) {
			return false;
		}
		foreach ( $this->icons() as $entry ) {
			if ( $entry['src'] === $icon ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Every registered icon as a picker entry, in registration order.
	 *
	 * An icon that yields no <svg>, or whose data URI would exceed what
	 * Config::sanitize_icon() stores, is left out rather than offered and then
	 * dropped on save.
	 *
	 * @return array[] Each { label, terms, src }.
	 */
	public function icons() {
		if ( null !== $this->icons ) {
			return $this->icons;
		}
		$this->icons = array();
		if ( ! self::available() ) {
			return $this->icons;
		}

		$collections = array();
		foreach ( \WP_Icon_Collections_Registry::get_instance()->get_all_registered() as $collection ) {
			if ( isset( $collection['slug'] ) ) {
				$collections[ (string) $collection['slug'] ] = isset( $collection['label'] ) ? (string) $collection['label'] : (string) $collection['slug'];
			}
		}

		foreach ( \WP_Icons_Registry::get_instance()->get_registered_icons() as $icon ) {
			if ( empty( $icon['name'] ) ) {
				continue;
			}
			$name = (string) $icon['name'];
			$src  = self::data_uri( wp_get_icon( $name, array( 'size' => null ) ) );
			if ( '' === $src || strlen( $src ) > Config::MAX_DATA_URI_BYTES ) {
				continue;
			}

			$parts      = explode( '/', $name, 2 );
			$slug       = isset( $icon['collection'] ) ? (string) $icon['collection'] : $parts[0];
			$collection = isset( $collections[ $slug ] ) ? $collections[ $slug ] : $slug;
			$label      = isset( $icon['label'] ) && '' !== (string) $icon['label'] ? (string) $icon['label'] : $name;
			$words      = str_replace( array( '/', '-' ), ' ', $name );

			$this->icons[] = array(
				// A plugin's collection is named in the tooltip; core's is the tab itself.
				'label' => 'core' === $slug
					/* translators: 1: icon name, 2: icon collection name. */
					? $label : sprintf( __( '%1$s (%2$s)', 'maestro-menu-editor' ), $label, $collection ),
				'terms' => strtolower( $words . ' ' . $collection ),
				'src'   => $src,
			);
		}
		return $this->icons;
	}

	/**
	 * An SVG from wp_get_icon() as a base64 data URI, with the fallback fill.
	 *
	 * The registry strips `fill` from the <svg> element, so without one a
	 * browser that cannot mask would paint the icon black. The fill is the
	 * same grey Bootstrap icons carry; with a mask it is never seen.
	 *
	 * @param string $svg SVG markup.
	 * @return string Data URI, or '' when there is no <svg>.
	 */
	public static function data_uri( $svg ) {
		$svg = (string) $svg;
		if ( '' === $svg ) {
			return '';
		}
		$processor = new \WP_HTML_Tag_Processor( $svg );
		if ( ! $processor->next_tag( 'svg' ) ) {
			return '';
		}
		if ( null === $processor->get_attribute( 'xmlns' ) ) {
			$processor->set_attribute( 'xmlns', 'http://www.w3.org/2000/svg' ); // An SVG image needs its namespace.
		}
		$processor->set_attribute( 'fill', self::FALLBACK_FILL );
		// Decorative attributes from wp_get_icon() mean nothing inside an image.
		$processor->remove_attribute( 'aria-hidden' );
		$processor->remove_attribute( 'focusable' );

		return 'data:image/svg+xml;base64,' . base64_encode( trim( $processor->get_updated_html() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Encodes an SVG for a data URI, as core's own menu icons are.
	}
}
