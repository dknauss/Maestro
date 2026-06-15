<?php
/**
 * Integration tests for the maestro/v1/config REST routes: capability
 * gating, the save round-trip (including sanitization), and reset. Runs under
 * WP_UnitTestCase.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use WP_REST_Request;
use WP_UnitTestCase;

class RestConfigTest extends WP_UnitTestCase {

	const ROUTE = '/maestro/v1/config';

	/**
	 * @var \WP_REST_Server
	 */
	private $server;

	public function set_up() {
		parent::set_up();
		global $wp_rest_server;
		$wp_rest_server = new \WP_REST_Server();
		$this->server  = $wp_rest_server;
		do_action( 'rest_api_init' );
		delete_option( 'maestro_config' );
	}

	public function tear_down() {
		global $wp_rest_server;
		$wp_rest_server = null;
		parent::tear_down();
	}

	public function test_route_is_registered() {
		$routes = $this->server->get_routes();
		$this->assertArrayHasKey( self::ROUTE, $routes );
	}

	public function test_subscriber_cannot_save() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );

		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param( 'config', array( 'items' => array() ) );

		$res = $this->server->dispatch( $req );
		$this->assertSame( 403, $res->get_status() );
	}

	/**
	 * @dataProvider route_methods
	 */
	public function test_missing_rest_nonce_rejects_cookie_authenticated_requests( $method ) {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		update_option( 'maestro_config', array( 'items' => array( 'edit.php' => array( 'title' => 'Existing' ) ) ) );

		$res = $this->dispatch_as_cookie_auth_request( $this->request_for_method( $method ), null );

		$this->assertSame( 401, $res->get_status(), 'Missing nonce should demote cookie auth to anonymous, so the capability gate rejects the request.' );
		$this->assertSame( 'Existing', get_option( 'maestro_config' )['items']['edit.php']['title'], 'Rejected requests must not mutate config.' );
	}

	/**
	 * @dataProvider route_methods
	 */
	public function test_invalid_rest_nonce_rejects_cookie_authenticated_requests( $method ) {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		update_option( 'maestro_config', array( 'items' => array( 'edit.php' => array( 'title' => 'Existing' ) ) ) );

		$res = $this->dispatch_as_cookie_auth_request( $this->request_for_method( $method ), 'not-a-valid-nonce' );

		$this->assertWPError( $res );
		$this->assertSame( 'rest_cookie_invalid_nonce', $res->get_error_code() );
		$this->assertSame( 403, $res->get_error_data()['status'] );
		$this->assertSame( 'Existing', get_option( 'maestro_config' )['items']['edit.php']['title'], 'Rejected requests must not mutate config.' );
	}

	public function route_methods() {
		return array(
			'GET /config'    => array( 'GET' ),
			'POST /config'   => array( 'POST' ),
			'DELETE /config' => array( 'DELETE' ),
		);
	}

	private function request_for_method( $method ) {
		$req = new WP_REST_Request( $method, self::ROUTE );
		if ( 'POST' === $method ) {
			$req->set_param(
				'config',
				array(
					'items' => array(
						'edit.php' => array( 'title' => 'Changed' ),
					),
				)
			);
		}
		return $req;
	}

	/**
	 * Simulate the cookie-auth nonce gate that runs before a real REST request is dispatched.
	 *
	 * Direct WP_REST_Server::dispatch() calls exercise route permission callbacks,
	 * but not the REST cookie authentication filter. This helper runs that filter
	 * first so missing/invalid X-WP-Nonce behavior is covered by integration tests.
	 *
	 * @param WP_REST_Request $request Request to dispatch if cookie auth passes.
	 * @param string|null     $nonce   Nonce header value, or null for missing.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function dispatch_as_cookie_auth_request( WP_REST_Request $request, $nonce ) {
		$had_cookie_flag = array_key_exists( 'wp_rest_auth_cookie', $GLOBALS );
		$cookie_flag     = $had_cookie_flag ? $GLOBALS['wp_rest_auth_cookie'] : null;
		$had_nonce       = isset( $_SERVER['HTTP_X_WP_NONCE'] );
		$server_nonce    = $had_nonce ? $_SERVER['HTTP_X_WP_NONCE'] : null;

		$GLOBALS['wp_rest_auth_cookie'] = true;
		if ( null === $nonce ) {
			unset( $_SERVER['HTTP_X_WP_NONCE'] );
		} else {
			$_SERVER['HTTP_X_WP_NONCE'] = $nonce;
		}

		$auth_result = apply_filters( 'rest_authentication_errors', null );

		if ( $had_cookie_flag ) {
			$GLOBALS['wp_rest_auth_cookie'] = $cookie_flag;
		} else {
			unset( $GLOBALS['wp_rest_auth_cookie'] );
		}
		if ( $had_nonce ) {
			$_SERVER['HTTP_X_WP_NONCE'] = $server_nonce;
		} else {
			unset( $_SERVER['HTTP_X_WP_NONCE'] );
		}
		remove_filter( 'rest_send_nocache_headers', '__return_true', 20 );

		if ( is_wp_error( $auth_result ) ) {
			return $auth_result;
		}

		return $this->server->dispatch( $request );
	}

	public function test_admin_can_save_and_read_back() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param(
			'config',
			array(
				'items'     => array(
					'edit.php' => array( 'title' => 'Articles', 'icon' => 'dashicons-book' ),
				),
				'top_order' => array( 'edit.php', 'index.php' ),
			)
		);

		$res = $this->server->dispatch( $req );
		$this->assertSame( 200, $res->get_status() );

		$data = $res->get_data();
		$this->assertTrue( $data['saved'] );
		$this->assertSame( 'Articles', $data['config']['items']['edit.php']['title'] );

		// Read back via GET.
		$get = $this->server->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$this->assertSame( 'Articles', $get->get_data()['config']['items']['edit.php']['title'] );
	}

	public function test_save_sanitizes_bad_icon_and_unknown_role() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param(
			'config',
			array(
				'items' => array(
					'edit.php' => array(
						'icon'         => 'not a real icon!!',           // should be dropped
						'hidden_roles' => array( 'editor', 'wizard' ),    // 'wizard' should be dropped
						'title'        => '<b>Bold</b> Posts',            // tags stripped
					),
				),
			)
		);

		$res  = $this->server->dispatch( $req );
		$item = $res->get_data()['config']['items']['edit.php'];

		$this->assertArrayNotHasKey( 'icon', $item, 'Malformed icon must be rejected.' );
		$this->assertSame( array( 'editor' ), $item['hidden_roles'], 'Unknown role must be filtered out.' );
		$this->assertSame( 'Bold Posts', $item['title'], 'Markup must be stripped from titles.' );
	}

	public function test_save_accepts_all_native_icon_forms() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$data_uri = 'data:image/svg+xml;base64,' . base64_encode( '<svg xmlns="http://www.w3.org/2000/svg"/>' );

		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param(
			'config',
			array(
				'items' => array(
					'a.php' => array( 'icon' => 'dashicons-store' ),
					'b.php' => array( 'icon' => 'none' ),
					'c.php' => array( 'icon' => 'https://cdn.example.com/icon.png' ),
					'd.php' => array( 'icon' => $data_uri ),
				),
			)
		);

		$items = $this->server->dispatch( $req )->get_data()['config']['items'];

		$this->assertSame( 'dashicons-store', $items['a.php']['icon'], 'Dashicon survives.' );
		$this->assertSame( 'none', $items['b.php']['icon'], '"none" survives.' );
		$this->assertSame( 'https://cdn.example.com/icon.png', $items['c.php']['icon'], 'URL survives.' );
		$this->assertSame( $data_uri, $items['d.php']['icon'], 'Base64 data-URI survives.' );
	}

	public function test_save_rejects_dangerous_icon_values() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param(
			'config',
			array(
				'items' => array(
					'a.php' => array( 'icon' => 'javascript:alert(1)' ),
					'b.php' => array( 'icon' => 'data:text/html;base64,PHNjcmlwdD4=' ),
					'c.php' => array( 'icon' => 'data:image/svg+xml,<svg onload=alert(1)>' ),
				),
			)
		);

		$items = $this->server->dispatch( $req )->get_data()['config']['items'];

		$this->assertArrayNotHasKey( 'a.php', $items, 'javascript: URI must be dropped.' );
		$this->assertArrayNotHasKey( 'b.php', $items, 'data:text/html must be dropped.' );
		$this->assertArrayNotHasKey( 'c.php', $items, 'Non-base64 data SVG must be dropped.' );
	}

	public function test_reset_clears_config() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		update_option(
			'maestro_config',
			array(
				'items'     => array( 'edit.php' => array( 'title' => 'X' ) ),
				'top_order' => array( 'edit.php', 'index.php' ),
				'sub_order' => array( 'edit.php' => array( 'post-new.php', 'edit.php' ) ),
			)
		);

		$res = $this->server->dispatch( new WP_REST_Request( 'DELETE', self::ROUTE ) );

		$this->assertSame( 200, $res->get_status() );
		$this->assertTrue( $res->get_data()['reset'] );
		$this->assertFalse( get_option( 'maestro_config' ) );
	}

	public function test_reset_is_idempotent_when_config_is_empty() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		delete_option( 'maestro_config' );

		$res = $this->server->dispatch( new WP_REST_Request( 'DELETE', self::ROUTE ) );

		$this->assertSame( 200, $res->get_status() );
		$this->assertTrue( $res->get_data()['reset'] );
		$this->assertSame( array(), $res->get_data()['config'] );
		$this->assertFalse( get_option( 'maestro_config' ) );
	}
}
