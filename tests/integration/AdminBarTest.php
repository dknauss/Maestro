<?php
/**
 * Integration checks for the admin-bar editor-entry toggle label strings (UX-08b).
 *
 * WHY INTEGRATION (not unit): Admin_Bar::node() depends on WordPress runtime functions
 * (is_admin(), current_user_can(), WP_Admin_Bar, add_query_arg(), is_edit_mode(),
 * capability()). The unit bootstrap (tests/bootstrap-unit.php) is deliberately WP-free
 * (loads only class-ordering + class-config), so these guards cannot run there.
 * LocalizationTest asserts the JS i18n payload which does NOT contain these admin-bar
 * strings, so relying on it would leave UX-08b unverified.
 *
 * WAVE 0 STATE: This test is INTENTIONALLY RED against current code. It asserts the
 * UX-08b TARGET strings:
 *   - Visible label (enter):  'Edit Menu'    (current: 'Edit Admin Menu')
 *   - Visible label (exit):   'Exit'         (current: 'Exit Editor')
 *   - meta.title (enter):     'Edit Admin Menu'
 *   - meta.title (exit):      'Exit Editor'
 *
 * Plan 11-02 changes class-admin-bar.php to these strings and turns this test green.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Admin_Bar;
use WP_Admin_Bar;
use WP_UnitTestCase;

class AdminBarTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();

		// Create and switch to an admin user so capability checks pass.
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		// Set current screen to dashboard so is_admin() returns true.
		set_current_screen( 'dashboard' );

		// Ensure we start outside edit mode.
		unset( $_GET['maestro_edit'] );
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		parent::tear_down();
	}

	/**
	 * Helper: render the maestro-toggle node via Admin_Bar and return it.
	 *
	 * Constructs a real WP_Admin_Bar, hooks Admin_Bar::node() on admin_bar_menu,
	 * fires the action, then reads back the node by its registered id.
	 *
	 * @return object|null The node object returned by WP_Admin_Bar::get_node().
	 */
	private function render_toggle_node() {
		// WP_Admin_Bar lives in wp-includes/class-wp-admin-bar.php and is only
		// auto-loaded when the admin bar actually renders. The phpunit integration
		// bootstrap does not load it, so require it explicitly before instantiating.
		if ( ! class_exists( 'WP_Admin_Bar' ) ) {
			require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';
		}

		$bar = new WP_Admin_Bar();

		// Instantiating Admin_Bar hooks node() on admin_bar_menu at prio 100.
		// Fire the action to populate $bar.
		$admin_bar = new Admin_Bar();
		do_action( 'admin_bar_menu', $bar );

		return $bar->get_node( 'maestro-toggle' );
	}

	/**
	 * UX-08b enter label: the visible node title must contain 'Edit Menu' (short form)
	 * and retain the dashicons-edit icon span.
	 *
	 * Current code emits 'Edit Admin Menu' — this test is RED until 11-02.
	 */
	public function test_enter_label_contains_edit_menu() {
		// Not in edit mode.
		unset( $_GET['maestro_edit'] );

		$node = $this->render_toggle_node();

		$this->assertNotNull( $node, 'maestro-toggle node must be registered' );

		$title = $node->title ?? '';

		// The dashicons-edit span must be present.
		$this->assertStringContainsString(
			'dashicons-edit',
			$title,
			'Enter-mode node title must contain the dashicons-edit icon span'
		);

		// UX-08b target: visible label is compact 'Edit Menu', not the long form.
		$this->assertStringContainsString(
			'Edit Menu',
			$title,
			'Enter-mode node title must contain "Edit Menu" (UX-08b compact label)'
		);
	}

	/**
	 * UX-08b exit label: the visible node title must contain 'Exit' (short form)
	 * and retain the dashicons-exit icon span.
	 *
	 * Current code emits 'Exit Editor' — this test is RED until 11-02.
	 */
	public function test_exit_label_contains_exit() {
		// Enter edit mode.
		$_GET['maestro_edit'] = '1';

		$node = $this->render_toggle_node();

		$this->assertNotNull( $node, 'maestro-toggle node must be registered' );

		$title = $node->title ?? '';

		// The dashicons-exit span must be present.
		$this->assertStringContainsString(
			'dashicons-exit',
			$title,
			'Exit-mode node title must contain the dashicons-exit icon span'
		);

		// UX-08b target: visible label is compact 'Exit', not the long form.
		$this->assertStringContainsString(
			'Exit',
			$title,
			'Exit-mode node title must contain "Exit" (UX-08b compact label)'
		);

		// Guard: the full form 'Exit Editor' must NOT appear in the visible title
		// (it belongs in meta.title only).
		$this->assertStringNotContainsString(
			'Exit Editor',
			$title,
			'Exit-mode visible title must use compact "Exit", not full "Exit Editor"'
		);
	}

	/**
	 * UX-08b meta.title (enter): the long accessible form 'Edit Admin Menu' must be
	 * preserved in meta.title (aria-label / tooltip) for screen readers.
	 *
	 * This ensures the compact visible label doesn't drop a11y coverage.
	 */
	public function test_enter_meta_title_is_long_form() {
		unset( $_GET['maestro_edit'] );

		$node = $this->render_toggle_node();

		$this->assertNotNull( $node, 'maestro-toggle node must be registered' );

		$meta_title = $node->meta['title'] ?? '';

		$this->assertStringContainsString(
			'Edit Admin Menu',
			$meta_title,
			'Enter-mode meta.title must retain full "Edit Admin Menu" for screen readers'
		);
	}

	/**
	 * UX-08b meta.title (exit): the long accessible form 'Exit Editor' must be
	 * preserved in meta.title (aria-label / tooltip) for screen readers.
	 *
	 * This ensures the compact visible 'Exit' label doesn't drop a11y coverage.
	 */
	public function test_exit_meta_title_is_long_form() {
		$_GET['maestro_edit'] = '1';

		$node = $this->render_toggle_node();

		$this->assertNotNull( $node, 'maestro-toggle node must be registered' );

		$meta_title = $node->meta['title'] ?? '';

		$this->assertStringContainsString(
			'Exit Editor',
			$meta_title,
			'Exit-mode meta.title must retain full "Exit Editor" for screen readers'
		);
	}
}
