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

	public function test_bootstrap_set_points_at_a_versioned_file() {
		$set = $this->set( 'bootstrap' );

		$this->assertArrayNotHasKey( 'icons', $set, 'The Bootstrap list loads on demand, not inline.' );
		$this->assertSame( MAESTRO_URL . 'assets/icons-bootstrap.json?ver=' . MAESTRO_VERSION, $set['url'] );
		$this->assertFileExists( MAESTRO_DIR . 'assets/icons-bootstrap.json' );
	}

	public function test_every_bootstrap_icon_is_a_saveable_svg_data_uri() {
		$file  = json_decode( file_get_contents( MAESTRO_DIR . 'assets/icons-bootstrap.json' ), true );
		$icons = $file['icons'];

		$this->assertGreaterThanOrEqual( 300, count( $icons ), 'The set should be near Dashicons parity.' );
		foreach ( $icons as $icon ) {
			$this->assertStringStartsWith( 'data:image/svg+xml;base64,', $icon['src'], $icon['label'] );
			$this->assertSame( $icon['src'], Config::sanitize_icon( $icon['src'] ), $icon['label'] );
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
