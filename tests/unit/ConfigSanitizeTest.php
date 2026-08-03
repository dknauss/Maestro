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
		// Reset the in-memory option store the unit bootstrap backs save()/get() with.
		$GLOBALS['maestro_unit_options'] = array();
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
	 * child_hidden_roles (COMPAT-10 REVISED, per-parent, independent of
	 * hidden_roles) — same shape/caps as hidden_roles.
	 * --------------------------------------------------------------------- */

	/**
	 * child_hidden_roles on a top-level item is intersected against valid
	 * roles and stored, mirroring hidden_roles exactly.
	 */
	public function test_child_hidden_roles_valid_roles_stored() {
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'child_hidden_roles' => array( 'role-1', 'role-2' ) ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( array( 'role-1', 'role-2' ), $out['items']['woocommerce']['child_hidden_roles'] );
	}

	/**
	 * An invalid role slug is dropped from child_hidden_roles via the same
	 * array_intersect( ..., valid_roles ) guard hidden_roles uses.
	 */
	public function test_child_hidden_roles_invalid_role_dropped() {
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'child_hidden_roles' => array( 'role-1', 'not-a-real-role' ) ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( array( 'role-1' ), $out['items']['woocommerce']['child_hidden_roles'] );
	}

	/**
	 * MAX_HIDDEN_ROLES caps child_hidden_roles exactly as it caps hidden_roles.
	 */
	public function test_child_hidden_roles_over_cap_truncated() {
		$roles = array();
		for ( $i = 1; $i <= Config::MAX_HIDDEN_ROLES + 1; $i++ ) {
			$roles[] = "role-$i";
		}
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'child_hidden_roles' => $roles ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( Config::MAX_HIDDEN_ROLES, count( $out['items']['woocommerce']['child_hidden_roles'] ) );
	}

	/**
	 * An empty child_hidden_roles array must NOT appear in the stored entry —
	 * default is untouched (no field), not an empty array sitting in storage.
	 */
	public function test_child_hidden_roles_empty_not_stored() {
		$raw = array(
			'items' => array(
				'woocommerce' => array(
					'title'               => 'Shop',
					'child_hidden_roles'  => array(),
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'child_hidden_roles', $out['items']['woocommerce'] );
		$this->assertSame( 'Shop', $out['items']['woocommerce']['title'], 'Sibling fields must still be stored.' );
	}

	/**
	 * When child_hidden_roles is entirely absent from the payload, it must
	 * not appear in the stored entry.
	 */
	public function test_child_hidden_roles_absent_not_stored() {
		$raw = array(
			'items' => array(
				'woocommerce' => array( 'title' => 'Shop' ),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'child_hidden_roles', $out['items']['woocommerce'] );
	}

	/**
	 * child_hidden_roles is a PARENT-only concept: a qualified `parent>child`
	 * submenu key must never carry it, mirroring the icon-drop rule.
	 */
	public function test_child_hidden_roles_dropped_on_qualified_key() {
		$key = 'edit.php?post_type=product>edit.php?post_type=product';
		$raw = array(
			'items' => array(
				$key => array(
					'title'               => 'My Products',
					'child_hidden_roles'  => array( 'role-1' ),
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertArrayNotHasKey( 'child_hidden_roles', $out['items'][ $key ], 'A qualified (submenu) key must never carry child_hidden_roles.' );
		$this->assertSame( 'My Products', $out['items'][ $key ]['title'], 'Title must still survive on the qualified key.' );
	}

	/**
	 * child_hidden_roles coexists with hidden_roles and other existing caps
	 * on the same top-level item, fully independently (REVISED semantics:
	 * the two role sets are unrelated, not "rides the parent hide").
	 */
	public function test_child_hidden_roles_coexists_with_hidden_roles_and_other_caps() {
		$raw = array(
			'items' => array(
				'woocommerce' => array(
					'title'               => 'Shop',
					'hidden_roles'        => array( 'role-1' ),
					'child_hidden_roles'  => array( 'role-2' ),
				),
			),
		);
		$out = $this->config->sanitize( $raw );

		$this->assertSame( 'Shop', $out['items']['woocommerce']['title'] );
		$this->assertSame( array( 'role-1' ), $out['items']['woocommerce']['hidden_roles'] );
		$this->assertSame( array( 'role-2' ), $out['items']['woocommerce']['child_hidden_roles'] );
	}

	/* -----------------------------------------------------------------------
	 * sub_order PARENT count cap (MAX_SUB_ORDER_PARENTS) — S-2
	 * --------------------------------------------------------------------- */

	/**
	 * Exactly MAX_SUB_ORDER_PARENTS parents must all be stored.
	 */
	public function test_sub_order_parents_at_limit_all_stored() {
		$sub = array();
		for ( $i = 1; $i <= Config::MAX_SUB_ORDER_PARENTS; $i++ ) {
			$sub[ "parent-$i" ] = array( 'child-a' );
		}
		$out = $this->config->sanitize( array( 'sub_order' => $sub ) );

		$this->assertSame( Config::MAX_SUB_ORDER_PARENTS, count( $out['sub_order'] ) );
	}

	/**
	 * MAX_SUB_ORDER_PARENTS+1 parents: only the first MAX_SUB_ORDER_PARENTS
	 * stored (insertion order); the surplus parent is dropped.
	 */
	public function test_sub_order_parents_over_by_one_last_dropped() {
		$sub = array();
		for ( $i = 1; $i <= Config::MAX_SUB_ORDER_PARENTS + 1; $i++ ) {
			$sub[ "parent-$i" ] = array( 'child-a' );
		}
		$out = $this->config->sanitize( array( 'sub_order' => $sub ) );

		$this->assertSame( Config::MAX_SUB_ORDER_PARENTS, count( $out['sub_order'] ) );
		$this->assertArrayHasKey( 'parent-1', $out['sub_order'], 'First parent must be kept.' );
		$this->assertArrayNotHasKey( 'parent-' . ( Config::MAX_SUB_ORDER_PARENTS + 1 ), $out['sub_order'], 'Surplus parent must be dropped.' );
	}

	/* -----------------------------------------------------------------------
	 * Slug byte cap (MAX_SLUG_BYTES) — S-2. Applies to item keys, top_order
	 * entries, and sub_order parent/child slugs (all route through clean_slug).
	 * --------------------------------------------------------------------- */

	/**
	 * A bare item-key slug of exactly MAX_SLUG_BYTES bytes is preserved intact.
	 */
	public function test_slug_at_limit_item_key_preserved() {
		$slug = str_repeat( 'a', Config::MAX_SLUG_BYTES );
		$out  = $this->config->sanitize(
			array( 'items' => array( $slug => array( 'title' => 'X' ) ) )
		);

		$this->assertArrayHasKey( $slug, $out['items'], 'An at-limit slug must be stored unchanged.' );
	}

	/**
	 * A bare item-key slug over MAX_SLUG_BYTES is truncated to the cap.
	 */
	public function test_slug_over_limit_item_key_truncated() {
		$slug = str_repeat( 'a', Config::MAX_SLUG_BYTES + 100 );
		$out  = $this->config->sanitize(
			array( 'items' => array( $slug => array( 'title' => 'X' ) ) )
		);

		$stored_key = array_key_first( $out['items'] );
		$this->assertSame( Config::MAX_SLUG_BYTES, strlen( $stored_key ), 'An over-limit item-key slug must be truncated to MAX_SLUG_BYTES.' );
	}

	/**
	 * top_order entries over MAX_SLUG_BYTES are truncated to the cap.
	 */
	public function test_slug_over_limit_top_order_truncated() {
		$slug = str_repeat( 'b', Config::MAX_SLUG_BYTES + 100 );
		$out  = $this->config->sanitize( array( 'top_order' => array( $slug ) ) );

		$this->assertSame( Config::MAX_SLUG_BYTES, strlen( $out['top_order'][0] ), 'An over-limit top_order slug must be truncated.' );
	}

	/**
	 * sub_order parent AND child slugs over MAX_SLUG_BYTES are both truncated.
	 */
	public function test_slug_over_limit_sub_order_parent_and_child_truncated() {
		$parent = str_repeat( 'c', Config::MAX_SLUG_BYTES + 100 );
		$child  = str_repeat( 'd', Config::MAX_SLUG_BYTES + 100 );
		$out    = $this->config->sanitize(
			array( 'sub_order' => array( $parent => array( $child ) ) )
		);

		$stored_parent = array_key_first( $out['sub_order'] );
		$this->assertSame( Config::MAX_SLUG_BYTES, strlen( $stored_parent ), 'An over-limit sub_order parent slug must be truncated.' );
		$this->assertSame( Config::MAX_SLUG_BYTES, strlen( $out['sub_order'][ $stored_parent ][0] ), 'An over-limit sub_order child slug must be truncated.' );
	}

	/* -----------------------------------------------------------------------
	 * URL-icon byte cap (MAX_ICON_URL_BYTES) — S-2. The 'url' branch of
	 * sanitize_icon() previously had no length check.
	 * --------------------------------------------------------------------- */

	/**
	 * A url-form icon of exactly MAX_ICON_URL_BYTES bytes passes through.
	 */
	public function test_icon_url_at_limit_passes_unchanged() {
		$prefix = 'https://example.com/';
		$icon   = $prefix . str_repeat( 'a', Config::MAX_ICON_URL_BYTES - strlen( $prefix ) );
		$this->assertSame( Config::MAX_ICON_URL_BYTES, strlen( $icon ) );
		$this->assertSame( $icon, Config::sanitize_icon( $icon ), 'An at-limit image URL must be accepted.' );
	}

	/**
	 * A url-form icon over MAX_ICON_URL_BYTES is dropped to ''.
	 */
	public function test_icon_url_over_limit_dropped() {
		$prefix = 'https://example.com/';
		$icon   = $prefix . str_repeat( 'a', Config::MAX_ICON_URL_BYTES + 1 - strlen( $prefix ) );
		$this->assertSame( Config::MAX_ICON_URL_BYTES + 1, strlen( $icon ) );
		$this->assertSame( '', Config::sanitize_icon( $icon ), 'An over-limit image URL must be rejected.' );
	}

	/* -----------------------------------------------------------------------
	 * Aggregate ceiling (MAX_CONFIG_BYTES) in save() — S-2.
	 * A payload whose serialized size exceeds the ceiling is rejected whole:
	 * update_option() is never called and the prior config is returned.
	 * --------------------------------------------------------------------- */

	/**
	 * Build N items each carrying a maximal (MAX_DATA_URI_BYTES) valid data-URI
	 * icon, so serialized size scales ~128 KB per item.
	 *
	 * @param int $count Number of items.
	 * @return array Raw config payload.
	 */
	private function config_with_max_icon_items( $count ) {
		$prefix = 'data:image/png;base64,';
		$icon   = $prefix . str_repeat( 'A', Config::MAX_DATA_URI_BYTES - strlen( $prefix ) );
		$items  = array();
		for ( $i = 1; $i <= $count; $i++ ) {
			$items[ "slug-$i" ] = array( 'icon' => $icon );
		}
		return array( 'items' => $items );
	}

	/**
	 * A large-but-in-bounds config (5 maximal icons ≈ 0.64 MB, under the 1 MB
	 * ceiling) is stored normally.
	 */
	public function test_config_under_ceiling_is_stored() {
		$raw = $this->config_with_max_icon_items( 5 );
		$this->assertLessThan( Config::MAX_CONFIG_BYTES, strlen( serialize( $this->config->sanitize( $raw ) ) ), 'Fixture must sit under the ceiling.' );

		$stored = $this->config->save( $raw );

		$this->assertCount( 5, $stored['items'], 'An under-ceiling config must be stored intact.' );
		$this->assertSame( $stored, get_option( MAESTRO_OPTION ), 'The stored option must equal the returned config.' );
	}

	/**
	 * An over-ceiling config (10 maximal icons ≈ 1.28 MB, above the 1 MB
	 * ceiling) is rejected whole: nothing is persisted and the prior (empty)
	 * config is returned unchanged.
	 */
	public function test_config_over_ceiling_rejected_and_prior_kept() {
		$raw = $this->config_with_max_icon_items( 10 );
		$this->assertGreaterThan( Config::MAX_CONFIG_BYTES, strlen( serialize( $this->config->sanitize( $raw ) ) ), 'Fixture must exceed the ceiling.' );

		$returned = $this->config->save( $raw );

		$this->assertSame( array(), $returned, 'An over-ceiling save must return the prior (empty) config, not the rejected payload.' );
		$this->assertFalse( get_option( MAESTRO_OPTION, false ), 'An over-ceiling save must never call update_option().' );
	}
}
