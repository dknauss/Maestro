<?php
/**
 * Integration tests for the amx/v1/config REST routes: capability gating, the
 * save round-trip (including sanitization), and reset. Runs under WP_UnitTestCase.
 *
 * @package AdminMenuCustomizer
 */

namespace AMX\Tests\Integration;

use WP_REST_Request;
use WP_UnitTestCase;

class RestConfigTest extends WP_UnitTestCase {

	const ROUTE = '/amx/v1/config';

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
		delete_option( 'amx_config' );
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
		update_option( 'amx_config', array( 'items' => array( 'edit.php' => array( 'title' => 'X' ) ) ) );

		$res = $this->server->dispatch( new WP_REST_Request( 'DELETE', self::ROUTE ) );

		$this->assertSame( 200, $res->get_status() );
		$this->assertTrue( $res->get_data()['reset'] );
		$this->assertFalse( get_option( 'amx_config' ) );
	}
}
