<?php
/**
 * Pure unit tests for Assets::menu_width_css() (Phase 28-02).
 *
 * The rule is the whole of what a stored width adds to an ordinary admin page,
 * so its shape is asserted directly: where it applies, what it touches, and
 * that it never uses !important (so a plugin that does, like Keel or PX, wins).
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Assets;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

/**
 * @covers \Maestro\Assets::menu_width_css
 */
class MenuWidthCssTest extends TestCase {

	public function test_rule_applies_only_to_the_expanded_desktop_menu() {
		$css = Assets::menu_width_css( 240 );

		// Core auto-folds to 36px at 960px and below; the width must not fight it.
		$this->assertStringStartsWith( '@media screen and (min-width: 961px){', $css );
		// Folded is core's 36px rail, so every selector skips it.
		preg_match_all( '/([^{}]+)\{[^{}]*\}/', substr( $css, strlen( '@media screen and (min-width: 961px){' ) ), $rules );
		$this->assertNotEmpty( $rules[1] );
		foreach ( $rules[1] as $selectors ) {
			foreach ( explode( ',', $selectors ) as $selector ) {
				$this->assertStringContainsString( ':not(.folded)', $selector, $selector );
			}
		}
	}

	public function test_rule_sets_the_menu_width_and_the_matching_content_offset() {
		$css = Assets::menu_width_css( 240 );

		foreach ( array( '#adminmenuback', '#adminmenuwrap', '#adminmenu', '#wpcontent', '#wpfooter' ) as $id ) {
			$this->assertStringContainsString( $id, $css );
		}
		$this->assertStringContainsString( 'width:240px', $css );
		$this->assertStringContainsString( 'margin-left:240px', $css );
		// Flyouts open where the wider menu ends, not at core's 160px.
		$this->assertStringContainsString( '.wp-not-current-submenu .wp-submenu{left:240px}', $css );
	}

	public function test_rtl_mirrors_the_offset_and_ltr_rules_stay_out_of_it() {
		$css = Assets::menu_width_css( 240 );

		$this->assertStringContainsString( 'body.rtl:not(.folded) #wpcontent', $css );
		$this->assertStringContainsString( 'margin-right:240px', $css );
		$this->assertStringContainsString( '{right:240px}', $css );
		$this->assertStringContainsString( 'body:not(.rtl):not(.folded) #wpcontent', $css );
	}

	public function test_rule_never_uses_important_so_another_width_source_wins() {
		$this->assertStringNotContainsString( '!important', Assets::menu_width_css( 240 ) );
	}

	public function test_width_is_cast_to_an_integer() {
		$this->assertStringContainsString( 'width:200px', Assets::menu_width_css( '200px;}body{display:none' ) );
	}

	public function test_rule_matches_the_js_preview_byte_for_byte() {
		// tests/js/menu-width.test.mjs asserts the same literal against
		// maestroLogic.menuWidthCss(), so the edit-mode preview is what a reload shows.
		$expected = '@media screen and (min-width: 961px){'
			. 'body:not(.folded) #adminmenuback,body:not(.folded) #adminmenuwrap,body:not(.folded) #adminmenu,'
			. 'body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu{width:240px}'
			. 'body:not(.rtl):not(.folded) #wpcontent,body:not(.rtl):not(.folded) #wpfooter{margin-left:240px}'
			. 'body.rtl:not(.folded) #wpcontent,body.rtl:not(.folded) #wpfooter{margin-right:240px}'
			. 'body:not(.rtl):not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{left:240px}'
			. 'body.rtl:not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{right:240px}'
			. '}';

		$this->assertSame( $expected, Assets::menu_width_css( 240 ) );
	}
}
