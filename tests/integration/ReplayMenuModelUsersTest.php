<?php
/**
 * Integration tests for ROLE-02's per-user axes as exposed to the EDITOR by
 * Replay::get_menu_model().
 *
 * The model must agree with what replay() actually applies — a popover that
 * shows a rule replay would not honour is how a full-replace autosave silently
 * drops a working rule.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use WP_UnitTestCase;

class ReplayMenuModelUsersTest extends WP_UnitTestCase {

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

		// The editor model is only ever built in edit mode, for a user who can
		// run Maestro — and per-user rules can only be written by someone with
		// `list_users`. Acting as an administrator here matches how this code is
		// reached in production; without it every save below would be refused by
		// the server-side gate and these tests would assert against an empty
		// config.
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
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
		return null;
	}

	private function child_node( array $model, $parent_slug, $child_slug ) {
		$parent = $this->node( $model, $parent_slug );
		if ( null === $parent ) {
			return null;
		}
		foreach ( $parent['submenu'] as $child ) {
			if ( $child['slug'] === $child_slug ) {
				return $child;
			}
		}
		return null;
	}

	/**
	 * The item axis is exposed as ID + display-name pairs, not bare IDs — the
	 * popover must be able to render a stored target without a second request.
	 */
	public function test_model_exposes_hidden_users_as_id_and_name_pairs() {
		$user = self::factory()->user->create(
			array(
				'role'         => 'editor',
				'display_name' => 'Ada Lovelace',
			)
		);

		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $user ) ) ) )
		);

		$node = $this->node( $this->model(), 'upload.php' );

		$this->assertNotNull( $node );
		$this->assertSame(
			array( array( 'id' => $user, 'name' => 'Ada Lovelace' ) ),
			$node['hiddenUsers']
		);
	}

	/**
	 * childHiddenUsers is exposed on every top-level node, as an EMPTY ARRAY for
	 * an untouched parent — matching the childHiddenRoles convention so the
	 * client can tell "no rule" from "not a parent".
	 */
	public function test_model_exposes_child_hidden_users_with_empty_array_convention() {
		$user = self::factory()->user->create(
			array(
				'role'         => 'editor',
				'display_name' => 'Grace Hopper',
			)
		);

		( new Config() )->save(
			array( 'items' => array( 'edit.php' => array( 'child_hidden_users' => array( $user ) ) ) )
		);

		$model = $this->model();

		$this->assertSame(
			array( array( 'id' => $user, 'name' => 'Grace Hopper' ) ),
			$this->node( $model, 'edit.php' )['childHiddenUsers']
		);
		$this->assertSame(
			array(),
			$this->node( $model, 'index.php' )['childHiddenUsers'],
			'An untouched parent must expose childHiddenUsers as an empty array, not merely absent.'
		);
	}

	/**
	 * A submenu child exposes its own hiddenUsers, resolved through the qualified
	 * key exactly as replay() resolves it.
	 */
	public function test_model_exposes_submenu_hidden_users_via_qualified_key() {
		$user = self::factory()->user->create(
			array(
				'role'         => 'editor',
				'display_name' => 'Katherine Johnson',
			)
		);

		( new Config() )->save(
			array(
				'items' => array(
					'edit.php>post-new.php' => array( 'hidden_users' => array( $user ) ),
				),
			)
		);

		$child = $this->child_node( $this->model(), 'edit.php', 'post-new.php' );

		$this->assertNotNull( $child );
		$this->assertSame(
			array( array( 'id' => $user, 'name' => 'Katherine Johnson' ) ),
			$child['hiddenUsers']
		);
	}

	/**
	 * A stored ID whose user no longer exists is omitted from the model —
	 * self-healing display, consistent with intersect-against-live. The popover
	 * must never render a dangling numeric target.
	 */
	public function test_model_omits_ids_whose_user_no_longer_exists() {
		$kept    = self::factory()->user->create(
			array(
				'role'         => 'editor',
				'display_name' => 'Kept User',
			)
		);
		$deleted = self::factory()->user->create( array( 'role' => 'editor' ) );

		// Saved while both exist, so sanitize() accepts both.
		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'hidden_users' => array( $kept, $deleted ) ) ) )
		);

		wp_delete_user( $deleted );

		$node = $this->node( $this->model(), 'upload.php' );

		$this->assertSame(
			array( array( 'id' => $kept, 'name' => 'Kept User' ) ),
			$node['hiddenUsers'],
			'A deleted user must drop out of the model rather than render as a dangling id.'
		);
	}

	/**
	 * An item with no user rule exposes an empty list, never a missing key.
	 */
	public function test_model_exposes_empty_list_for_untouched_item() {
		( new Config() )->save(
			array( 'items' => array( 'upload.php' => array( 'title' => 'Files' ) ) )
		);

		$node = $this->node( $this->model(), 'upload.php' );

		$this->assertSame( array(), $node['hiddenUsers'] );
	}

	/**
	 * Display names are resolved in ONE batched query for the whole model, not
	 * per item. A per-item implementation would issue a query per targeted row,
	 * which is the shape that turns a 75-row menu into a page-load problem.
	 *
	 * The bound is deliberately loose (a small constant, not an exact count) so
	 * the test asserts "batched" rather than pinning an implementation detail.
	 */
	public function test_display_names_are_resolved_in_one_batched_query() {
		$a = self::factory()->user->create( array( 'role' => 'editor' ) );
		$b = self::factory()->user->create( array( 'role' => 'editor' ) );
		$c = self::factory()->user->create( array( 'role' => 'editor' ) );

		( new Config() )->save(
			array(
				'items' => array(
					'index.php'             => array( 'hidden_users' => array( $a ) ),
					'upload.php'            => array( 'hidden_users' => array( $b ) ),
					'edit.php'              => array( 'child_hidden_users' => array( $c ) ),
					'edit.php>post-new.php' => array( 'hidden_users' => array( $a, $b ) ),
				),
			)
		);

		$replay = new Replay( new Config() );
		$replay->replay();

		$before = get_num_queries();
		$replay->get_menu_model();
		$delta = get_num_queries() - $before;

		$this->assertLessThanOrEqual(
			3,
			$delta,
			"Display-name resolution must be batched; {$delta} queries suggests a per-item lookup."
		);
	}

	/**
	 * The user axes resolve through the SAME shared resolver as the role axes, so
	 * a stored key that only matches after normalization still shows in the
	 * editor. Without this the popover would look empty and the next
	 * full-replace autosave would silently drop a working rule.
	 */
	public function test_user_axis_resolves_through_the_shared_normalized_lookup() {
		$user = self::factory()->user->create(
			array(
				'role'         => 'editor',
				'display_name' => 'Norm Alized',
			)
		);

		// Stored with a cache-busting query arg the normalizer strips.
		( new Config() )->save(
			array( 'items' => array( 'upload.php?ver=123' => array( 'hidden_users' => array( $user ) ) ) )
		);

		$node = $this->node( $this->model(), 'upload.php' );

		$this->assertSame(
			array( array( 'id' => $user, 'name' => 'Norm Alized' ) ),
			$node['hiddenUsers'],
			'A normalized-key match must surface in the editor model.'
		);
	}
}
