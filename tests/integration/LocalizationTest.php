<?php
/**
 * Integration checks for localization-sensitive editor payload contracts.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class LocalizationTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();
		unset( $_GET['maestro_edit'] );
		$this->reset_asset_state();
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		$this->reset_asset_state();
		parent::tear_down();
	}

	public function test_edit_mode_payload_exposes_expected_translated_labels() {
		global $wp_scripts;

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );
		$_GET['maestro_edit'] = '1';

		$assets = new Assets( new Config(), new Replay( new Config() ) );
		$assets->enqueue();

		$data = isset( $wp_scripts->registered['maestro']->extra['data'] )
			? $wp_scripts->registered['maestro']->extra['data']
			: '';

		$this->assertStringContainsString( '"i18n"', $data );

		foreach ( $this->expected_i18n_keys() as $key ) {
			$this->assertStringContainsString( '"' . $key . '"', $data, "Missing localized editor label: {$key}" );
		}
	}

	public function test_plugin_header_declares_matching_text_domain() {
		$plugin = file_get_contents( dirname( dirname( __DIR__ ) ) . '/maestro-menu-editor.php' );

		$this->assertStringContainsString( 'Text Domain:       maestro-menu-editor', $plugin );
		$this->assertStringContainsString( 'Domain Path:       /languages', $plugin );
	}

	private function expected_i18n_keys() {
		return array(
			'saving',
			'saved',
			'saveError',
			'modeLabel',
			'renamePlaceholder',
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
			'moveUp',
			'moveDown',
			'tourHelp',
			'tourTitle',
			'tourNext',
			'tourBack',
			'tourDone',
			'tourSkip',
			'tourProgress',
			'tourStep1',
			'tourStep2',
			'tourStep3',
			'tourStep4',
			'tourStep5',
		);
	}

	private function reset_asset_state() {
		wp_dequeue_script( 'maestro' );
		wp_dequeue_style( 'maestro' );
		wp_deregister_script( 'maestro' );
		wp_deregister_style( 'maestro' );
	}
}
