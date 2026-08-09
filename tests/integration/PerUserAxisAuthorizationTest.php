<?php
/**
 * ROLE-02 — authorization boundary for the per-user axes.
 *
 * `maestro_capability` lets a site delegate Maestro to a custom role. That role
 * may not hold `list_users`, and core's users endpoint would give it only
 * published authors — so Maestro withholds the person picker from it. Hiding
 * the picker is presentation, though; the REST save is gated by `capability()`,
 * not by `list_users`. These tests pin the SERVER-side boundary that actually
 * holds the line, in both directions:
 *
 *   - such a saver cannot ADD a per-user rule (no enumeration via Maestro)
 *   - such a saver cannot DESTROY one either, whether they submit the item or
 *     omit it
 *   - the editor model does not hand them display names
 *
 * Written as an adversarial probe during the v1.5.0 release gate, and kept —
 * the omit-the-item case (A3) was a real defect when written, and it is exactly
 * the kind that returns silently, because the symptom is a rule quietly
 * disappearing rather than anything failing loudly.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class PerUserAxisAuthorizationTest extends WP_UnitTestCase {

	private $admin;
	private $delegate;
	private $victim;

	public function set_up() {
		parent::set_up();
		delete_option( 'maestro_config' );

		$this->admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$this->victim = self::factory()->user->create(
			array( 'role' => 'editor', 'display_name' => 'Victim Person' )
		);

		// A delegated Maestro editor: can run Maestro via maestro_capability,
		// but CANNOT list users.
		add_role( 'maestro_delegate', 'Maestro Delegate', array( 'read' => true, 'edit_posts' => true ) );
		$this->delegate = self::factory()->user->create( array( 'role' => 'maestro_delegate' ) );
	}

	public function tear_down() {
		remove_role( 'maestro_delegate' );
		parent::tear_down();
	}

	private function seed_admin_rule() {
		wp_set_current_user( $this->admin );
		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $this->victim ) ) ) )
		);
		$cfg = ( new Config() )->get();
		$this->assertSame( array( $this->victim ), $cfg['items']['upload.php']['hidden_users'], 'precondition' );
	}

	/** A1: can a delegate INJECT a per-user rule? Expected: no. */
	public function test_delegate_cannot_inject_hidden_users() {
		wp_set_current_user( $this->delegate );
		$this->assertFalse( current_user_can( 'list_users' ), 'precondition: delegate lacks list_users' );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $this->victim ) ) ) )
		);

		$cfg = ( new Config() )->get();
		$this->assertArrayNotHasKey( 'hidden_users', $cfg['items']['upload.php'] ?? array() );
	}

	/** A2: delegate saves the SAME item without the axis — is it preserved? Expected: yes. */
	public function test_delegate_save_of_same_item_preserves_the_rule() {
		$this->seed_admin_rule();
		wp_set_current_user( $this->delegate );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'title' => 'Files' ) ) )
		);

		$cfg = ( new Config() )->get();
		$this->assertSame(
			array( $this->victim ),
			$cfg['items']['upload.php']['hidden_users'] ?? null,
			'A2: preserve-verbatim must keep the rule'
		);
	}

	/** A3: delegate saves a payload that OMITS the item entirely. */
	public function test_delegate_save_omitting_the_item() {
		$this->seed_admin_rule();
		wp_set_current_user( $this->delegate );

		( new Config() )->save(
			array( 'items' => array( 'index.php' => array( 'title' => 'Home' ) ) )
		);

		$cfg = ( new Config() )->get();
		$this->assertSame(
			array( $this->victim ),
			$cfg['items']['upload.php']['hidden_users'] ?? null,
			'A3: omitting the item must not destroy the rule'
		);
	}

	/** A4: does the model leak display names to a delegate? Expected: no. */
	public function test_model_does_not_leak_display_names_to_delegate() {
		$this->seed_admin_rule();

		global $menu, $submenu;
		$menu = array(
			10 => array( 'Media', 'upload_files', 'upload.php', '', 'menu-top', 'menu-media', '' ),
		);
		$submenu = array();

		wp_set_current_user( $this->delegate );
		$replay = new Replay( new Config() );
		$model  = $replay->get_menu_model();

		$names = wp_json_encode( $model );
		$this->assertStringNotContainsString(
			'Victim Person',
			$names,
			'A4: a delegate must not read user display names out of the model'
		);
	}
}
