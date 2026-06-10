<?php
/**
 * Pure unit tests for the icon validator.
 *
 * `is_valid_icon()` is the dashicon-only predicate (unchanged). `icon_form()`
 * classifies a candidate into one of the four WordPress-native menu-icon forms
 * — dashicon, none, data (base64 image data-URI), url — or '' for anything that
 * doesn't safely match. The classifier is the security allowlist and is pure
 * (preg only); the WP-function-dependent sanitisation is covered by integration.
 *
 * @package AdminMenuCustomizer
 */

namespace AMX\Tests\Unit;

use AMX\Config;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

class IconValidationTest extends TestCase {

	/**
	 * @dataProvider valid_icons
	 */
	public function test_accepts_valid_dashicons( $icon ) {
		$this->assertTrue( Config::is_valid_icon( $icon ) );
	}

	/**
	 * @dataProvider invalid_icons
	 */
	public function test_rejects_invalid_icons( $icon ) {
		$this->assertFalse( Config::is_valid_icon( $icon ) );
	}

	public function valid_icons() {
		return array(
			array( 'dashicons-admin-home' ),
			array( 'dashicons-chart-pie' ),
			array( 'dashicons-a' ),
			array( 'dashicons-store' ),
		);
	}

	public function invalid_icons() {
		return array(
			'missing prefix'   => array( 'admin-home' ),
			'empty suffix'     => array( 'dashicons-' ),
			'uppercase'        => array( 'dashicons-Admin' ),
			'space'            => array( 'dashicons-admin home' ),
			'markup'           => array( '<script>alert(1)</script>' ),
			'url'              => array( 'https://evil.example/x.png' ),
			'empty'            => array( '' ),
			'underscore'       => array( 'dashicons_admin_home' ),
		);
	}

	/* ---- icon_form() : the four native forms + rejection -------------------- */

	/**
	 * @dataProvider icon_forms
	 */
	public function test_icon_form_classifies( $icon, $expected ) {
		$this->assertSame( $expected, Config::icon_form( $icon ) );
	}

	public function icon_forms() {
		return array(
			// Accepted forms.
			'dashicon'           => array( 'dashicons-store', 'dashicon' ),
			'dashicon single'    => array( 'dashicons-a', 'dashicon' ),
			'none literal'       => array( 'none', 'none' ),
			'https url'          => array( 'https://cdn.example.com/i.png', 'url' ),
			'http url'           => array( 'http://example.com/i.svg', 'url' ),
			'protocol-relative'  => array( '//cdn.example.com/i.png', 'url' ),
			'root-relative'      => array( '/wp-content/uploads/i.png', 'url' ),
			'data svg base64'    => array( 'data:image/svg+xml;base64,PHN2Zy8+', 'data' ),
			'data png base64'    => array( 'data:image/png;base64,iVBORw0KGgo=', 'data' ),
			'data webp base64'   => array( 'data:image/webp;base64,UklGRg==', 'data' ),

			// Rejected — return ''.
			'empty'              => array( '', '' ),
			'bare word'          => array( 'admin-home', '' ),
			'uppercase dashicon' => array( 'dashicons-Admin', '' ),
			'javascript uri'     => array( 'javascript:alert(1)', '' ),
			'vbscript uri'       => array( 'vbscript:msgbox(1)', '' ),
			'data html'          => array( 'data:text/html;base64,PHNjcmlwdD4=', '' ),
			'data svg not b64'   => array( 'data:image/svg+xml,<svg onload=alert(1)>', '' ),
			'url with space'     => array( '/x y.png', '' ),
			'url with quote'     => array( '/x".png', '' ),
			'url with angle'     => array( '/x<b>.png', '' ),
			'markup'             => array( '<script>alert(1)</script>', '' ),
		);
	}
}
