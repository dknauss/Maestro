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

	/* ---- top(): separators the stored order does not name ---------------- */

	public function test_unnamed_separator_stays_after_its_natural_predecessor() {
		// An order saved before separators were editable names only the items.
		// The separators must keep their groups instead of sinking to the end,
		// where core's adjacent/trailing trim deletes them.
		$this->assertSame(
			array( 'index.php', 'separator1', 'upload.php', 'edit.php', 'separator2', 'tools.php' ),
			Ordering::top(
				array( 'index.php', 'upload.php', 'edit.php', 'tools.php' ),
				array( 'index.php', 'separator1', 'edit.php', 'upload.php', 'separator2', 'tools.php' ),
				array( 'separator1', 'separator2' )
			)
		);
	}

	public function test_unnamed_separator_that_leads_the_menu_stays_first() {
		$this->assertSame(
			array( 'sep', 'b', 'a' ),
			Ordering::top( array( 'b', 'a' ), array( 'sep', 'a', 'b' ), array( 'sep' ) )
		);
	}

	public function test_consecutive_unnamed_separators_keep_their_relative_order() {
		$this->assertSame(
			array( 'b', 'a', 's1', 's2' ),
			Ordering::top( array( 'b', 'a' ), array( 'a', 's1', 's2', 'b' ), array( 's1', 's2' ) )
		);
	}

	public function test_named_separator_follows_the_stored_order() {
		$this->assertSame(
			array( 'b', 'sep', 'a' ),
			Ordering::top( array( 'b', 'sep', 'a' ), array( 'a', 'sep', 'b' ), array( 'sep' ) )
		);
	}

	public function test_unnamed_separator_after_a_newcomer_follows_it_to_the_end() {
		// 'c' is a newcomer (appended); the separator it precedes goes with it.
		$this->assertSame(
			array( 'b', 'a', 'c', 'sep' ),
			Ordering::top( array( 'b', 'a' ), array( 'a', 'b', 'c', 'sep' ), array( 'sep' ) )
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
