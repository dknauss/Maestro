<?php
/**
 * Seeds the Maestro UX lab: named users in every role, and saved Maestro settings
 * that exercise renames, a changed icon, a custom order with an added separator,
 * per-role, per-person, and profile visibility rules.
 *
 * Run with `wp eval-file` after Maestro is active (playground/blueprint-ux-lab.json,
 * bin/ux-gallery.sh). Safe to run twice: users are created only when missing, and
 * the settings are replaced, not merged.
 *
 * Playground UX lab only. Never part of the plugin package.
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( '\Maestro\Config' ) ) {
	WP_CLI::error( 'Maestro is not active.' );
}

$people = array(
	'editor'      => array( 'Emma', 'Editor', 'editor' ),
	'author'      => array( 'Andy', 'Author', 'author' ),
	'contributor' => array( 'Carrie', 'Contributor', 'contributor' ),
	'subscriber'  => array( 'Steven', 'Subscriber', 'subscriber' ),
	'shop'        => array( 'Sam', 'Shopkeeper', 'shop_manager' ),
);

wp_update_user(
	array(
		'ID'           => 1,
		'first_name'   => 'Adam',
		'last_name'    => 'Admin',
		'display_name' => 'Adam Admin',
	)
);

// Act as the admin: Maestro keeps rules that name people (per-person hides and
// profiles) only when the saver can list users.
wp_set_current_user( 1 );

// Keep the welcome panel out of every screenshot.
update_user_meta( 1, 'show_welcome_panel', 0 );

$ids = array();
foreach ( $people as $login => $person ) {
	list( $first, $last, $role ) = $person;
	$user = get_user_by( 'login', $login );
	if ( $user ) {
		$ids[ $login ] = $user->ID;
		continue;
	}
	$id = wp_insert_user(
		array(
			'user_login'   => $login,
			'user_email'   => $login . '@example.com',
			'user_pass'    => 'password',
			'first_name'   => $first,
			'last_name'    => $last,
			'display_name' => $first . ' ' . $last,
			'role'         => $role,
		)
	);
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id->get_error_message() );
	}
	$ids[ $login ] = $id;
}

$saved = ( new \Maestro\Config() )->save(
	array(
		'items'      => array(
			'edit.php'          => array(
				'title' => 'Articles',
			),
			'ux-shop'           => array(
				'icon'                => 'dashicons-store',
				'child_hidden_roles'  => array( 'contributor' ),
			),
			'edit-comments.php' => array(
				'hidden_roles' => array( 'author', 'contributor' ),
			),
			'tools.php'         => array(
				'hidden_roles' => array( 'editor', 'shop_manager' ),
			),
			'ux-newsletter'     => array(
				'hidden_users' => array( $ids['author'] ),
			),
		),
		'top_order'  => array(
			'index.php',
			'ux-shop',
			'separator-maestro-lab1',
			'edit.php',
			'upload.php',
			'edit.php?post_type=page',
			'edit-comments.php',
		),
		'separators' => array( 'separator-maestro-lab1' ),
		'profiles'   => array(
			'p_1' => array(
				'name'  => 'Writers',
				'users' => array( $ids['author'], $ids['contributor'] ),
				// Profile hides are stored here; Maestro compiles them onto the items.
				'hides' => array( 'tools.php', 'ux-forms', 'ux-events' ),
			),
			'p_2' => array(
				'name'  => 'Shop staff',
				'users' => array( $ids['shop'] ),
			),
		),
	)
);

WP_CLI::success( sprintf( 'Seeded %d users and %d Maestro item rules.', count( $ids ), count( $saved['items'] ) ) );
