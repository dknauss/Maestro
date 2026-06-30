<?php
/**
 * Pure unit tests for Maestro\Slug::normalize(). No WordPress, no database —
 * just the normalization contract. Six R1 fixtures (plus their volatile-param
 * twins), a four-case collision guard, idempotency, plain-slug no-op, and
 * explicit edge/malformed rows.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Slug;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

class SlugTest extends TestCase {

	/**
	 * Admin base passed into normalize() for internal wp-admin URL fixtures.
	 * Matches the local dev host used in SURV-02/04 captures.
	 *
	 * @var string
	 */
	private const ADMIN_BASE = 'http://localhost:8890/wp-admin/';

	// -------------------------------------------------------------------------
	// Data provider
	// -------------------------------------------------------------------------

	/**
	 * Ten R1 fixture rows: [ input, admin_base, expected ].
	 * Each row cites its SURV-NN source.
	 *
	 * @return array<string, array{0: string, 1: string, 2: string}>
	 */
	public function fixtures() {
		return array(
			// SURV-02 I2 (Jetpack Settings) — absolute internal URL, fragment preserved.
			'jetpack-settings'            => array(
				'http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings',
				self::ADMIN_BASE,
				'admin.php?page=jetpack#/settings',
			),
			// SURV-02 I2 host-moved twin — different scheme+host, same admin path.
			'jetpack-settings-host-moved' => array(
				'https://example.com/wp-admin/admin.php?page=jetpack#/settings',
				self::ADMIN_BASE,
				'admin.php?page=jetpack#/settings',
			),
			// SURV-04 I230 (Elementor Website Templates) — ver= stripped, fragment kept, params sorted.
			'elementor-templates'         => array(
				'http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library',
				self::ADMIN_BASE,
				'admin.php?page=elementor-app&return_to&source=wp_db_templates_menu#/kit-library',
			),
			// SURV-04 I230 ver-bumped twin — only ver= changed; must normalize equal.
			'elementor-templates-ver-bump' => array(
				'http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.2.0&return_to&source=wp_db_templates_menu#/kit-library',
				self::ADMIN_BASE,
				'admin.php?page=elementor-app&return_to&source=wp_db_templates_menu#/kit-library',
			),
			// SURV-05 I4 (WPForms Upgrade) — external URL, all utm_* stripped, no trailing ?.
			'wpforms-upgrade'             => array(
				'https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US',
				self::ADMIN_BASE,
				'wpforms.com/lite-upgrade/',
			),
			// SURV-05 I4 UTM-drift twin — different utm values; must normalize equal.
			'wpforms-upgrade-utm-drift'   => array(
				'https://wpforms.com/lite-upgrade/?utm_campaign=other&utm_source=elsewhere',
				self::ADMIN_BASE,
				'wpforms.com/lite-upgrade/',
			),
			// SURV-04 I229 (Elementor Categories) — &amp; entity-encoded, params sorted.
			'elementor-categories-amp'    => array(
				'edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library',
				self::ADMIN_BASE,
				'edit-tags.php?post_type=elementor_library&taxonomy=elementor_library_category',
			),
			// SURV-04 I229 & twin — bare & instead of &amp;; must normalize equal.
			'elementor-categories-raw'    => array(
				'edit-tags.php?taxonomy=elementor_library_category&post_type=elementor_library',
				self::ADMIN_BASE,
				'edit-tags.php?post_type=elementor_library&taxonomy=elementor_library_category',
			),
			// SURV-01 I3 (WooCommerce Categories) — &amp; entity-encoded, params sorted.
			'woocommerce-categories'      => array(
				'edit-tags.php?taxonomy=product_cat&amp;post_type=product',
				self::ADMIN_BASE,
				'edit-tags.php?post_type=product&taxonomy=product_cat',
			),
			// SURV-06 F5 (LifterLMS Categories) — &amp; entity-encoded, params sorted.
			'lifterlms-categories'        => array(
				'edit-tags.php?taxonomy=course_cat&amp;post_type=course',
				self::ADMIN_BASE,
				'edit-tags.php?post_type=course&taxonomy=course_cat',
			),
		);
	}

	// -------------------------------------------------------------------------
	// Fixture-driven assertions
	// -------------------------------------------------------------------------

	/**
	 * @dataProvider fixtures
	 *
	 * @param string $input      Raw slug / URL from plugin render.
	 * @param string $admin_base Admin base to pass into normalize().
	 * @param string $expected   Expected normalized output.
	 */
	public function test_normalize_fixtures( $input, $admin_base, $expected ) {
		$this->assertSame( $expected, Slug::normalize( $input, $admin_base ) );
	}

	// -------------------------------------------------------------------------
	// Idempotency
	// -------------------------------------------------------------------------

	/**
	 * normalize(normalize(x)) === normalize(x) for every fixture input.
	 *
	 * @dataProvider fixtures
	 *
	 * @param string $input      Raw slug / URL.
	 * @param string $admin_base Admin base.
	 * @param string $expected   (unused — idempotency is the contract here)
	 */
	public function test_idempotent( $input, $admin_base, $expected ) {
		$once  = Slug::normalize( $input, $admin_base );
		$twice = Slug::normalize( $once, $admin_base );
		$this->assertSame( $once, $twice );
	}

	// -------------------------------------------------------------------------
	// Plain-slug no-op
	// -------------------------------------------------------------------------

	/**
	 * Slugs that need no transformation are returned unchanged.
	 */
	public function test_plain_slug_unchanged() {
		$this->assertSame( 'woocommerce', Slug::normalize( 'woocommerce' ) );
		$this->assertSame( 'edit.php', Slug::normalize( 'edit.php' ) );
	}

	// -------------------------------------------------------------------------
	// Collision guard (4 cases)
	// -------------------------------------------------------------------------

	/**
	 * (a) MUST NOT collapse: different taxonomy values stay distinct.
	 * (b) MUST NOT collapse: internal admin slug vs external wpforms.com URL.
	 * (c) MUST merge: ver= is the only difference (Elementor 2 vs 2b).
	 * (d) MUST merge: &amp; vs & (entity-encoding twin).
	 */
	public function test_collision_guard() {
		// (a) distinct taxonomy slugs — must stay distinct.
		$product_cat = Slug::normalize(
			'edit-tags.php?taxonomy=product_cat&amp;post_type=product',
			self::ADMIN_BASE
		);
		$product_tag = Slug::normalize(
			'edit-tags.php?taxonomy=product_tag&amp;post_type=product',
			self::ADMIN_BASE
		);
		$this->assertNotSame( $product_cat, $product_tag, '(a) distinct taxonomies must not collapse' );

		// (b) internal admin page vs external wpforms.com upgrade URL — must stay distinct.
		$internal_upgrade = Slug::normalize(
			'http://localhost:8890/wp-admin/admin.php?page=wpforms-upgrade',
			self::ADMIN_BASE
		);
		$external_upgrade = Slug::normalize(
			'https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US',
			self::ADMIN_BASE
		);
		$this->assertNotSame( $internal_upgrade, $external_upgrade, '(b) internal vs external host must not collapse' );

		// (c) MUST merge: Elementor ver=4.1.4 vs ver=4.2.0 (fixture 2 vs 2b).
		$elementor_old = Slug::normalize(
			'http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library',
			self::ADMIN_BASE
		);
		$elementor_new = Slug::normalize(
			'http://localhost:8890/wp-admin/admin.php?page=elementor-app&ver=4.2.0&return_to&source=wp_db_templates_menu#/kit-library',
			self::ADMIN_BASE
		);
		$this->assertSame( $elementor_old, $elementor_new, '(c) ver= bump must collapse to same key' );

		// (d) MUST merge: &amp; vs & (fixture 4 vs 4b).
		$amp_encoded = Slug::normalize(
			'edit-tags.php?taxonomy=elementor_library_category&amp;post_type=elementor_library',
			self::ADMIN_BASE
		);
		$raw_amp     = Slug::normalize(
			'edit-tags.php?taxonomy=elementor_library_category&post_type=elementor_library',
			self::ADMIN_BASE
		);
		$this->assertSame( $amp_encoded, $raw_amp, '(d) &amp; vs & must collapse to same key' );
	}

	// -------------------------------------------------------------------------
	// Edge / malformed inputs — never throws
	// -------------------------------------------------------------------------

	/**
	 * Empty string returns empty string.
	 */
	public function test_empty_string_returns_empty() {
		$this->assertSame( '', Slug::normalize( '' ) );
	}

	/**
	 * Non-string inputs (null, int) return empty string.
	 */
	public function test_non_string_returns_empty() {
		// @phpstan-ignore-next-line — intentionally testing non-string input.
		$this->assertSame( '', Slug::normalize( null ) );
		// @phpstan-ignore-next-line — intentionally testing non-string input.
		$this->assertSame( '', Slug::normalize( 123 ) );
	}

	/**
	 * Duplicate params are kept (no dedupe), sorted alphabetically.
	 */
	public function test_duplicate_params_kept_and_sorted() {
		$this->assertSame(
			'edit.php?page=a&page=b',
			Slug::normalize( 'edit.php?page=a&page=b' )
		);
	}

	/**
	 * Empty-value param (foo=) is preserved with the = sign.
	 */
	public function test_empty_value_param_preserved() {
		$this->assertSame(
			'edit.php?foo=',
			Slug::normalize( 'edit.php?foo=' )
		);
	}

	/**
	 * Only the first # splits the fragment; subsequent # are part of the fragment.
	 */
	public function test_only_first_hash_splits_fragment() {
		$this->assertSame(
			'admin.php?page=x#a#b',
			Slug::normalize( 'admin.php?page=x#a#b' )
		);
	}

	// -------------------------------------------------------------------------
	// Nested '/wp-admin/' inside a query value must not hijack the host strip
	// -------------------------------------------------------------------------

	/**
	 * A '/wp-admin/' that appears inside a query-string value (e.g. a redirect
	 * param) must NOT be treated as the admin boundary: only the URL PATH is
	 * searched. Otherwise a host-moved key strips down to the nested page
	 * (profile.php) and stops matching the real item. Regression guard for the
	 * exact host-move case the wp-admin strip is meant to fix.
	 */
	public function test_nested_wp_admin_in_query_does_not_hijack_strip() {
		$moved = 'https://newhost.test/wp-admin/admin.php?page=x&redirect=https://site.test/wp-admin/profile.php';

		$this->assertSame(
			'admin.php?page=x&redirect=https://site.test/wp-admin/profile.php',
			Slug::normalize( $moved, self::ADMIN_BASE ),
			'The query value /wp-admin/ must not hijack the path-based host strip.'
		);
	}

	/**
	 * The host-moved absolute form and the current-host relative form of the same
	 * slug (whose query contains a nested /wp-admin/ value) must normalize equal,
	 * so a stored override keeps applying after a host move.
	 */
	public function test_nested_wp_admin_host_move_normalizes_equal() {
		$absolute = 'https://newhost.test/wp-admin/admin.php?page=x&redirect=https://site.test/wp-admin/profile.php';
		$relative = 'admin.php?page=x&redirect=https://site.test/wp-admin/profile.php';

		$this->assertSame(
			Slug::normalize( $relative, self::ADMIN_BASE ),
			Slug::normalize( $absolute, self::ADMIN_BASE ),
			'Host-moved and current-host forms must collapse to the same key.'
		);
	}
}
