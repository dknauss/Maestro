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
}
