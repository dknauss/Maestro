<?php
/**
 * THE COSMETIC-ONLY GUARDRAIL for ROLE-02's per-user axes.
 *
 * Phase 19 gated this whole feature on one claim being provable: applying a hide
 * changes what a user SEES and never what they can DO. This file is where that
 * stops being a claim. It implements the §6 sketch from
 * `phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md` literally:
 *
 *   STEP 1  baseline    = { cap => current_user_can(cap) } for user U
 *   STEP 2  apply       a hide rule targeting U
 *   STEP 3  ASSERT      the capability map is IDENTICAL while the rule is active
 *   STEP 4  ASSERT      the menu model changed (the hide actually did something)
 *   STEP 5  remove      the rule
 *   STEP 6  ASSERT      the capability map is IDENTICAL again
 *
 * The capability set C is read off the LIVE role object rather than hand-listed,
 * so a capability added by a future WordPress version cannot escape the net. A
 * control set of capabilities the role does NOT hold is included too — a hide
 * must not grant one either.
 *
 * The whole map is asserted at once rather than capability-by-capability: when a
 * safety invariant breaks, the complete divergence is what you want to read.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class CosmeticInvariantUsersTest extends WP_UnitTestCase {

	/**
	 * Capabilities the editor role does NOT hold. A cosmetic hide must leave
	 * these false — it can no more grant a capability than remove one.
	 */
	private const CONTROL_CAPS = array( 'manage_options', 'edit_theme_options', 'activate_plugins', 'promote_users' );

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
	 * The per-user axes are gated server-side on `list_users`, which an editor
	 * lacks — so a rule saved while acting as the target would store nothing and
	 * this guardrail would then "prove" the invariant against a config that was
	 * never written. Authoring as an admin and measuring as the target is both
	 * realistic and the only way these assertions mean anything.
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

	/**
	 * Fresh model from the current globals.
	 */
	private function menu_model() {
		return ( new Replay( new Config() ) )->get_menu_model();
	}

	/**
	 * The capability set under test: every capability the role actually holds,
	 * plus the control caps it does not.
	 *
	 * @param string $role_name Role slug.
	 * @return string[]
	 */
	private function capability_set( $role_name ) {
		$role = get_role( $role_name );
		$caps = array_keys( (array) $role->capabilities );
		return array_values( array_unique( array_merge( $caps, self::CONTROL_CAPS ) ) );
	}

	/**
	 * cap => bool map for the CURRENT user across the whole set.
	 *
	 * The current user is re-set first, which forces WordPress to rebuild the
	 * WP_User object and re-resolve its capability map from the role. Without
	 * that refresh, `current_user_can()` answers from the allcaps array cached on
	 * the user object at first use — so a seam that mutated the role mid-request
	 * would keep returning the PRE-mutation answers and this guardrail would
	 * happily pass a broken implementation. Verified: with the refresh removed
	 * and a deliberate `add_cap()` injected into the hide seam, the six-step
	 * tests pass and only an unrelated precondition catches it.
	 *
	 * @param string[] $caps Capability set.
	 * @return array<string, bool>
	 */
	private function snapshot_caps( array $caps ) {
		// Note wp_set_current_user() alone is NOT enough — it short-circuits when
		// the id already matches, returning the same cached object. The global has
		// to be dropped so WP_User::__construct() re-derives allcaps from the role.
		$uid = get_current_user_id();
		unset( $GLOBALS['current_user'] );
		wp_set_current_user( $uid );

		$snapshot = array();
		foreach ( $caps as $cap ) {
			$snapshot[ $cap ] = current_user_can( $cap );
		}
		return $snapshot;
	}

	private function top_slugs_in_model() {
		return wp_list_pluck( $this->menu_model(), 'slug' );
	}

	private function child_slugs_in_model( $parent_slug ) {
		foreach ( $this->menu_model() as $node ) {
			if ( $node['slug'] === $parent_slug ) {
				return wp_list_pluck( $node['submenu'], 'slug' );
			}
		}
		return array();
	}

	/**
	 * Run the full six-step invariant against a rule, for the item axis.
	 */
	public function test_hidden_users_never_changes_what_the_user_can_do() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$caps = $this->capability_set( 'editor' );

		// STEP 1 — baseline.
		$baseline = $this->snapshot_caps( $caps );
		$this->assertNotEmpty( $baseline, 'Precondition: the capability set must not be empty.' );
		$this->assertTrue( $baseline['edit_posts'], 'Precondition: an editor holds edit_posts.' );
		$this->assertFalse( $baseline['manage_options'], 'Precondition: an editor lacks manage_options.' );

		// STEP 4 (first half) — the row is present BEFORE the rule.
		$this->run_replay();
		$this->assertContains( 'upload.php', $this->top_slugs_in_model(), 'Precondition: the row is visible before the rule.' );

		// STEP 2 — apply.
		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $editor ) ) ) )
		);
		$this->seed_menu();
		$this->run_replay();

		// STEP 3 — the invariant holds WHILE the rule is active.
		$this->assertSame(
			$baseline,
			$this->snapshot_caps( $caps ),
			'Applying a hidden_users rule must not change any capability.'
		);

		// STEP 4 (second half) — but the row is genuinely GONE. Without this the
		// capability assertions would pass on a rule that silently did nothing.
		$this->assertNotContains( 'upload.php', $this->top_slugs_in_model(), 'The hide must actually change visibility.' );

		// STEP 5 — remove (sparse contract: reset deletes the key).
		// Removed AS ADMIN, matching how the rule was authored: an editor without
		// `list_users` deliberately CANNOT destroy a per-user rule, so removing as
		// the measured user would silently no-op and this step would prove nothing.
		$this->save_as_admin( array( 'items' => array() ) );
		$stored = ( new Config() )->get();
		$this->assertArrayNotHasKey( 'upload.php', $stored['items'], 'Reset must delete the key, not blank it.' );

		$this->seed_menu();
		$this->run_replay();

		// STEP 6 — the invariant still holds after removal.
		$this->assertSame(
			$baseline,
			$this->snapshot_caps( $caps ),
			'Removing a hidden_users rule must not change any capability.'
		);
		$this->assertContains( 'upload.php', $this->top_slugs_in_model(), 'Removing the rule must restore the row.' );
	}

	/**
	 * The same six steps for the per-user CHILD axis, which drops rows through a
	 * different path (the cascade union) and so needs its own proof.
	 */
	public function test_child_hidden_users_never_changes_what_the_user_can_do() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$caps     = $this->capability_set( 'editor' );
		$baseline = $this->snapshot_caps( $caps );

		$this->run_replay();
		$this->assertContains( 'post-new.php', $this->child_slugs_in_model( 'edit.php' ), 'Precondition: the child is visible.' );

		$this->save_as_admin(
			array( 'items' => array( 'edit.php' => array( 'child_hidden_users' => array( $editor ) ) ) )
		);
		$this->seed_menu();
		$this->run_replay();

		$this->assertSame(
			$baseline,
			$this->snapshot_caps( $caps ),
			'Applying a child_hidden_users rule must not change any capability.'
		);

		// Parent visible, children gone — the observable effect, and proof the
		// cascade is not inert (the failure mode COMPAT-10 shipped with once).
		$this->assertContains( 'edit.php', $this->top_slugs_in_model(), 'The parent must stay visible.' );
		$this->assertSame( array(), $this->child_slugs_in_model( 'edit.php' ), 'Every child must be hidden.' );

		// Removed AS ADMIN, matching how the rule was authored: an editor without
		// `list_users` deliberately CANNOT destroy a per-user rule, so removing as
		// the measured user would silently no-op and this step would prove nothing.
		$this->save_as_admin( array( 'items' => array() ) );
		$this->seed_menu();
		$this->run_replay();

		$this->assertSame(
			$baseline,
			$this->snapshot_caps( $caps ),
			'Removing a child_hidden_users rule must not change any capability.'
		);
		$this->assertContains( 'post-new.php', $this->child_slugs_in_model( 'edit.php' ), 'Removing the rule must restore the children.' );
	}

	/**
	 * The role capabilities MAP itself must be byte-for-byte untouched — not just
	 * the resolved answers for one user. A rule that quietly edited the role would
	 * affect every user holding it.
	 */
	public function test_role_capability_map_is_never_mutated_by_a_per_user_rule() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$caps_before = get_role( 'editor' )->capabilities;

		$this->save_as_admin(
			array(
				'items' => array(
					'upload.php' => array( 'hidden_users' => array( $editor ) ),
					'edit.php'   => array( 'child_hidden_users' => array( $editor ) ),
				),
			)
		);
		$this->run_replay();

		$this->assertSame(
			$caps_before,
			get_role( 'editor' )->capabilities,
			'A per-user hide must never mutate the role capabilities map.'
		);
	}

	/**
	 * THE ESCAPE HATCH (§11). A hidden page stays reachable by direct URL for a
	 * user who independently holds its capability — this is what keeps a hide
	 * from ever becoming an accidental lockout, and it is the single most
	 * important property of the whole feature.
	 */
	public function test_hidden_page_still_passes_its_own_capability_gate() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		// upload.php gates on upload_files; post-new.php on edit_posts.
		$this->assertTrue( current_user_can( 'upload_files' ), 'Precondition: an editor may upload.' );

		$this->save_as_admin(
			array(
				'items' => array(
					'upload.php' => array( 'hidden_users' => array( $editor ) ),
					'edit.php'   => array( 'child_hidden_users' => array( $editor ) ),
				),
			)
		);
		$this->run_replay();

		// Rows gone from the sidebar...
		$this->assertNotContains( 'upload.php', $this->top_slugs_in_model() );
		$this->assertSame( array(), $this->child_slugs_in_model( 'edit.php' ) );

		// ...but the capability each hidden page gates direct access on is intact,
		// so navigating straight to the URL still loads.
		$this->assertTrue( current_user_can( 'upload_files' ), 'The hidden page must still load by direct URL.' );
		$this->assertTrue( current_user_can( 'edit_posts' ), 'The hidden child page must still load by direct URL.' );
	}

	/**
	 * A hide must not GRANT anything either. The control capabilities an editor
	 * never held stay false throughout — the invariant runs in both directions.
	 */
	public function test_a_hide_never_grants_a_capability_the_user_lacked() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		// Asserted against a FRESHLY resolved user, so a role mutated by an
		// earlier test in the same process cannot make this precondition pass
		// (or fail) for the wrong reason.
		$before = $this->snapshot_caps( self::CONTROL_CAPS );
		foreach ( self::CONTROL_CAPS as $cap ) {
			$this->assertFalse( $before[ $cap ], "Precondition: an editor lacks {$cap}." );
		}

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $editor ) ) ) )
		);
		$this->run_replay();

		$after = $this->snapshot_caps( self::CONTROL_CAPS );
		foreach ( self::CONTROL_CAPS as $cap ) {
			$this->assertFalse( $after[ $cap ], "A hide must never grant {$cap}." );
		}
	}

	/**
	 * The invariant must hold for a user who is NOT targeted too — a rule aimed
	 * at someone else changes nothing at all for a bystander.
	 */
	public function test_untargeted_user_is_entirely_unaffected() {
		$targeted = self::factory()->user->create( array( 'role' => 'editor' ) );
		$other    = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $other );

		$caps     = $this->capability_set( 'editor' );
		$baseline = $this->snapshot_caps( $caps );

		$this->save_as_admin(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $targeted ) ) ) )
		);
		$this->run_replay();

		$this->assertSame( $baseline, $this->snapshot_caps( $caps ) );
		$this->assertContains( 'upload.php', $this->top_slugs_in_model(), 'A bystander keeps the row.' );
	}
}
