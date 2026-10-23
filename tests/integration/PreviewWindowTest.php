<?php
/**
 * The Phase 30 capability window (D2): who can open it, what it does to
 * capability checks, whom it touches, when it closes, and what it never writes.
 *
 * Each boundary in `.planning/phases/30-view-as-role-preview/30-CONTEXT.md`
 * has a test here. Subtraction alone is not proof of safety, so authorization,
 * viewer isolation, cleanup and the absence of writes are asserted separately.
 *
 * @package Maestro
 */

namespace Maestro\Tests\Integration;

use Maestro\Config;
use Maestro\Preview;
use Maestro\Replay;
use WP_UnitTestCase;

use function Maestro\is_edit_mode;

class PreviewWindowTest extends WP_UnitTestCase {

	/** @var int */
	private $admin;

	/** @var Preview */
	private $preview;

	/** @var string|null */
	private $saved_pagenow;

	public function set_up() {
		parent::set_up();
		Preview::reset();
		delete_option( MAESTRO_OPTION );
		$this->admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $this->admin );
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
	 * Ask for a preview the way a request would, and run the window's start.
	 *
	 * @param string      $role  Role to preview.
	 * @param string|null $nonce Nonce; a fresh valid one when null.
	 * @return Preview
	 */
	private function begin( $role, $nonce = null ) {
		$_GET[ Preview::QUERY ] = $role;
		$_GET[ Preview::NONCE ] = null === $nonce ? wp_create_nonce( Preview::ACTION ) : $nonce;
		$this->preview          = new Preview();
		$this->preview->begin( get_current_user_id() );
		return $this->preview;
	}

	/* ---- Subtraction ------------------------------------------------------ */

	public function test_an_administrator_previewing_editor_loses_what_editor_lacks() {
		$this->begin( 'editor' );

		$this->assertSame( 'editor', Preview::role() );
		$this->assertTrue( $this->preview->is_open() );
		$this->assertFalse( current_user_can( 'manage_options' ) );
		$this->assertFalse( current_user_can( 'activate_plugins' ) );
		$this->assertTrue( current_user_can( 'edit_posts' ) );
		$this->assertTrue( current_user_can( 'edit_others_posts' ) );
		$this->assertTrue( current_user_can( 'read' ) );
	}

	public function test_the_filter_never_grants_a_capability_the_viewer_lacks() {
		add_role( 'menu_lead', 'Menu lead', array( 'read' => true, 'maestro_edit' => true ) );
		add_filter( 'maestro_capability', array( $this, 'maestro_edit_cap' ) );
		$lead = self::factory()->user->create( array( 'role' => 'menu_lead' ) );
		wp_set_current_user( $lead );

		$this->begin( 'administrator' );

		$this->assertSame( 'administrator', Preview::role() );
		$this->assertFalse( current_user_can( 'manage_options' ), 'Previewing a stronger role must not grant its capabilities.' );
		$this->assertFalse( current_user_can( 'edit_posts' ) );
		$this->assertTrue( current_user_can( 'read' ) );
		// Even the viewer's own Maestro capability is off: administrator lacks it.
		$this->assertFalse( current_user_can( 'maestro_edit' ) );

		remove_role( 'menu_lead' );
	}

	/**
	 * The custom capability for the menu-lead test.
	 *
	 * @return string
	 */
	public function maestro_edit_cap() {
		return 'maestro_edit';
	}

	public function test_a_capability_granted_to_the_user_directly_is_removed_too() {
		wp_get_current_user()->add_cap( 'some_plugin_cap' );
		$this->assertTrue( current_user_can( 'some_plugin_cap' ) );

		$this->begin( 'editor' );

		$this->assertFalse( current_user_can( 'some_plugin_cap' ) );
	}

	/* ---- Viewer isolation ------------------------------------------------- */

	public function test_only_the_viewer_is_affected() {
		$other_admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$author      = self::factory()->user->create( array( 'role' => 'author' ) );

		$this->begin( 'editor' );

		$this->assertFalse( current_user_can( 'manage_options' ) );
		$this->assertTrue( user_can( $other_admin, 'manage_options' ), 'Another administrator is untouched.' );
		$this->assertTrue( user_can( $author, 'publish_posts' ) );
		$this->assertFalse( user_can( $author, 'edit_others_posts' ), 'Nobody gains anything either.' );
	}

	/* ---- Cleanup ---------------------------------------------------------- */

