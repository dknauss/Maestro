<?php
/**
 * PHPStan declarations for WordPress 7.1's icon registry, which the pinned
 * wordpress-stubs predate. Signatures copied from wp-includes/icons.php,
 * class-wp-icons-registry.php and class-wp-icon-collections-registry.php
 * (7.1.3). Analysis only; never loaded by the plugin.
 *
 * @package Maestro
 */

// phpcs:disable

if ( ! function_exists( 'wp_get_icon' ) ) {
	/**
	 * @param string $name
	 * @param array  $args
	 * @return string
	 */
	function wp_get_icon( $name, $args = array() ) {
		return '';
	}
}

if ( ! class_exists( 'WP_Icons_Registry' ) ) {
	class WP_Icons_Registry {
		/** @return WP_Icons_Registry */
		public static function get_instance() {
			return new self();
		}
		/**
		 * @param string $search
		 * @return array[]
		 */
		public function get_registered_icons( $search = '' ) {
			return array();
		}
	}
}

if ( ! class_exists( 'WP_Icon_Collections_Registry' ) ) {
	class WP_Icon_Collections_Registry {
		/** @return WP_Icon_Collections_Registry */
		public static function get_instance() {
			return new self();
		}
		/** @return array[] */
		public function get_all_registered() {
			return array();
		}
	}
}
