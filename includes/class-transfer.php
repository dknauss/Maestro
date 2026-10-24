<?php
/**
 * Portable configuration file contract and target-menu reconciliation.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/** Pure transfer operations; no configuration writes or user lookups. */
class Transfer {
	const MAX_FILE_BYTES = 2097152;
	const FIELDS         = array( 'title', 'icon', 'hidden_roles', 'child_hidden_roles' );
	const KEYS           = array( 'schema_version', 'items', 'top_order', 'sub_order', 'separators', 'removed_separators', 'menu_width' );

	/**
	 * Export only explicitly portable fields, regardless of viewer authority.
	 *
	 * @param array $stored Stored.
	 * @throws \InvalidArgumentException Invalid transfer data.
	 */
	public static function export( array $stored ) {
		if ( $stored && ( $stored['schema_version'] ?? null ) !== Config::SCHEMA_VERSION ) {
			throw new \InvalidArgumentException( esc_html__( 'Save the menu in the current editor before exporting this older configuration.', 'maestro-menu-editor' ) );
		}
		$config = array(
			'schema_version' => Config::SCHEMA_VERSION,
			'items'          => new \stdClass(),
			'top_order'      => $stored['top_order'] ?? array(),
			'sub_order'      => (object) ( $stored['sub_order'] ?? array() ),
		);
		foreach ( $stored['items'] ?? array() as $key => $item ) {
			$portable = array_intersect_key( $item, array_flip( self::FIELDS ) );
			if ( $portable ) {
				$config['items']->{$key} = $portable;
			}
		}
		foreach ( array( 'separators', 'removed_separators', 'menu_width' ) as $key ) {
			if ( isset( $stored[ $key ] ) ) {
				$config[ $key ] = $stored[ $key ];
			}
		}
		return array(
			'format'         => 'maestro-menu-config',
			'schema_version' => 1,
			'config'         => $config,
		);
	}

	/**
	 * Parse a bounded versioned file. Structural errors never become resets.
	 *
	 * @param mixed $json Json.
	 * @throws \InvalidArgumentException Invalid transfer data.
	 */
	public static function parse( $json ) {
		if ( ! is_string( $json ) || strlen( $json ) > self::MAX_FILE_BYTES ) {
			throw new \InvalidArgumentException( esc_html__( 'The configuration file is too large (maximum 2 MB).', 'maestro-menu-editor' ) );
		}
		$file = json_decode( $json, false, 16 );
		if ( JSON_ERROR_NONE !== json_last_error() || ! $file instanceof \stdClass || ( $file->format ?? null ) !== 'maestro-menu-config' || ( $file->schema_version ?? null ) !== 1 || ! isset( $file->config ) || ! $file->config instanceof \stdClass || ( $file->config->schema_version ?? null ) !== Config::SCHEMA_VERSION ) {
			throw new \InvalidArgumentException( esc_html__( 'Invalid configuration file or unsupported schema version.', 'maestro-menu-editor' ) );
		}
		self::unique_members( $json );
		$c = $file->config;
		if ( array_diff( array_keys( (array) $file ), array( 'format', 'schema_version', 'config' ) ) || array_diff( array_keys( (array) $c ), self::KEYS ) || ! isset( $c->items, $c->sub_order, $c->top_order ) || ! $c->items instanceof \stdClass || ! $c->sub_order instanceof \stdClass ) {
			self::bad_shape();
		}
		if ( count( (array) $c->items ) > Config::MAX_ITEMS || count( (array) $c->sub_order ) > Config::MAX_SUB_ORDER_PARENTS ) {
			self::bad_shape();
		}
		self::slugs( $c->top_order, Config::MAX_ORDER_ENTRIES );
		foreach ( $c->sub_order as $parent => $children ) {
			self::slug( $parent );
			self::slugs( $children, Config::MAX_SUB_ORDER_CHILDREN );
		}
		foreach ( $c->items as $key => $item ) {
			self::slug( $key );
			if ( ! $item instanceof \stdClass || array_diff( array_keys( (array) $item ), self::FIELDS ) ) {
				self::bad_shape();
			}
			foreach ( (array) $item as $field => $value ) {
				if ( in_array( $field, array( 'hidden_roles', 'child_hidden_roles' ), true ) ) {
					self::slugs( $value, Config::MAX_HIDDEN_ROLES );
				} elseif ( ! is_string( $value ) || strlen( $value ) > ( 'title' === $field ? Config::MAX_TITLE_BYTES : Config::MAX_DATA_URI_BYTES ) ) {
					self::bad_shape();
				}
			}
		}
		foreach ( array( 'separators', 'removed_separators' ) as $key ) {
			if ( property_exists( $c, $key ) ) {
				self::slugs( $c->{$key}, Config::MAX_SEPARATORS );
			}
		}
		if ( property_exists( $c, 'menu_width' ) && ( ! is_int( $c->menu_width ) || $c->menu_width < Config::MIN_MENU_WIDTH || $c->menu_width > Config::MAX_MENU_WIDTH ) ) {
			self::bad_shape();
		}
		return json_decode( $json, true, 16 )['config'];
	}

