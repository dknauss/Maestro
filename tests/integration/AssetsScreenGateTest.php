<?php
/**
 * Integration checks for the editor-screen asset gate (WP71-01).
 *
 * WHY INTEGRATION (not unit): Assets::enqueue() depends on the WordPress asset
 * runtime (wp_enqueue_style/script, wp_localize_script), on get_current_screen(),
 * and on is_edit_mode() -> current_user_can(). The unit bootstrap
 * (tests/bootstrap-unit.php) is deliberately WP-free, so none of that can run
 * there.
 *
 * WHY A SECOND GATE AT ALL: AdminBarTest covers hiding the *toggle* on editor
 * screens, but `?maestro_edit=1` is a plain query arg — bookmarkable, shareable,
 * and typeable by hand. Hiding the entry point does not stop the URL, so the
 * asset loader has to hold the line independently or a bookmarked editor URL
 * still drops Maestro's toolbar over the block canvas.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class AssetsScreenGateTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		// Edit mode on for every case here: the gate under test is the SCREEN,
		// not the query arg, so the query arg must never be the thing that fails.
		$_GET['maestro_edit'] = '1';
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		parent::tear_down();
	}

	/**
	 * Helper: run the enqueue pass against the current screen.
	 *
	 * Calls Assets::enqueue() directly rather than firing admin_enqueue_scripts,
	 * so the assertion is about this plugin's gate and not about which other
	 * callbacks happen to be hooked in the test environment.
	 *
	 * @return void
	 */
	private function run_enqueue() {
		$config = new Config();
		$replay = new Replay( $config );
		$assets = new Assets( $config, $replay );

		$assets->enqueue();
	}

	/**
	 * Every handle Assets::enqueue() can register, including the always-loaded
	 * admin-bar stylesheet — that stylesheet exists only to keep the toggle
	 * reachable at <=782px, so on a screen with no toggle it is dead weight.
	 *
	 * @return string[][] [ handle, type ] pairs.
	 */
	private function handles() {
		return array(
			array( 'maestro-admin-bar', 'style' ),
			array( 'maestro', 'style' ),
			array( 'maestro-logic', 'script' ),
			array( 'maestro', 'script' ),
		);
	}

	/**
	 * Assert none of Maestro's handles are enqueued.
	 *
	 * @param string $context Screen description for the failure message.
	 * @return void
	 */
	private function assertNothingEnqueued( $context ) {
		foreach ( $this->handles() as list( $handle, $type ) ) {
			$enqueued = 'style' === $type
				? wp_style_is( $handle, 'enqueued' )
				: wp_script_is( $handle, 'enqueued' );

			$this->assertFalse(
				$enqueued,
				sprintf( '%s handle "%s" must not be enqueued on %s', $type, $handle, $context )
			);
		}
	}

	/**
	 * WP71-01 (post editor): edit mode reached by URL on a block-editor screen
	 * must load nothing.
	 */
	public function test_no_assets_on_block_editor_screen() {
		set_current_screen( 'post' );
		get_current_screen()->is_block_editor( true );

		$this->run_enqueue();

		$this->assertNothingEnqueued( 'a block-editor screen' );
	}

	/**
	 * WP71-01 (Site Editor): same, matched on screen id.
	 */
	public function test_no_assets_on_site_editor_screen() {
		set_current_screen( 'site-editor' );

		$this->run_enqueue();

		$this->assertNothingEnqueued( 'the Site Editor screen' );
	}

	/**
	 * Regression guard: on a classic admin screen in edit mode the editor must
	 * still load in full. Without this, a gate that refused everything
	 * everywhere would pass the two tests above.
	 */
	public function test_assets_load_on_classic_admin_screen() {
		set_current_screen( 'options-general' );

		$this->run_enqueue();

		foreach ( $this->handles() as list( $handle, $type ) ) {
			$enqueued = 'style' === $type
				? wp_style_is( $handle, 'enqueued' )
				: wp_script_is( $handle, 'enqueued' );

			$this->assertTrue(
				$enqueued,
				sprintf( '%s handle "%s" must be enqueued on a classic admin screen in edit mode', $type, $handle )
			);
		}
	}
}
