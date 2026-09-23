<?php
/**
 * Gated e2e fixture: registers two top-level items whose NATURAL icon is an
 * image rather than a dashicon — the two shapes third-party plugins ship:
 *
 *   - a URL icon (UpdraftPlus, miniOrange SAML). Core prints an <img> inside
 *     div.wp-menu-image for these.
 *   - a base64 SVG data-URI (Yoast SEO, Smush). Core paints it as an inline
 *     background-image, and wp-admin/js/svg-painter.js caches it and repaints
 *     it on every hover.
 *
 * Both used to resist a re-icon in the live preview. Gated behind the
 * `maestro_e2e_image_icons` option so it never affects any other spec's menu
 * shape; only image-icons.spec.ts turns the option on. Mirrors
 * tests/e2e/fixtures/maestro-e2e-childless.php.
 */

add_action(
	'admin_menu',
	function () {
		if ( ! get_option( 'maestro_e2e_image_icons' ) ) {
			return;
		}

		$render = function () {
			echo '<div class="wrap"><h1>E2E Image Icon</h1></div>';
		};

		add_menu_page(
			'E2E URL Icon',
			'E2E URL Icon',
			'read',
			'maestro-e2e-url-icon',
			$render,
			includes_url( 'images/w-logo-blue.png' ),
			98
		);

		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#a7aaad"/></svg>';
		add_menu_page(
			'E2E SVG Icon',
			'E2E SVG Icon',
			'read',
			'maestro-e2e-svg-icon',
			$render,
			'data:image/svg+xml;base64,' . base64_encode( $svg ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Core's own data-URI menu-icon form.
			99
		);
	}
);
