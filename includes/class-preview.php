<?php
/**
 * Read-only role preview (Phase 30, ROLE-03): show the admin menu as a chosen
 * role would see it, while the viewer stays logged in as themselves.
 *
 * This is the one approved exception to "Maestro never changes a capability"
 * (D2, `.planning/phases/30-view-as-role-preview/30-CONTEXT.md`). It changes no
 * stored permission. For one request it makes the viewer's own capability
 * checks answer as the role would, and only while the menu is being built:
 *
 * - **Start:** the `auth_redirect` action. `wp-admin/admin.php` calls
 *   auth_redirect() just before it requires `wp-admin/menu.php`, and nothing in
 *   between checks a capability.
 * - **Inside:** core adds its items, plugins add theirs on `admin_menu`,
 *   Replay runs at `admin_menu` PHP_INT_MAX, and `wp-admin/includes/menu.php`
 *   prunes what the user cannot reach with current_user_can().
 * - **End:** `custom_menu_order`, which core applies unconditionally after the
 *   pruning and before user_can_access_admin_page(). The page itself, its
 *   callbacks, REST, AJAX and cron all run with the viewer's real capabilities.
 *   `admin_init` closes the window too, in case a page never reaches the menu
 *   include.
 *
 * **Only on the Dashboard.** Core records what it pruned in the
 * `$_wp_menu_nopriv` / `$_wp_submenu_nopriv` globals, and
 * user_can_access_admin_page() reads them. Built inside the window, they say
 * what the ROLE cannot reach, so on a page the role lacks (Settings, for an
 * Editor) the real viewer would be refused. Rebuilding them with the viewer's
 * capabilities is not possible once the pruned rows are gone, and clearing
 * them would let a page through that the viewer really lacks. The Dashboard
 * needs only `read`, which the previewed role must hold, so it is the one page
 * where the access check gives the same answer either way. Menu links carry
 * no preview arg, so following one leaves the preview.
 *
 * The filter only ever removes capabilities, and only for the viewer. It is
 * attached after the viewer's REAL capabilities pass capability(), the nonce
 * is valid, the role exists, and the viewer is not a multisite super admin
 * (WP_User::has_cap() answers true for those before the filter runs, so a
 * preview could never be faithful; see 30-CONTEXT.md).
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Read-only role preview.
 */
class Preview {

	/** Query arg carrying the role to preview. */
	const QUERY = 'maestro_preview';

	/** Query arg carrying the nonce. */
	const NONCE = 'maestro_preview_nonce';

	/** Nonce action. */
	const ACTION = 'maestro_preview';

	/**
	 * The role being previewed this request, or null. Set once the request is
	 * validated and kept for the whole request (the banner and Replay read it);
	 * the capability window itself is shorter.
	 *
	 * @var string|null
	 */
	private static $role = null;

	/**
	 * Why a preview request was refused, or null.
	 *
	 * @var string|null
	 */
	private static $refused = null;

	/**
	 * The user whose checks are filtered.
	 *
	 * @var int
	 */
	private $viewer = 0;

	/**
	 * Capabilities of the previewed role, as stored on the role.
	 *
	 * @var array<string, bool>
	 */
	private $role_caps = array();

	/**
	 * Whether the capability filter is attached.
	 *
	 * @var bool
	 */
	private $open = false;

	/**
	 * Register the window's start and end.
	 *
	 * Construct after Replay, so this `custom_menu_order` callback runs after
	 * Replay's own at the same priority.
	 */
	public function __construct() {
		add_action( 'auth_redirect', array( $this, 'begin' ), PHP_INT_MAX );
		add_filter( 'custom_menu_order', array( $this, 'end_at_menu_order' ), PHP_INT_MAX );
		add_action( 'admin_init', array( $this, 'end' ), PHP_INT_MIN );
		// Core renders Screen Options and Help after in_admin_header. Put the
		// banner in the normal notice area below that screen chrome instead.
		add_action( 'admin_notices', array( $this, 'render_banner' ) );
		add_action( 'admin_notices', array( $this, 'render_refusal' ) );
	}

