<?php
/**
 * Phase 27-04 — the hiding-profile axes as the EDITOR receives them.
 *
 * The popover's profile checkboxes are seeded from Replay::get_menu_model(),
 * and the Profiles dialog from Replay::get_editor_profiles(). Both must agree
 * with what replay() applies, or the next full-replace autosave would drop a
 * working rule. And both name people, so both are withheld from a viewer
 * without `list_users`, on the same terms as the per-user axes.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use ReflectionMethod;
use WP_UnitTestCase;

class ReplayMenuModelProfilesTest extends WP_UnitTestCase {

	private $admin;
	private $member;

	private function seed_menu() {
		global $menu, $submenu;

		$menu = array(
			2  => array( 'Dashboard', 'read', 'index.php', '', 'menu-top', 'menu-dashboard', 'dashicons-dashboard' ),
			5  => array( 'Posts', 'edit_posts', 'edit.php', '', 'menu-top', 'menu-posts', 'dashicons-admin-post' ),
			10 => array( 'Media', 'upload_files', 'upload.php', '', 'menu-top', 'menu-media', 'dashicons-admin-media' ),
		);

		$submenu = array(
			'edit.php' => array(
				5  => array( 'All Posts', 'edit_posts', 'edit.php', '' ),
				10 => array( 'Add New', 'edit_posts', 'post-new.php', '' ),
			),
		);
	}

	public function set_up() {
		parent::set_up();
		$this->seed_menu();
		delete_option( 'maestro_config' );

		$this->admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$this->member = self::factory()->user->create(
			array(
				'role'         => 'editor',
				'display_name' => 'Ada Lovelace',
			)
		);
		wp_set_current_user( $this->admin );
	}

	public function tear_down() {
		delete_option( 'maestro_config' );
		parent::tear_down();
	}

	private function seed_profiles() {
		( new Config() )->save(
			array(
				'profiles' => array(
					'p_1' => array(
						'name'        => 'Reduced view',
						'users'       => array( $this->member ),
						'hides'       => array( 'upload.php?ver=9', 'edit.php>post-new.php' ),
						'child_hides' => array( 'edit.php' ),
					),
					'p_2' => array( 'name' => 'Shop staff' ),
				),
			)
		);
	}

	private function model() {
		$replay = new Replay( new Config() );
		$replay->replay();
		return $replay->get_menu_model();
	}

	private function node( array $model, $slug ) {
		foreach ( $model as $node ) {
			if ( $node['slug'] === $slug ) {
				return $node;
			}
		}
		$this->fail( "No node '{$slug}'" );
	}

	private function child( array $node, $slug ) {
		foreach ( $node['submenu'] as $child ) {
			if ( $child['slug'] === $slug ) {
				return $child;
			}
		}
		$this->fail( "No child '{$slug}'" );
	}

	/**
	 * Every node carries both profile axes, as an empty list when untouched,
	 * and a child carries its own axis through the qualified key. The hide
	 * naming `upload.php?ver=9` surfaces on `upload.php`, where the compile
	 * landed it.
	 */
	public function test_model_exposes_the_profile_axes() {
		$this->seed_profiles();
		$model = $this->model();

		$this->assertSame( array( 'p_1' ), $this->node( $model, 'upload.php' )['hiddenProfiles'] );
		$this->assertSame( array(), $this->node( $model, 'upload.php' )['childHiddenProfiles'] );

		$posts = $this->node( $model, 'edit.php' );
		$this->assertSame( array(), $posts['hiddenProfiles'] );
		$this->assertSame( array( 'p_1' ), $posts['childHiddenProfiles'] );
		$this->assertSame( array( 'p_1' ), $this->child( $posts, 'post-new.php' )['hiddenProfiles'] );
		$this->assertSame( array(), $this->child( $posts, 'edit.php' )['hiddenProfiles'] );

		$this->assertSame( array(), $this->node( $model, 'index.php' )['hiddenProfiles'] );
	}

	/**
	 * What the model shows is what replay() does: the item the popover shows
	 * ticked for p_1 is the one removed for p_1's member.
	 */
	public function test_model_agrees_with_replay_for_a_member() {
		global $menu, $submenu;
		$this->seed_profiles();

		wp_set_current_user( $this->member );
		( new Replay( new Config() ) )->replay();
		$rendered = array_map(
			function ( $row ) {
				return $row[2];
			},
			array_values( $menu )
		);
		$this->assertNotContains( 'upload.php', $rendered );
		$this->assertContains( 'edit.php', $rendered );
		$this->assertEmpty( $submenu['edit.php'] ?? array(), 'The child axis hides every sub-item.' );

		$this->seed_menu();
		wp_set_current_user( $this->admin );
		$model = $this->model();
		$this->assertSame( array( 'p_1' ), $this->node( $model, 'upload.php' )['hiddenProfiles'] );
		$this->assertSame( array( 'p_1' ), $this->node( $model, 'edit.php' )['childHiddenProfiles'] );
	}

	/**
	 * A reference to a profile that is not in the map is left out of the
	 * display. The compile never stores one, so this writes the option by hand,
	 * the shape a config restored from an older backup could have.
	 */
	public function test_model_omits_references_to_missing_profiles() {
		update_option(
			'maestro_config',
			array(
				'schema_version' => 2,
				'items'          => array(
					'upload.php' => array( 'hidden_profiles' => array( 'p_9', 'p_1' ) ),
					'edit.php'   => array( 'child_hidden_profiles' => array( 'p_9' ) ),
				),
				'profiles'       => array( 'p_1' => array( 'name' => 'Kept' ) ),
			)
		);

		$model = $this->model();

		$this->assertSame( array( 'p_1' ), $this->node( $model, 'upload.php' )['hiddenProfiles'] );
		$this->assertSame( array(), $this->node( $model, 'edit.php' )['childHiddenProfiles'] );
	}

	/**
	 * The registry lists profiles in stored order with members as id/name
	 * pairs, drops a member whose account is gone, and resolves every name in
	 * one query.
	 */
	public function test_editor_profiles_registry() {
		$gone = self::factory()->user->create( array( 'role' => 'author' ) );
		( new Config() )->save(
			array(
				'profiles' => array(
					'p_1' => array(
						'name'  => 'Reduced view',
						'users' => array( $this->member, $gone ),
					),
					'p_2' => array(
						'name'  => 'Shop staff',
						'users' => array( $this->member ),
					),
				),
			)
		);
		wp_delete_user( $gone );

		$replay = new Replay( new Config() );
		$before = get_num_queries();
		$out    = $replay->get_editor_profiles();
		$delta  = get_num_queries() - $before;

		$pair = array(
			'id'   => $this->member,
			'name' => 'Ada Lovelace',
		);
		$this->assertSame(
			array(
				array(
					'id'    => 'p_1',
					'name'  => 'Reduced view',
					'users' => array( $pair ),
				),
				array(
					'id'    => 'p_2',
					'name'  => 'Shop staff',
					'users' => array( $pair ),
				),
			),
			$out
		);
		$this->assertLessThanOrEqual( 2, $delta, "Member names must be batched; {$delta} queries suggests a per-profile lookup." );
	}

	/**
	 * A viewer without `list_users` gets no registry, empty profile axes, and
	 * no profiles map in the localized config, while the stored map and the
	 * rules it compiles are untouched.
	 */
	public function test_profiles_are_withheld_without_list_users() {
		$this->seed_profiles();

		add_role( 'maestro_delegate', 'Maestro Delegate', array( 'read' => true, 'edit_posts' => true, 'upload_files' => true ) );
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'maestro_delegate' ) ) );
		$this->assertFalse( current_user_can( 'list_users' ), 'precondition: delegate lacks list_users' );

		$model = $this->model();
		$this->assertSame( array(), $this->node( $model, 'upload.php' )['hiddenProfiles'] );
		$this->assertSame( array(), $this->node( $model, 'edit.php' )['childHiddenProfiles'] );
		$this->assertSame( array(), $this->child( $this->node( $model, 'edit.php' ), 'post-new.php' )['hiddenProfiles'] );
		$this->assertSame( array(), ( new Replay( new Config() ) )->get_editor_profiles() );

		$this->assertSame( array(), $this->assets_call( 'profile_carry' ) );

		$this->assertArrayHasKey( 'p_1', ( new Config() )->get()['profiles'], 'Withheld from the viewer, not deleted.' );

		remove_role( 'maestro_delegate' );
	}

	/**
	 * The localized config never carries the map, for anyone: the editor
	 * gets profiles from the registry and its carry list from profile_carry().
	 * The compiled item axes, which hold only profile IDs, stay.
	 */
	public function test_localized_config_omits_the_profiles_map() {
		$this->seed_profiles();

		$localized = $this->assets_call( 'editor_config' );

		$this->assertArrayNotHasKey( 'profiles', $localized );
		$this->assertSame( array( 'p_1' ), $localized['items']['upload.php?ver=9']['hidden_profiles'] );
	}

	/**
	 * The carry list holds exactly the stored hides that match no rendered
	 * row, compared by normalized key. A key that matches only after
	 * normalization (`upload.php?ver=9`) is rendered, so it is left to the
	 * editor's model; carrying it too would make unticking it impossible.
	 */
	public function test_profile_carry_lists_only_unrendered_hides() {
		( new Config() )->save(
			array(
				'profiles' => array(
					'p_1' => array(
						'name'        => 'Reduced view',
						'hides'       => array( 'upload.php?ver=9', 'woocommerce', 'edit.php>post-new.php', 'edit.php>gone.php' ),
						'child_hides' => array( 'edit.php', 'shop_order' ),
					),
					'p_2' => array(
						'name'  => 'Shop staff',
						'hides' => array( 'index.php' ),
					),
				),
			)
		);

		$this->assertSame(
			array(
				'p_1' => array(
					'hides'       => array( 'woocommerce', 'edit.php>gone.php' ),
					'child_hides' => array( 'shop_order' ),
				),
			),
			$this->assets_call( 'profile_carry' )
		);
	}

	private function assets_call( $name ) {
		$method = new ReflectionMethod( Assets::class, $name );
		$method->setAccessible( true );
		return $method->invoke( new Assets( new Config(), new Replay( new Config() ) ) );
	}
}
