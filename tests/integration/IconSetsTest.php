<?php
/**
 * The picker's Dashicons set against the font core actually ships.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use ReflectionMethod;
use WP_UnitTestCase;

class IconSetsTest extends WP_UnitTestCase {

	public function test_dashicons_set_offers_every_core_glyph_once() {
		$offered = wp_list_pluck( $this->set( 'dashicons' )['icons'], 'id' );

		$this->assertSame( $this->core_glyphs(), $offered );
	}

	public function test_every_offered_dashicon_is_a_saveable_icon() {
		foreach ( $this->set( 'dashicons' )['icons'] as $icon ) {
			$this->assertSame( 'dashicon', Config::icon_form( $icon['id'] ), $icon['id'] );
		}
	}

	/**
	 * One class per distinct glyph, in core's stylesheet order. Core keeps a
	 * few aliases (share1, exerpt-view, ...) on the same code point; offering
	 * both would show the same glyph twice, so the first name wins.
	 *
	 * @return string[]
	 */
	private function core_glyphs() {
		$css = file_get_contents( ABSPATH . WPINC . '/css/dashicons.css' );
		preg_match_all( '/((?:\.dashicons-[a-z0-9-]+:before,?\s*)+)\{\s*content:\s*"([^"]+)"/', $css, $rules, PREG_SET_ORDER );

		$seen    = array();
		$classes = array();
		foreach ( $rules as $rule ) {
			preg_match_all( '/\.(dashicons-[a-z0-9-]+):before/', $rule[1], $names );
			foreach ( $names[1] as $name ) {
				if ( ! isset( $seen[ $rule[2] ] ) ) {
					$seen[ $rule[2] ] = true;
					$classes[]        = $name;
				}
			}
		}
		return $classes;
	}

	private function set( $id ) {
		$method = new ReflectionMethod( Assets::class, 'icon_sets' );
		$method->setAccessible( true );
		$sets = $method->invoke( new Assets( new Config(), new Replay( new Config() ) ) );

		foreach ( $sets as $set ) {
			if ( $id === $set['id'] ) {
				return $set;
			}
		}
		$this->fail( "No icon set '{$id}'" );
	}
}