	/**
	 * Roles that can be previewed: those that hold `read` (see validate()).
	 *
	 * @return array<string, string> role key => translated name, in site order.
	 */
	public static function previewable_roles() {
		$out = array();
		foreach ( wp_roles()->roles as $key => $data ) {
			if ( ! empty( $data['capabilities']['read'] ) ) {
				$out[ $key ] = translate_user_role( $data['name'] );
			}
		}
		return $out;
	}

	/**
	 * Whether the current user may start a preview at all. Multisite super
	 * admins may not (30-CONTEXT.md); the editor explains why instead.
	 *
	 * @return bool
	 */
	public static function available() {
		return ! ( is_multisite() && is_super_admin() );
	}

	/**
	 * The Dashboard URL that previews a role, with a fresh nonce.
	 *
	 * @param string $role Role key.
	 * @return string
	 */
	public static function url( $role ) {
		return add_query_arg(
			array(
				self::QUERY => rawurlencode( $role ),
				self::NONCE => wp_create_nonce( self::ACTION ),
			),
			admin_url( 'index.php' )
		);
	}

	/**
	 * Where Exit preview goes: the Dashboard, back in edit mode.
	 *
	 * @return string
	 */
	public static function exit_url() {
		return add_query_arg( 'maestro_edit', '1', admin_url( 'index.php' ) );
	}

