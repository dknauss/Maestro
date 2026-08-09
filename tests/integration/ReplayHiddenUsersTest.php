<?php
/**
 * Integration tests for ROLE-02's per-user hiding axes applied to the real
 * $menu / $submenu globals.
 *
 * Covers the widened Replay::is_hidden_for_current_user() seam (hidden_users),
 * the per-user child cascade (child_hidden_users), the super-admin exemption's
 * scope, and the anti-lockout rail.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class ReplayHiddenUsersTest extends WP_UnitTestCase {

	/**
	 * Same minimal menu shape ReplayTest seeds, so the two read alike.
	 *
	 * Row shape: [ title, capability, slug, page_title, classes, menu_id, icon ]
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

	private function run_replay() {
		( new Replay( new Config() ) )->replay();
	}

	/**
	 * Author a config AS AN ADMINISTRATOR, then restore the acting user.
	 *
	 * Per-user rules can only be written by someone with `list_users`, so a test
	 * that saves them while acting as the targeted editor is not just unrealistic
	 * — it silently stores nothing and then asserts against an empty config.
	 * Several tests here did exactly that and passed vacuously until the
	 * server-side gate landed. Authoring as an admin and observing as the target
	 * mirrors how the feature is actually used.
	 *
	 * @param array $config Raw config payload.
	 * @return void
	 */
	private function save_as_admin( array $config ) {
		$acting = get_current_user_id();
		$admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );
		( new Config() )->save( $config );
		wp_set_current_user( $acting );
	}

	private function top_slugs() {
		global $menu;
		return wp_list_pluck( $menu, 2 );
	}

	private function child_slugs( $parent = 'edit.php' ) {
		global $submenu;
		return isset( $submenu[ $parent ] ) ? wp_list_pluck( $submenu[ $parent ], 2 ) : array();
	}

	/* -----------------------------------------------------------------------
	 * hidden_users — the item axis
	 * --------------------------------------------------------------------- */

	public function test_hidden_from_user_is_removed_for_that_user() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $editor ) ) ) )
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'Media should be hidden from the targeted user.' );
	}

	public function test_hidden_from_user_still_shows_for_other_users() {
		$targeted = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other    = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $other );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $targeted ) ) ) )
		);

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs(), 'Media should remain for an untargeted user.' );
	}

	/* -----------------------------------------------------------------------
	 * The two axes OR independently
	 * --------------------------------------------------------------------- */

	public function test_user_axis_hides_even_when_role_axis_does_not_match() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array(
				'items' => array(
					'upload.php' => array(
						'hidden_roles' => array( 'author' ),   // does NOT match an editor
						'hidden_users' => array( $editor ),    // does
					),
				),
			)
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'The user axis alone should hide.' );
	}

	public function test_role_axis_hides_even_when_user_axis_does_not_match() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other  = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array(
				'items' => array(
					'upload.php' => array(
						'hidden_roles' => array( 'editor' ),  // matches
						'hidden_users' => array( $other ),    // does not
					),
				),
			)
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'The role axis alone should still hide.' );
	}

	public function test_neither_axis_matching_leaves_the_row_visible() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other  = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array(
				'items' => array(
					'upload.php' => array(
						'hidden_roles' => array( 'author' ),
						'hidden_users' => array( $other ),
					),
				),
			)
		);

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs(), 'Neither axis matching must leave the row alone.' );
	}

	/**
	 * A config with no visibility axes at all must leave the menu untouched —
	 * the zero-override path that every pre-ROLE-02 config takes.
	 */
	public function test_config_without_any_visibility_axis_leaves_menu_untouched() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'title' => 'Files' ) ) )
		);

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs() );
	}

	/**
	 * A logged-out context must not fatal and must not hide.
	 */
	public function test_logged_out_user_is_never_hidden_and_does_not_fatal() {
		wp_set_current_user( 0 );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( 1 ) ) ) )
		);

		$this->run_replay();

		$this->assertContains( 'upload.php', $this->top_slugs(), 'A logged-out request must not resolve a per-user hide.' );
	}

	/* -----------------------------------------------------------------------
	 * child_hidden_users — the per-user child cascade
	 * --------------------------------------------------------------------- */

	public function test_child_hidden_users_hides_children_with_parent_left_visible() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array( 'items' => array( 'edit.php' => array( 'child_hidden_users' => array( $editor ) ) ) )
		);

		$this->run_replay();

		$this->assertContains( 'edit.php', $this->top_slugs(), 'The parent row must stay visible.' );
		$this->assertSame( array(), array_values( $this->child_slugs() ), 'Every child must be hidden from the targeted user.' );
	}

	public function test_child_hidden_users_does_not_affect_untargeted_users() {
		$targeted = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other    = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $other );

		$this->save_as_admin(
			array( 'items' => array( 'edit.php' => array( 'child_hidden_users' => array( $targeted ) ) ) )
		);

		$this->run_replay();

		$this->assertContains( 'post-new.php', $this->child_slugs(), 'An untargeted user keeps the children.' );
	}

	/**
	 * The child's own hidden_users unions with the parent's child_hidden_users:
	 * two different users, each hidden by a different half of the union.
	 */
	public function test_child_own_users_union_with_parent_child_users() {
		$by_own    = self::factory()->user->create( array( 'role' => 'editor' ) );
		$by_parent = self::factory()->user->create( array( 'role' => 'editor' ) );

		$this->save_as_admin(
			array(
				'items' => array(
					'edit.php'                 => array( 'child_hidden_users' => array( $by_parent ) ),
					'edit.php>post-new.php'    => array( 'hidden_users' => array( $by_own ) ),
				),
			)
		);

		wp_set_current_user( $by_own );
		$this->seed_menu();
		$this->run_replay();
		$this->assertNotContains( 'post-new.php', $this->child_slugs(), 'Hidden by the child own axis.' );

		wp_set_current_user( $by_parent );
		$this->seed_menu();
		$this->run_replay();
		$this->assertNotContains( 'post-new.php', $this->child_slugs(), 'Hidden by the parent child axis.' );
	}

	/**
	 * A parent with no child_hidden_users contributes nothing — the untouched
	 * no-op case that keeps the cascade zero-regression by construction.
	 */
	public function test_parent_without_child_users_contributes_nothing() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->save_as_admin(
			array( 'items' => array( 'edit.php' => array( 'title' => 'Writing' ) ) )
		);

		$this->run_replay();

		$this->assertContains( 'post-new.php', $this->child_slugs() );
	}

	/* -----------------------------------------------------------------------
	 * Super-admin exemption scope (RULED 2026-08-08: new axis only)
	 * --------------------------------------------------------------------- */

	/**
	 * The exemption is MULTISITE-scoped. On single-site is_super_admin() is true
	 * for any administrator, so an unscoped exemption would make administrators
	 * un-hideable — breaking the locked "self-target = warn but allow" decision
	 * and the feature's primary single-site target. This test pins that: on
	 * single-site, an administrator CAN be hidden by a per-user rule.
	 */
	public function test_administrator_can_be_per_user_hidden_on_single_site() {
		if ( is_multisite() ) {
			$this->markTestSkipped( 'Single-site behaviour; the multisite exemption is asserted separately.' );
		}

		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $admin ) ) ) )
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'Self-targeting must be permitted on single-site.' );
	}

	/**
	 * The role axis keeps its shipped v1.4.1 behaviour: the exemption ruled on
	 * 2026-08-08 covers the NEW user axis only. An administrator matched by a
	 * role rule is still hidden, exactly as before this phase.
	 */
	public function test_role_axis_behaviour_is_unchanged_for_administrators() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'administrator' ) ) ) )
		);

		$this->run_replay();

		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'The shipped role axis must be untouched by the exemption.' );
	}

	/* -----------------------------------------------------------------------
	 * SERVER-SIDE gate on the per-user axes (Codex P2, 2026-08-09)
	 *
	 * Hiding the picker in the editor is not a control — the REST save is gated
	 * by capability(), not list_users, so a delegated editor could POST guessed
	 * IDs and read the names back out of the model. These pin the real gate.
	 * --------------------------------------------------------------------- */

	/**
	 * A saver without `list_users` cannot ADD a per-user rule, however the
	 * payload is constructed.
	 */
	public function test_saver_without_list_users_cannot_add_a_user_rule() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		$victim = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );
		$this->assertFalse( current_user_can( 'list_users' ), 'Precondition: an editor lacks list_users.' );

		$config = new Config();
		$config->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $victim ) ) ) )
		);

		$stored = $config->get();
		$this->assertArrayNotHasKey(
			'hidden_users',
			isset( $stored['items']['upload.php'] ) ? $stored['items']['upload.php'] : array(),
			'A saver without list_users must not be able to write a per-user rule.'
		);
	}

	/**
	 * ...and cannot DESTROY one either. The autosave is full-replace, so simply
	 * dropping the axes would let any unrelated edit by such a user wipe an
	 * administrator's per-user rules.
	 */
	public function test_saver_without_list_users_preserves_existing_user_rules() {
		$admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$target = self::factory()->user->create( array( 'role' => 'editor' ) );
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );

		// An administrator authors the rule.
		wp_set_current_user( $admin );
		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $target ) ) ) )
		);

		// A delegated editor then saves an unrelated rename.
		wp_set_current_user( $editor );
		$config = new Config();
		$config->save(
			array( 'items' => array( 'upload.php' => array( 'title' => 'Files' ) ) )
		);

		$stored = $config->get();
		$this->assertSame( 'Files', $stored['items']['upload.php']['title'], 'The rename must apply.' );
		$this->assertSame(
			array( $target ),
			$stored['items']['upload.php']['hidden_users'],
			"An unrelated save must not destroy an administrator's per-user rule."
		);
	}

	/**
	 * The editor MODEL must not leak IDs or display names to a viewer who
	 * cannot list users — otherwise the model becomes the back door the
	 * server-side write gate just closed.
	 */
	public function test_menu_model_hides_user_axes_from_viewers_without_list_users() {
		$admin  = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$target = self::factory()->user->create( array( 'role' => 'editor', 'display_name' => 'Secret Person' ) );
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );

		wp_set_current_user( $admin );
		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $target ) ) ) )
		);

		wp_set_current_user( $editor );
		$replay = new Replay( new Config() );
		$replay->replay();
		$model = $replay->get_menu_model();

		$json = wp_json_encode( $model );
		$this->assertStringNotContainsString( 'Secret Person', $json, 'Display names must not reach a viewer without list_users.' );
		$this->assertStringNotContainsString( (string) $target, $json, 'Targeted user IDs must not reach them either.' );
	}

	/* -----------------------------------------------------------------------
	 * Self-target must stay UNDOABLE (Codex P2, 2026-08-09)
	 * --------------------------------------------------------------------- */

	/**
	 * In EDIT MODE the per-user axis is suspended, so a self-targeted row stays
	 * in $menu — and therefore in get_menu_model() — where the admin can click
	 * it and remove the rule.
	 *
	 * Without this, replay drops the row before the editor model is built and
	 * "warn but allow" degrades into "warn, allow, and strand them on Reset
	 * All". The rule is still honoured during normal browsing; only editing is
	 * exempt, and only for this axis.
	 */
	public function test_self_targeted_row_remains_editable_in_edit_mode() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $admin ) ) ) )
		);

		// Normal browsing: the rule applies.
		$this->run_replay();
		$this->assertNotContains( 'upload.php', $this->top_slugs(), 'Outside edit mode the self-hide must apply.' );

		// Edit mode: the row comes back so it can be un-hidden.
		$_GET['maestro_edit'] = '1';
		$this->seed_menu();
		$this->run_replay();
		unset( $_GET['maestro_edit'] );

		$this->assertContains(
			'upload.php',
			$this->top_slugs(),
			'A self-targeted row must remain visible in edit mode so the rule can be removed.'
		);
	}

	/**
	 * The suspension is scoped to the USER axis. A role rule that matches the
	 * acting user still hides in edit mode, exactly as it did in v1.4.1 —
	 * this fix must not quietly change the shipped role behaviour.
	 */
	public function test_role_axis_still_applies_in_edit_mode() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'administrator' ) ) ) )
		);

		$_GET['maestro_edit'] = '1';
		$this->run_replay();
		unset( $_GET['maestro_edit'] );

		$this->assertNotContains(
			'upload.php',
			$this->top_slugs(),
			'The role axis must keep its v1.4.1 edit-mode behaviour.'
		);
	}

	/**
	 * Someone ELSE's hide is unaffected by the acting admin being in edit mode —
	 * the suspension only ever spares the person doing the editing.
	 */
	public function test_edit_mode_suspension_does_not_leak_to_other_users() {
		$target = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $target );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $target ) ) ) )
		);

		$this->run_replay();
		$this->assertNotContains( 'upload.php', $this->top_slugs() );
	}

	/* -----------------------------------------------------------------------
	 * Anti-lockout rail (§11)
	 * --------------------------------------------------------------------- */

	/**
	 * TRIPWIRE. Maestro registers no admin menu page — its only entry point is an
	 * admin-bar node, which lives in $wp_admin_bar and not in $menu/$submenu, so
	 * no `items` rule can address it. The §11 anti-lockout rail is therefore
	 * satisfied structurally rather than by protective code.
	 *
	 * If someone later gives Maestro a real add_menu_page() entry, this test
	 * fails and forces the rail to be reconsidered deliberately. That tripwire is
	 * the point of this test — not the assertion itself.
	 */
	public function test_maestro_registers_no_menu_page_that_a_hide_could_remove() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $admin ) ) ) )
		);

		$this->run_replay();

		foreach ( $this->top_slugs() as $slug ) {
			$this->assertStringNotContainsString(
				'maestro',
				strtolower( (string) $slug ),
				'Maestro must not own a $menu row; if it gains one, the anti-lockout rail needs real protective code.'
			);
		}
	}
}
