<?php
/**
 * Integration checks for localization-sensitive editor payload contracts.
 *
 * @package AdminMenuMaestro
 */

namespace AdminMenuMaestro\Tests\Integration;

use AdminMenuMaestro\Assets;
use AdminMenuMaestro\Config;
use AdminMenuMaestro\Replay;
use WP_UnitTestCase;

class LocalizationTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();
		unset( $_GET['amm_edit'] );
		$this->reset_asset_state();
	}

	public function tear_down() {
		unset( $_GET['amm_edit'] );
		$this->reset_asset_state();
		parent::tear_down();
	}

	public function test_edit_mode_payload_exposes_expected_translated_labels() {
		global $wp_scripts;

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );
		$_GET['amm_edit'] = '1';

		$assets = new Assets( new Config(), new Replay( new Config() ) );
		$assets->enqueue();

		$data = isset( $wp_scripts->registered['admin-menu-maestro']->extra['data'] )
			? $wp_scripts->registered['admin-menu-maestro']->extra['data']
			: '';

		$this->assertStringContainsString( '"i18n"', $data );

		foreach ( $this->expected_i18n_keys() as $key ) {
			$this->assertStringContainsString( '"' . $key . '"', $data, "Missing localized editor label: {$key}" );
		}
	}

	public function test_plugin_header_declares_matching_text_domain() {
		$plugin = file_get_contents( dirname( dirname( __DIR__ ) ) . '/admin-menu-maestro.php' );

		$this->assertStringContainsString( 'Text Domain:       admin-menu-maestro', $plugin );
		$this->assertStringContainsString( 'Domain Path:       /languages', $plugin );
	}

	private function expected_i18n_keys() {
		return array(
			'idle',
			'saving',
			'saved',
			'saveError',
			'rename',
			'icon',
			'iconDialog',
			'iconSearch',
			'iconNone',
			'iconNoneHint',
			'visibility',
			'resetItem',
			'resetAll',
			'exit',
			'hideFrom',
			'confirmAll',
			'drag',
		);
	}

	private function reset_asset_state() {
		wp_dequeue_script( 'admin-menu-maestro' );
		wp_dequeue_style( 'admin-menu-maestro' );
		wp_deregister_script( 'admin-menu-maestro' );
		wp_deregister_style( 'admin-menu-maestro' );
	}
}
