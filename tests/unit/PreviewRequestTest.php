<?php
/**
 * Pure unit tests for Maestro\Preview::validate(), the gate in front of the
 * Phase 30 capability window. Every WordPress lookup is an input, so each
 * refusal is tested on its own.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Unit;

use Maestro\Preview;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

/**
 * @covers \Maestro\Preview::validate
 */
class PreviewRequestTest extends TestCase {

	/**
	 * An environment in which every check passes.
	 *
	 * @param array $over Overrides.
	 * @return array
	 */
	private function env( array $over = array() ) {
		return array_merge(
			array(
				'admin_page' => true,
				'site_admin' => true,
				'dashboard'  => true,
				'can_edit'   => true,
				'super'      => false,
				'nonce_ok'   => true,
				'roles'      => array( 'administrator', 'editor', 'author', 'no_admin' ),
				'readers'    => array( 'administrator', 'editor', 'author' ),
			),
			$over
		);
	}

	public function test_a_request_without_the_arg_is_not_a_preview() {
		$this->assertSame( array(), Preview::validate( array(), $this->env() ) );
		$this->assertSame( array(), Preview::validate( array( 'maestro_preview' => '' ), $this->env() ) );
		$this->assertSame( array(), Preview::validate( array( 'maestro_preview' => array( 'editor' ) ), $this->env() ) );
	}

	public function test_a_valid_request_names_the_role() {
		$this->assertSame(
			array( 'role' => 'editor' ),
			Preview::validate( array( 'maestro_preview' => 'editor' ), $this->env() )
		);
	}

	public function test_the_role_is_sanitized_before_it_is_matched() {
		$this->assertSame(
			array( 'role' => 'editor' ),
			Preview::validate( array( 'maestro_preview' => 'Editor' ), $this->env() )
		);
	}

	/**
	 * @return array
	 */
	public function data_refusals() {
		return array(
			'AJAX, REST or cron'      => array( array( 'admin_page' => false ), 'not_admin_page' ),
			'network or user admin'   => array( array( 'site_admin' => false ), 'outside_site_admin' ),
			'not the Dashboard'       => array( array( 'dashboard' => false ), 'not_dashboard' ),
			'no Maestro capability'   => array( array( 'can_edit' => false ), 'no_capability' ),
			'multisite super admin'   => array( array( 'super' => true ), 'super_admin' ),
			'bad or missing nonce'    => array( array( 'nonce_ok' => false ), 'bad_nonce' ),
			'role not on this site'   => array( array( 'roles' => array( 'administrator' ) ), 'unknown_role' ),
		);
	}

	/**
	 * @dataProvider data_refusals
	 *
	 * @param array  $over   The one failing check.
	 * @param string $reason The expected reason.
	 */
	public function test_each_failing_check_refuses( array $over, $reason ) {
		$this->assertSame(
			array( 'refused' => $reason ),
			Preview::validate( array( 'maestro_preview' => 'editor' ), $this->env( $over ) )
		);
	}

	public function test_a_role_without_read_is_refused() {
		$this->assertSame(
			array( 'refused' => 'role_cannot_read' ),
			Preview::validate( array( 'maestro_preview' => 'no_admin' ), $this->env() )
		);
	}

	public function test_a_role_that_sanitizes_to_nothing_is_unknown() {
		$this->assertSame(
			array( 'refused' => 'unknown_role' ),
			Preview::validate( array( 'maestro_preview' => '!!!' ), $this->env() )
		);
	}

	public function test_capability_is_checked_before_the_nonce() {
		// Someone who cannot edit learns nothing about the nonce.
		$this->assertSame(
			array( 'refused' => 'no_capability' ),
			Preview::validate( array( 'maestro_preview' => 'editor' ), $this->env( array( 'can_edit' => false, 'nonce_ok' => false ) ) )
		);
	}
}
