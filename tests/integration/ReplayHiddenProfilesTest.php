<?php
/**
 * Phase 27-03 — Term 3 of the hide seam: hiding profiles, applied to the real
 * $menu / $submenu globals.
 *
 * Covers the third OR'd term in Replay::is_hidden_for_current_user(), the
 * profile child cascade (child_hidden_profiles), LIVE membership (a change to
 * the profiles map takes effect on the next request with no re-compile), the
 * fast path (no membership lookup unless an item carries a profile axis), and
 * the edit-mode suspension and multisite super-admin exemption Term 3 shares
 * with the per-user axis.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class ReplayHiddenProfilesTest extends WP_UnitTestCase {

	/**
	 * Same minimal menu shape ReplayHiddenUsersTest seeds.
	 */
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
				15 => array( 'Categories', 'manage_categories', 'edit-tags.php?taxonomy=category', '' ),
			),
		);
	}

	public function set_up() {
		parent::set_up();
		$this->seed_menu();
		delete_option( 'maestro_config' );
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		parent::tear_down();
	}

	private function run_replay() {
		$replay = new Replay( new Config() );
		$replay->replay();
		return $replay;
	}

	/**
	 * Author AS AN ADMINISTRATOR, then restore the acting user. Profiles are
	 * gated on `list_users` exactly as the per-user axes are.
	 *
	 * @param array $config Raw config payload.
	 * @return array The stored config.
	 */
	private function save_as_admin( array $config ) {
		$acting = get_current_user_id();
		$admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );
		$saved = ( new Config() )->save( $config );
		wp_set_current_user( $acting );
		return $saved;
	}

	/**
	 * One profile named P, with the given members, hiding upload.php and the
	 * children of edit.php.
	 *
	 * @param int[] $members User IDs.
	 * @return array The stored config.
	 */
	private function save_profile( array $members ) {
		return $this->save_as_admin(
			array(
				'profiles' => array(
					'p_1' => array(
						'name'        => 'Reduced view',
						'users'       => $members,
						'hides'       => array( 'upload.php' ),
						'child_hides' => array( 'edit.php' ),
					),
				),
			)
		);
	}

	private function top_slugs() {
		global $menu;
		return wp_list_pluck( $menu, 2 );
	}

	private function child_slugs( $parent = 'edit.php' ) {
		global $submenu;
		return isset( $submenu[ $parent ] ) ? array_values( wp_list_pluck( $submenu[ $parent ], 2 ) ) : array();
	}

	private function membership_index( Replay $replay ) {
		$prop = new \ReflectionProperty( Replay::class, 'profile_ids_by_user' );
		$prop->setAccessible( true );
		return $prop->getValue( $replay );
	}

	/* -----------------------------------------------------------------------
	 * Term 3 — the item and child axes
	 * --------------------------------------------------------------------- */

	public function test_profile_member_has_the_item_hidden() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_profile( array( $editor ) );

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs() );
	}

	public function test_non_member_is_unaffected() {
		$member = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other  = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $other );
		$this->save_profile( array( $member ) );

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs(), 'A same-role non-member keeps the row.' );
		$this->assertSame( array( 'edit.php', 'post-new.php', 'edit-tags.php?taxonomy=category' ), $this->child_slugs() );
	}

	public function test_child_hides_hide_the_children_with_the_parent_left_visible() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_profile( array( $editor ) );

		$this->run_replay();

		$this->assertContains( 'edit.php', $this->top_slugs(), 'The parent stays visible.' );
		$this->assertSame( array(), $this->child_slugs(), 'Every child is hidden.' );
	}

	public function test_a_profile_hide_on_a_qualified_submenu_key_hides_only_that_child() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_as_admin(
			array(
				'profiles' => array(
					'p_1' => array(
						'name'  => 'P',
						'users' => array( $editor ),
						'hides' => array( 'edit.php>post-new.php' ),
					),
				),
			)
		);

		$this->run_replay();

		$this->assertSame( array( 'edit.php', 'edit-tags.php?taxonomy=category' ), $this->child_slugs() );
	}

	/* -----------------------------------------------------------------------
	 * Membership is LIVE and self-healing
	 * --------------------------------------------------------------------- */

	/**
	 * Membership is read from the map on each request, not compiled. Editing
	 * the stored member list alone, with the compiled item axis left exactly as
	 * it was, changes the outcome on the next request.
	 */
	public function test_removing_a_member_unhides_on_the_next_request_without_a_recompile() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$stored = $this->save_profile( array( $editor ) );

		$this->run_replay();
		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'Precondition: hidden while a member.' );

		unset( $stored['profiles']['p_1']['users'] );
		update_option( 'maestro_config', $stored, false );
		$this->assertSame( array( 'p_1' ), $stored['items']['upload.php']['hidden_profiles'], 'The compiled axis is untouched.' );

		$this->seed_menu();
		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs() );
	}

	/**
	 * A stale reference on an item to a profile that no longer exists resolves
	 * to nothing. Deletion cleans items on save (27-02); this is the net.
	 */
	public function test_a_reference_to_a_deleted_profile_self_heals() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$stored = $this->save_profile( array( $editor ) );

		unset( $stored['profiles'] );
		update_option( 'maestro_config', $stored, false );

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs() );
		$this->assertSame( array( 'edit.php', 'post-new.php', 'edit-tags.php?taxonomy=category' ), $this->child_slugs() );
	}

	/**
	 * Membership is resolved per user, so a Replay that serves two users in one
	 * request (as tests and some cron paths do) never reuses the first user's set.
	 */
	public function test_membership_is_resolved_per_user() {
		$member = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other  = self::factory()->user->create( array( 'role' => 'editor' ) );
		$this->save_profile( array( $member ) );

		$replay = new Replay( new Config() );

		wp_set_current_user( $member );
		$replay->replay();
		$this->assertNotContains( 'upload.php', $this->top_slugs() );

		wp_set_current_user( $other );
		$this->seed_menu();
		$replay->replay();
		$this->assertContains( 'upload.php', $this->top_slugs() );
	}

	/* -----------------------------------------------------------------------
	 * The three terms OR independently
	 * --------------------------------------------------------------------- */

	public function test_profile_term_hides_when_neither_role_nor_user_term_matches() {
		$editor   = self::factory()->user->create( array( 'role' => 'editor' ) );
		$stranger = self::factory()->user->create( array( 'role' => 'author' ) );
		wp_set_current_user( $editor );
		$this->save_as_admin(
			array(
				'items'    => array(
					'upload.php' => array(
						'hidden_roles' => array( 'author' ),
						'hidden_users' => array( $stranger ),
					),
				),
				'profiles' => array(
					'p_1' => array( 'name' => 'P', 'users' => array( $editor ), 'hides' => array( 'upload.php' ) ),
				),
			)
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs() );
	}

	public function test_role_term_still_hides_when_the_profile_term_does_not_match() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		$member = self::factory()->user->create( array( 'role' => 'author' ) );
		wp_set_current_user( $editor );
		$this->save_as_admin(
			array(
				'items'    => array( 'upload.php' => array( 'hidden_roles' => array( 'editor' ) ) ),
				'profiles' => array(
					'p_1' => array( 'name' => 'P', 'users' => array( $member ), 'hides' => array( 'upload.php' ) ),
				),
			)
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs() );
	}

	public function test_no_term_matching_leaves_the_row_visible() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		$member = self::factory()->user->create( array( 'role' => 'author' ) );
		wp_set_current_user( $editor );
		$this->save_as_admin(
			array(
				'items'    => array( 'upload.php' => array( 'hidden_roles' => array( 'author' ), 'hidden_users' => array( $member ) ) ),
				'profiles' => array(
					'p_1' => array( 'name' => 'P', 'users' => array( $member ), 'hides' => array( 'upload.php' ) ),
				),
			)
		);

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs() );
	}

	public function test_several_terms_matching_hide_the_row_once() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_as_admin(
			array(
				'items'    => array( 'upload.php' => array( 'hidden_roles' => array( 'editor' ), 'hidden_users' => array( $editor ) ) ),
				'profiles' => array(
					'p_1' => array( 'name' => 'P', 'users' => array( $editor ), 'hides' => array( 'upload.php' ) ),
				),
			)
		);

		$this->run_replay();

		$this->assertSame( array( 'index.php', 'edit.php' ), array_values( $this->top_slugs() ) );
	}

	/* -----------------------------------------------------------------------
	 * The fast path
	 * --------------------------------------------------------------------- */

	/**
	 * Profiles that hide nothing cost nothing: no item carries a profile axis,
	 * so the membership index is never built.
	 */
	public function test_no_membership_lookup_without_a_profile_axis_on_any_item() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_as_admin(
			array(
				'items'    => array( 'upload.php' => array( 'title' => 'Files' ) ),
				'profiles' => array( 'p_1' => array( 'name' => 'P', 'users' => array( $editor ) ) ),
			)
		);

		$replay = $this->run_replay();

		$this->assertSame( array(), $this->membership_index( $replay ) );
	}

	public function test_membership_index_is_built_once_and_reused() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_profile( array( $editor ) );

		$replay = $this->run_replay();

		$this->assertSame( array( $editor => array( 'p_1' ) ), $this->membership_index( $replay ) );
	}

	/* -----------------------------------------------------------------------
	 * Edit mode and the multisite super-admin exemption
	 * --------------------------------------------------------------------- */

	/**
	 * A profile can contain the admin who is editing. Applying it in edit mode
	 * would remove the row before the editor model is built and strand the
	 * rule, so Term 3 is suspended there, exactly like Term 2.
	 */
	public function test_profile_containing_the_editing_admin_stays_editable_in_edit_mode() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );
		$this->save_profile( array( $admin ) );

		$this->run_replay();
		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'Outside edit mode the profile applies to its admin member.' );

		$_GET['maestro_edit'] = '1';
		$this->seed_menu();
		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs() );
		$this->assertSame( array( 'edit.php', 'post-new.php', 'edit-tags.php?taxonomy=category' ), $this->child_slugs() );
	}

	public function test_multisite_super_admin_is_exempt_from_the_profile_axis() {
		if ( ! is_multisite() ) {
			$this->markTestSkipped( 'Multisite-only: the exempt branch requires is_multisite().' );
		}

		$super = self::factory()->user->create( array( 'role' => 'administrator' ) );
		grant_super_admin( $super );
		wp_set_current_user( $super );
		$this->save_profile( array( $super ) );

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs() );
	}

	public function test_multisite_ordinary_member_is_still_hidden() {
		if ( ! is_multisite() ) {
			$this->markTestSkipped( 'Multisite-only.' );
		}

		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->save_profile( array( $editor ) );

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs() );
	}
}
