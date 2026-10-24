<?php
/** Disposable source-site setup for the two-site export/import lab. */
$fixture = WPMU_PLUGIN_DIR . '/maestro-transfer-source-lab.php';
if ( getenv( 'MAESTRO_TRANSFER_CLEANUP' ) ) {
	if ( file_exists( $fixture ) ) {
		unlink( $fixture );
	}
	remove_role( 'source_client' );
	delete_option( 'maestro_config' );
	return;
}
file_put_contents( $fixture, '<?php add_action( "admin_menu", static function () { add_menu_page( "Source tools", "Source tools", "read", "source-only-tools", "__return_null" ); } );' );
add_role( 'source_client', 'Source client', array( 'read' => true ) );
update_option( 'maestro_config', array(
	'schema_version' => 2,
	'items' => array(
		'edit.php' => array( 'title' => 'Client articles', 'hidden_roles' => array( 'source_client', 'editor' ) ),
		'source-only-tools' => array( 'title' => 'Source settings' ),
	),
	'top_order' => array( 'edit.php', 'index.php', 'source-only-tools' ),
	'sub_order' => array(),
	'menu_width' => 256,
), false );
