<?php
/**
 * Plugin Name: Maestro UX lab menus
 * Description: Playground UX lab only. Adds the menu shapes real sites have and core does not: a long list of plugin menus, long names, image icons, a deep submenu, and a custom role.
 *
 * Loaded as a must-use plugin by playground/blueprint-ux-lab.json (hosted) and by
 * bin/ux-gallery.sh (the gallery capture). playground/ux-lab/seed.php adds the users
 * and the saved Maestro settings. Never part of the plugin package.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function () {
		if ( ! get_role( 'shop_manager' ) ) {
			add_role(
				'shop_manager',
				'Shop Manager',
				array(
					'read'         => true,
					'edit_posts'   => true,
					'upload_files' => true,
				)
			);
		}
	}
);

add_action(
	'admin_menu',
	static function () {
		$page = static function () {
			echo '<div class="wrap"><h1>' . esc_html( get_admin_page_title() ) . '</h1><p>A stand-in page from the Maestro UX lab.</p></div>';
		};

		// Top-level items a busy site collects from plugins. Positions put them
		// where plugins usually land: after Settings, with a few squeezed higher.
		$items = array(
			array( 'Forms', 'ux-forms', 'dashicons-feedback', 'edit_posts', 26 ),
			array( 'SEO', 'ux-seo', 'dashicons-search', 'manage_options', 80.1 ),
			array( 'Analytics', 'ux-analytics', 'dashicons-chart-bar', 'manage_options', 80.2 ),
			array( 'Memberships and Subscriptions', 'ux-memberships', 'dashicons-groups', 'manage_options', 80.3 ),
			array( 'Newsletter', 'ux-newsletter', 'dashicons-email-alt', 'edit_posts', 80.4 ),
			array( 'Events', 'ux-events', 'dashicons-calendar-alt', 'edit_posts', 80.5 ),
			array( 'Redirects', 'ux-redirects', 'dashicons-randomize', 'manage_options', 80.6 ),
			array( 'Security', 'ux-security', 'dashicons-shield', 'manage_options', 80.7 ),
			array( 'Translations', 'ux-translations', 'dashicons-translation', 'manage_options', 80.8 ),
		);
		foreach ( $items as $item ) {
			list( $title, $slug, $icon, $cap, $position ) = $item;
			add_menu_page( $title, $title, $cap, $slug, $page, $icon, $position );
		}

		// A shop with a deep submenu, the case that stretches the editor most.
		add_menu_page( 'Shop', 'Shop', 'edit_posts', 'ux-shop', $page, 'dashicons-cart', 55.5 );
		$shop = array( 'Orders', 'Customers', 'Products', 'Categories', 'Coupons', 'Reports', 'Shipping zones', 'Tax rates', 'Payment methods', 'Status' );
		foreach ( $shop as $title ) {
			add_submenu_page( 'ux-shop', $title, $title, 'edit_posts', 'ux-shop-' . sanitize_title( $title ), $page );
		}

		// The two image-icon forms third-party plugins ship: a URL and a base64 SVG.
		add_menu_page( 'Backups', 'Backups', 'manage_options', 'ux-backups', $page, admin_url( 'images/yes.png' ), 80.9 );
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#a7aaad" d="M10 2 3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5z"/></svg>';
		add_menu_page(
			'Site Health Monitor',
			'Site Health Monitor',
			'manage_options',
			'ux-monitor',
			$page,
			'data:image/svg+xml;base64,' . base64_encode( $svg ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Core's own data-URI menu-icon form.
			81
		);
	}
);
