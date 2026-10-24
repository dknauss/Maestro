<?php
/**
 * Authenticated configuration transfer with server-owned menu context.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/** Transfer transport. Ordinary config saves keep their existing semantics. */
class Transfer_Rest {
	/**
	 * Shared configuration.
	 *
	 * @var Config
	 */
	private $config;
	/**
	 * Natural menu capture.
	 *
	 * @var Replay
	 */
	private $replay;

	/**
	 * Construct the authenticated transfer transport.
	 *
	 * @param Config $config Config.
	 * @param Replay $replay Replay.
	 */
	public function __construct( Config $config, Replay $replay ) {
		$this->config = $config;
		$this->replay = $replay;
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'load-index.php', array( $this, 'refresh_context' ) );
	}

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			Rest::NS,
			'/config/export',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'export_file' ),
				'permission_callback' => array( $this, 'can_transfer' ),
			)
		);
		register_rest_route(
			Rest::NS,
			'/config/import',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'import_file' ),
				'permission_callback' => array( $this, 'can_transfer' ),
				'args'                => array(
					'file'    => array(
						'type'     => 'string',
						'required' => true,
					),
					'context' => array(
						'type'     => 'string',
						'required' => true,
					),
					'mode'    => array(
						'type'     => 'string',
						'enum'     => array( 'analyze', 'apply' ),
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * Can transfer.
	 */
	public function can_transfer() {
		return current_user_can( capability() ) && ! is_outside_site_admin() && null === Preview::role();
	}

	/**
	 * Run only after real Dashboard menu registration; never fake it in REST.
	 */
	public function refresh_context() {
		if ( ! isset( $_GET['maestro_transfer_context'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Header nonce verified below.
			return;
		}
		$nonce = isset( $_SERVER['HTTP_X_WP_NONCE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_WP_NONCE'] ) ) : '';
		if ( ! $this->can_transfer() || ! is_edit_mode() || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			wp_send_json( array( 'message' => __( 'You cannot refresh this menu context.', 'maestro-menu-editor' ) ), 403 );
		}
		nocache_headers();
		wp_send_json( array( 'context' => $this->context( $this->replay->get_transfer_inventory() ) ) );
	}

	/**
	 * At most one bounded snapshot per viewer session and site, expiring in 5m.
	 *
	 * @param array $inventory Inventory.
	 */
	public function context( array $inventory ) {
		$token = wp_generate_password( 32, false );
		set_transient(
			$this->context_key(),
			array(
				'token'       => $token,
				'inventory'   => $inventory,
				'fingerprint' => $this->fingerprint(),
				'revision'    => $this->revision(),
			),
			5 * MINUTE_IN_SECONDS
		);
		return $token;
	}

	/**
	 * Revision.
	 */
	public function revision() {
		return hash( 'sha256', serialize( $this->config->get() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize -- Internal comparison, never deserialization.
	}

	/**
	 * Context key.
	 */
	private function context_key() {
		return 'maestro_transfer_' . md5( get_current_blog_id() . ':' . get_current_user_id() . ':' . wp_get_session_token() );
	}

	/**
	 * Fingerprint.
	 */
	private function fingerprint() {
		return wp_hash( wp_json_encode( array( get_option( 'active_plugins' ), get_site_option( 'active_sitewide_plugins' ), get_stylesheet(), wp_roles()->roles, wp_get_current_user()->allcaps ) ) );
	}

	/**
	 * Export file.
	 */
	public function export_file() {
		if ( ! $this->can_transfer() ) {
			return new \WP_Error( 'maestro_transfer_forbidden', __( 'You cannot transfer menu settings.', 'maestro-menu-editor' ), array( 'status' => 403 ) );
		}
		try {
			return $this->response( Transfer::export( $this->config->get() ) );
		} catch ( \InvalidArgumentException $e ) {
			return new \WP_Error( 'maestro_transfer_file', $e->getMessage(), array( 'status' => 400 ) );
		}
	}

	/**
	 * Import file.
	 *
	 * @throws \InvalidArgumentException Invalid input, converted to REST error.
	 *
	 * @param \WP_REST_Request $request Request.
	 */
	public function import_file( \WP_REST_Request $request ) {
		if ( ! $this->can_transfer() ) {
			return new \WP_Error( 'maestro_transfer_forbidden', __( 'You cannot transfer menu settings.', 'maestro-menu-editor' ), array( 'status' => 403 ) );
		}
		$context = get_transient( $this->context_key() );
		$token   = $request->get_param( 'context' );
		if ( ! is_array( $context ) || ! is_string( $token ) || ! hash_equals( $context['token'], $token ) || $context['fingerprint'] !== $this->fingerprint() || $context['revision'] !== $this->revision() ) {
			return new \WP_Error( 'maestro_transfer_stale', __( 'The menu or settings changed. Review the file again before importing.', 'maestro-menu-editor' ), array( 'status' => 409 ) );
		}
		try {
			$file   = $request->get_param( 'file' );
			$parsed = Transfer::parse( $file );
			$result = Transfer::reconcile( $parsed, $context['inventory'], array_keys( wp_roles()->get_names() ) );
			$clean  = $this->config->sanitize( $result['config'], true );
			if ( strlen( serialize( $clean ) ) > Config::MAX_CONFIG_BYTES ) { // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize -- Storage size only.
				throw new \InvalidArgumentException( esc_html__( 'The imported settings exceed the storage limit. No settings were changed.', 'maestro-menu-editor' ) );
			}
			// Surface sanitized fields without ever describing protected destination data.
			$portable = Transfer::parse( wp_json_encode( Transfer::export( $clean ) ) );
			foreach ( $result['config']['items'] as $key => $entry ) {
				foreach ( $entry as $field => $value ) {
					if ( ( $portable['items'][ $key ][ $field ] ?? null ) !== $value && ! ( array() === $value && ! isset( $portable['items'][ $key ][ $field ] ) ) ) {
						$result['report'][] = array(
							'code'      => 'sanitized_field',
							'reference' => $key . ':' . $field,
						);
					}
				}
			}
			$proof = hash_hmac( 'sha256', $file . $token . $context['revision'], wp_salt( 'nonce' ) );
			$empty = empty( $portable['items'] ) && empty( $portable['top_order'] ) && empty( $portable['sub_order'] ) && empty( $portable['separators'] ) && empty( $portable['removed_separators'] ) && empty( $portable['menu_width'] );
			$mode  = $request->get_param( 'mode' );
			if ( 'analyze' === $mode ) {
				return $this->response(
					array(
						'analysis' => $proof,
						'report'   => $result['report'],
						'empty'    => $empty,
					)
				);
			}
			if ( 'apply' !== $mode || ! is_string( $request->get_param( 'analysis' ) ) || ! hash_equals( $proof, $request->get_param( 'analysis' ) ) || ( $empty && true !== $request->get_param( 'confirm_empty' ) ) ) {
				throw new \InvalidArgumentException( esc_html__( 'Review this file and confirm any reset before importing.', 'maestro-menu-editor' ) );
			}
			$saved = $this->config->save_import( $result['config'], $context['revision'] );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			delete_transient( $this->context_key() );
			return $this->response(
				array(
					'imported' => true,
					'report'   => $result['report'],
				)
			);
		} catch ( \InvalidArgumentException $e ) {
			return new \WP_Error( 'maestro_transfer_file', $e->getMessage(), array( 'status' => 400 ) );
		}
	}

	/**
	 * Response.
	 *
	 * @param array $data Data.
	 */
	private function response( array $data ) {
		$response = rest_ensure_response( $data );
		$response->header( 'Cache-Control', 'no-store, private' );
		return $response;
	}
}
