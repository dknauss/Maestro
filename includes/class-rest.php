<?php
/**
 * REST controller for the menu config.
 *
 * Routes (namespace maestro/v1):
 *   GET    /config  -> current stored config
 *   POST   /config  -> full-replace save (sanitized)
 *   DELETE /config  -> reset (delete the option)
 *
 * Auth: the permission_callback gates on our capability. The cookie-auth nonce
 * (X-WP-Nonce header, value = wp_create_nonce('wp_rest')) is validated by core's
 * REST cookie auth layer when the request is same-origin from the admin JS.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * REST controller — exposes GET / POST / DELETE for the menu config.
 *
 * @package Maestro
 */
class Rest {

	const NS = 'maestro/v1';

	/**
	 * Shared config instance.
	 *
	 * @var Config
	 */
	private $config;

	/**
	 * Store config and register the REST-init hook.
	 *
	 * @param Config $config Shared config instance.
	 */
	public function __construct( Config $config ) {
		$this->config = $config;
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register the /config route with all three methods.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			self::NS,
			'/config',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_config' ),
					'permission_callback' => array( $this, 'can_edit' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_config' ),
					'permission_callback' => array( $this, 'can_edit' ),
					'args'                => array(
						'config' => array(
							'required' => true,
							'type'     => 'object',
						),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'reset_config' ),
					'permission_callback' => array( $this, 'can_edit' ),
				),
			)
		);
	}

	/**
	 * Permission callback: returns true only if the current user can edit the menu.
	 *
	 * @return bool
	 */
	public function can_edit() {
		return current_user_can( capability() );
	}

	/**
	 * Return the current stored config.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_config() {
		return rest_ensure_response(
			array(
				'config' => $this->config->get(),
			)
		);
	}

	/**
	 * Full-replace save.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function save_config( \WP_REST_Request $request ) {
		$incoming = $request->get_param( 'config' );
		if ( ! is_array( $incoming ) ) {
			return new \WP_Error( 'maestro_bad_payload', __( 'Invalid config payload.', 'maestro-menu-editor' ), array( 'status' => 400 ) );
		}

		$saved = $this->config->save( $incoming );

		return rest_ensure_response(
			array(
				'saved'  => true,
				'config' => $saved,
			)
		);
	}

	/**
	 * Reset everything.
	 *
	 * @return \WP_REST_Response
	 */
	public function reset_config() {
		$this->config->reset();
		return rest_ensure_response(
			array(
				'reset'  => true,
				'config' => array(),
			)
		);
	}
}
