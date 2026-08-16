<?php
/**
 * Integration checks for the admin-bar editor-entry toggle: its label strings
 * (UX-08b / UX-09) and the screens it may appear on (WP71-01).
 *
 * WHY INTEGRATION (not unit): Admin_Bar::node() depends on WordPress runtime functions
 * (is_admin(), current_user_can(), WP_Admin_Bar, add_query_arg(), is_edit_mode(),
 * capability()). The unit bootstrap (tests/bootstrap-unit.php) is deliberately WP-free
 * (loads only class-ordering + class-config), so these guards cannot run there.
 * LocalizationTest asserts the JS i18n payload which does NOT contain these admin-bar
 * strings, so relying on it would leave UX-08b unverified.
 *
 * Strings locked by UX-08b (Phase 11) and relabelled by UX-09 (Phase 23, plan 23-02
 * Task 2 — the admin-bar toggle became the single entry/exit and mode indicator):
 *   - Visible label (enter):  'Edit Menu'
 *   - Visible label (exit):   'Exit Menu Editor'  (was 'Exit' pre-Phase-23)
 *   - meta.title (enter):     'Edit Admin Menu'
 *   - meta.title (exit):      'Exit Menu Editor'  (was 'Exit Editor' pre-Phase-23)
 *
 * WP71-01 adds the screen gate: the toggle must not be registered in the Post
 * Editor or the Site Editor, where WordPress 7.1's persistent toolbar would
 * otherwise make it visible on a screen with no editable menu. The matching
 * asset-side gate is covered by AssetsScreenGateTest.
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
	 * UX-09 exit label: the visible node title must contain 'Exit Menu Editor'
	 * and retain the dashicons-exit icon span. The admin-bar toggle is the
	 * single entry/exit and mode indicator (Phase 23) — its editing-state
	 * label names the mode, no highlight needed.
	 */
	public function test_exit_label_contains_exit_menu_editor() {
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

		// UX-09 target: visible label is the full "Exit Menu Editor" — it now
		// names the mode as well as the action (no separate mode chip).
		$this->assertStringContainsString(
			'Exit Menu Editor',
			$title,
			'Exit-mode node title must contain "Exit Menu Editor" (UX-09 relabel)'
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
	 * UX-09 meta.title (exit): 'Exit Menu Editor' must be preserved in
	 * meta.title (aria-label / tooltip) for screen readers, matching the
	 * visible label now that both are the same full form.
	 */
	public function test_exit_meta_title_is_long_form() {
		$_GET['maestro_edit'] = '1';

		$node = $this->render_toggle_node();

		$this->assertNotNull( $node, 'maestro-toggle node must be registered' );

		$meta_title = $node->meta['title'] ?? '';

		$this->assertStringContainsString(
			'Exit Menu Editor',
			$meta_title,
			'Exit-mode meta.title must contain "Exit Menu Editor" for screen readers'
		);
	}

	/**
	 * WP71-01 (post editor): the toggle must NOT be registered on a block-editor
	 * screen.
	 *
	 * WordPress 7.1 shows the toolbar persistently in the Post Editor — previously
	 * it was hidden by fullscreen, which is the default. The toggle therefore
	 * becomes visible and clickable on a screen where #adminmenu is hidden and
	 * there is no menu to edit: entering edit mode there binds sortables to a
	 * hidden menu and floats Maestro's toolbar over the block canvas.
	 */
	public function test_toggle_absent_on_block_editor_screen() {
		set_current_screen( 'post' );
		get_current_screen()->is_block_editor( true );

		$this->assertNull(
			$this->render_toggle_node(),
			'maestro-toggle must not be registered on a block-editor screen (WP 7.1 persistent toolbar)'
		);
	}

	/**
	 * WP71-01 (Site Editor): same guard, matched on screen id.
	 *
	 * The Site Editor never rendered the toolbar before 7.1, so this is entirely
	 * new exposure. It is matched by id rather than is_block_editor() because the
	 * two are set independently and the Site Editor is the case that regressed.
	 */
	public function test_toggle_absent_on_site_editor_screen() {
		set_current_screen( 'site-editor' );

		$this->assertNull(
			$this->render_toggle_node(),
			'maestro-toggle must not be registered on the Site Editor screen (WP 7.1 persistent toolbar)'
		);
	}

	/**
	 * Regression guard for the gate above: a classic admin screen that is NOT a
	 * block editor must still get the toggle. Without this, "hide it everywhere"
	 * would pass the two tests above.
	 */
	public function test_toggle_present_on_classic_admin_screen() {
		set_current_screen( 'options-general' );

		$this->assertNotNull(
			$this->render_toggle_node(),
			'maestro-toggle must still be registered on classic admin screens'
		);
	}
}
