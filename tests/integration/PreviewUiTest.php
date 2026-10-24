<?php
/**
 * Phase 30-02: what the viewer sees around a role preview. The banner, the
 * refusal notices, the admin-bar Exit preview node and the localized picker
 * data. The capability window itself is covered by PreviewWindowTest.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Admin_Bar;
use Maestro\Preview;
use WP_Admin_Bar;
use WP_UnitTestCase;

class PreviewUiTest extends WP_UnitTestCase {

	/** @var Preview|null */
	private $preview;

	/** @var string|null */
	private $saved_pagenow;

	public function set_up() {
		parent::set_up();
		Preview::reset();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );
		$this->saved_pagenow = isset( $GLOBALS['pagenow'] ) ? $GLOBALS['pagenow'] : null;
		$GLOBALS['pagenow']  = 'index.php'; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Preview runs on the Dashboard.
	}

	public function tear_down() {
		unset( $_GET[ Preview::QUERY ], $_GET[ Preview::NONCE ], $_GET['maestro_edit'] );
		if ( $this->preview ) {
			$this->preview->end();
		}
		Preview::reset();
		$GLOBALS['current_screen'] = null;
		$GLOBALS['pagenow']        = $this->saved_pagenow; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		parent::tear_down();
	}

	/**
	 * Run a preview request through the window and close it, as admin.php would
	 * by the time the header renders.
	 *
	 * @param string      $role  Role to preview.
	 * @param string|null $nonce Nonce; a fresh valid one when null.
	 * @return Preview
	 */
	private function request( $role, $nonce = null ) {
		$_GET[ Preview::QUERY ] = $role;
		$_GET[ Preview::NONCE ] = null === $nonce ? wp_create_nonce( Preview::ACTION ) : $nonce;
		$this->preview          = new Preview();
		$this->preview->begin( get_current_user_id() );
		$this->preview->end();
		return $this->preview;
	}

	private function banner() {
		ob_start();
		$this->preview->render_banner();
		return (string) ob_get_clean();
	}

	private function refusal() {
		ob_start();
		$this->preview->render_refusal();
		return (string) ob_get_clean();
	}

	public function test_the_banner_names_the_role_and_says_read_only() {
		$this->request( 'editor' );
		$html = $this->banner();

		$this->assertStringContainsString( 'Previewing menu as Editor — read-only', $html );
		$this->assertStringContainsString( 'approximation', $html );
		$this->assertStringContainsString( 'Exit preview', $html );
		$this->assertStringContainsString( 'maestro_edit=1', $html );
	}

	public function test_the_banner_picker_offers_only_roles_that_can_read_and_carries_a_nonce() {
		add_role( 'maestro_no_read', 'No Read', array( 'edit_posts' => true ) );
		$this->request( 'author' );
		$html = $this->banner();
		remove_role( 'maestro_no_read' );

		$this->assertMatchesRegularExpression( '/value="author"\s+selected/', $html );
		$this->assertStringContainsString( 'value="subscriber"', $html );
		$this->assertStringNotContainsString( 'maestro_no_read', $html );
		$this->assertMatchesRegularExpression( '/name="' . Preview::NONCE . '" value="[0-9a-f]+"/', $html );
	}

	public function test_no_banner_without_a_preview() {
		$this->preview = new Preview();
		$this->assertSame( '', $this->banner() );
	}

	public function test_a_bad_nonce_is_explained() {
		$this->request( 'editor', 'nope' );
		$this->assertStringContainsString( 'expired', $this->refusal() );
		$this->assertSame( '', $this->banner() );
	}

	public function test_a_role_without_read_is_explained() {
		add_role( 'maestro_no_read', 'No Read', array( 'edit_posts' => true ) );
		$this->request( 'maestro_no_read' );
		remove_role( 'maestro_no_read' );
		$this->assertStringContainsString( 'no access to the WordPress admin', $this->refusal() );
	}

	public function test_a_preview_off_the_dashboard_is_explained() {
		$GLOBALS['pagenow'] = 'options-general.php'; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$this->request( 'editor' );
		$this->assertStringContainsString( 'runs on the Dashboard', $this->refusal() );
	}

	public function test_someone_without_maestro_access_is_told_nothing() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );
		$this->request( 'subscriber', 'nope' );
		$this->assertSame( 'no_capability', Preview::refused() );
		$this->assertSame( '', $this->refusal() );
		$this->assertSame( '', $this->banner() );
	}

	public function test_the_admin_bar_offers_exit_preview_while_previewing() {
		$this->request( 'editor' );

		require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';
		$bar = new WP_Admin_Bar();
		( new Admin_Bar() )->node( $bar );
		$node = $bar->get_node( 'maestro-toggle' );

		$this->assertNotNull( $node );
		$this->assertStringContainsString( 'Exit preview', $node->title );
		$this->assertStringContainsString( 'maestro_edit=1', $node->href );
		$this->assertStringNotContainsString( Preview::QUERY, $node->href );
	}

	public function test_url_targets_the_dashboard_with_a_valid_nonce() {
		$url = Preview::url( 'editor' );
		$this->assertStringStartsWith( admin_url( 'index.php' ), $url );
		wp_parse_str( (string) wp_parse_url( $url, PHP_URL_QUERY ), $args );
		$this->assertSame( 'editor', $args[ Preview::QUERY ] );
		$this->assertSame( 1, wp_verify_nonce( $args[ Preview::NONCE ], Preview::ACTION ) );
	}

	public function test_previewable_roles_are_those_with_read() {
		$roles = Preview::previewable_roles();
		$this->assertArrayHasKey( 'administrator', $roles );
		$this->assertArrayHasKey( 'subscriber', $roles );
		$this->assertSame( 'Editor', $roles['editor'] );
	}

	public function test_available_is_false_only_for_super_admins() {
		$this->assertSame( ! is_multisite() || ! is_super_admin(), Preview::available() );
		if ( is_multisite() ) {
			grant_super_admin( get_current_user_id() );
			$this->assertFalse( Preview::available() );
			revoke_super_admin( get_current_user_id() );
		}
	}
}
