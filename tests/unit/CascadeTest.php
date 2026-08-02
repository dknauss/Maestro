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

}
