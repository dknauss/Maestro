<?php
/**
 * Integration checks for the stored admin menu width (Phase 28-02): the rule
 * reaches ordinary admin pages only when a width is stored, rides on the
 * always-loaded stylesheet, and costs no query beyond the config read Replay
 * already makes.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use WP_REST_Request;
use WP_UnitTestCase;

class MenuWidthAssetTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();
		delete_option( MAESTRO_OPTION );
		unset( $_GET['maestro_edit'] );
		$this->reset_styles();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		$this->reset_styles();
		parent::tear_down();
	}

	public function test_no_stored_width_adds_nothing_to_the_page() {
		$this->enqueue( new Config() );

		$this->assertTrue( wp_style_is( 'maestro-admin-bar', 'enqueued' ) );
		$this->assertFalse( wp_styles()->get_data( 'maestro-admin-bar', 'after' ), 'A site that never set a width must get no inline CSS.' );
	}

	public function test_stored_width_applies_outside_edit_mode() {
		( new Config() )->save( array( 'menu_width' => 240 ) );

		$this->enqueue( new Config() );

		$this->assertFalse( wp_script_is( 'maestro', 'enqueued' ), 'Still no editor outside edit mode.' );
		$this->assertSame( array( Assets::menu_width_css( 240 ) ), wp_styles()->get_data( 'maestro-admin-bar', 'after' ) );
	}

	public function test_stored_width_also_applies_in_edit_mode() {
		( new Config() )->save( array( 'menu_width' => 240 ) );
		$_GET['maestro_edit'] = '1';

		$this->enqueue( new Config() );

		$this->assertSame( array( Assets::menu_width_css( 240 ) ), wp_styles()->get_data( 'maestro-admin-bar', 'after' ) );
	}

	public function test_applying_the_width_costs_no_query_beyond_replays_read() {
		global $wpdb;

		( new Config() )->save( array( 'menu_width' => 240 ) );
		wp_cache_flush();

		// One Config is shared by Replay and Assets (boot()); Replay reads it on
		// admin_menu, before admin_enqueue_scripts.
		$config = new Config();
		$config->get();
		$before = $wpdb->num_queries;

		$this->enqueue( $config );

		$this->assertSame( $before, $wpdb->num_queries );
		$this->assertNotEmpty( wp_styles()->get_data( 'maestro-admin-bar', 'after' ) );
	}

	public function test_rest_save_stores_a_bounded_width_and_reset_removes_it() {
		global $wp_rest_server;
		$wp_rest_server = new \WP_REST_Server();
		do_action( 'rest_api_init' );

		$save = new WP_REST_Request( 'POST', '/maestro/v1/config' );
		$save->set_param( 'config', array( 'menu_width' => 99999 ) );
		$this->assertSame( 200, $wp_rest_server->dispatch( $save )->get_status() );
		$this->assertSame( Config::MAX_MENU_WIDTH, ( new Config() )->menu_width() );

		$this->assertSame( 200, $wp_rest_server->dispatch( new WP_REST_Request( 'DELETE', '/maestro/v1/config' ) )->get_status() );
		$this->assertNull( ( new Config() )->menu_width() );

		$wp_rest_server = null;
	}

	private function enqueue( Config $config ) {
		$assets = new Assets( $config, new Replay( $config ) );
		$assets->enqueue();
	}

	private function reset_styles() {
		foreach ( array( 'maestro', 'maestro-admin-bar' ) as $handle ) {
			wp_dequeue_style( $handle );
			wp_deregister_style( $handle );
		}
		wp_dequeue_script( 'maestro' );
		wp_deregister_script( 'maestro' );
	}
}