	/**
	 * Build typed, parent-qualified indexes before replay can hide rows.
	 *
	 * @param array $menu Menu.
	 * @param array $submenu Submenu.
	 */
	public static function inventory( array $menu, array $submenu ) {
		$out = array(
			'top'        => array(),
			'sub'        => array(),
			'separators' => array(),
		);
		foreach ( $menu as $row ) {
			if ( empty( $row[2] ) ) {
				continue;
			}
			$key = (string) $row[2];
			self::index( $out['top'], $key );
			if ( false !== strpos( $row[4] ?? '', 'wp-menu-separator' ) ) {
				self::index( $out['separators'], $key );
			}
		}
		foreach ( $submenu as $parent => $children ) {
			foreach ( $children as $row ) {
				if ( ! empty( $row[2] ) ) {
					self::index( $out['sub'], $parent . '>' . $row[2] );
				}
			}
		}
		return $out;
	}

	/**
	 * Resolve a file against server-owned menu identities and current roles.
	 *
	 * @param array $config Config.
	 * @param array $inventory Inventory.
	 * @param array $roles Roles.
	 * @throws \InvalidArgumentException Invalid transfer data.
	 */
	public static function reconcile( array $config, array $inventory, array $roles ) {
		$report = array();
		$top    = $inventory['top'];
		$sub    = $inventory['sub'];
		$out    = array(
			'schema_version' => Config::SCHEMA_VERSION,
			'items'          => array(),
			'top_order'      => array(),
			'sub_order'      => array(),
		);
		foreach ( $config['separators'] ?? array() as $id ) {
			if ( ! Config::is_separator_id( $id ) || array_key_exists( self::normalize( $id ), $top ) ) {
				$report[] = array(
					'code'      => 'separator_collision',
					'reference' => $id,
				);
				continue;
			}
			$out['separators'][] = $id;
			$top[ $id ]          = $id;
		}
		$seen = array();
		foreach ( $config['items'] as $key => $item ) {
			$norm = self::normalize( (string) $key );
			if ( isset( $seen[ $norm ] ) ) {
				throw new \InvalidArgumentException( esc_html__( 'The file contains ambiguous duplicate menu rules.', 'maestro-menu-editor' ) );
			}
			$seen[ $norm ] = true;
			$qualified     = Slug::is_qualified( $norm );
			$target        = self::match_key( (string) $key, $qualified ? $sub : $top, $report );
			if ( null === $target ) {
				continue;
			}
			foreach ( array( 'hidden_roles', 'child_hidden_roles' ) as $axis ) {
				if ( isset( $item[ $axis ] ) ) {
					foreach ( array_diff( $item[ $axis ], $roles ) as $missing ) {
						$report[] = array(
							'code'      => 'missing_role',
							'reference' => $missing,
						);
					}
					$item[ $axis ] = array_values( array_intersect( $item[ $axis ], $roles ) );
				}
			}
			if ( isset( $item['icon'] ) && ! Config::is_valid_icon( $item['icon'] ) ) {
				unset( $item['icon'] );
				$report[] = array(
					'code'      => 'invalid_icon',
					'reference' => (string) $key,
				);
			}
			if ( $item ) {
				$out['items'][ $target ] = $item;
			}
		}
		foreach ( $config['top_order'] as $key ) {
			$target = self::match_key( $key, $top, $report );
			if ( null !== $target ) {
				$out['top_order'][] = $target;
			}
		}
		$seen_parents = array();
		foreach ( $config['sub_order'] as $parent => $children ) {
			$identity = self::normalize( (string) $parent );
			if ( isset( $seen_parents[ $identity ] ) ) {
				throw new \InvalidArgumentException( esc_html__( 'The file contains ambiguous submenu ordering.', 'maestro-menu-editor' ) );
			}
			$seen_parents[ $identity ] = true;
			$p                         = self::match_key( (string) $parent, $inventory['top'], $report );
			if ( null === $p ) {
				continue;
			}
			foreach ( $children as $child ) {
				$target = self::match_key( $parent . '>' . $child, $sub, $report );
				if ( null !== $target ) {
					$out['sub_order'][ $p ][] = substr( $target, strpos( $target, '>' ) + 1 );
				}
			}
		}
		foreach ( $config['removed_separators'] ?? array() as $key ) {
			$target = self::match_key( $key, $inventory['separators'], $report );
			if ( null !== $target ) {
				$out['removed_separators'][] = $target;
			}
		}
		if ( isset( $config['menu_width'] ) ) {
			$out['menu_width'] = $config['menu_width'];
		}
		return array(
			'config' => $out,
			'report' => $report,
		);
	}


