<?php
namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Replay;
use Maestro\Transfer;
use Maestro\Transfer_Rest;
use WP_REST_Request;
use WP_UnitTestCase;

class RestTransferTest extends WP_UnitTestCase {
	private $transfer;
	private $config;
	public function set_up() {
		parent::set_up();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		delete_option( MAESTRO_OPTION );
		$this->config = new Config();
		$this->transfer = new Transfer_Rest( $this->config, new Replay( $this->config ) );
	}
	private function file( $items = array(), $extra = array() ) {
		return wp_json_encode( Transfer::export( array_merge( array( 'schema_version' => 2, 'items' => $items, 'top_order' => array( 'edit.php' ), 'sub_order' => array() ), $extra ) ) );
	}
	private function context() {
		return $this->transfer->context( Transfer::inventory( array( array( '', '', 'edit.php' ), array( '', '', 'tools.php' ) ), array() ) );
	}
	private function request( $file, $context, $mode = 'analyze', $analysis = '' ) {
		$r = new WP_REST_Request( 'POST', '/maestro/v1/config/import' );
		$r->set_param( 'file', $file );
		$r->set_param( 'context', $context );
		$r->set_param( 'mode', $mode );
		$r->set_param( 'analysis', $analysis );
		return $r;
	}
	public function test_analyze_is_read_only_and_apply_preserves_all_private_data() {
		$user = self::factory()->user->create();
		$this->config->save( array( 'items' => array( 'edit.php' => array( 'title' => 'Old', 'hidden_users' => array( $user ) ) ), 'profiles' => array( 'p_1' => array( 'name' => 'Private', 'users' => array( $user ), 'hides' => array( 'tools.php' ) ) ) ) );
		$before = $this->config->get();
		$file = $this->file( array( 'edit.php' => array( 'title' => 'Articles' ), 'gone.php' => array( 'title' => 'Gone' ) ) );
		$token = $this->context();
		$analysis = $this->transfer->import_file( $this->request( $file, $token ) )->get_data();
		$this->assertSame( $before, get_option( MAESTRO_OPTION ) );
		$this->assertCount( 1, $analysis['report'] );
		$response = $this->transfer->import_file( $this->request( $file, $token, 'apply', $analysis['analysis'] ) );
		$this->assertNotWPError( $response );
		$stored = get_option( MAESTRO_OPTION );
		$this->assertSame( 'Articles', $stored['items']['edit.php']['title'] );
		$this->assertSame( array( $user ), $stored['items']['edit.php']['hidden_users'] );
		$this->assertSame( $before['profiles'], $stored['profiles'] );
		$this->assertArrayNotHasKey( 'gone.php', $stored['items'] );
		$this->assertStringNotContainsString( 'Private', wp_json_encode( $response->get_data() ) );
	}
	public function test_changed_config_refuses_stale_analysis_without_mutating() {
		$token = $this->context();
		$file = $this->file();
		$a = $this->transfer->import_file( $this->request( $file, $token ) )->get_data();
		$this->config->save( array( 'menu_width' => 240 ) );
		$r = $this->transfer->import_file( $this->request( $file, $token, 'apply', $a['analysis'] ) );
		$this->assertWPError( $r );
		$this->assertSame( 409, $r->get_error_data()['status'] );
		$this->assertSame( 240, get_option( MAESTRO_OPTION )['menu_width'] );
	}
	public function test_changed_file_refuses_analysis_proof() {
		$token = $this->context();
		$a = $this->transfer->import_file( $this->request( $this->file(), $token ) )->get_data();
		$r = $this->transfer->import_file( $this->request( $this->file( array( 'edit.php' => array( 'title' => 'Changed' ) ) ), $token, 'apply', $a['analysis'] ) );
		$this->assertWPError( $r );
		$this->assertFalse( get_option( MAESTRO_OPTION, false ) );
	}
	public function test_context_is_user_and_site_bound() {
		$token = $this->context();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		$this->assertWPError( $this->transfer->import_file( $this->request( $this->file(), $token ) ) );
	}
	public function test_unauthorized_export_and_import_are_rejected() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );
		$this->assertFalse( $this->transfer->can_transfer() );
		$this->assertWPError( $this->transfer->export_file() );
		$this->assertWPError( $this->transfer->import_file( $this->request( '{}', '' ) ) );
	}
	public function test_checked_save_refuses_oversize_and_preserves_previous_value() {
		$this->config->save( array( 'menu_width' => 240 ) );
		$before = $this->config->get();
		$items = array();
		for ( $i = 0; $i < 12; $i++ ) {
			$items[ 'p' . $i ] = array( 'icon' => 'data:image/svg+xml;base64,' . base64_encode( str_repeat( 'a', 90000 ) ) );
		}
		$r = $this->config->save_import( array( 'items' => $items ), $this->transfer->revision() );
		$this->assertWPError( $r );
		$this->assertSame( $before, get_option( MAESTRO_OPTION ) );
	}
	public function test_replay_inventory_precedes_hiding_and_qualifies_shared_children() {
		global $menu, $submenu;
		set_current_screen( 'dashboard' );
		$_GET['maestro_edit'] = '1';
		$menu = array( array( 'A', 'read', 'a' ), array( 'B', 'read', 'b' ) );
		$submenu = array( 'a' => array( array( 'One', 'read', 'shared' ) ), 'b' => array( array( 'Two', 'read', 'shared' ) ) );
		$replay = new Replay( $this->config );
		$replay->replay();
		$i = $replay->get_transfer_inventory();
		$this->assertSame( 'a>shared', $i['sub']['a>shared'] );
		$this->assertSame( 'b>shared', $i['sub']['b>shared'] );
		unset( $_GET['maestro_edit'] );
	}
	public function test_delegate_cannot_write_or_erase_people_with_import() {
		$person = self::factory()->user->create();
		$this->config->save( array( 'items' => array( 'edit.php' => array( 'hidden_users' => array( $person ) ) ) ) );
		$delegate = self::factory()->user->create( array( 'role' => 'subscriber' ) );
		get_user_by( 'id', $delegate )->add_cap( 'manage_options' );
		wp_set_current_user( $delegate );
		$this->assertFalse( current_user_can( 'list_users' ) );
		$token = $this->context();
		$file = $this->file( array( 'tools.php' => array( 'title' => 'Utilities' ) ) );
		$a = $this->transfer->import_file( $this->request( $file, $token ) )->get_data();
		$r = $this->transfer->import_file( $this->request( $file, $token, 'apply', $a['analysis'] ) );
		$this->assertNotWPError( $r );
		$this->assertSame( array( $person ), get_option( MAESTRO_OPTION )['items']['edit.php']['hidden_users'] );
		$this->assertStringNotContainsString( 'hidden_users', wp_json_encode( $r->get_data() ) );
	}
	public function test_context_expires_and_environment_change_is_refused() {
		$token = $this->context();
		add_role( 'new_role', 'New role', array( 'read' => true ) );
		$r = $this->transfer->import_file( $this->request( $this->file(), $token ) );
		$this->assertWPError( $r );
		remove_role( 'new_role' );
		$this->assertWPError( $this->transfer->import_file( $this->request( $this->file(), 'tampered' ) ) );
	}
	public function test_empty_import_requires_explicit_reset_confirmation() {
		$file = wp_json_encode( Transfer::export( array() ) );
		$token = $this->context();
		$a = $this->transfer->import_file( $this->request( $file, $token ) )->get_data();
		$this->assertTrue( $a['empty'] );
		$this->assertWPError( $this->transfer->import_file( $this->request( $file, $token, 'apply', $a['analysis'] ) ) );
		$r = $this->request( $file, $token, 'apply', $a['analysis'] );
		$r->set_param( 'confirm_empty', true );
		$this->assertNotWPError( $this->transfer->import_file( $r ) );
	}
	public function test_unchanged_import_is_a_successful_noop_and_single_use() {
		$file = $this->file();
		foreach ( array( 1, 2 ) as $pass ) {
			$token = $this->context();
			$a = $this->transfer->import_file( $this->request( $file, $token ) )->get_data();
			$this->assertNotWPError( $this->transfer->import_file( $this->request( $file, $token, 'apply', $a['analysis'] ) ) );
			$this->assertWPError( $this->transfer->import_file( $this->request( $file, $token, 'apply', $a['analysis'] ) ) );
		}
	}

}