	/**
	 * The banner shown for the whole preview. Rendered by PHP after the window
	 * has closed, so it uses the viewer's real capabilities and is there even
	 * when the previewed role cannot reach Maestro. The role picker is a plain
	 * GET form carrying the nonce; no script is needed.
	 *
	 * @return void
	 */
	public function render_banner() {
		if ( null === self::$role || ! current_user_can( capability() ) ) {
			return;
		}

		$roles = self::previewable_roles();
		$name  = isset( $roles[ self::$role ] ) ? $roles[ self::$role ] : self::$role;
		?>
		<div class="notice notice-info inline maestro-preview-banner" role="region" aria-labelledby="maestro-preview-title" style="clear:both;">
			<p id="maestro-preview-title"><strong>
				<?php
				/* translators: %s: role name, such as "Editor". */
				echo esc_html( sprintf( __( 'Previewing menu as %s — read-only', 'maestro-menu-editor' ), $name ) );
				?>
			</strong></p>
			<p><?php esc_html_e( 'The menu you see now is a representation of how it should appear to users in the role you’ve selected. This preview is based on the rules WordPress and your plugins build for this role, with Maestro’s rules applied last. Keep in mind it’s an approximation: rules for specific users or visibility groups, capabilities given to individual users, people with more than one role, and plugins that check the user directly can create different, unexpected results.', 'maestro-menu-editor' ); ?></p>
			<form method="get" action="<?php echo esc_url( admin_url( 'index.php' ) ); ?>" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px;">
				<label for="maestro-preview-role"><?php esc_html_e( 'Preview as', 'maestro-menu-editor' ); ?></label>
				<select id="maestro-preview-role" name="<?php echo esc_attr( self::QUERY ); ?>">
					<?php foreach ( $roles as $key => $label ) : ?>
						<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $key, self::$role ); ?>><?php echo esc_html( $label ); ?></option>
					<?php endforeach; ?>
				</select>
				<input type="hidden" name="<?php echo esc_attr( self::NONCE ); ?>" value="<?php echo esc_attr( wp_create_nonce( self::ACTION ) ); ?>" />
				<button type="submit" class="button"><?php esc_html_e( 'Preview', 'maestro-menu-editor' ); ?></button>
				<a class="button button-primary maestro-preview-exit" href="<?php echo esc_url( self::exit_url() ); ?>"><?php esc_html_e( 'Exit preview', 'maestro-menu-editor' ); ?></a>
			</form>
		</div>
		<?php
	}

	/**
	 * Say why a preview request was refused, when the viewer could have
	 * previewed. Someone without Maestro's capability is told nothing.
	 *
	 * @return void
	 */
	public function render_refusal() {
		$messages = array(
			'bad_nonce'        => __( 'That role preview link has expired. Choose the role again from the menu editor.', 'maestro-menu-editor' ),
			'unknown_role'     => __( 'That role cannot be previewed on this site.', 'maestro-menu-editor' ),
			'role_cannot_read' => __( 'That role has no access to the WordPress admin, so there is no menu to preview.', 'maestro-menu-editor' ),
			'super_admin'      => __( 'Role preview is not available to network super admins. Use a site administrator account to preview this site’s roles.', 'maestro-menu-editor' ),
			'not_dashboard'    => __( 'Role preview runs on the Dashboard. Choose the role again from the menu editor.', 'maestro-menu-editor' ),
		);
		if ( null === self::$refused || ! isset( $messages[ self::$refused ] ) ) {
			return;
		}
		printf( '<div class="notice notice-warning maestro-preview-refused"><p>%s</p></div>', esc_html( $messages[ self::$refused ] ) );
	}

	/**
	 * The role being previewed this request, or null when not previewing.
	 *
	 * @return string|null
	 */
	public static function role() {
		return self::$role;
	}

	/**
	 * Why this request's preview was refused, or null.
	 *
	 * @return string|null One of the reasons validate() returns.
	 */
	public static function refused() {
		return self::$refused;
	}

	/**
	 * Clear the request state. For tests; a real request starts clean.
	 *
	 * @internal
	 * @return void
	 */
	public static function reset() {
		self::$role    = null;
		self::$refused = null;
	}

	/**
	 * Decide whether a preview request may start. Pure: every WordPress
	 * lookup is done by the caller and passed in, so each branch is testable.
	 *
	 * The order matters only for which reason is reported; any failure refuses.
	 *
	 * @param array $request The request args (normally $_GET).
	 * @param array $env {
	 *     The checks, each already resolved by the caller.
	 *
	 *     @type bool     $admin_page Ordinary wp-admin page load (not AJAX, REST or cron).
	 *     @type bool     $site_admin A site's own admin, not network or user admin.
	 *     @type bool     $dashboard  The page is the Dashboard (index.php).
	 *     @type bool     $can_edit   The viewer's REAL capabilities pass capability().
	 *     @type bool     $super      The viewer is a multisite super admin.
	 *     @type bool     $nonce_ok   The nonce verified.
	 *     @type string[] $roles      Role keys that exist on this site.
	 *     @type string[] $readers    Of those, the roles that hold `read`.
	 * }
	 * @return array Either array( 'role' => string ), array( 'refused' => string ),
	 *               or an empty array when the request does not ask for a preview.
	 */
	public static function validate( array $request, array $env ) {
		if ( ! isset( $request[ self::QUERY ] ) || ! is_string( $request[ self::QUERY ] ) || '' === $request[ self::QUERY ] ) {
			return array();
		}

		$role = sanitize_key( $request[ self::QUERY ] );

		if ( empty( $env['admin_page'] ) ) {
			return array( 'refused' => 'not_admin_page' );
		}
		if ( empty( $env['site_admin'] ) ) {
			return array( 'refused' => 'outside_site_admin' );
		}
		if ( empty( $env['dashboard'] ) ) {
			return array( 'refused' => 'not_dashboard' );
		}
		if ( empty( $env['can_edit'] ) ) {
			return array( 'refused' => 'no_capability' );
		}
		if ( ! empty( $env['super'] ) ) {
			return array( 'refused' => 'super_admin' );
		}
		if ( empty( $env['nonce_ok'] ) ) {
			return array( 'refused' => 'bad_nonce' );
		}
		if ( '' === $role || ! in_array( $role, (array) $env['roles'], true ) ) {
			return array( 'refused' => 'unknown_role' );
		}
		if ( ! in_array( $role, isset( $env['readers'] ) ? (array) $env['readers'] : array(), true ) ) {
			// Without `read` the role has no admin, and the Dashboard itself
			// would be refused.
			return array( 'refused' => 'role_cannot_read' );
		}

		return array( 'role' => $role );
	}

	/**
	 * Start of the window: validate the request with the viewer's real
	 * capabilities and, if it passes, attach the filter.
	 *
	 * @param int $user_id The authenticated user, from auth_redirect().
	 * @return void
	 */
	public function begin( $user_id ) {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- The nonce is verified below, as one of validate()'s inputs.
		$request = $_GET;
		$nonce   = isset( $_GET[ self::NONCE ] ) ? sanitize_text_field( wp_unslash( $_GET[ self::NONCE ] ) ) : '';
		// phpcs:enable

		if ( ! isset( $request[ self::QUERY ] ) ) {
			return;
		}
		if ( is_string( $request[ self::QUERY ] ) ) {
			$request[ self::QUERY ] = wp_unslash( $request[ self::QUERY ] );
		}

		global $pagenow;

		$user_id = (int) $user_id;
		$roles   = wp_roles()->roles;
		$readers = array();
		foreach ( $roles as $key => $data ) {
			if ( ! empty( $data['capabilities']['read'] ) ) {
				$readers[] = $key;
			}
		}
		$result = self::validate(
			$request,
			array(
				'admin_page' => is_admin() && ! wp_doing_ajax() && ! wp_doing_cron() && ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ),
				'site_admin' => ! is_outside_site_admin(),
				'dashboard'  => 'index.php' === $pagenow && ! isset( $request['page'] ),
				'can_edit'   => 0 < $user_id && get_current_user_id() === $user_id && current_user_can( capability() ),
				'super'      => is_multisite() && is_super_admin( $user_id ),
				'nonce_ok'   => '' !== $nonce && false !== wp_verify_nonce( $nonce, self::ACTION ),
				'roles'      => array_keys( $roles ),
				'readers'    => $readers,
			)
		);

		if ( isset( $result['refused'] ) ) {
			self::$refused = $result['refused'];
			return;
		}
		if ( ! isset( $result['role'] ) ) {
			return;
		}

		$role_object = get_role( $result['role'] );
		if ( ! $role_object ) {
			self::$refused = 'unknown_role';
			return;
		}

		self::$role      = $result['role'];
		$this->viewer    = $user_id;
		$this->role_caps = (array) $role_object->capabilities;
		$this->open      = true;
		add_filter( 'user_has_cap', array( $this, 'subtract' ), PHP_INT_MAX, 4 );
	}

	/**
	 * The filter: for the viewer only, while the window is open, turn off every
	 * granted capability the previewed role does not hold. It never adds a key
	 * and never sets one to true.
	 *
	 * Role-name keys (an administrator's `administrator` entry) are turned off
	 * too, since a role does not grant itself by name. That is the safe
	 * direction: a check on the viewer's role name can only fail in preview.
	 *
	 * @param array    $allcaps The user's capabilities, cap => bool.
	 * @param array    $caps    Primitive capabilities being checked.
	 * @param array    $args    Arguments to the check.
	 * @param \WP_User $user    The user being checked.
	 * @return array
	 */
	public function subtract( $allcaps, $caps, $args, $user ) {
		if ( ! $this->open || ! ( $user instanceof \WP_User ) || (int) $user->ID !== $this->viewer ) {
			return $allcaps;
		}

		foreach ( (array) $allcaps as $cap => $granted ) {
			if ( $granted && empty( $this->role_caps[ $cap ] ) ) {
				$allcaps[ $cap ] = false;
			}
		}

		return $allcaps;
	}

	/**
	 * End of the window. Safe to call more than once.
	 *
	 * @return void
	 */
	public function end() {
		if ( ! $this->open ) {
			return;
		}
		remove_filter( 'user_has_cap', array( $this, 'subtract' ), PHP_INT_MAX );
		$this->open = false;
	}

	/**
	 * End the window at `custom_menu_order`, passing its value through.
	 *
	 * @param bool $custom Whether custom ordering is on.
	 * @return bool
	 */
	public function end_at_menu_order( $custom ) {
		$this->end();
		return $custom;
	}

	/**
	 * Whether the capability filter is attached right now.
	 *
	 * @return bool
	 */
	public function is_open() {
		return $this->open;
	}
}
