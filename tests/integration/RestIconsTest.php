<?php
/**
 * Integration tests for the maestro/v1/icons route (the picker's WordPress
 * set, read from core's icon registry on 7.1+).
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Registry_Icons;
use WP_REST_Request;
use WP_UnitTestCase;

class RestIconsTest extends WP_UnitTestCase {

	const ROUTE = '/maestro/v1/icons';

	/**
	 * @var \WP_REST_Server
	 */
	private $server;

	public function set_up() {
		parent::set_up();
		if ( ! Registry_Icons::available() ) {
			$this->markTestSkipped( 'The icon registry needs WordPress 7.1.' );
		}
		global $wp_rest_server;
		$wp_rest_server = new \WP_REST_Server();
		$this->server  = $wp_rest_server;
		do_action( 'rest_api_init' );
	}

	public function tear_down() {
		global $wp_rest_server;
		$wp_rest_server = null;
		parent::tear_down();
	}

	public function test_route_is_registered_for_get_only() {
		$routes = $this->server->get_routes();
		$this->assertArrayHasKey( self::ROUTE, $routes );
		$this->assertSame( array( 'GET' => true ), $routes[ self::ROUTE ][0]['methods'] );
	}

	public function test_editor_without_the_capability_is_refused() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$res = $this->server->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$this->assertSame( 403, $res->get_status() );
	}

	public function test_logged_out_is_refused() {
		wp_set_current_user( 0 );

		$res = $this->server->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$this->assertSame( 401, $res->get_status() );
	}

	public function test_administrator_gets_the_bootstrap_file_shape() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$res  = $this->server->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$data = $res->get_data();

		$this->assertSame( 200, $res->get_status() );
		$this->assertNotEmpty( $data['icons'] );
		foreach ( $data['icons'] as $icon ) {
			$this->assertSame( array( 'label', 'terms', 'src' ), array_keys( $icon ) );
		}
	}
}
