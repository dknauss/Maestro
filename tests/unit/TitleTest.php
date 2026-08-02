<?php
/**
 * Pure unit tests for Maestro\Title::replace_label() — COMPAT-07 badge/HTML
 * preservation on rename. No WordPress, no database.
 *
 * Fixture shapes mirror the R1 BACKLOG COMPAT-07 survey rows: trailing count
 * bubble (WooCommerce Orders), notification span (Yoast SEO update count),
 * wrapping span (WPForms "Addons"), and a trailing upsell badge
 * (Yoast/Elementor PRO) — plus the plain-label and no-text-node edge cases.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Title;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

class TitleTest extends TestCase {

	// -------------------------------------------------------------------------
	// Fixture-driven: markup preserved, only the label text swapped.
	// -------------------------------------------------------------------------

	/**
	 * @return array<string, array{0: string, 1: string, 2: string}>
	 */
	public function fixtures() {
		return array(
			// WooCommerce Orders — trailing count bubble (nested spans, digit-only inner text).
			'woocommerce-trailing-count-bubble' => array(
				'Orders <span class="awaiting-mod count-3"><span class="pending-count">3</span></span>',
				'Sales',
				'Sales <span class="awaiting-mod count-3"><span class="pending-count">3</span></span>',
			),
			// Yoast SEO — trailing notification span (update count).
			'yoast-notification-span'           => array(
				'SEO <span class="update-plugins count-1">1</span>',
				'Optimize',
				'Optimize <span class="update-plugins count-1">1</span>',
			),
			// WPForms Addons — the label itself is WRAPPED in a colour span (not trailing).
			'wpforms-wrapping-span'              => array(
				'<span style="color:#f18500">Addons</span>',
				'Extras',
				'<span style="color:#f18500">Extras</span>',
			),
			// Yoast/Elementor-style upsell badge — trailing PRO wrapper, non-numeric but non-label.
			'upsell-trailing-badge'              => array(
				'Templates <span class="elementor-upsell-badge">PRO</span>',
				'Layouts',
				'Layouts <span class="elementor-upsell-badge">PRO</span>',
			),
			// Plain label, no markup at all — wholesale swap of the single text node.
			'plain-label-no-markup'              => array(
				'Dashboard',
				'Home',
				'Home',
			),
		);
	}

	/**
	 * @dataProvider fixtures
	 *
	 * @param string $live_html_title Rendered live title (may carry markup).
	 * @param string $plain_label     Stored plain-text custom label.
	 * @param string $expected        Expected retitled HTML.
	 */
	public function test_replace_label_preserves_markup( $live_html_title, $plain_label, $expected ) {
		$this->assertSame( $expected, Title::replace_label( $live_html_title, $plain_label ) );
	}

	// -------------------------------------------------------------------------
	// Whitespace: the space separating a trailing badge from the label survives.
	// -------------------------------------------------------------------------

	public function test_leading_trailing_whitespace_preserved_around_trailing_badge() {
		$result = Title::replace_label(
			'Orders <span class="count-3">3</span>',
			'Sales'
		);
		$this->assertSame( 'Sales <span class="count-3">3</span>', $result );
		$this->assertStringNotContainsString( 'Sales<span', $result, 'The separating space before a trailing badge must not be dropped.' );
	}

	// -------------------------------------------------------------------------
	// Upsell-wrapper-style shape: a leading icon-only element with no text,
	// then the label, then a trailing empty decoration element.
	// -------------------------------------------------------------------------

	public function test_leading_icon_element_and_label_preserves_surrounding_elements() {
		$result = Title::replace_label(
			'<span class="dashicons dashicons-star-filled"></span>SEO <span class="wpseo-score-icon"></span>',
			'Search Optimization'
		);
		$this->assertSame(
			'<span class="dashicons dashicons-star-filled"></span>Search Optimization <span class="wpseo-score-icon"></span>',
			$result
		);
	}

	// -------------------------------------------------------------------------
	// No-text-node fallback: icon + digit-only badge, no human-readable label.
	// -------------------------------------------------------------------------

	public function test_no_text_node_returns_null() {
		$this->assertNull(
			Title::replace_label(
				'<span class="wp-menu-image"></span><span class="count-2">2</span>',
				'Anything'
			)
		);
	}

	public function test_empty_title_returns_null() {
		$this->assertNull( Title::replace_label( '', 'Anything' ) );
		$this->assertNull( Title::replace_label( '   ', 'Anything' ) );
	}

	// -------------------------------------------------------------------------
	// Multiple text nodes: the FIRST non-whitespace, non-numeric text node in
	// document order is the primary human-readable label; other sibling text
	// nodes are left untouched (documented chosen rule).
	// -------------------------------------------------------------------------

	public function test_multiple_text_nodes_replaces_first_label_run_only() {
		$result = Title::replace_label(
			'Orders <span class="count-3">3</span> Overdue',
			'Sales'
		);
		$this->assertSame( 'Sales <span class="count-3">3</span> Overdue', $result );
	}

	// -------------------------------------------------------------------------
	// Entity round-trip: a live title with an existing entity, and a plain label
	// containing a literal '&', must not double-encode on output.
	// -------------------------------------------------------------------------

	public function test_entity_bearing_label_round_trips_without_double_encoding() {
		$result = Title::replace_label(
			'Menu &amp; Settings <span class="count-1">1</span>',
			'Rock & Roll'
		);
		$this->assertSame( 'Rock &amp; Roll <span class="count-1">1</span>', $result );
		$this->assertStringNotContainsString( '&amp;amp;', $result, 'The label must not be double-encoded.' );
	}
}
