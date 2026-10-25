<?php
/** Disposable source-site setup for the two-site export/import lab. */
if ( getenv( 'MAESTRO_TRANSFER_CLEANUP' ) ) {
	delete_option( 'maestro_e2e_transfer_source' );
	remove_role( 'source_client' );
	delete_option( 'maestro_config' );
	return;
}
update_option( 'maestro_e2e_transfer_source', true, false );
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
