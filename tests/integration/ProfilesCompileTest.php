<?php
/**
 * Phase 27-02 — hiding profiles compile onto the inline `hidden_profiles` axis.
 *
 * The `profiles` map is authoring only. These tests pin, against real
 * WordPress users and the real REST save, that:
 *
 *   - a profile's hide-lists compile onto `items[slug].hidden_profiles` and
 *     `child_hidden_profiles`, and nothing else writes those axes
 *   - the compile is idempotent across repeated full-replace saves
 *   - members are intersected against LIVE users, so a deleted account drops
 *     out on the next save without deleting the profile
 *   - a saver without `list_users` can neither change nor destroy profiles,
 *     on save or on Reset All, while an administrator's Reset All wipes them
 *   - nothing in replay resolves FROM the map (27-03 adds Term 3 on the
 *     compiled axis; until then a profile hides nothing)
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use WP_REST_Request;
use WP_UnitTestCase;

class ProfilesCompileTest extends WP_UnitTestCase {

	const ROUTE = '/maestro/v1/config';

	private $admin;
	private $delegate;
	private $member;
	private $other;

	public function set_up() {
		parent::set_up();
		delete_option( 'maestro_config' );

		global $wp_rest_server;
		$wp_rest_server = new \WP_REST_Server();
		do_action( 'rest_api_init' );

		$this->admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$this->member = self::factory()->user->create( array( 'role' => 'editor' ) );
		$this->other  = self::factory()->user->create( array( 'role' => 'author' ) );

		add_role( 'maestro_delegate', 'Maestro Delegate', array( 'read' => true, 'edit_posts' => true ) );
		$this->delegate = self::factory()->user->create( array( 'role' => 'maestro_delegate' ) );
	}

	public function tear_down() {
		global $wp_rest_server;
		$wp_rest_server = null;
		remove_role( 'maestro_delegate' );
		parent::tear_down();
	}

	private function rest_save( array $config ) {
		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param( 'config', $config );
		$res = rest_get_server()->dispatch( $req );
		$this->assertSame( 200, $res->get_status() );
		return $res->get_data()['config'];
	}

	private function seed_profile() {
		wp_set_current_user( $this->admin );
		return $this->rest_save(
			array(
				'items'    => array( 'upload.php' => array( 'title' => 'Files' ) ),
				'profiles' => array(
					'p_1' => array(
						'name'        => 'Reduced view',
						'users'       => array( $this->member ),
						'hides'       => array( 'upload.php', 'tools.php' ),
						'child_hides' => array( 'edit.php' ),
					),
				),
			)
		);
	}

	public function test_profile_compiles_through_the_rest_save() {
		$saved = $this->seed_profile();

		$this->assertSame(
			array(
				'upload.php' => array(
					'title'           => 'Files',
					'hidden_profiles' => array( 'p_1' ),
				),
				'tools.php'  => array( 'hidden_profiles' => array( 'p_1' ) ),
				'edit.php'   => array( 'child_hidden_profiles' => array( 'p_1' ) ),
			),
			$saved['items']
		);
		$this->assertSame( array( $this->member ), $saved['profiles']['p_1']['users'] );
		$this->assertSame( $saved, ( new Config() )->get(), 'What the save returns is what is stored.' );
	}

	public function test_repeated_full_replace_saves_do_not_drift() {
		$first = $this->seed_profile();

		$again = $first;
		for ( $i = 0; $i < 3; $i++ ) {
			$again = $this->rest_save( $again );
		}

		$this->assertSame( $first, $again );
	}

	public function test_members_are_intersected_against_live_users() {
		wp_set_current_user( $this->admin );
		$saved = $this->rest_save(
			array(
				'profiles' => array(
					'p_1' => array(
						'name'  => 'P',
						'users' => array( $this->member, $this->other, 999999 ),
					),
				),
			)
		);
		$this->assertSame( array( $this->member, $this->other ), $saved['profiles']['p_1']['users'] );

		wp_delete_user( $this->other );
		$saved = $this->rest_save( $saved );

		$this->assertSame( array( $this->member ), $saved['profiles']['p_1']['users'] );

		wp_delete_user( $this->member );
		$saved = $this->rest_save( $saved );

		$this->assertSame(
			array( 'name' => 'P' ),
			$saved['profiles']['p_1'],
			'The profile outlives its members; only the stale IDs go.'
		);
	}

	public function test_delegate_cannot_change_or_destroy_profiles() {
		$seeded = $this->seed_profile();

		wp_set_current_user( $this->delegate );
		$this->assertFalse( current_user_can( 'list_users' ), 'precondition: delegate lacks list_users' );

		$saved = ( new Config() )->save(
			array(
				'items'    => array( 'index.php' => array( 'title' => 'Home' ) ),
				'profiles' => array(),
			)
		);

		$this->assertSame( $seeded['profiles'], $saved['profiles'] );
		$this->assertSame( array( 'p_1' ), $saved['items']['upload.php']['hidden_profiles'] );
		$this->assertSame( array( 'p_1' ), $saved['items']['tools.php']['hidden_profiles'] );
		$this->assertSame( array( 'p_1' ), $saved['items']['edit.php']['child_hidden_profiles'] );
		$this->assertSame( 'Home', $saved['items']['index.php']['title'] );
	}

	public function test_delegate_reset_keeps_profiles_and_admin_reset_wipes_them() {
		$seeded = $this->seed_profile();

		wp_set_current_user( $this->delegate );
		( new Config() )->reset();
		$kept = ( new Config() )->get();

		$this->assertSame( $seeded['profiles'], $kept['profiles'] );
		$this->assertArrayNotHasKey( 'title', $kept['items']['upload.php'], 'The rename the delegate may reset is gone.' );
		$this->assertSame( array( 'p_1' ), $kept['items']['upload.php']['hidden_profiles'] );

		wp_set_current_user( $this->admin );
		( new Config() )->reset();

		$this->assertFalse( get_option( 'maestro_config' ) );
	}

	/**
	 * The map is authoring only: replay may read the compiled axis (27-03),
	 * never the map, for anything but live membership — and in 27-02 it reads
	 * neither. A cheap tripwire on the property the whole design rests on.
	 */
	public function test_replay_never_resolves_from_the_profiles_map() {
		$replay = file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-replay.php' );
		$this->assertStringNotContainsString( "['profiles']", $replay, 'Replay must never resolve from the profiles map.' );
	}
}
