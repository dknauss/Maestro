<?php
/**
 * Maestro edits one site's admin menu. Network admin and the multisite user
 * admin (wp-admin/user/) are not that menu.
 *
 * Core fires `network_admin_menu` / `user_admin_menu` on those screens, never
 * `admin_menu`, so replay() does not run there. But `custom_menu_order` and
 * `menu_order` do run on every admin menu build. Before this was scoped, the
 * site's stored top-level order was applied to the network menu while its
 * renames, icons and hides were not. And because is_edit_mode() only checked
 * the query arg and capability, a super admin could open edit mode on the
 * network menu. The editor's full-replace autosave would then save a config
 * built from Sites / Users / Themes over the main site's own config.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Admin_Bar;
use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use WP_Admin_Bar;
use WP_UnitTestCase;

use function Maestro\is_edit_mode;

class NetworkAdminTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();

		if ( ! is_multisite() ) {
			$this->markTestSkipped( 'Network and user admin exist only on multisite.' );
		}

		$user_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		grant_super_admin( $user_id );
		wp_set_current_user( $user_id );

		delete_option( MAESTRO_OPTION );
		$_GET['maestro_edit'] = '1';
		$this->reset_asset_state();
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		$this->reset_asset_state();
		parent::tear_down();
	}

	/**
	 * Screens outside a single site's admin.
	 *
	 * @return array
	 */
	public function data_non_site_screens() {
		return array(
			'network admin' => array( 'dashboard-network' ),
			'user admin'    => array( 'dashboard-user' ),
		);
	}

	/**
	 * @dataProvider data_non_site_screens
	 *
	 * @param string $screen Screen id.
	 */
	public function test_edit_mode_is_off_outside_site_admin( $screen ) {
		set_current_screen( $screen );

		$this->assertFalse( is_edit_mode() );
	}

	/**
	 * @dataProvider data_non_site_screens
	 *
	 * @param string $screen Screen id.
	 */
	public function test_no_toggle_outside_site_admin( $screen ) {
		set_current_screen( $screen );

		$this->assertNull( $this->render_toggle_node() );
	}

	/**
	 * @dataProvider data_non_site_screens
	 *
	 * @param string $screen Screen id.
	 */
	public function test_editor_assets_do_not_load_outside_site_admin( $screen ) {
		set_current_screen( $screen );

		( new Assets( new Config(), new Replay( new Config() ) ) )->enqueue();

		$this->assertFalse( wp_script_is( 'maestro', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'maestro', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'maestro-admin-bar', 'enqueued' ) );
	}

	/**
	 * @dataProvider data_non_site_screens
	 *
	 * @param string $screen Screen id.
	 */
	public function test_site_top_order_is_not_applied_outside_site_admin( $screen ) {
		( new Config() )->save( array( 'top_order' => array( 'users.php', 'index.php' ) ) );
		set_current_screen( $screen );

		$replay  = new Replay( new Config() );
		$natural = array( 'index.php', 'sites.php', 'users.php' );

		$this->assertFalse( $replay->has_top_order( false ) );
		$this->assertSame( $natural, $replay->reorder_top( $natural ) );
	}

	/**
	 * The guard must not reach into the site's own admin.
	 */
	public function test_site_admin_still_edits_and_orders() {
		( new Config() )->save( array( 'top_order' => array( 'users.php', 'index.php' ) ) );
		set_current_screen( 'dashboard' );

		$replay = new Replay( new Config() );

		$this->assertTrue( is_edit_mode() );
		$this->assertNotNull( $this->render_toggle_node() );
		$this->assertTrue( $replay->has_top_order( false ) );
		$this->assertSame(
			array( 'users.php', 'index.php', 'upload.php' ),
			$replay->reorder_top( array( 'index.php', 'upload.php', 'users.php' ) )
		);
	}

	/**
	 * @return object|null
	 */
	private function render_toggle_node() {
		if ( ! class_exists( 'WP_Admin_Bar' ) ) {
			require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';
		}

		$bar = new WP_Admin_Bar();
		( new Admin_Bar() )->node( $bar );

		return $bar->get_node( 'maestro-toggle' );
	}

	private function reset_asset_state() {
		wp_dequeue_script( 'maestro' );
		wp_dequeue_style( 'maestro' );
		wp_deregister_script( 'maestro' );
		wp_deregister_style( 'maestro' );
		wp_dequeue_style( 'maestro-admin-bar' );
		wp_deregister_style( 'maestro-admin-bar' );
	}
}
