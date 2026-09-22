<?php
/**
 * The edit-mode notice shown when another admin-menu editor is active.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Conflict_Notice;
use WP_UnitTestCase;

class ConflictNoticeTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );
		$_GET['maestro_edit'] = '1';
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		remove_all_filters( 'maestro_menu_editor_conflicts' );
		parent::tear_down();
	}

	public function test_admin_menu_editor_is_a_known_conflict() {
		$this->assertArrayHasKey( 'WPMenuEditor', Conflict_Notice::known() );
	}

	public function test_edit_mode_names_the_active_menu_editor() {
		$this->pretend_active( 'Admin Menu Editor' );

		$html = $this->render();

		$this->assertStringContainsString( 'notice-warning', $html );
		$this->assertStringContainsString( 'Admin Menu Editor', $html );
	}

	public function test_no_notice_when_no_menu_editor_is_active() {
		$this->assertSame( '', $this->render() );
	}

	public function test_no_notice_outside_edit_mode() {
		$this->pretend_active( 'Admin Menu Editor' );
		unset( $_GET['maestro_edit'] );

		$this->assertSame( '', $this->render() );
	}

	public function test_no_notice_on_the_post_editor() {
		$this->pretend_active( 'Admin Menu Editor' );
		set_current_screen( 'post' );
		get_current_screen()->is_block_editor( true );

		$this->assertSame( '', $this->render() );
	}

	// Map a class that IS loaded to a label, standing in for the real plugin.
	private function pretend_active( $label ) {
		add_filter(
			'maestro_menu_editor_conflicts',
			function () use ( $label ) {
				return array( self::class => $label );
			}
		);
	}

	private function render() {
		ob_start();
		( new Conflict_Notice() )->render();
		return ob_get_clean();
	}
}
