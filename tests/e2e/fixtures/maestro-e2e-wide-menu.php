<?php
/**
 * Gated e2e fixture (Phase 28-01): widens the admin menu the way Keel and PX do,
 * so menu-width-measured.spec.ts can assert that edit mode follows a width some
 * OTHER plugin set, rather than assuming core's 160px.
 *
 * The rule is Keel's `keel_defaults_admin_menu_width_css()` verbatim (PX emits the
 * same): `!important` widths from 961px up, only when the menu is not folded.
 * Copying it rather than approximating it is the point — a looser rule could pass
 * while the real one still breaks.
 *
 * Gated behind the `maestro_e2e_wide_menu` option (its value is the width in px)
 * so it never affects any other spec's layout; only menu-width-measured.spec.ts
 * sets it, and that spec deletes it again afterwards. Same gating pattern as
 * maestro-e2e-shared-slug.php and maestro-e2e-childless.php.
 */

add_action(
	'admin_head',
	function () {
		$w = (int) get_option( 'maestro_e2e_wide_menu' );
		if ( $w < 160 ) {
			return;
		}

		$b = 'body:not(.folded)';
		printf(
			'<style id="maestro-e2e-wide-menu">@media screen and (min-width: 961px) {
				%2$s #adminmenu,
				%2$s #adminmenuback,
				%2$s #adminmenuwrap,
				%2$s #adminmenu li.menu-top,
				%2$s #adminmenu .wp-submenu { width: %1$dpx !important; }
				%2$s #adminmenuback { position: fixed; top: 0; bottom: -120px; }
				%2$s #adminmenu li.menu-top > a.menu-top,
				%2$s #adminmenu .wp-has-current-submenu a.wp-has-current-submenu,
				%2$s #adminmenu li.current a.menu-top { width: auto !important; }
				%2$s #wpcontent,
				%2$s #wpfooter { margin-left: %1$dpx !important; }
				%2$s #adminmenu li.menu-top:not(.wp-has-current-submenu) .wp-submenu { left: %1$dpx; }
				%2$s #adminmenu .wp-has-current-submenu .wp-submenu.wp-submenu-wrap { left: auto; }
			}</style>',
			$w, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- cast to int above.
			$b  // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal selector.
		);
	}
);
