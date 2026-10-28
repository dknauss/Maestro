<?php
/**
 * The picker's Dashicons set against the font core actually ships.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Registry_Icons;
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

	public function test_icon_set_of_matches_the_real_catalogs() {
		$method = new ReflectionMethod( Assets::class, 'icon_set_of' );
		$method->setAccessible( true );
		$assets = new Assets( new Config(), new Replay( new Config() ) );
		$file   = json_decode( file_get_contents( MAESTRO_DIR . 'assets/icons-bootstrap.json' ), true );

		$this->assertSame( 'dashicons', $method->invoke( $assets, 'dashicons-book' ) );
		$this->assertSame( 'bootstrap', $method->invoke( $assets, $file['icons'][0]['src'] ) );
		// A plugin's own SVG (Yoast, Smush, ...) is not a Bootstrap icon.
		$this->assertSame( '', $method->invoke( $assets, 'data:image/svg+xml;base64,PHN2Zy8+' ) );
		$this->assertSame( '', $method->invoke( $assets, 'none' ) );
		$this->assertSame( '', $method->invoke( $assets, '' ) );
	}

	public function test_wordpress_set_points_at_the_icons_route() {
		$this->require_registry();
		$set = $this->set( 'wordpress' );

		$this->assertArrayNotHasKey( 'icons', $set, 'The registry list loads on demand, not inline.' );
		$this->assertSame( 'data', $set['type'] );
		$this->assertSame( rest_url( 'maestro/v1/icons' ), $set['url'] );
		$this->assertTrue( $set['rest'], 'The picker must send the REST nonce for this set.' );
	}

	public function test_every_core_registry_icon_is_offered_as_a_saveable_svg_data_uri() {
		$this->require_registry();
		$icons = ( new Registry_Icons() )->icons();
		$core  = array_filter(
			\WP_Icons_Registry::get_instance()->get_registered_icons(),
			function ( $icon ) {
				return 0 === strpos( $icon['name'], 'core/' );
			}
		);

		$this->assertGreaterThanOrEqual( count( $core ), count( $icons ), 'Every core icon should be offered.' );
		foreach ( $icons as $icon ) {
			$this->assertStringStartsWith( 'data:image/svg+xml;base64,', $icon['src'], $icon['label'] );
			$this->assertSame( $icon['src'], Config::sanitize_icon( $icon['src'] ), $icon['label'] );
			$svg = base64_decode( substr( $icon['src'], strlen( 'data:image/svg+xml;base64,' ) ) );
			$this->assertStringStartsWith( '<svg', $svg, $icon['label'] );
			$this->assertStringContainsString( 'xmlns="http://www.w3.org/2000/svg"', $svg, $icon['label'] );
			$this->assertStringContainsString( 'fill="#a7aaad"', $svg, 'No-mask browsers get the Bootstrap grey.' );
		}
	}

	public function test_a_plugin_registered_icon_is_offered_with_its_collection() {
		$this->require_registry();
		wp_register_icon_collection( 'maestro-test', array( 'label' => 'Maestro Test' ) );
		wp_register_icon(
			'maestro-test/square',
			array(
				'label'   => 'Square',
				'content' => '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>',
			)
		);

		try {
			$found = null;
			foreach ( ( new Registry_Icons() )->icons() as $icon ) {
				if ( 'Square (Maestro Test)' === $icon['label'] ) {
					$found = $icon;
				}
			}
			$this->assertNotNull( $found, 'A plugin icon is offered, its collection named in the label.' );
			$this->assertStringContainsString( 'maestro test', $found['terms'] );
			$this->assertSame( $found['src'], Config::sanitize_icon( $found['src'] ) );
			// The registry kept no xmlns on this one; an SVG image needs it.
			$this->assertStringContainsString( 'xmlns="http://www.w3.org/2000/svg"', base64_decode( substr( $found['src'], 26 ) ) );
		} finally {
			wp_unregister_icon( 'maestro-test/square' );
			wp_unregister_icon_collection( 'maestro-test' );
		}
	}

	public function test_icon_set_of_recognises_a_registry_icon() {
		$this->require_registry();
		$method = new ReflectionMethod( Assets::class, 'icon_set_of' );
		$method->setAccessible( true );
		$assets = new Assets( new Config(), new Replay( new Config() ) );
		$icons  = ( new Registry_Icons() )->icons();

		$this->assertSame( 'wordpress', $method->invoke( $assets, $icons[0]['src'] ) );
		$this->assertSame( '', $method->invoke( $assets, 'data:image/svg+xml;base64,PHN2Zy8+' ) );
	}

	public function test_data_uri_needs_an_svg() {
		$this->require_registry();
		$this->assertSame( '', Registry_Icons::data_uri( '' ) );
		$this->assertSame( '', Registry_Icons::data_uri( '<p>not an icon</p>' ) );
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

	private function require_registry() {
		if ( ! Registry_Icons::available() ) {
			$this->markTestSkipped( 'The icon registry needs WordPress 7.1.' );
		}
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
