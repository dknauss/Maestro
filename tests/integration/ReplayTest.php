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
}
