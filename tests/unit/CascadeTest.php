<?php
/**
 * Pure unit tests for Maestro\Cascade::effective_hidden_roles() (COMPAT-10).
 * No WordPress, no database — pure role-list union computation.
 *
 * REVISED (2026-08-01): the boolean cascade_hide + "rides the parent hide"
 * model is gone. The two arguments are now independent: a child's own
 * hidden_roles and its parent's child_hidden_roles, unconditionally unioned.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Cascade;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

/**
 * @covers \Maestro\Cascade::effective_hidden_roles
 */
class CascadeTest extends TestCase {

	/**
	 * Neither the child nor the parent has any rule: effective set is empty.
	 */
	public function test_no_rules_at_all_is_empty() {
		$this->assertSame(
			array(),
			Cascade::effective_hidden_roles( array(), array() )
		);
	}

	/**
	 * Parent's child_hidden_roles is empty: effective set is exactly the
	 * child's own hidden_roles, unchanged — a parent with no child-hiding
	 * rule contributes nothing.
	 */
	public function test_empty_parent_child_hidden_roles_returns_childs_own_only() {
		$this->assertSame(
			array( 'editor' ),
			Cascade::effective_hidden_roles( array( 'editor' ), array() )
		);
	}

	/**
	 * Child has no own rule; parent's child_hidden_roles hides it for
	 * [editor] — the effective set is exactly the parent's rule.
	 */
	public function test_childless_own_rule_gets_parents_child_hidden_roles() {
		$this->assertSame(
			array( 'editor' ),
			Cascade::effective_hidden_roles( array(), array( 'editor' ) )
		);
	}

	/**
	 * Union: a child's own rule (shop_manager) AND the parent's
	 * child_hidden_roles (editor) must both apply — union, not override.
	 */
	public function test_union_of_childs_own_rule_and_parents_child_hidden_roles() {
		$effective = Cascade::effective_hidden_roles( array( 'shop_manager' ), array( 'editor' ) );

		sort( $effective );
		$this->assertSame( array( 'editor', 'shop_manager' ), $effective );
	}

	/**
	 * Overlap between the child's own rule and the parent's
	 * child_hidden_roles must not produce a duplicate entry.
	 */
	public function test_overlapping_roles_are_deduplicated() {
		$this->assertSame(
			array( 'editor' ),
			Cascade::effective_hidden_roles( array( 'editor' ), array( 'editor' ) )
		);
	}

	/**
	 * Multiple parent child_hidden_roles all apply, unioned with the child's
	 * own distinct rule.
	 */
	public function test_multiple_parent_roles_all_apply_and_union_with_own_rule() {
		$effective = Cascade::effective_hidden_roles( array( 'author' ), array( 'editor', 'shop_manager' ) );

		sort( $effective );
		$this->assertSame( array( 'author', 'editor', 'shop_manager' ), $effective );
	}

	/* -----------------------------------------------------------------------
	 * ROLE-02 per-user union — effective_hidden_users()
	 *
	 * Identical semantics to the role union: the underlying merge is
	 * type-agnostic, so these cases mirror the role cases above deliberately.
	 * --------------------------------------------------------------------- */

	/**
	 * A child with no rule of its own inherits exactly the parent's
	 * child_hidden_users — the cascade's whole point.
	 */
	public function test_users_child_with_no_own_rule_inherits_parents_child_users() {
		$this->assertSame(
			array( 7 ),
			Cascade::effective_hidden_users( array(), array( 7 ) )
		);
	}

	/**
	 * An untouched parent contributes nothing: the child's own list passes
	 * through unchanged. This is the zero-regression no-op case.
	 */
	public function test_users_untouched_parent_leaves_childs_own_list_alone() {
		$this->assertSame(
			array( 3 ),
			Cascade::effective_hidden_users( array( 3 ), array() )
		);
	}

	/**
	 * Both empty is empty — never a stray key.
	 */
	public function test_users_both_empty_is_empty() {
		$this->assertSame( array(), Cascade::effective_hidden_users( array(), array() ) );
	}

	public function test_union_of_childs_own_users_and_parents_child_users() {
		$effective = Cascade::effective_hidden_users( array( 4 ), array( 9 ) );

		sort( $effective );
		$this->assertSame( array( 4, 9 ), $effective );
	}

	/**
	 * The same user targeted on both axes must not produce a duplicate entry.
	 */
	public function test_overlapping_users_are_deduplicated() {
		$this->assertSame(
			array( 5 ),
			Cascade::effective_hidden_users( array( 5 ), array( 5 ) )
		);
	}

	public function test_multiple_parent_users_all_apply_and_union_with_own_rule() {
		$effective = Cascade::effective_hidden_users( array( 2 ), array( 6, 8 ) );

		sort( $effective );
		$this->assertSame( array( 2, 6, 8 ), $effective );
	}

	/**
	 * The two axes are separate lists that never bleed into one another — a role
	 * union and a user union computed from the same shared merge stay distinct.
	 */
	public function test_role_and_user_unions_do_not_bleed_into_each_other() {
		$roles = Cascade::effective_hidden_roles( array( 'editor' ), array( 'author' ) );
		$users = Cascade::effective_hidden_users( array( 1 ), array( 2 ) );

		sort( $roles );
		sort( $users );
		$this->assertSame( array( 'author', 'editor' ), $roles );
		$this->assertSame( array( 1, 2 ), $users );
	}

}