	/**
	 * Reject duplicate decoded object members; json_decode otherwise overwrites.
	 * Input is already valid, depth-bounded JSON. String tokens include escapes,
	 * so punctuation inside values cannot affect the container stack.
	 *
	 * @param string $json Valid JSON text.
	 * @throws \InvalidArgumentException Duplicate object member.
	 */
	private static function unique_members( $json ) {
		preg_match_all( '/"(?:[^"\\\\]|\\\\.)*"|[{}\[\],:]/s', $json, $matches );
		$stack = array();
		foreach ( $matches[0] as $token ) {
			if ( '{' === $token || '[' === $token ) {
				$stack[] = array(
					'object' => '{' === $token,
					'key'    => true,
					'keys'   => array(),
				);
				continue;
			}
			if ( '}' === $token || ']' === $token ) {
				array_pop( $stack );
				continue;
			}
			$last = count( $stack ) - 1;
			if ( $last < 0 || ! $stack[ $last ]['object'] ) {
				continue;
			}
			if ( ',' === $token ) {
				$stack[ $last ]['key'] = true;
			} elseif ( ':' === $token ) {
				$stack[ $last ]['key'] = false;
			} elseif ( $stack[ $last ]['key'] && '"' === $token[0] ) {
				$key = json_decode( $token );
				if ( array_key_exists( $key, $stack[ $last ]['keys'] ) ) {
					throw new \InvalidArgumentException( esc_html__( 'The file contains duplicate JSON fields.', 'maestro-menu-editor' ) );
				}
				$stack[ $last ]['keys'][ $key ] = true;
			}
		}
	}

	/**
	 * Normalize each qualified half using the same identity contract as Replay.
	 *
	 * @param mixed $key Key.
	 */
	private static function normalize( $key ) {
		return Slug::normalize_qualified( $key );
	}

	/**
	 * Index collisions fail closed, mirroring Replay's identity guards.
	 *
	 * @param array $index Index.
	 * @param mixed $key Key.
	 */
	private static function index( array &$index, $key ) {
		$norm           = self::normalize( $key );
		$index[ $norm ] = array_key_exists( $norm, $index ) ? null : $key;
	}

	/**
	 * Match only unambiguous identities.
	 *
	 * @param mixed $key Key.
	 * @param array $index Index.
	 * @param array $report Report.
	 */
	private static function match_key( $key, array $index, array &$report ) {
		$norm = self::normalize( $key );
		if ( ! isset( $index[ $norm ] ) ) {
			$report[] = array(
				'code'      => 'missing_or_ambiguous_item',
				'reference' => $key,
			);
			return null;
		}
		return $index[ $norm ];
	}

	/**
	 * Validate a bounded string list without coercion.
	 *
	 * @param mixed $values List.
	 * @param mixed $max Max.
	 */
	private static function slugs( $values, $max ) {
		if ( ! is_array( $values ) || array_values( $values ) !== $values || count( $values ) > $max ) {
			self::bad_shape();
		}
		foreach ( $values as $slug ) {
			self::slug( $slug );
		}
	}

	/**
	 * Validate one identity before normalization.
	 *
	 * @param mixed $value Value.
	 */
	private static function slug( $value ) {
		if ( ! is_string( $value ) || '' === $value || strlen( $value ) > Config::MAX_SLUG_BYTES ) {
			self::bad_shape();
		}
	}

	/**
	 * A malformed file must never turn into an empty successful import.
	 *
	 * @throws \InvalidArgumentException Invalid transfer data.
	 */
	private static function bad_shape() {
		throw new \InvalidArgumentException( esc_html__( 'Invalid configuration structure, private fields, or collection limits.', 'maestro-menu-editor' ) );
	}
}
