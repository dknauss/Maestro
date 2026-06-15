<?php
/**
 * Pure unit tests for Maestro\Ordering. No WordPress, no database — just the
 * resilience contract. Mirrors the cases validated during development.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Ordering;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

class OrderingTest extends TestCase {

	/* ---- top() ---------------------------------------------------------- */

	public function test_empty_desired_is_passthrough() {
		$this->assertSame(
			array( 'a', 'b', 'c' ),
			Ordering::top( array(), array( 'a', 'b', 'c' ) )
		);
	}

	public function test_full_reorder() {
		$this->assertSame(
			array( 'c', 'a', 'b' ),
			Ordering::top( array( 'c', 'a', 'b' ), array( 'a', 'b', 'c' ) )
		);
	}

	public function test_orphan_slug_is_dropped() {
		// 'zzz' no longer exists in the live menu and must be skipped.
		$this->assertSame(
			array( 'c', 'a', 'b' ),
			Ordering::top( array( 'c', 'zzz', 'a' ), array( 'a', 'b', 'c' ) )
		);
	}

	public function test_newcomer_is_appended_at_end() {
		// 'b' is live but not in the stored order; it sinks to the bottom.
		$this->assertSame(
			array( 'c', 'a', 'b' ),
			Ordering::top( array( 'c', 'a' ), array( 'a', 'b', 'c' ) )
		);
	}

	public function test_duplicate_desired_honoured_once() {
		$this->assertSame(
			array( 'a', 'b', 'c' ),
			Ordering::top( array( 'a', 'a', 'b' ), array( 'a', 'b', 'c' ) )
		);
	}

	public function test_no_desired_matches_returns_natural_order() {
		$this->assertSame(
			array( 'a', 'b' ),
			Ordering::top( array( 'x', 'y' ), array( 'a', 'b' ) )
		);
	}

	public function test_query_arg_slugs_are_treated_as_opaque() {
		$this->assertSame(
			array( 'edit.php?post_type=page', 'edit.php', 'upload.php' ),
			Ordering::top(
				array( 'edit.php?post_type=page', 'edit.php' ),
				array( 'edit.php', 'upload.php', 'edit.php?post_type=page' )
			)
		);
	}

	/* ---- submenu() ------------------------------------------------------ */

	private function rows() {
		return array(
			array( 'All', 'cap', 'a.php' ),
			array( 'Add', 'cap', 'b.php' ),
			array( 'Tags', 'cap', 'c.php' ),
		);
	}

	public function test_submenu_empty_desired_is_passthrough() {
		$this->assertSame( $this->rows(), Ordering::submenu( $this->rows(), array() ) );
	}

	public function test_submenu_reorder_by_slug() {
		$this->assertSame(
			array(
				array( 'Tags', 'cap', 'c.php' ),
				array( 'All', 'cap', 'a.php' ),
				array( 'Add', 'cap', 'b.php' ),
			),
			Ordering::submenu( $this->rows(), array( 'c.php', 'a.php', 'b.php' ) )
		);
	}

	public function test_submenu_orphan_skipped_and_newcomers_appended() {
		$this->assertSame(
			array(
				array( 'Tags', 'cap', 'c.php' ),
				array( 'All', 'cap', 'a.php' ),
				array( 'Add', 'cap', 'b.php' ),
			),
			Ordering::submenu( $this->rows(), array( 'c.php', 'gone.php' ) )
		);
	}

	public function test_submenu_row_without_slug_preserved_at_tail() {
		$this->assertSame(
			array(
				array( 'All', 'cap', 'a.php' ),
				array( 'Sep', 'cap', '' ),
			),
			Ordering::submenu(
				array(
					array( 'All', 'cap', 'a.php' ),
					array( 'Sep', 'cap', '' ),
				),
				array( 'a.php' )
			)
		);
	}
}
