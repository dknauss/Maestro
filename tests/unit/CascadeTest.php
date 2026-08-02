<?php
/**
 * Pure unit tests for Maestro\Cascade::effective_hidden_roles() (COMPAT-10).
 * No WordPress, no database — pure role-list union computation.
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
	 * Flag OFF: the parent's hidden_roles must contribute nothing — the
	 * effective set is exactly the child's own hidden_roles, unchanged.
	 * This is the default (cascade_hide absent/false) and must be a
	 * zero-regression no-op against today's behavior.
	 */
	public function test_flag_off_returns_child_own_roles_only() {
		$this->assertSame(
			array( 'editor' ),
			Cascade::effective_hidden_roles( array( 'editor' ), false, array( 'administrator' ) )
		);
	}

	/**
	 * Flag OFF with no own rule at all: effective set is empty.
	 */
	public function test_flag_off_with_no_own_roles_is_empty() {
		$this->assertSame(
			array(),
			Cascade::effective_hidden_roles( array(), false, array( 'editor', 'administrator' ) )
		);
	}

	/**
	 * Flag ON, parent hidden from [editor], child has no own rule: effective
	 * set is the union — here just [editor], since the child contributes
	 * nothing of its own.
	 */
	public function test_flag_on_parent_hidden_from_editor_unions_into_childless_child() {
		$this->assertSame(
			array( 'editor' ),
			Cascade::effective_hidden_roles( array(), true, array( 'editor' ) )
		);
	}

	/**
	 * Flag ON but the parent is hidden from NOBODY (empty hidden_roles):
	 * "rides the parent hide" — cascade contributes nothing, so the
	 * effective set is exactly the child's own hidden_roles.
	 */
	public function test_flag_on_but_parent_hidden_from_nothing_rides_the_parent_hide() {
		$this->assertSame(
			array( 'shop_manager' ),
			Cascade::effective_hidden_roles( array( 'shop_manager' ), true, array() )
		);
	}

	/**
	 * Flag ON but the parent is hidden from NOBODY and the child has no own
	 * rule either: effective set is empty (nothing hides).
	 */
	public function test_flag_on_parent_hidden_from_nothing_and_no_own_rule_is_empty() {
		$this->assertSame(
			array(),
			Cascade::effective_hidden_roles( array(), true, array() )
		);
	}

	/**
	 * Role-mirror: the parent is hidden from [editor] ONLY. The cascade must
	 * add editor and ONLY editor — administrator (or any other role) must
	 * never appear in the effective set just because cascade is on.
	 */
	public function test_role_mirror_only_the_parents_hidden_roles_are_added() {
		$effective = Cascade::effective_hidden_roles( array(), true, array( 'editor' ) );

		$this->assertContains( 'editor', $effective );
		$this->assertNotContains( 'administrator', $effective, 'Cascade must never add a role the parent is not itself hidden from.' );
	}

	/**
	 * Union: a child with its own rule (shop_manager) AND a cascading parent
	 * hidden from a different role (editor) must be hidden for BOTH — union,
	 * not override.
	 */
	public function test_union_of_childs_own_rule_and_parent_cascade() {
		$effective = Cascade::effective_hidden_roles( array( 'shop_manager' ), true, array( 'editor' ) );

		sort( $effective );
		$this->assertSame( array( 'editor', 'shop_manager' ), $effective );
	}

	/**
	 * Overlap between the child's own rule and the parent's hidden_roles must
	 * not produce a duplicate entry — the effective set is deduplicated.
	 */
	public function test_overlapping_roles_are_deduplicated() {
		$this->assertSame(
			array( 'editor' ),
			Cascade::effective_hidden_roles( array( 'editor' ), true, array( 'editor' ) )
		);
	}

	/**
	 * Multiple parent-hidden roles all cascade in (role-mirrored across more
	 * than one role at once), unioned with the child's own distinct rule.
	 */
	public function test_multiple_parent_roles_all_cascade_and_union_with_own_rule() {
		$effective = Cascade::effective_hidden_roles( array( 'author' ), true, array( 'editor', 'shop_manager' ) );

		sort( $effective );
		$this->assertSame( array( 'author', 'editor', 'shop_manager' ), $effective );
	}
}
