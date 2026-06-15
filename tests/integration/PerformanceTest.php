<?php
/**
 * Integration checks for performance-sensitive contracts: option autoload,
 * edit-mode-only asset loading, and localized payload size.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class PerformanceTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();
		delete_option( MAESTRO_OPTION );
		unset( $_GET['maestro_edit'] );
		$this->reset_asset_state();
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		$this->reset_asset_state();
		parent::tear_down();
	}

	public function test_config_option_is_not_autoloaded() {
		global $wpdb;

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php' => array( 'title' => 'Articles' ),
				),
			)
		);

		$autoload = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT autoload FROM {$wpdb->options} WHERE option_name = %s",
				MAESTRO_OPTION
			)
		);

		$this->assertContains( $autoload, array( 'no', 'off', 'auto-off' ), 'The sparse config option must not join the global autoload payload.' );
	}

	public function test_assets_load_only_in_edit_mode() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );

		do_action( 'admin_enqueue_scripts', 'index.php' );
		$this->assertFalse( wp_script_is( 'maestro', 'enqueued' ), 'Editor JS must not load on ordinary admin screens.' );
		$this->assertFalse( wp_style_is( 'maestro', 'enqueued' ), 'Editor CSS must not load on ordinary admin screens.' );

		$_GET['maestro_edit'] = '1';
		do_action( 'admin_enqueue_scripts', 'index.php' );

		$this->assertTrue( wp_script_is( 'maestro', 'enqueued' ), 'Editor JS should load in edit mode.' );
		$this->assertTrue( wp_style_is( 'maestro', 'enqueued' ), 'Editor CSS should load in edit mode.' );
	}

	public function test_edit_mode_localized_payload_stays_under_budget() {
		global $wp_scripts;

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );
		$_GET['maestro_edit'] = '1';
		$this->seed_large_menu();

		$replay = new Replay( new Config() );
		$assets = new Assets( new Config(), $replay );
		$assets->enqueue();

		$data  = isset( $wp_scripts->registered['maestro']->extra['data'] )
			? $wp_scripts->registered['maestro']->extra['data']
			: '';
		$bytes = strlen( $data );

		$this->assertGreaterThan( 70 * 1024, $bytes, 'The measurement should include the bundled icon data, not an empty payload.' );
		$this->assertLessThan( 256 * 1024, $bytes, 'The edit-mode localized payload should stay below 256 KiB for a large synthetic menu.' );
	}

	private function reset_asset_state() {
		wp_dequeue_script( 'maestro' );
		wp_dequeue_style( 'maestro' );
		wp_deregister_script( 'maestro' );
		wp_deregister_style( 'maestro' );
	}

	private function seed_large_menu() {
		global $menu, $submenu;

		$menu    = array();
		$submenu = array();

		for ( $i = 1; $i <= 60; $i++ ) {
			$slug          = 'maestro-top-' . $i . '.php';
			$menu[ $i * 5 ] = array(
				'Top ' . $i,
				'read',
				$slug,
				'',
				'menu-top',
				'toplevel_page_maestro_top_' . $i,
				'dashicons-admin-generic',
			);
			$submenu[ $slug ] = array();

			for ( $j = 1; $j <= 6; $j++ ) {
				$submenu[ $slug ][ $j * 5 ] = array(
					'Child ' . $i . '.' . $j,
					'read',
					$slug . '&child=' . $j,
					'',
				);
			}
		}
	}
}