	public function test_the_window_closes_at_custom_menu_order() {
		$this->begin( 'editor' );
		$this->assertFalse( current_user_can( 'manage_options' ) );

		// Core applies this unconditionally after pruning the menu and before
		// user_can_access_admin_page().
		$this->assertFalse( apply_filters( 'custom_menu_order', false ), 'The value passes through.' );

		$this->assertFalse( $this->preview->is_open() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
		$this->assertFalse( has_filter( 'user_has_cap', array( $this->preview, 'subtract' ) ) );
		// The role is still known for the banner and the rest of the request.
		$this->assertSame( 'editor', Preview::role() );
	}

	public function test_the_window_closes_at_admin_init_as_well() {
		$this->begin( 'editor' );
		// Firing admin_init itself runs core's update checks, so check the
		// registration and run the callback it names.
		$this->assertSame( PHP_INT_MIN, has_action( 'admin_init', array( $this->preview, 'end' ) ) );
		$this->preview->end();

		$this->assertFalse( $this->preview->is_open() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	/**
	 * Run core's own wp-admin/menu.php as a preview request would, and check
	 * that the Dashboard's access check passes and the menu is the role's.
	 *
	 * Core's include is require_once and declares functions, so it can run once
	 * per process; this is the only test that runs it.
	 */
	public function test_core_menu_build_in_preview_keeps_the_dashboard_reachable() {
		if ( function_exists( 'add_menu_classes' ) ) {
			$this->markTestSkipped( 'wp-admin/includes/menu.php already ran in this process.' );
		}
		// phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited -- Recreating the globals wp-admin/admin.php has when it requires menu.php.
		global $menu, $submenu, $_wp_real_parent_file, $_wp_submenu_nopriv, $_wp_menu_nopriv, $_registered_pages, $_parent_pages, $admin_page_hooks, $plugin_page, $typenow, $taxnow, $parent_file, $submenu_file;
		$menu                 = array();
		$submenu              = array();
		$_wp_real_parent_file = array();
		$_registered_pages    = array();
		$_parent_pages        = array();
		$admin_page_hooks     = array();
		$plugin_page          = null;
		$typenow              = '';
		$taxnow               = '';
		// phpcs:enable

		$this->begin( 'editor' );

		try {
			require ABSPATH . 'wp-admin/menu.php';
		} catch ( \WPDieException $e ) {
			$this->fail( 'The Dashboard was refused during preview: ' . $e->getMessage() );
		}

		$this->assertFalse( $this->preview->is_open(), 'The window closed inside core\'s menu build.' );
		$this->assertTrue( current_user_can( 'manage_options' ) );
		$this->assertTrue( user_can_access_admin_page() );

		$slugs = array_values( array_map( static function ( $row ) { return $row[2]; }, $menu ) );
		$this->assertContains( 'edit.php', $slugs );
		$this->assertNotContains( 'plugins.php', $slugs, 'Editor has no Plugins menu.' );
		$this->assertNotContains( 'options-general.php', $slugs, 'Editor has no Settings menu.' );
		$this->assertContains( 'profile.php', $slugs, 'Editor gets Profile in place of Users.' );
	}

	public function test_no_window_on_a_page_other_than_the_dashboard() {
		$GLOBALS['pagenow'] = 'options-general.php'; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Simulating the requested page.

		$this->begin( 'editor' );

		$this->assertSame( 'not_dashboard', Preview::refused() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	public function test_no_window_for_a_role_without_read() {
		add_role( 'no_admin', 'No admin', array( 'edit_posts' => true ) );

		$this->begin( 'no_admin' );

		$this->assertSame( 'role_cannot_read', Preview::refused() );
		remove_role( 'no_admin' );
	}

	public function test_ending_twice_is_harmless() {
		$this->begin( 'editor' );
		$this->preview->end();
		$this->preview->end();
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	/* ---- Authorization ---------------------------------------------------- */

	public function test_no_window_without_the_maestro_capability() {
		$editor = self::factory()->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $editor );

		$this->begin( 'author' );

		$this->assertNull( Preview::role() );
		$this->assertSame( 'no_capability', Preview::refused() );
		$this->assertFalse( $this->preview->is_open() );
		$this->assertTrue( current_user_can( 'edit_others_posts' ) );
	}

	public function test_no_window_with_a_bad_nonce() {
		$this->begin( 'editor', 'not-a-nonce' );

		$this->assertNull( Preview::role() );
		$this->assertSame( 'bad_nonce', Preview::refused() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	public function test_no_window_with_a_missing_nonce() {
		$this->begin( 'editor', '' );

		$this->assertSame( 'bad_nonce', Preview::refused() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	public function test_another_users_nonce_is_refused() {
		$other = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $other );
		$nonce = wp_create_nonce( Preview::ACTION );
		wp_set_current_user( $this->admin );

		$this->begin( 'editor', $nonce );

		$this->assertSame( 'bad_nonce', Preview::refused() );
	}

	public function test_no_window_for_an_unknown_role() {
		$this->begin( 'no_such_role' );

		$this->assertSame( 'unknown_role', Preview::refused() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	public function test_no_window_outside_wp_admin() {
		$GLOBALS['current_screen'] = null;

		$this->begin( 'editor' );

		$this->assertSame( 'not_admin_page', Preview::refused() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	public function test_no_window_during_ajax() {
		add_filter( 'wp_doing_ajax', '__return_true' );

		$this->begin( 'editor' );

		$this->assertSame( 'not_admin_page', Preview::refused() );
		$this->assertTrue( current_user_can( 'manage_options' ) );
	}

	public function test_no_window_for_a_multisite_super_admin() {
		if ( ! is_multisite() ) {
			$this->markTestSkipped( 'Super admins exist only on multisite.' );
		}
		grant_super_admin( $this->admin );

		$this->begin( 'editor' );

		$this->assertSame( 'super_admin', Preview::refused() );
		$this->assertNull( Preview::role() );
		$this->assertFalse( $this->preview->is_open() );
	}

	public function test_a_request_without_the_arg_does_nothing() {
		$this->preview = new Preview();
		$this->preview->begin( $this->admin );

		$this->assertNull( Preview::role() );
		$this->assertNull( Preview::refused() );
		$this->assertFalse( $this->preview->is_open() );
	}

	/* ---- Read-only -------------------------------------------------------- */

	public function test_preview_is_never_edit_mode() {
		$_GET['maestro_edit'] = '1';
		$this->assertTrue( is_edit_mode() );

		$this->begin( 'editor' );
		apply_filters( 'custom_menu_order', false );

		$this->assertFalse( is_edit_mode() );
	}

	public function test_a_preview_request_writes_nothing() {
		$this->seed_menu();
		update_option(
			MAESTRO_OPTION,
			array(
				'items' => array( 'edit.php' => array( 'hidden_roles' => array( 'editor' ) ) ),
			)
		);

		$writes = 0;
		$count  = static function () use ( &$writes ) {
			++$writes;
		};
		add_action( 'add_option', $count );
		add_action( 'update_option', $count );
		add_action( 'delete_option', $count );
		$meta = static function ( $check ) use ( &$writes ) {
			++$writes;
			return $check;
		};
		add_filter( 'update_user_metadata', $meta );
		add_filter( 'add_user_metadata', $meta );
		add_filter( 'delete_user_metadata', $meta );

		$this->begin( 'editor' );
		( new Replay( new Config() ) )->replay();
		apply_filters( 'custom_menu_order', false );

		$this->assertSame( 0, $writes );
	}

	/* ---- Maestro's own rules ---------------------------------------------- */

	/**
	 * A small menu Replay can act on.
	 *
	 * @return void
	 */
	private function seed_menu() {
		global $menu, $submenu;
		// phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited -- Seeding the admin menu globals for the test.
		$menu    = array(
			2  => array( 'Dashboard', 'read', 'index.php', '', 'menu-top', 'menu-dashboard', 'dashicons-dashboard' ),
			5  => array( 'Posts', 'edit_posts', 'edit.php', '', 'menu-top', 'menu-posts', 'dashicons-admin-post' ),
			10 => array( 'Media', 'upload_files', 'upload.php', '', 'menu-top', 'menu-media', 'dashicons-admin-media' ),
		);
		$submenu = array(
			'edit.php' => array(
				5  => array( 'All Posts', 'edit_posts', 'edit.php', '' ),
				10 => array( 'Add New', 'edit_posts', 'post-new.php', '' ),
			),
		);
		// phpcs:enable
	}

	/**
	 * Top-level slugs left in $menu.
	 *
	 * @return string[]
	 */
	private function top_slugs() {
		global $menu;
		return array_values( array_map( static function ( $row ) { return $row[2]; }, $menu ) );
	}

	public function test_role_rules_apply_for_the_previewed_role() {
		$this->seed_menu();
		update_option(
			MAESTRO_OPTION,
			array(
				'items' => array( 'edit.php' => array( 'hidden_roles' => array( 'editor' ) ) ),
			)
		);

		$this->begin( 'editor' );
		( new Replay( new Config() ) )->replay();

		$this->assertNotContains( 'edit.php', $this->top_slugs(), 'Hidden from Editor, so gone in the Editor preview.' );
	}

	public function test_the_viewers_own_role_rules_do_not_apply_in_preview() {
		$this->seed_menu();
		update_option(
			MAESTRO_OPTION,
			array(
				'items' => array( 'upload.php' => array( 'hidden_roles' => array( 'administrator' ) ) ),
			)
		);

		$this->begin( 'editor' );
		( new Replay( new Config() ) )->replay();

		$this->assertContains( 'upload.php', $this->top_slugs(), 'Hidden from Administrator only, so an Editor preview shows it.' );
	}

	public function test_person_rules_are_not_applied_in_preview() {
		$this->seed_menu();
		update_option(
			MAESTRO_OPTION,
			array(
				'items' => array( 'upload.php' => array( 'hidden_users' => array( $this->admin ) ) ),
			)
		);

		$this->begin( 'editor' );
		( new Replay( new Config() ) )->replay();

		$this->assertContains( 'upload.php', $this->top_slugs(), 'A rule naming the viewer says nothing about the role.' );
	}

	public function test_sub_item_role_rules_apply_for_the_previewed_role() {
		$this->seed_menu();
		update_option(
			MAESTRO_OPTION,
			array(
				'items' => array( 'edit.php' => array( 'child_hidden_roles' => array( 'editor' ) ) ),
			)
		);

		$this->begin( 'editor' );
		( new Replay( new Config() ) )->replay();

		global $submenu;
		$this->assertContains( 'edit.php', $this->top_slugs() );
		$this->assertEmpty( isset( $submenu['edit.php'] ) ? $submenu['edit.php'] : array() );
	}
}
