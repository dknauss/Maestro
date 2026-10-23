<?php
/**
 * Person-targeting data must stay server-side for editors without list_users.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Assets;
use Maestro\Config;
use Maestro\Replay;
use WP_REST_Request;
use WP_UnitTestCase;

class ProfilesPrivacyTest extends WP_UnitTestCase {

	const ROUTE = '/maestro/v1/config';

	private $admin;
	private $delegate;
	private $stored;

	public function set_up() {
		parent::set_up();
		global $wp_rest_server;
		$wp_rest_server = new \WP_REST_Server();
		do_action( 'rest_api_init' );
		$this->admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$this->delegate = self::factory()->user->create( array( 'role' => 'subscriber' ) );
		// A delegated Maestro editor, deliberately without core's user-list authority.
		get_user_by( 'id', $this->delegate )->add_cap( 'manage_options' );
		wp_set_current_user( $this->admin );
		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param( 'config', array(
			'items' => array( 'upload.php' => array(
				'title' => 'Files',
				'hidden_users' => array( $this->delegate ),
				'child_hidden_users' => array( $this->delegate ),
			) ),
			'profiles' => array( 'p_1' => array(
				'name' => 'Private client group', 'users' => array( $this->delegate ),
				'hides' => array( 'upload.php', 'tools.php' ), 'child_hides' => array( 'edit.php' ),
			) ),
		) );
		$res = rest_get_server()->dispatch( $req );
		$this->assertSame( 200, $res->get_status() );
		$this->stored = $res->get_data()['config'];
		wp_set_current_user( $this->delegate );
		$this->assertTrue( current_user_can( 'manage_options' ) );
		$this->assertFalse( current_user_can( 'list_users' ) );
	}

	public function tear_down() {
		unset( $_GET['maestro_edit'] );
		wp_set_current_user( $this->admin );
		rest_get_server()->dispatch( new WP_REST_Request( 'DELETE', self::ROUTE ) );
		global $wp_rest_server, $wp_scripts, $wp_styles;
		$wp_rest_server = null;
		$wp_scripts = null;
		$wp_styles = null;
		parent::tear_down();
	}

	private function assert_private_data_absent( array $config ) {
		$this->assertArrayNotHasKey( 'profiles', $config );
		foreach ( $config['items'] as $item ) {
			foreach ( array( 'hidden_users', 'child_hidden_users', 'hidden_profiles', 'child_hidden_profiles' ) as $axis ) {
				$this->assertArrayNotHasKey( $axis, $item );
			}
		}
		$this->assertSame( 'Files', $config['items']['upload.php']['title'] );
	}

	public function test_delegate_get_omits_private_data_without_mutating_storage() {
		$res = rest_get_server()->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$this->assertSame( 200, $res->get_status() );
		$this->assert_private_data_absent( $res->get_data()['config'] );
		$this->assertSame( $this->stored, ( new Config() )->get() );
	}

	public function test_delegate_save_response_is_private_and_round_trip_keeps_rules() {
		$get = rest_get_server()->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$req = new WP_REST_Request( 'POST', self::ROUTE );
		$req->set_param( 'config', $get->get_data()['config'] );
		$res = rest_get_server()->dispatch( $req );
		$this->assertSame( 200, $res->get_status() );
		$this->assert_private_data_absent( $res->get_data()['config'] );
		$this->assertSame( $this->stored, ( new Config() )->get(), 'Redacted autosave must preserve every protected rule.' );
	}

	public function test_delegate_localized_payload_omits_private_data() {
		global $wp_scripts, $wp_styles;
		$wp_scripts = null;
		$wp_styles = null;
		set_current_screen( 'dashboard' );
		$_GET['maestro_edit'] = '1';
		$config = new Config();
		$assets = new Assets( $config, new Replay( $config ) );
		$assets->enqueue();
		$data = $wp_scripts->get_data( 'maestro', 'data' );
		$this->assertSame( 1, preg_match( '/var maestroData = (.*);/', $data, $matches ) );
		$payload = json_decode( $matches[1], true );
		$this->assert_private_data_absent( $payload['config'] );
		$this->assertStringNotContainsString( 'Private client group', $data );
		$this->assertSame( $this->stored, $config->get() );
	}

	public function test_authorized_get_keeps_the_full_config() {
		wp_set_current_user( $this->admin );
		$res = rest_get_server()->dispatch( new WP_REST_Request( 'GET', self::ROUTE ) );
		$this->assertSame( $this->stored, $res->get_data()['config'] );
	}
}
