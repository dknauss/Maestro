<?php
/**
 * Pure unit tests for Config::sanitize() payload-size caps (HARD-02).
 *
 * All assertions reference Config::MAX_* constants, never literals.
 * WordPress function stubs live in tests/bootstrap-unit.php so the no-WP
 * unit suite can call Config::sanitize() and Config::sanitize_icon().
 *
 * Coverage:
 *  Task 1 — Title byte cap (MAX_TITLE_BYTES), items count cap (MAX_ITEMS),
 *            top_order cap (MAX_ORDER_ENTRIES), sub_order children cap
 *            (MAX_SUB_ORDER_CHILDREN), hidden_roles cap (MAX_HIDDEN_ROLES).
 *  Task 2 — data-URI byte cap (MAX_DATA_URI_BYTES) via sanitize_icon() 'data' branch.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Config;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

/**
 * @covers \Maestro\Config::sanitize
 * @covers \Maestro\Config::sanitize_icon
 */
class ConfigSanitizeTest extends TestCase {

	/** @var Config */
	private $config;

	protected function set_up() {
		parent::set_up();
		$this->config = new Config();
	}

	/* -----------------------------------------------------------------------
	 * Title byte cap (MAX_TITLE_BYTES)
	 * --------------------------------------------------------------------- */

	/**
	 * A title of exactly MAX_TITLE_BYTES bytes must pass through unchanged.
	 */
	public function test_title_at_limit_passes_unchanged() {
		$title = str_repeat( 'a', Config::MAX_TITLE_BYTES );
		$raw   = array(
			'items' => array( 'menu-slug' => array( 'title' => $title ) ),
		);
		$out   = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_TITLE_BYTES, strlen( $out['items']['menu-slug']['title'] ) );
	}

	/**
	 * A title of MAX_TITLE_BYTES+1 bytes must be truncated to MAX_TITLE_BYTES.
	 */
	public function test_title_over_by_one_is_truncated() {
		$title = str_repeat( 'b', Config::MAX_TITLE_BYTES + 1 );
		$raw   = array(
			'items' => array( 'menu-slug' => array( 'title' => $title ) ),
		);
		$out   = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_TITLE_BYTES, strlen( $out['items']['menu-slug']['title'] ) );
	}

	/**
	 * A very long title (500 bytes) must be truncated to MAX_TITLE_BYTES.
	 */
	public function test_title_well_over_is_truncated() {
		$title = str_repeat( 'c', 500 );
		$raw   = array(
			'items' => array( 'menu-slug' => array( 'title' => $title ) ),
		);
		$out   = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_TITLE_BYTES, strlen( $out['items']['menu-slug']['title'] ) );
	}

	/**
	 * An empty/whitespace-only title must not produce a 'title' key (existing behaviour).
	 */
	public function test_empty_title_omitted() {
		$raw = array(
			'items' => array( 'menu-slug' => array( 'title' => '   ' ) ),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'menu-slug', $out['items'] );
	}

	/* -----------------------------------------------------------------------
	 * Items count cap (MAX_ITEMS)
	 * --------------------------------------------------------------------- */

	/**
	 * Exactly MAX_ITEMS slugs must all be stored.
	 */
	public function test_items_at_limit_all_stored() {
		$items = array();
		for ( $i = 1; $i <= Config::MAX_ITEMS; $i++ ) {
			$items[ "slug-$i" ] = array( 'title' => "Title $i" );
		}
		$raw = array( 'items' => $items );
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_ITEMS, count( $out['items'] ) );
	}

	/**
	 * MAX_ITEMS+1 slugs: only first MAX_ITEMS stored (insertion order).
	 */
	public function test_items_over_by_one_last_dropped() {
		$items = array();
		for ( $i = 1; $i <= Config::MAX_ITEMS + 1; $i++ ) {
			$items[ "slug-$i" ] = array( 'title' => "Title $i" );
		}
		$raw = array( 'items' => $items );
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_ITEMS, count( $out['items'] ) );
		$this->assertArrayHasKey( 'slug-1', $out['items'], 'First slug must be present' );
		$this->assertArrayNotHasKey( 'slug-' . ( Config::MAX_ITEMS + 1 ), $out['items'], 'Last slug must be dropped' );
	}

	/* -----------------------------------------------------------------------
	 * top_order cap (MAX_ORDER_ENTRIES)
	 * --------------------------------------------------------------------- */

	/**
	 * Exactly MAX_ORDER_ENTRIES entries must all be stored.
	 */
	public function test_top_order_at_limit_all_stored() {
		$slugs = array();
		for ( $i = 1; $i <= Config::MAX_ORDER_ENTRIES; $i++ ) {
			$slugs[] = "slug-$i";
		}
		$raw = array( 'top_order' => $slugs );
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_ORDER_ENTRIES, count( $out['top_order'] ) );
	}

	/**
	 * MAX_ORDER_ENTRIES+1 entries: only first MAX_ORDER_ENTRIES stored.
	 */
	public function test_top_order_over_by_one_truncated() {
		$slugs = array();
		for ( $i = 1; $i <= Config::MAX_ORDER_ENTRIES + 1; $i++ ) {
			$slugs[] = "slug-$i";
		}
		$raw = array( 'top_order' => $slugs );
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_ORDER_ENTRIES, count( $out['top_order'] ) );
		$this->assertSame( 'slug-1', $out['top_order'][0], 'First entry must be kept' );
	}

	/* -----------------------------------------------------------------------
	 * sub_order children cap (MAX_SUB_ORDER_CHILDREN)
	 * --------------------------------------------------------------------- */

	/**
	 * Exactly MAX_SUB_ORDER_CHILDREN children under one parent must all be stored.
	 */
	public function test_sub_order_children_at_limit_all_stored() {
		$children = array();
		for ( $i = 1; $i <= Config::MAX_SUB_ORDER_CHILDREN; $i++ ) {
			$children[] = "child-$i";
		}
		$raw = array( 'sub_order' => array( 'parent-slug' => $children ) );
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_SUB_ORDER_CHILDREN, count( $out['sub_order']['parent-slug'] ) );
	}

	/**
	 * MAX_SUB_ORDER_CHILDREN+1 children: only first MAX_SUB_ORDER_CHILDREN stored.
	 */
	public function test_sub_order_children_over_by_one_truncated() {
		$children = array();
		for ( $i = 1; $i <= Config::MAX_SUB_ORDER_CHILDREN + 1; $i++ ) {
			$children[] = "child-$i";
		}
		$raw = array( 'sub_order' => array( 'parent-slug' => $children ) );
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_SUB_ORDER_CHILDREN, count( $out['sub_order']['parent-slug'] ) );
		$this->assertSame( 'child-1', $out['sub_order']['parent-slug'][0], 'First child must be kept' );
	}

	/* -----------------------------------------------------------------------
	 * hidden_roles cap (MAX_HIDDEN_ROLES)
	 * The wp_roles() stub in bootstrap-unit.php returns 60 valid roles
	 * (role-1 … role-60), so array_intersect passes them all through and
	 * the slice cap is exercised cleanly.
	 * --------------------------------------------------------------------- */

	/**
	 * Exactly MAX_HIDDEN_ROLES roles must all be stored.
	 */
	public function test_hidden_roles_at_limit_all_stored() {
		$roles = array();
		for ( $i = 1; $i <= Config::MAX_HIDDEN_ROLES; $i++ ) {
			$roles[] = "role-$i";
		}
		$raw = array(
			'items' => array(
				'menu-slug' => array( 'hidden_roles' => $roles ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_HIDDEN_ROLES, count( $out['items']['menu-slug']['hidden_roles'] ) );
	}

	/**
	 * MAX_HIDDEN_ROLES+1 roles: only first MAX_HIDDEN_ROLES stored.
	 */
	public function test_hidden_roles_over_by_one_truncated() {
		$roles = array();
		for ( $i = 1; $i <= Config::MAX_HIDDEN_ROLES + 1; $i++ ) {
			$roles[] = "role-$i";
		}
		$raw = array(
			'items' => array(
				'menu-slug' => array( 'hidden_roles' => $roles ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_HIDDEN_ROLES, count( $out['items']['menu-slug']['hidden_roles'] ) );
	}

	/* -----------------------------------------------------------------------
	 * data-URI byte cap (MAX_DATA_URI_BYTES) — Task 2
	 * Tests Config::sanitize_icon() 'data' branch directly (pure — no esc_url_raw).
	 * --------------------------------------------------------------------- */

	/**
	 * A real small data-URI (well under cap) must pass through unchanged.
	 */
	public function test_data_uri_small_real_passes_unchanged() {
		$icon = 'data:image/svg+xml;base64,PHN2Zy8+';
		$this->assertSame( $icon, Config::sanitize_icon( $icon ) );
	}

	/**
	 * A data-URI of exactly MAX_DATA_URI_BYTES bytes must pass through unchanged.
	 */
	public function test_data_uri_at_limit_passes_unchanged() {
		$prefix = 'data:image/png;base64,';
		$needed = Config::MAX_DATA_URI_BYTES - strlen( $prefix );
		// Fill with valid base64 chars ('A') to reach exactly MAX_DATA_URI_BYTES total.
		$body   = str_repeat( 'A', $needed );
		$icon   = $prefix . $body;
		$this->assertSame( Config::MAX_DATA_URI_BYTES, strlen( $icon ) );
		$this->assertSame( $icon, Config::sanitize_icon( $icon ) );
	}

	/**
	 * A data-URI of MAX_DATA_URI_BYTES+1 bytes must be dropped to '' (not truncated).
	 */
	public function test_data_uri_over_by_one_dropped() {
		$prefix = 'data:image/png;base64,';
		$needed = Config::MAX_DATA_URI_BYTES - strlen( $prefix ) + 1;
		$body   = str_repeat( 'A', $needed );
		$icon   = $prefix . $body;
		$this->assertSame( Config::MAX_DATA_URI_BYTES + 1, strlen( $icon ) );
		$this->assertSame( '', Config::sanitize_icon( $icon ) );
	}

	/**
	 * A data-URI well over the cap must be dropped to ''.
	 */
	public function test_data_uri_well_over_cap_dropped() {
		$prefix = 'data:image/png;base64,';
		$body   = str_repeat( 'A', Config::MAX_DATA_URI_BYTES * 2 );
		$icon   = $prefix . $body;
		$this->assertSame( '', Config::sanitize_icon( $icon ) );
	}

	/**
	 * An empty string must return '' (existing behaviour unchanged).
	 */
	public function test_data_uri_empty_returns_empty() {
		$this->assertSame( '', Config::sanitize_icon( '' ) );
	}

	/* -----------------------------------------------------------------------
	 * Qualified `parent>child` submenu keys (COMPAT-04 foundation, Task 2)
	 * --------------------------------------------------------------------- */

	/**
	 * A qualified `parent>child` items key is preserved (not flattened to the
	 * bare child slug); title and hidden_roles survive under that same key.
	 */
	public function test_qualified_key_preserved_with_title_and_hidden_roles() {
		$key = 'edit.php?post_type=product>edit.php?post_type=product';
		$raw = array(
			'items' => array(
				$key => array(
					'title'        => 'My Products',
					'hidden_roles' => array( 'role-1' ),
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayHasKey( $key, $out['items'], 'Qualified key must be retained as-is, not flattened.' );
		$this->assertSame( 'My Products', $out['items'][ $key ]['title'] );
		$this->assertSame( array( 'role-1' ), $out['items'][ $key ]['hidden_roles'] );
	}

	/**
	 * Regression guard: a bare top-level slug key is unchanged.
	 */
	public function test_bare_top_level_key_unchanged() {
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'title' => 'Shop' ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayHasKey( 'woocommerce', $out['items'] );
		$this->assertSame( 'Shop', $out['items']['woocommerce']['title'] );
	}

	/**
	 * An icon on a qualified submenu key is DROPPED; the same icon on a bare
	 * top-level key is kept (existing behaviour) — submenu rows have no icon slot.
	 */
	public function test_icon_dropped_on_qualified_key_but_kept_on_bare_key() {
		$icon = 'dashicons-cart';
		$key  = 'edit.php?post_type=product>edit.php?post_type=product';
		$raw  = array(
			'items' => array(
				$key            => array(
					'title' => 'My Products',
					'icon'  => $icon,
				),
				'edit.php?post_type=product' => array(
					'title' => 'Products',
					'icon'  => $icon,
				),
			),
		);
		$out  = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'icon', $out['items'][ $key ], 'Qualified (submenu) key must never carry an icon.' );
		$this->assertSame( $icon, $out['items']['edit.php?post_type=product']['icon'], 'Bare top-level key keeps its icon.' );
	}

	/**
	 * Both halves of a qualified key are cleaned via clean_slug independently
	 * so tags/whitespace in either half can't corrupt the stored key.
	 */
	public function test_qualified_key_halves_are_cleaned_independently() {
		$dirty_key = '  edit.php?post_type=product  >  edit.php?post_type=product<b>  ';
		$clean_key = 'edit.php?post_type=product>edit.php?post_type=product';
		$raw       = array(
			'items' => array(
				$dirty_key => array( 'title' => 'My Products' ),
			),
		);
		$out       = $this->config->sanitize( $raw );

		$this->assertArrayHasKey( $clean_key, $out['items'], 'Both halves must be independently tag/whitespace-stripped.' );
	}

	/**
	 * MAX_ITEMS/MAX_TITLE_BYTES/MAX_HIDDEN_ROLES caps still apply per entry
	 * to a qualified-key row exactly as they do to a bare-key row.
	 */
	public function test_qualified_key_entry_still_capped() {
		$key   = 'edit.php?post_type=product>edit.php?post_type=product';
		$title = str_repeat( 'a', Config::MAX_TITLE_BYTES + 50 );
		$roles = array();
		for ( $i = 1; $i <= Config::MAX_HIDDEN_ROLES + 1; $i++ ) {
			$roles[] = "role-$i";
		}
		$raw = array(
			'items' => array(
				$key => array(
					'title'        => $title,
					'hidden_roles' => $roles,
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_TITLE_BYTES, strlen( $out['items'][ $key ]['title'] ) );
		$this->assertSame( Config::MAX_HIDDEN_ROLES, count( $out['items'][ $key ]['hidden_roles'] ) );
	}

	/**
	 * A qualified key whose parent-half or child-half is empty/unparseable is
	 * skipped — no items entry emitted for it — mirroring an empty bare slug.
	 */
	public function test_qualified_key_with_empty_half_skipped() {
		$raw = array(
			'items' => array(
				'>child-only'          => array( 'title' => 'Orphan Child' ),
				'parent-only>'         => array( 'title' => 'Orphan Parent' ),
				'>'                    => array( 'title' => 'Both Empty' ),
				'edit.php?post_type=x' => array( 'title' => 'Valid Bare Key' ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertCount( 1, $out['items'], 'Only the valid bare key should survive.' );
		$this->assertArrayHasKey( 'edit.php?post_type=x', $out['items'] );
	}

	/* -----------------------------------------------------------------------
	 * cascade_hide flag (COMPAT-10, per-parent, default OFF)
	 * --------------------------------------------------------------------- */

	/**
	 * A truthy cascade_hide on a top-level item is stored, normalized to a
	 * real bool `true` (not the raw truthy value that was sent).
	 */
	public function test_cascade_hide_true_stored_as_normalized_bool() {
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'cascade_hide' => 1 ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( true, $out['items']['woocommerce']['cascade_hide'], 'Truthy cascade_hide must normalize to bool true.' );
	}

	/**
	 * An explicit falsey cascade_hide (false) must NOT be stored — default
	 * OFF means absent, not `false` sitting in the array.
	 */
	public function test_cascade_hide_false_not_stored() {
		$raw = array(
			'items' => array(
				'woocommerce' => array(
					'title'        => 'Shop',
					'cascade_hide' => false,
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'cascade_hide', $out['items']['woocommerce'] );
		$this->assertSame( 'Shop', $out['items']['woocommerce']['title'], 'Sibling fields must still be stored.' );
	}

	/**
	 * When cascade_hide is entirely absent from the payload, it must not
	 * appear in the stored entry — this is the default-OFF success criterion.
	 */
	public function test_cascade_hide_absent_not_stored() {
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'title' => 'Shop' ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'cascade_hide', $out['items']['woocommerce'] );
	}

	/**
	 * cascade_hide is a PARENT-only concept: a qualified `parent>child`
	 * submenu key must never carry it, mirroring the icon-drop rule.
	 */
	public function test_cascade_hide_dropped_on_qualified_key() {
		$key = 'edit.php?post_type=product>edit.php?post_type=product';
		$raw = array(
			'items' => array(
				$key => array(
					'title'        => 'My Products',
					'cascade_hide' => true,
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'cascade_hide', $out['items'][ $key ], 'A qualified (submenu) key must never carry cascade_hide.' );
		$this->assertSame( 'My Products', $out['items'][ $key ]['title'], 'Title must still survive on the qualified key.' );
	}

	/**
	 * cascade_hide coexists with hidden_roles and other existing caps on the
	 * same top-level item without interfering with each other.
	 */
	public function test_cascade_hide_coexists_with_hidden_roles_and_other_caps() {
		$raw = array(
			'items' => array(
				'woocommerce' => array(
					'title'        => 'Shop',
					'hidden_roles' => array( 'role-1' ),
					'cascade_hide' => true,
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( 'Shop', $out['items']['woocommerce']['title'] );
		$this->assertSame( array( 'role-1' ), $out['items']['woocommerce']['hidden_roles'] );
		$this->assertTrue( $out['items']['woocommerce']['cascade_hide'] );
	}
}
