<?php
/** Source-only menu for the disposable two-site transfer lab. */
add_action( 'admin_menu', static function () {
	if ( get_option( 'maestro_e2e_transfer_source' ) ) {
		add_menu_page( 'Source tools', 'Source tools', 'read', 'source-only-tools', '__return_null' );
	}
} );
