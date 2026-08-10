<?php
/**
 * Integration tests for the replay engine: rename / icon / visibility applied
 * to the real $menu / $submenu globals, plus reorder via the menu_order filter.
 * Runs under the WordPress PHPUnit test suite (WP_UnitTestCase).
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class ReplayTest extends WP_UnitTestCase {

	/**
	 * A minimal but realistic top-level menu.
	 *
	 * Row shape: [ title, capability, slug, page_title, classes, menu_id, icon ]
	 */
	private function seed_menu() {
		global $menu, $submenu;

		$menu = array(
			2  => array( 'Dashboard', 'read', 'index.php', '', 'menu-top', 'menu-dashboard', 'dashicons-dashboard' ),
			5  => array( 'Posts', 'edit_posts', 'edit.php', '', 'menu-top', 'menu-posts', 'dashicons-admin-post' ),
			10 => array( 'Media', 'upload_files', 'upload.php', '', 'menu-top', 'menu-media', 'dashicons-admin-media' ),
		);

		$submenu = array(
			'edit.php' => array(
				5  => array( 'All Posts', 'edit_posts', 'edit.php', '' ),
				10 => array( 'Add New', 'edit_posts', 'post-new.php', '' ),
				15 => array( 'Categories', 'manage_categories', 'edit-tags.php?taxonomy=category', '' ),
			),
		);
	}

	public function set_up() {
		parent::set_up();
		$this->seed_menu();
		delete_option( 'maestro_config' );
	}

	private function run_replay() {
		// Fresh Config so the in-request cache reflects what we just saved.
		( new Replay( new Config() ) )->replay();
	}

	public function test_rename_top_level() {
		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Articles' ) ) )
		);

		$this->run_replay();

		global $menu;
		$this->assertSame( 'Articles', $menu[5][0] );
	}

	public function test_icon_swap_top_level() {
		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'icon' => 'dashicons-book' ) ) )
		);

		$this->run_replay();

		global $menu;
		$this->assertSame( 'dashicons-book', $menu[5][6] );
	}

	public function test_custom_image_icon_strips_menu_icon_class() {
		global $menu;
		// Core's own items carry a `menu-icon-*` class whose CSS sets
		// `background-image:none !important` on div.wp-menu-image — which would
		// hide a custom data-URI/URL icon. Replay must drop it for those.
		$menu[5][4] = 'menu-top menu-icon-post';

		$data_uri = 'data:image/svg+xml;base64,PHN2Zy8+';
		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'icon' => $data_uri ) ) )
		);

		$this->run_replay();

		$this->assertSame( $data_uri, $menu[5][6], 'Custom icon should be applied.' );
		$this->assertStringNotContainsString( 'menu-icon-post', $menu[5][4], 'menu-icon-* class must be stripped for custom image icons.' );
		$this->assertStringContainsString( 'menu-top', $menu[5][4], 'Other classes must be preserved.' );
	}

	public function test_dashicon_keeps_menu_icon_class() {
		global $menu;
		$menu[5][4] = 'menu-top menu-icon-post';

		// A dashicon renders via ::before, so the menu-icon-* class is harmless
		// and must be left intact.
		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'icon' => 'dashicons-book' ) ) )
		);

		$this->run_replay();

		$this->assertStringContainsString( 'menu-icon-post', $menu[5][4], 'Dashicon swaps must not strip menu-icon-*.' );
	}

	public function test_rename_submenu_item() {
		( new Config() )->save(
			array( 'items' => array( 'post-new.php' => array( 'title' => 'Write' ) ) )
		);

		$this->run_replay();

		global $submenu;
		$this->assertSame( 'Write', $submenu['edit.php'][10][0] );
	}

	public function test_hidden_from_role_is_removed_for_that_role() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$this->run_replay();

		global $menu;
		$slugs = wp_list_pluck( $menu, 2 );
		$this->assertNotContains( 'upload.php', $slugs, 'Media should be hidden from editors.' );
	}

	public function test_hidden_from_role_still_shows_for_other_roles() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$this->run_replay();

		global $menu;
		$slugs = wp_list_pluck( $menu, 2 );
		$this->assertContains( 'upload.php', $slugs, 'Media should remain for administrators.' );
	}

	public function test_submenu_reorder() {
		( new Config() )->save(
			array(
				'sub_order' => array(
					'edit.php' => array( 'edit-tags.php?taxonomy=category', 'edit.php', 'post-new.php' ),
				),
			)
		);

		$this->run_replay();

		global $submenu;
		$slugs = wp_list_pluck( array_values( $submenu['edit.php'] ), 2 );
		$this->assertSame(
			array( 'edit-tags.php?taxonomy=category', 'edit.php', 'post-new.php' ),
			$slugs
		);
	}

	public function test_top_order_via_menu_order_filter() {
		( new Config() )->save(
			array( 'top_order' => array( 'edit.php', 'index.php', 'upload.php' ) )
		);

		$replay = new Replay( new Config() );
		$result = $replay->reorder_top( array( 'index.php', 'edit.php', 'upload.php' ) );

		$this->assertSame( array( 'edit.php', 'index.php', 'upload.php' ), $result );
	}

	public function test_empty_config_leaves_menu_untouched() {
		$this->run_replay();

		global $menu;
		$this->assertSame( 'Posts', $menu[5][0] );
		$this->assertSame( 'dashicons-admin-post', $menu[5][6] );
	}

	// -----------------------------------------------------------------------
	// HARD-01: custom_menu_order gate (predicate-gated on stored top_order)
	// -----------------------------------------------------------------------

	/**
	 * With no stored top_order, the custom_menu_order filter must return false so
	 * Maestro does not claim core's menu-order machinery when it has no opinion.
	 *
	 * RED: before the fix, class-replay.php:59 registers __return_true unconditionally,
	 * so apply_filters('custom_menu_order', false) returns true — this case must FAIL
	 * in the working tree before the fix lands.
	 */
	public function test_custom_menu_order_off_without_top_order() {
		// No top_order saved — config is empty.
		remove_all_filters( 'custom_menu_order' );
		new Replay( new Config() );

		$this->assertFalse(
			apply_filters( 'custom_menu_order', false ),
			'custom_menu_order must return false when no top_order is stored.'
		);
	}

	/**
	 * With top_order stored as an empty array, the filter still returns false —
	 * an empty order means Maestro has no ordering opinion either.
	 */
	public function test_custom_menu_order_off_with_empty_top_order_array() {
		( new Config() )->save( array( 'top_order' => array() ) );

		remove_all_filters( 'custom_menu_order' );
		new Replay( new Config() );

		$this->assertFalse(
			apply_filters( 'custom_menu_order', false ),
			'custom_menu_order must return false when top_order is an empty array.'
		);
	}

	/**
	 * With a single-entry top_order stored, the filter returns true — Maestro
	 * has an ordering opinion and should engage core's machinery.
	 */
	public function test_custom_menu_order_on_with_single_entry_top_order() {
		( new Config() )->save( array( 'top_order' => array( 'edit.php' ) ) );

		remove_all_filters( 'custom_menu_order' );
		new Replay( new Config() );

		$this->assertTrue(
			apply_filters( 'custom_menu_order', false ),
			'custom_menu_order must return true when top_order has at least one entry.'
		);
	}

	/**
	 * With a multi-entry top_order stored, the filter returns true — same as the
	 * single-entry case, ensures no off-by-one edge in the predicate.
	 */
	public function test_custom_menu_order_on_with_stored_top_order() {
		( new Config() )->save(
			array( 'top_order' => array( 'edit.php', 'index.php', 'upload.php' ) )
		);

		remove_all_filters( 'custom_menu_order' );
		new Replay( new Config() );

		$this->assertTrue(
			apply_filters( 'custom_menu_order', false ),
			'custom_menu_order must return true when top_order is non-empty.'
		);
	}

	// -----------------------------------------------------------------------
	// HARD-01 (cont.): custom_menu_order pass-through (coexistence)
	//
	// The callback is a WP filter; WordPress passes the current filter value as
	// the first argument. When Maestro has no stored order it must return that
	// incoming value UNCHANGED, so an earlier plugin that returned true to enable
	// core's custom menu ordering is not overridden back to false.
	// (Bonus defect from the PR #105 prior-art review; adjacent to COMPAT-05/06.)
	// -----------------------------------------------------------------------

	/**
	 * No stored top_order: an incoming true must pass through as true. Before the
	 * fix the callback ignored its argument and returned false, clobbering an
	 * earlier plugin's opt-in to core menu ordering.
	 */
	public function test_custom_menu_order_passes_through_incoming_true() {
		$replay = new Replay( new Config() );

		$this->assertTrue(
			$replay->has_top_order( true ),
			'With no stored top_order, an incoming true must pass through unchanged.'
		);
	}

	/**
	 * No stored top_order: an incoming false stays false — Maestro adds no
	 * opinion of its own.
	 */
	public function test_custom_menu_order_passes_through_incoming_false() {
		$replay = new Replay( new Config() );

		$this->assertFalse(
			$replay->has_top_order( false ),
			'With no stored top_order, an incoming false must pass through unchanged.'
		);
	}

	/**
	 * A stored top_order claims the filter regardless of the incoming value: even
	 * an incoming false becomes true because Maestro now has an ordering opinion.
	 */
	public function test_custom_menu_order_claims_true_when_top_order_stored() {
		( new Config() )->save( array( 'top_order' => array( 'edit.php' ) ) );
		$replay = new Replay( new Config() );

		$this->assertTrue(
			$replay->has_top_order( false ),
			'A stored top_order must make the callback claim the filter (return true).'
		);
	}

	/**
	 * End-to-end coexistence: an earlier plugin hooks custom_menu_order and
	 * returns true; with no stored top_order Maestro must leave that decision
	 * intact rather than resetting it to false.
	 */
	public function test_custom_menu_order_does_not_override_earlier_plugin() {
		remove_all_filters( 'custom_menu_order' );

		// Earlier plugin enables core's custom menu ordering.
		add_filter( 'custom_menu_order', '__return_true', 5 );

		// Maestro registers its callback at the default priority (10).
		new Replay( new Config() );

		$this->assertTrue(
			apply_filters( 'custom_menu_order', false ),
			'Maestro must not override an earlier plugin that enabled custom menu ordering.'
		);
	}

	// -----------------------------------------------------------------------
	// FIX-01/02/03: Normalized slug resolution — acceptance tests
	// (17-02 Wave 2; full Docker run executes in 17-03)
	// -----------------------------------------------------------------------

	/**
	 * FIX-01 host move: a Jetpack Settings submenu slug registered under one host
	 * (e.g. example.com) is renamed when the override is stored under a different
	 * host (e.g. localhost:8890), because both normalize to the same admin-relative key.
	 *
	 * Rendered slug:  https://example.com/wp-admin/admin.php?page=jetpack#/settings
	 * Stored key:     http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings
	 * Normalized:     admin.php?page=jetpack#/settings (both)
	 */
	public function test_fix01_host_move_submenu_rename_resolves() {
		global $submenu;

		$rendered_slug = 'https://example.com/wp-admin/admin.php?page=jetpack#/settings';
		$stored_key    = 'http://localhost:8890/wp-admin/admin.php?page=jetpack#/settings';

		$submenu['jetpack'] = array(
			5 => array( 'Jetpack Settings', 'manage_options', $rendered_slug, '' ),
		);

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'title' => 'Connectivity' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Connectivity',
			$submenu['jetpack'][5][0],
			'FIX-01: rename must land even when host differs between stored key and rendered slug.'
		);
	}

	/**
	 * FIX-01 ver bump: an Elementor Website Templates slug with ver=4.2.0 is renamed
	 * when the override was stored with ver=4.1.4 — ver param is volatile and dropped
	 * during normalization.
	 *
	 * Rendered slug (ver bumped):  …?page=elementor-app&ver=4.2.0&return_to&source=…#/kit-library
	 * Stored key (old ver):        …?page=elementor-app&ver=4.1.4&return_to&source=…#/kit-library
	 * Normalized:                  admin.php?page=elementor-app&return_to&source=wp_db_templates_menu#/kit-library
	 */
	public function test_fix01_ver_bump_submenu_rename_resolves() {
		global $menu, $submenu;

		$base           = admin_url( '' );
		$rendered_slug  = $base . 'admin.php?page=elementor-app&ver=4.2.0&return_to&source=wp_db_templates_menu#/kit-library';
		$stored_key     = $base . 'admin.php?page=elementor-app&ver=4.1.4&return_to&source=wp_db_templates_menu#/kit-library';

		$submenu['elementor'] = array(
			10 => array( 'Website Templates', 'manage_options', $rendered_slug, '' ),
		);

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'title' => 'Templates Library' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Templates Library',
			$submenu['elementor'][10][0],
			'FIX-01: rename must land even when ver= param has changed.'
		);
	}

	/**
	 * FIX-02 UTM drift: a WPForms external upgrade URL with drifted utm_* params is
	 * renamed when the override was stored with the original utm_* values — all utm_*
	 * params are volatile and dropped during normalization.
	 *
	 * Rendered slug (drifted UTM):  https://wpforms.com/lite-upgrade/?utm_campaign=other&utm_source=elsewhere
	 * Stored key (original UTM):    https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&…
	 * Normalized:                   wpforms.com/lite-upgrade/ (both)
	 */
	public function test_fix02_utm_drift_submenu_rename_resolves() {
		global $submenu;

		$rendered_slug = 'https://wpforms.com/lite-upgrade/?utm_campaign=other&utm_source=elsewhere';
		$stored_key    = 'https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US';

		$submenu['wpforms-overview'] = array(
			50 => array( 'Upgrade to Pro', 'manage_options', $rendered_slug, '' ),
		);

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'title' => 'Go Pro' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Go Pro',
			$submenu['wpforms-overview'][50][0],
			'FIX-02: rename must land even when utm_* params have drifted.'
		);
	}

	/**
	 * FIX-03 entity encoding — &amp; rendered, & stored:
	 * A WooCommerce taxonomy slug rendered with &amp; is renamed when the override
	 * is stored with plain & (and vice-versa).
	 *
	 * Rendered slug: edit-tags.php?taxonomy=product_cat&amp;post_type=product
	 * Stored key:    edit-tags.php?taxonomy=product_cat&post_type=product
	 * Normalized:    edit-tags.php?post_type=product&taxonomy=product_cat (both, after sort)
	 */
	public function test_fix03_ampamp_rendered_plain_stored_submenu_rename_resolves() {
		global $submenu;

		$rendered_slug = 'edit-tags.php?taxonomy=product_cat&amp;post_type=product';
		$stored_key    = 'edit-tags.php?taxonomy=product_cat&post_type=product';

		$submenu['woocommerce'] = array(
			10 => array( 'Product Categories', 'manage_woocommerce', $rendered_slug, '' ),
		);

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'title' => 'Categories' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Categories',
			$submenu['woocommerce'][10][0],
			'FIX-03: rename must land when rendered slug has &amp; and stored key has &.'
		);
	}

	/**
	 * FIX-03 entity encoding — & rendered, &amp; stored (reverse direction).
	 *
	 * Rendered slug: edit-tags.php?taxonomy=product_cat&post_type=product
	 * Stored key:    edit-tags.php?taxonomy=product_cat&amp;post_type=product
	 * Normalized:    edit-tags.php?post_type=product&taxonomy=product_cat (both)
	 */
	public function test_fix03_plain_rendered_ampamp_stored_submenu_rename_resolves() {
		global $submenu;

		$rendered_slug = 'edit-tags.php?taxonomy=product_cat&post_type=product';
		$stored_key    = 'edit-tags.php?taxonomy=product_cat&amp;post_type=product';

		$submenu['woocommerce'] = array(
			10 => array( 'Product Categories', 'manage_woocommerce', $rendered_slug, '' ),
		);

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'title' => 'Cat Items' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Cat Items',
			$submenu['woocommerce'][10][0],
			'FIX-03: rename must land when rendered slug has & and stored key has &amp;.'
		);
	}

	/**
	 * sub_order reorder on encoded child slugs: a sub_order desired list using plain
	 * & separator against &amp;-rendered child slugs still reorders correctly, because
	 * both sides are normalized before comparison.
	 */
	public function test_sub_order_reorder_on_encoded_child_slugs() {
		global $submenu;

		// Children with &amp;-encoded slugs in their natural order.
		$submenu['woocommerce'] = array(
			5  => array( 'Product Categories', 'manage_woocommerce', 'edit-tags.php?taxonomy=product_cat&amp;post_type=product', '' ),
			10 => array( 'Product Tags', 'manage_woocommerce', 'edit-tags.php?taxonomy=product_tag&amp;post_type=product', '' ),
			15 => array( 'All Products', 'manage_woocommerce', 'edit.php?post_type=product', '' ),
		);

		// Desired order using plain & (without entity encoding).
		( new Config() )->save(
			array(
				'sub_order' => array(
					'woocommerce' => array(
						'edit.php?post_type=product',
						'edit-tags.php?taxonomy=product_cat&post_type=product',
						'edit-tags.php?taxonomy=product_tag&post_type=product',
					),
				),
			)
		);

		$this->run_replay();

		$slugs = wp_list_pluck( array_values( $submenu['woocommerce'] ), 2 );
		$this->assertSame(
			array(
				'edit.php?post_type=product',
				'edit-tags.php?taxonomy=product_cat&amp;post_type=product',
				'edit-tags.php?taxonomy=product_tag&amp;post_type=product',
			),
			$slugs,
			'sub_order must reorder children even when desired list uses different entity-encoding than rendered rows.'
		);
	}

	/**
	 * Collision no-op (Axis-1 fail-safe): two distinct stored keys that normalize to
	 * the same key → neither override is applied; items stay at natural title.
	 *
	 * Both keys normalize to the same form (both represent the same WooCommerce
	 * Categories slug, one &amp;-encoded and one &-encoded). The collision guard
	 * must detect this and apply NOTHING.
	 */
	public function test_collision_noop_ambiguous_stored_keys_apply_nothing() {
		global $submenu;

		$slug_amp    = 'edit-tags.php?taxonomy=product_cat&amp;post_type=product';
		$slug_plain  = 'edit-tags.php?taxonomy=product_cat&post_type=product';
		// Both normalize to: edit-tags.php?post_type=product&taxonomy=product_cat

		$submenu['woocommerce'] = array(
			10 => array( 'Product Categories', 'manage_woocommerce', $slug_plain, '' ),
		);

		// Store two DISTINCT keys that normalize to the same key.
		( new Config() )->save(
			array(
				'items' => array(
					$slug_amp   => array( 'title' => 'Ambiguous A' ),
					$slug_plain => array( 'title' => 'Ambiguous B' ),
				),
			)
		);

		$this->run_replay();

		// Neither override should be applied — fail-safe no-op.
		$this->assertSame(
			'Product Categories',
			$submenu['woocommerce'][10][0],
			'Collision no-op: ambiguous normalized keys must leave the item at its natural title.'
		);
	}

	/**
	 * Reorder collision safety: when two live submenu children normalize to the
	 * same key (here they differ only by a volatile ver= param), a saved sub_order
	 * must NOT drop either row. Ordering::submenu emits a slug once, so feeding it
	 * two identically-normalized rows would collapse them — the reorder is skipped
	 * and natural order preserved instead.
	 */
	public function test_sub_order_reorder_preserves_rows_on_normalized_collision() {
		global $submenu;

		$submenu['parent'] = array(
			5  => array( 'Templates A', 'manage_options', 'admin.php?page=tpl&ver=1.0', '' ),
			10 => array( 'Templates B', 'manage_options', 'admin.php?page=tpl&ver=2.0', '' ),
			15 => array( 'Other', 'manage_options', 'admin.php?page=other', '' ),
		);
		// The two 'tpl' rows both normalize to admin.php?page=tpl (ver= dropped).

		( new Config() )->save(
			array(
				'sub_order' => array(
					'parent' => array( 'admin.php?page=other', 'admin.php?page=tpl' ),
				),
			)
		);

		$this->run_replay();

		$slugs = wp_list_pluck( array_values( $submenu['parent'] ), 2 );

		$this->assertCount( 3, $slugs, 'No child row may be dropped on a normalized collision.' );
		$this->assertContains( 'admin.php?page=tpl&ver=1.0', $slugs );
		$this->assertContains( 'admin.php?page=tpl&ver=2.0', $slugs );
		$this->assertContains( 'admin.php?page=other', $slugs );
	}

	/**
	 * Editor model resolves hidden_roles via the SAME normalization replay() uses.
	 * When the stored override key only matches the rendered slug after
	 * normalization (here a host move), get_menu_model() must still report the
	 * hidden roles. A raw $items[$slug] lookup would miss, the visibility panel
	 * would show no checked roles, and the next full-replace autosave would delete
	 * the working rule.
	 */
	public function test_get_menu_model_resolves_hidden_roles_via_normalized_key() {
		global $menu;

		$rendered_slug = 'https://example.com/wp-admin/admin.php?page=jetpack';
		$stored_key    = 'http://oldhost.test/wp-admin/admin.php?page=jetpack';
		// Both normalize (via the /wp-admin/ path boundary) to: admin.php?page=jetpack

		$menu[20] = array( 'Jetpack', 'manage_options', $rendered_slug, '', 'menu-top', 'menu-jetpack', 'dashicons-admin-plugins' );

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$model = ( new Replay( new Config() ) )->get_menu_model();

		$node = null;
		foreach ( $model as $entry ) {
			if ( $entry['slug'] === $rendered_slug ) {
				$node = $entry;
				break;
			}
		}

		$this->assertNotNull( $node, 'Jetpack node must appear in the editor model.' );
		$this->assertSame(
			array( 'editor' ),
			$node['hiddenRoles'],
			'hidden_roles must resolve via normalized key, not a raw slug lookup.'
		);
	}

	/**
	 * Anti-regression guard: a plain already-simple slug (edit.php) with a stored
	 * override still renames exactly as before — normalize() is a no-op on simple slugs
	 * (idempotency guarantees zero behavior change for existing overrides).
	 */
	public function test_simple_slug_override_still_renames_after_normalization() {
		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Articles' ) ) )
		);

		$this->run_replay();

		global $menu;
		$this->assertSame(
			'Articles',
			$menu[5][0],
			'Anti-regression: plain slug overrides must still apply unchanged after normalization wiring.'
		);
	}

	// -----------------------------------------------------------------------
	// COMPAT-04: level-qualified submenu resolution (20-02)
	// -----------------------------------------------------------------------

	/**
	 * Seed a WooCommerce-style shared-slug fixture: a top-level item and its
	 * own first submenu child render the SAME slug (e.g. Products top-level +
	 * "All Products" submenu under itself) — the COMPAT-04 collision surface.
	 */
	private function seed_shared_slug_menu() {
		global $menu, $submenu;

		$menu[20] = array( 'Products', 'manage_woocommerce', 'edit.php?post_type=product', '', 'menu-top', 'menu-posts-product', 'dashicons-tag' );

		$submenu['edit.php?post_type=product'] = array(
			5  => array( 'All Products', 'manage_woocommerce', 'edit.php?post_type=product', '' ),
			10 => array( 'Add Product', 'manage_woocommerce', 'post-new.php?post_type=product', '' ),
		);
	}

	/**
	 * A qualified `parent>child` override renames ONLY the submenu row; the
	 * same-slug top-level item is untouched.
	 */
	public function test_qualified_key_renames_only_submenu_not_top() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php?post_type=product>edit.php?post_type=product' => array( 'title' => 'All Items' ),
				),
			)
		);

		$this->run_replay();

		global $menu, $submenu;
		$this->assertSame( 'All Items', $submenu['edit.php?post_type=product'][5][0], 'Qualified key must rename the submenu row.' );
		$this->assertSame( 'Products', $menu[20][0], 'Qualified submenu key must not touch the same-slug top-level item.' );
	}

	/**
	 * A bare top-level override and a qualified submenu override on the SAME
	 * underlying slug apply independently: each hits only its own scope.
	 */
	public function test_bare_top_override_and_qualified_submenu_override_are_independent() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php?post_type=product'                             => array( 'title' => 'Shop Items' ),
					'edit.php?post_type=product>edit.php?post_type=product' => array( 'title' => 'All Items' ),
				),
			)
		);

		$this->run_replay();

		global $menu, $submenu;
		$this->assertSame( 'Shop Items', $menu[20][0], 'Bare top-level key must rename only the top-level item.' );
		$this->assertSame( 'All Items', $submenu['edit.php?post_type=product'][5][0], 'Qualified key must win for the submenu row over the bare top key.' );
	}

	/**
	 * Zero-regression: a config saved by <= 1.4.0 (schema v1 — no
	 * `schema_version` key) with ONLY a bare submenu key still renames BOTH the
	 * top-level item and the same-slug submenu row, until it is re-saved.
	 *
	 * Written straight to the option rather than through Config::save(), because
	 * save() stamps SCHEMA_VERSION — this fixture must be a genuine pre-v2
	 * config, which is exactly what an upgrading site has on disk.
	 */
	public function test_legacy_v1_bare_submenu_key_still_matches_both_scopes() {
		$this->seed_shared_slug_menu();

		update_option(
			MAESTRO_OPTION,
			array(
				'items'     => array( 'edit.php?post_type=product' => array( 'title' => 'Renamed Everywhere' ) ),
				'top_order' => array(),
				'sub_order' => array(),
			),
			false
		);

		$this->run_replay();

		global $menu, $submenu;
		$this->assertSame( 'Renamed Everywhere', $menu[20][0], 'Legacy bare key must still rename the top-level item.' );
		$this->assertSame(
			'Renamed Everywhere',
			$submenu['edit.php?post_type=product'][5][0],
			'A schema-v1 bare key with no qualified key present must still rename the same-slug submenu row (zero-regression until re-saved).'
		);
	}

	/**
	 * COMPAT-04 completion: in a CURRENT (schema v2) config, a bare key is a
	 * top-level key and nothing else. Renaming only the top-level item must
	 * leave a same-slug submenu row alone — the propagation that v1.4.0 still
	 * had, and that its changelog was corrected for.
	 */
	public function test_v2_bare_top_level_key_does_not_touch_the_same_slug_submenu() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array( 'items' => array( 'edit.php?post_type=product' => array( 'title' => 'Shop Items' ) ) )
		);

		$this->run_replay();

		global $menu, $submenu;
		$this->assertSame( 'Shop Items', $menu[20][0], 'The top-level rename must still apply.' );
		$this->assertSame(
			'All Products',
			$submenu['edit.php?post_type=product'][5][0],
			'A top-level-only rename must NOT propagate to the same-slug submenu row under schema v2.'
		);
	}

	/**
	 * The same isolation for the HIDE axis: a bare top-level hidden_roles rule
	 * must not cosmetically remove the same-slug submenu row.
	 */
	public function test_v2_bare_top_level_hide_does_not_hide_the_same_slug_submenu() {
		$this->seed_shared_slug_menu();
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		( new Config() )->save(
			array( 'items' => array( 'edit.php?post_type=product' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$this->run_replay();

		global $submenu;
		$this->assertArrayHasKey(
			5,
			$submenu['edit.php?post_type=product'],
			'A top-level-only hide must NOT remove the same-slug submenu row under schema v2.'
		);
	}

	/**
	 * Migration is self-healing: the editor model is built from the REPLAYED
	 * globals, so a legacy v1 bare key that is currently retitling both rows
	 * shows the override on both nodes. That is what lets the next
	 * full-replace save write a bare top key AND a qualified child key, so
	 * nothing visible changes when the config crosses to v2.
	 */
	public function test_legacy_v1_bare_key_surfaces_on_both_editor_nodes_for_migration() {
		$this->seed_shared_slug_menu();

		update_option(
			MAESTRO_OPTION,
			array(
				'items'     => array( 'edit.php?post_type=product' => array( 'title' => 'Renamed Everywhere' ) ),
				'top_order' => array(),
				'sub_order' => array(),
			),
			false
		);

		$this->run_replay();
		$model = ( new Replay( new Config() ) )->get_menu_model();

		$top = null;
		foreach ( $model as $node ) {
			if ( 'edit.php?post_type=product' === $node['slug'] ) {
				$top = $node;
				break;
			}
		}

		$this->assertNotNull( $top, 'The shared-slug top-level node must be in the model.' );
		$this->assertSame( 'Renamed Everywhere', $top['title'], 'Top-level node carries the legacy override.' );
		$this->assertSame(
			'Renamed Everywhere',
			$top['submenu'][0]['title'],
			'The submenu node must ALSO carry it, so the next save persists it under a qualified key.'
		);
		$this->assertNotSame( '', $top['submenu'][0]['qualifiedKey'], 'The submenu node must expose a qualified key to save under.' );
	}

	/**
	 * A qualified key whose parent half matches no rendered parent in this
	 * pass is skipped and degrades silently — no misapplied override.
	 */
	public function test_qualified_key_parent_half_miss_skips_silently() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array(
				'items' => array(
					'no-such-parent.php>edit.php?post_type=product' => array( 'title' => 'Should Not Apply' ),
				),
			)
		);

		$this->run_replay();

		global $submenu;
		$this->assertSame(
			'All Products',
			$submenu['edit.php?post_type=product'][5][0],
			'A qualified key whose parent half matches no rendered parent must be skipped silently.'
		);
	}

	/**
	 * Axis-1 collision guard extends to qualified keys: two distinct stored
	 * qualified keys that normalize (ver= dropped) to the SAME qualified key
	 * are ambiguous — apply nothing.
	 */
	public function test_axis1_guard_extends_to_qualified_keys() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php?post_type=product>edit.php?post_type=product&ver=1.0' => array( 'title' => 'Ambiguous A' ),
					'edit.php?post_type=product>edit.php?post_type=product&ver=2.0' => array( 'title' => 'Ambiguous B' ),
				),
			)
		);

		$this->run_replay();

		global $submenu;
		$this->assertSame(
			'All Products',
			$submenu['edit.php?post_type=product'][5][0],
			'Axis-1 collision guard must extend to qualified keys: two stored keys normalizing to one apply nothing.'
		);
	}

	/**
	 * Each half of a qualified key normalizes independently: a host-moved
	 * parent half and a ver=-drifted child half both still resolve to the
	 * live parent/child pair.
	 */
	public function test_qualified_key_normalizes_each_half_independently() {
		$this->seed_shared_slug_menu();

		$stored_key = 'https://oldhost.test/wp-admin/edit.php?post_type=product>edit.php?post_type=product&ver=9.9';

		( new Config() )->save(
			array( 'items' => array( $stored_key => array( 'title' => 'All Items Twin' ) ) )
		);

		$this->run_replay();

		global $menu, $submenu;
		$this->assertSame(
			'All Items Twin',
			$submenu['edit.php?post_type=product'][5][0],
			'Each half of a qualified key must be normalized independently (host-move parent half + ver-drift child half).'
		);
		$this->assertSame( 'Products', $menu[20][0], 'Top-level item must remain untouched by the qualified override.' );
	}

	/**
	 * get_menu_model(): each submenu child node carries its qualified
	 * `parent>child` key alongside its raw slug, so the client and the next
	 * full-replace save can address it independently of a same-slug top-level.
	 */
	public function test_get_menu_model_submenu_node_exposes_qualified_key() {
		$this->seed_shared_slug_menu();

		$model = ( new Replay( new Config() ) )->get_menu_model();

		$top = null;
		foreach ( $model as $entry ) {
			if ( 'edit.php?post_type=product' === $entry['slug'] ) {
				$top = $entry;
				break;
			}
		}
		$this->assertNotNull( $top, 'Shared-slug top-level node must appear in the model.' );

		$children = wp_list_pluck( $top['submenu'], 'qualifiedKey', 'slug' );
		$this->assertSame(
			'edit.php?post_type=product>edit.php?post_type=product',
			$children['edit.php?post_type=product'],
			'Same-slug submenu child must carry its own qualified key.'
		);
		$this->assertSame(
			'edit.php?post_type=product>post-new.php?post_type=product',
			$children['post-new.php?post_type=product'],
			'A different-slug submenu child must carry its own qualified key too.'
		);
	}

	/**
	 * get_menu_model(): a submenu child's hiddenRoles resolves through the
	 * qualified key first — matching exactly what replay() would apply — and
	 * a same-slug top-level node never reflects a qualified submenu-only rule.
	 */
	public function test_get_menu_model_resolves_submenu_hidden_roles_via_qualified_key() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php?post_type=product>edit.php?post_type=product' => array( 'hidden_roles' => array( 'editor' ) ),
				),
			)
		);

		$model = ( new Replay( new Config() ) )->get_menu_model();

		$top = null;
		foreach ( $model as $entry ) {
			if ( 'edit.php?post_type=product' === $entry['slug'] ) {
				$top = $entry;
				break;
			}
		}
		$this->assertSame( array(), $top['hiddenRoles'], 'Top-level node must not reflect the qualified submenu-only rule.' );

		$sub = null;
		foreach ( $top['submenu'] as $child ) {
			if ( 'edit.php?post_type=product' === $child['slug'] ) {
				$sub = $child;
				break;
			}
		}
		$this->assertSame( array( 'editor' ), $sub['hiddenRoles'], 'Submenu node must resolve hiddenRoles via the qualified key.' );
	}

	/**
	 * get_menu_model(): with no qualified key stored, a legacy bare override
	 * still resolves for BOTH the top-level node and the same-slug submenu
	 * node — matching replay()'s legacy fallback so the editor never shows a
	 * rule that the next full-replace save would drop (or vice versa).
	 */
	public function test_get_menu_model_submenu_hidden_roles_fallback_to_legacy_bare_key() {
		$this->seed_shared_slug_menu();

		// A genuine schema-v1 config (no schema_version) — Config::save() would
		// stamp v2, under which a parent-colliding bare key is top-level-only.
		update_option(
			MAESTRO_OPTION,
			array(
				'items'     => array( 'edit.php?post_type=product' => array( 'hidden_roles' => array( 'editor' ) ) ),
				'top_order' => array(),
				'sub_order' => array(),
			),
			false
		);

		$model = ( new Replay( new Config() ) )->get_menu_model();

		$top = null;
		foreach ( $model as $entry ) {
			if ( 'edit.php?post_type=product' === $entry['slug'] ) {
				$top = $entry;
				break;
			}
		}
		$this->assertSame( array( 'editor' ), $top['hiddenRoles'], 'Legacy bare key must still resolve for the top-level node.' );

		$sub = null;
		foreach ( $top['submenu'] as $child ) {
			if ( 'edit.php?post_type=product' === $child['slug'] ) {
				$sub = $child;
				break;
			}
		}
		$this->assertSame( array( 'editor' ), $sub['hiddenRoles'], 'Legacy bare key with no qualified key present must still resolve for the same-slug submenu node too.' );
	}

	/**
	 * The v2 counterpart: with a current config, the editor model must NOT show
	 * the parent's bare hidden_roles on the same-slug submenu node. The popover
	 * has to agree with what replay() applies, or it lies about the state and
	 * the next full-replace save persists the lie.
	 */
	public function test_get_menu_model_v2_bare_parent_key_does_not_surface_on_same_slug_submenu() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array( 'items' => array( 'edit.php?post_type=product' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$model = ( new Replay( new Config() ) )->get_menu_model();

		$top = null;
		foreach ( $model as $entry ) {
			if ( 'edit.php?post_type=product' === $entry['slug'] ) {
				$top = $entry;
				break;
			}
		}
		$this->assertSame( array( 'editor' ), $top['hiddenRoles'], 'The bare key still resolves for the top-level node.' );

		$sub = null;
		foreach ( $top['submenu'] as $child ) {
			if ( 'edit.php?post_type=product' === $child['slug'] ) {
				$sub = $child;
				break;
			}
		}
		$this->assertSame( array(), $sub['hiddenRoles'], 'Under schema v2 the parent-colliding bare key must NOT surface on the submenu node.' );
	}

	/**
	 * The collision is not only the CPT self-link shape. A plugin can register a
	 * submenu under one parent whose rendered slug equals a DIFFERENT top-level
	 * row's slug (here a "Media" shortcut parked under Posts). The child slug
	 * does not equal its own parent's, so a `$nk === $norm_parent` test misses
	 * it — but under schema v2 the bare key still unambiguously means the
	 * top-level row, because any submenu edit would have been qualified.
	 */
	public function test_v2_bare_top_level_key_does_not_touch_a_submenu_under_a_different_parent() {
		global $submenu;
		$this->seed_menu();
		// A submenu row under Posts that re-uses the top-level Media slug.
		$submenu['edit.php'][20] = array( 'Media Shortcut', 'upload_files', 'upload.php', '' );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'title' => 'Files' ) ) )
		);

		$this->run_replay();

		global $menu;
		$this->assertSame( 'Files', $menu[10][0], 'The top-level rename must still apply.' );
		$this->assertSame(
			'Media Shortcut',
			$submenu['edit.php'][20][0],
			'A bare key that names a rendered TOP-LEVEL row must not also rename a same-slug submenu under an unrelated parent.'
		);
	}

	/**
	 * The editor-model mirror of the different-parent collision. Worth its own
	 * test because the two sets are built differently — replay() uses
	 * $top_rendered_matches (only keys that HAVE a stored override, which is the
	 * same condition its fallback requires) while get_menu_model() builds
	 * $top_rendered_keys from every rendered top-level row. They must agree in
	 * the fallback context or the popover drifts from what replay applies.
	 */
	public function test_get_menu_model_v2_bare_top_key_does_not_surface_on_a_submenu_under_a_different_parent() {
		global $submenu;
		$this->seed_menu();
		$submenu['edit.php'][20] = array( 'Media Shortcut', 'upload_files', 'upload.php', '' );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$model = ( new Replay( new Config() ) )->get_menu_model();

		$posts = null;
		foreach ( $model as $entry ) {
			if ( 'edit.php' === $entry['slug'] ) {
				$posts = $entry;
				break;
			}
		}
		$this->assertNotNull( $posts );

		$shortcut = null;
		foreach ( $posts['submenu'] as $child ) {
			if ( 'upload.php' === $child['slug'] ) {
				$shortcut = $child;
				break;
			}
		}
		$this->assertNotNull( $shortcut, 'The same-slug submenu row must be in the model.' );
		$this->assertSame( array(), $shortcut['hiddenRoles'], 'The top-level bare key must NOT surface on a submenu under an unrelated parent.' );
	}

	/**
	 * The narrowing is surgical: a bare key for a submenu child whose slug does
	 * NOT collide with its parent's is unambiguous (only one rendered row can
	 * carry it), so it keeps applying under schema v2.
	 */
	public function test_v2_bare_key_still_applies_to_a_non_colliding_submenu_child() {
		$this->seed_shared_slug_menu();

		( new Config() )->save(
			array( 'items' => array( 'post-new.php?post_type=product' => array( 'title' => 'New Widget' ) ) )
		);

		$this->run_replay();

		global $submenu;
		$this->assertSame(
			'New Widget',
			$submenu['edit.php?post_type=product'][10][0],
			'A non-colliding bare submenu key must still apply under schema v2.'
		);
	}

	// -----------------------------------------------------------------------
	// COMPAT-07: badge/HTML preservation on rename (20-04)
	// -----------------------------------------------------------------------

	/**
	 * Top-level rename over a live title with a trailing badge preserves the
	 * badge; only the label text is swapped in $menu[pos][0].
	 */
	public function test_rename_top_level_preserves_trailing_badge() {
		global $menu;
		$menu[5][0] = 'Orders <span class="awaiting-mod count-3"><span class="pending-count">3</span></span>';

		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Sales' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Sales <span class="awaiting-mod count-3"><span class="pending-count">3</span></span>',
			$menu[5][0],
			'Top-level rename must preserve the trailing badge markup.'
		);
	}

	/**
	 * Submenu rename over a wrapping-span title preserves the wrapper; only
	 * the inner label text is swapped in $submenu[parent][pos][0].
	 */
	public function test_rename_submenu_preserves_wrapping_span() {
		global $submenu;
		$submenu['edit.php'][10][0] = '<span style="color:#f18500">Addons</span>';

		( new Config() )->save(
			array( 'items' => array( 'post-new.php' => array( 'title' => 'Extras' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'<span style="color:#f18500">Extras</span>',
			$submenu['edit.php'][10][0],
			'Submenu rename must preserve the wrapping markup around the label.'
		);
	}

	/**
	 * When Title::replace_label() finds no replaceable text node (icon + badge
	 * only), replay must fall back to the wholesale stored title — today's
	 * behavior — with no fatal and no invented markup.
	 */
	public function test_rename_falls_back_to_wholesale_when_no_text_node() {
		global $menu;
		$menu[5][0] = '<span class="wp-menu-image"></span><span class="count-2">2</span>';

		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Articles' ) ) )
		);

		$this->run_replay();

		$this->assertSame(
			'Articles',
			$menu[5][0],
			'With no replaceable text node, replay must fall back to the wholesale stored title.'
		);
	}

	/**
	 * Counts are current: a badge's count is re-extracted from the LIVE title
	 * every replay pass, never a stale stored snapshot. Changing the live
	 * count between two replay passes (same stored override) must show the
	 * NEW count both times.
	 */
	public function test_rename_preserves_current_count_not_stale_snapshot() {
		global $menu;
		$menu[5][0] = 'Orders <span class="count-5">5</span>';

		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Sales' ) ) )
		);

		$this->run_replay();

		$this->assertSame( 'Sales <span class="count-5">5</span>', $menu[5][0] );

		// Simulate the badge count changing before the NEXT request — same
		// stored plain-text override, different live title.
		$menu[5][0] = 'Orders <span class="count-9">9</span>';
		$this->run_replay();

		$this->assertSame(
			'Sales <span class="count-9">9</span>',
			$menu[5][0],
			'Counts must be re-extracted from the live title each request, not a stale stored snapshot.'
		);
	}

	/**
	 * Stored config is unaffected: after a save+replay round-trip over a
	 * badge-bearing live title, the stored items[key].title remains plain
	 * text — badge HTML must never leak into storage.
	 */
	public function test_stored_title_stays_plain_text_after_badge_replay_round_trip() {
		global $menu;
		$menu[5][0] = 'Orders <span class="count-3">3</span>';

		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Sales' ) ) )
		);

		$this->run_replay();

		$cfg = ( new Config() )->get();
		$this->assertSame(
			'Sales',
			$cfg['items']['edit.php']['title'],
			'Stored config must hold only the plain-text label; badge HTML must never enter storage.'
		);
		$this->assertStringNotContainsString( '<span', $cfg['items']['edit.php']['title'] );
	}

	// -----------------------------------------------------------------------
	// COMPAT-10 (REVISED 2026-08-01): independent child_hidden_roles.
	//
	// The original boolean cascade_hide + "rides the parent hide" model
	// (20-05) was found INERT: WordPress core's _wp_menu_output() never
	// renders a parent's <ul class="wp-submenu"> once the parent's own $menu
	// row is unset(), so hiding the parent already removes the whole subtree
	// cosmetically — cascading on TOP of that produced no observable
	// difference. The revised model makes child-hiding INDEPENDENT of parent
	// visibility: a per-parent child_hidden_roles list hides all live
	// children from those roles WITH THE PARENT LEFT VISIBLE, unrelated to
	// the parent's own hidden_roles.
	//
	// Parent 'edit.php' from seed_menu() has three live children: 'edit.php'
	// (All Posts), 'post-new.php' (Add New), 'edit-tags.php?taxonomy=category'
	// (Categories) — enough to prove "ALL live children" are hidden, not
	// just one.
	// -----------------------------------------------------------------------

	/**
	 * Untouched parent (no child_hidden_roles rule): every child stays
	 * visible — zero regression, nothing hides by default.
	 */
	public function test_no_child_hidden_roles_rule_leaves_children_visible() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		( new Config() )->save( array( 'items' => array() ) );

		$this->run_replay();

		global $submenu;
		$slugs = wp_list_pluck( $submenu['edit.php'], 2 );
		$this->assertContains( 'post-new.php', $slugs );
		$this->assertContains( 'edit-tags.php?taxonomy=category', $slugs );
	}

	/**
	 * child_hidden_roles hides ALL live children for that role — WITH THE
	 * PARENT ITSELF LEFT VISIBLE (no hidden_roles set on the parent at all).
	 * This is the core of the revision: a visible effect independent of
	 * parent visibility.
	 */
	public function test_child_hidden_roles_hides_all_live_children_parent_stays_visible() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php' => array( 'child_hidden_roles' => array( 'editor' ) ),
				),
			)
		);

		$this->run_replay();

		global $menu, $submenu;
		$top_slugs = wp_list_pluck( $menu, 2 );
		$this->assertContains( 'edit.php', $top_slugs, 'Parent must remain visible — child_hidden_roles never touches the parent row.' );
		$this->assertEmpty(
			$submenu['edit.php'],
			'child_hidden_roles must hide ALL live children for the targeted role.'
		);
	}

	/**
	 * Independence from the parent's own hide: hiding the PARENT (its own
	 * hidden_roles) for one role and hiding CHILDREN (child_hidden_roles) for
	 * a DIFFERENT role are unrelated settings that both take effect for
	 * their respective, non-overlapping roles.
	 */
	public function test_parent_hide_and_child_hidden_roles_are_independent_settings() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php' => array(
						'hidden_roles'       => array( 'shop_manager' ),
						'child_hidden_roles' => array( 'editor' ),
					),
				),
			)
		);

		$this->run_replay();

		global $menu, $submenu;
		// Editor is not in the parent's OWN hidden_roles (shop_manager only) —
		// the parent row stays visible for editor.
		$top_slugs = wp_list_pluck( $menu, 2 );
		$this->assertContains( 'edit.php', $top_slugs );
		// But editor IS in child_hidden_roles — every child is gone.
		$this->assertEmpty( $submenu['edit.php'] );
	}

	/**
	 * Role-mirror: child_hidden_roles targets editor ONLY. An administrator
	 * (not in that list) must still see every child — never broadens beyond
	 * the exact roles named.
	 */
	public function test_child_hidden_roles_role_mirror_other_roles_unaffected() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php' => array( 'child_hidden_roles' => array( 'editor' ) ),
				),
			)
		);

		$this->run_replay();

		global $submenu;
		$slugs = wp_list_pluck( $submenu['edit.php'], 2 );
		$this->assertContains( 'post-new.php', $slugs, 'Role-mirror: an administrator must still see children not targeted by child_hidden_roles.' );
		$this->assertContains( 'edit-tags.php?taxonomy=category', $slugs );
	}

	/**
	 * Union: a child's OWN hidden_roles rule keeps working alongside the
	 * parent's child_hidden_roles, for a DIFFERENT role the parent's rule
	 * does NOT itself reach. Parent hides children only for 'editor'; the
	 * child is separately hidden for 'author' via its own rule. An author
	 * must still lose the child even though the parent's rule contributes
	 * nothing for author.
	 */
	public function test_child_hidden_roles_unions_with_childs_own_hidden_roles_rule() {
		$author = self::factory()->user->create( array( 'role' => 'author' ) );
		wp_set_current_user( $author );

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php'     => array( 'child_hidden_roles' => array( 'editor' ) ),
					'post-new.php' => array( 'hidden_roles' => array( 'author' ) ),
				),
			)
		);

		$this->run_replay();

		global $submenu;
		$slugs = wp_list_pluck( $submenu['edit.php'], 2 );
		$this->assertNotContains( 'post-new.php', $slugs, "Union: the child's own hidden_roles rule must still apply." );
		$this->assertContains( 'edit-tags.php?taxonomy=category', $slugs, 'A sibling with no own rule and no child_hidden_roles match for this role must remain visible.' );
	}

	/**
	 * get_menu_model() exposes each parent's child_hidden_roles list so the
	 * editor popover can reflect it — the stored roles when set, an empty
	 * array (not merely absent) for an untouched parent.
	 */
	public function test_get_menu_model_exposes_child_hidden_roles() {
		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'child_hidden_roles' => array( 'editor' ) ) ) )
		);

		$replay = new Replay( new Config() );
		$replay->replay();
		$model = $replay->get_menu_model();

		$edit_node  = null;
		$index_node = null;
		foreach ( $model as $node ) {
			if ( 'edit.php' === $node['slug'] ) {
				$edit_node = $node;
			}
			if ( 'index.php' === $node['slug'] ) {
				$index_node = $node;
			}
		}

		$this->assertNotNull( $edit_node );
		$this->assertSame( array( 'editor' ), $edit_node['childHiddenRoles'], 'A stored child_hidden_roles must be exposed in the model.' );

		$this->assertNotNull( $index_node );
		$this->assertSame( array(), $index_node['childHiddenRoles'], 'An untouched parent must expose childHiddenRoles as an empty array, not merely absent.' );
	}

	/**
	 * AXIS-2 PARITY: on a RENDERED collision — two distinct live top-level rows
	 * whose slugs normalize to the same key — replay() applies nothing ("when
	 * resolution is ambiguous, apply nothing"). The editor model must agree.
	 *
	 * It used to apply only the Axis-1 guard (two distinct STORED keys), so the
	 * popover showed the stored roles checked while replay applied none of them.
	 * Display-only in isolation, but the editor autosaves a FULL REPLACE built
	 * from what it displayed — so a lying popover is one save away from becoming
	 * the stored truth.
	 */
	public function test_get_menu_model_applies_the_axis2_rendered_collision_guard() {
		global $menu;

		// Two DISTINCT rendered rows that normalize to one key: `ver=` is
		// stripped by Slug::normalize(), so both collapse to `upload.php`.
		$menu[90] = array( 'Media A', 'upload_files', 'upload.php?ver=1', '', 'menu-top', 'menu-media-a', '' );
		$menu[91] = array( 'Media B', 'upload_files', 'upload.php?ver=2', '', 'menu-top', 'menu-media-b', '' );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$replay = new Replay( new Config() );
		$replay->replay();
		$model = $replay->get_menu_model();

		foreach ( $model as $node ) {
			if ( 'upload.php?ver=1' === $node['slug'] || 'upload.php?ver=2' === $node['slug'] ) {
				$this->assertSame(
					array(),
					$node['hiddenRoles'],
					'An Axis-2-ambiguous row must show NOTHING checked — replay applies nothing for it.'
				);
			}
		}
	}

	/**
	 * COSMETIC-ONLY GUARDRAIL (mandatory, non-negotiable): applying a
	 * child_hidden_roles rule must NEVER change current_user_can() for any
	 * capability — it is pure visibility. Proven two ways: (1) the editor
	 * role's entire capabilities map is byte-for-byte identical before and
	 * after the rule is saved and replayed; (2) the exact capability the
	 * hidden child page itself gates on ('edit_posts', per seed_menu()'s
	 * post-new.php row) still resolves true for the editor — i.e. the page
	 * is still directly loadable by URL even though its sidebar row was
	 * unset() and its parent remains visible.
	 */
	public function test_child_hidden_roles_is_cosmetic_only_current_user_can_and_page_capability_unchanged() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$role_before = get_role( 'editor' );
		$caps_before = $role_before->capabilities;

		$can_edit_posts_before     = current_user_can( 'edit_posts' );
		$can_manage_options_before = current_user_can( 'manage_options' );

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php' => array( 'child_hidden_roles' => array( 'editor' ) ),
				),
			)
		);

		$this->run_replay();

		// Sidebar row is cosmetically gone, parent stays visible...
		global $menu, $submenu;
		$this->assertContains( 'edit.php', wp_list_pluck( $menu, 2 ) );
		$slugs = wp_list_pluck( $submenu['edit.php'], 2 );
		$this->assertNotContains( 'post-new.php', $slugs, 'child_hidden_roles must hide the child row cosmetically.' );

		// ...but capabilities are byte-for-byte unchanged: child_hidden_roles
		// never grants or removes a capability from the role.
		$role_after = get_role( 'editor' );
		$this->assertSame(
			$caps_before,
			$role_after->capabilities,
			'Applying a child_hidden_roles rule must never mutate the role capabilities map.'
		);

		// The exact capability post-new.php itself gates direct access on
		// ('edit_posts', from seed_menu()'s row) is unchanged — the page is
		// still directly loadable by URL for a user who holds it. Maestro
		// only unset() the sidebar row; it never touches capability
		// resolution.
		$this->assertSame( $can_edit_posts_before, current_user_can( 'edit_posts' ) );
		$this->assertTrue( current_user_can( 'edit_posts' ), 'Editor must still hold edit_posts after a child_hidden_roles rule is applied.' );
		$this->assertSame( $can_manage_options_before, current_user_can( 'manage_options' ) );
		$this->assertFalse( current_user_can( 'manage_options' ), 'child_hidden_roles must not grant a capability the role never had.' );
	}

	/**
	 * Ambiguity guard for child-hiding: child_hidden_roles must NOT fire when the
	 * parent override is ambiguous. Here two DISTINCT stored keys normalize to the
	 * same parent key (Axis-1 norm_skip), so the parent's override — including its
	 * child_hidden_roles — resolves to nothing. The child-hiding path is gated on
	 * exactly this in class-replay.php (parent_ovr requires the normalized parent
	 * key be absent from norm_skip AND top_skip_rendered). This locks in that a
	 * fail-safe "apply nothing" parent never silently hides its children.
	 */
	public function test_child_hidden_roles_does_not_fire_on_ambiguous_parent() {
		global $menu, $submenu;

		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$slug_amp   = 'admin.php?page=shop&amp;post_type=product';
		$slug_plain = 'admin.php?page=shop&post_type=product';
		// Both normalize to the SAME key: admin.php?page=shop&post_type=product.

		$menu[30]               = array( 'Shop', 'manage_options', $slug_plain, '', 'menu-top', 'menu-shop', 'dashicons-cart' );
		$submenu[ $slug_plain ] = array(
			10 => array( 'Products', 'manage_options', 'admin.php?page=products', '' ),
			20 => array( 'Coupons', 'manage_options', 'admin.php?page=coupons', '' ),
		);

		// Two DISTINCT stored keys collide to one normalized parent key (Axis-1
		// norm_skip). One carries child_hidden_roles for the current (editor) user;
		// because the parent override is ambiguous, child-hiding must NOT fire.
		( new Config() )->save(
			array(
				'items' => array(
					$slug_amp   => array( 'child_hidden_roles' => array( 'editor' ) ),
					$slug_plain => array( 'title' => 'Ambiguous' ),
				),
			)
		);

		$this->run_replay();

		$slugs = wp_list_pluck( array_values( $submenu[ $slug_plain ] ), 2 );
		$this->assertContains( 'admin.php?page=products', $slugs, 'child_hidden_roles must NOT fire when the parent override is ambiguous (Axis-1 norm_skip).' );
		$this->assertContains( 'admin.php?page=coupons', $slugs, 'Every child stays visible under an ambiguous parent.' );
		$this->assertCount( 2, $slugs, 'No child may be hidden when the parent override resolves to nothing.' );
	}

	// -------------------------------------------------------------------------
	// S-1 GUARDRAIL: the top-level hide is capability-bounded so it can never
	// remove a row the current user could not already reach. Keeping such a row
	// lets WP core build its own $_wp_menu_nopriv entry, so core's own 403 gate
	// (user_can_access_admin_page()) still denies — hiding can never *widen*
	// access. A user who genuinely holds the capability still gets the row
	// cosmetically hidden (unchanged behavior). Modeled on the cosmetic-only
	// guardrail for child_hidden_roles above.
	// -------------------------------------------------------------------------

	/**
	 * A top-level row whose capability the current user LACKS must NOT be
	 * removed by a hidden_roles rule targeting that user. Removing it would
	 * suppress the row core needs to keep in order to build its own nopriv
	 * denial, so Maestro leaves it in place and defers to core's 403 gate.
	 * current_user_can() is untouched — the hide never granted the capability.
	 */
	public function test_top_level_hidden_row_retained_when_user_lacks_capability() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		// A high-privilege top-level page the editor cannot reach. Modeled on an
		// add_menu_page( ..., 'manage_options', 'sec-test', '' ) registration with
		// an unconditional toplevel_page_sec-test handler — the exact shape that,
		// if cosmetically unset(), would drop core's nopriv guard for the row.
		global $menu;
		$menu[60] = array( 'Secret', 'manage_options', 'sec-test', '', 'menu-top', 'menu-sec-test', 'dashicons-lock' );

		$this->assertFalse( current_user_can( 'manage_options' ), 'Precondition: editor must lack the row capability.' );
		$can_edit_posts_before = current_user_can( 'edit_posts' );

		( new Config() )->save(
			array( 'items' => array( 'sec-test' => array( 'hidden_roles' => array( 'editor' ) ) ) )
		);

		$this->run_replay();

		$slugs = wp_list_pluck( $menu, 2 );
		$this->assertContains(
			'sec-test',
			$slugs,
			'A hidden_roles rule must NOT remove a top-level row the user cannot access — core keeps the nopriv 403 gate.'
		);

		// Cosmetic-only: current_user_can() is byte-for-byte unchanged.
		$this->assertFalse( current_user_can( 'manage_options' ), 'The hide must never grant a capability the user lacked.' );
		$this->assertSame( $can_edit_posts_before, current_user_can( 'edit_posts' ) );
	}

	/**
	 * The counterpart: a user who genuinely HOLDS the row capability still gets
	 * the row cosmetically hidden by a hidden_roles rule — the capability gate
	 * added in S-1 narrows nothing for an authorized user. current_user_can()
	 * stays unchanged (the removal is purely cosmetic; the page still loads by
	 * direct URL).
	 */
	public function test_top_level_hidden_row_removed_when_user_has_capability() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		global $menu;
		$menu[60] = array( 'Secret', 'manage_options', 'sec-test', '', 'menu-top', 'menu-sec-test', 'dashicons-lock' );

		$this->assertTrue( current_user_can( 'manage_options' ), 'Precondition: admin must hold the row capability.' );
		$can_manage_before = current_user_can( 'manage_options' );

		( new Config() )->save(
			array( 'items' => array( 'sec-test' => array( 'hidden_roles' => array( 'administrator' ) ) ) )
		);

		$this->run_replay();

		$slugs = wp_list_pluck( $menu, 2 );
		$this->assertNotContains(
			'sec-test',
			$slugs,
			'A capable user still gets the row cosmetically hidden — S-1 narrows nothing for the authorized case.'
		);

		// Cosmetic-only: hiding the row never revoked the capability.
		$this->assertSame( $can_manage_before, current_user_can( 'manage_options' ) );
		$this->assertTrue( current_user_can( 'manage_options' ), 'Admin must still hold manage_options after the row is hidden — page still loadable by URL.' );
	}
}
