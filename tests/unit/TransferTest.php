<?php
namespace Maestro\Tests\Unit;

use Maestro\Transfer;
use PHPUnit\Framework\TestCase;

if ( file_exists( dirname( __DIR__, 2 ) . '/includes/class-transfer.php' ) ) { require_once dirname( __DIR__, 2 ) . '/includes/class-transfer.php'; }

class TransferTest extends TestCase {
	private function config() {
		return array( 'schema_version' => 2, 'items' => array(), 'top_order' => array(), 'sub_order' => array() );
	}
	private function file( $config ) {
		$config['items'] = (object) $config['items'];
		$config['sub_order'] = (object) $config['sub_order'];
		return json_encode( array( 'format' => 'maestro-menu-config', 'schema_version' => 1, 'config' => $config ) );
	}
	public function test_export_never_contains_people_or_groups() {
		$this->assertTrue( class_exists( Transfer::class ), 'Transfer service must exist.' );
		$c = $this->config();
		$c['items']['edit.php'] = array( 'title' => 'Articles', 'hidden_users' => array( 42 ), 'hidden_profiles' => array( 'p_1' ), 'future_private_field' => 'secret' );
		$c['profiles'] = array( 'p_1' => array( 'name' => 'Private client' ) );
		$f = Transfer::export( $c );
		$this->assertSame( array( 'title' => 'Articles' ), (array) $f['config']['items']->{'edit.php'} );
		$this->assertStringNotContainsString( 'Private client', json_encode( $f ) );
		$this->assertArrayNotHasKey( 'profiles', $f['config'] );
	}
	public function test_empty_maps_are_objects_and_round_trip() {
		$f = Transfer::export( array() );
		$this->assertInstanceOf( \stdClass::class, $f['config']['items'] );
		$this->assertSame( $this->config(), Transfer::parse( json_encode( $f ) ) );
	}
	public function test_rejects_legacy_export_instead_of_reinterpreting_shared_slugs() {
		$this->expectException( \InvalidArgumentException::class );
		Transfer::export( array( 'items' => array( 'edit.php' => array( 'title' => 'Both' ) ) ) );
	}
	/** @dataProvider invalid_files */
	public function test_invalid_files_are_refused( $json ) {
		$this->expectException( \InvalidArgumentException::class );
		Transfer::parse( $json );
	}
	public function invalid_files() {
		$base = '{"format":"maestro-menu-config","schema_version":1,"config":{"schema_version":2,"items":{},"top_order":[],"sub_order":{}}}';
		return array_map( function ( $s ) { return array( $s ); }, array(
			'null', '[]', '{bad', str_replace( '"sub_order":{}', '"sub_order":{},"menu_width":null', $base ), str_replace( '"schema_version":1', '"schema_version":99', $base ),
			str_replace( '"items":{}', '"items":[]', $base ),
			str_replace( '"items":{}', '"items":{"edit.php":{"hidden_users":[1]}}', $base ),
			str_replace( '"top_order":[]', '"top_order":[false]', $base ),
			str_replace( '"items":{}', '"items":{"a":{"title":[]}}', $base ),
		) );
	}
	public function test_reconcile_uses_target_keys_parent_identity_and_reports_missing() {
		$i = Transfer::inventory( array( array( '', '', 'edit.php' ), array( '', '', 'tools.php' ) ), array( 'edit.php' => array( array( '', '', 'shared' ) ), 'tools.php' => array( array( '', '', 'shared' ) ) ) );
		$c = $this->config();
		$c['items'] = array( 'https://source.test/wp-admin/edit.php?ver=2' => array( 'title' => 'Articles', 'hidden_roles' => array( 'editor', 'absent' ) ), 'tools.php>shared' => array( 'title' => 'Tools child' ), 'missing' => array( 'title' => 'Gone' ) );
		$r = Transfer::reconcile( $c, $i, array( 'editor' ) );
		$this->assertSame( 'Articles', $r['config']['items']['edit.php']['title'] );
		$this->assertSame( array( 'editor' ), $r['config']['items']['edit.php']['hidden_roles'] );
		$this->assertSame( 'Tools child', $r['config']['items']['tools.php>shared']['title'] );
		$this->assertArrayNotHasKey( 'edit.php>shared', $r['config']['items'] );
		$this->assertCount( 2, $r['report'] );
	}
	public function test_new_separators_survive_but_removing_real_items_is_reported() {
		$i = Transfer::inventory( array( array( '', '', 'edit.php' ), array( '', '', 'separator1', '', 'wp-menu-separator' ) ), array() );
		$c = $this->config();
		$c['separators'] = array( 'separator-maestro-ab' );
		$c['top_order'] = array( 'separator-maestro-ab', 'missing', 'edit.php' );
		$c['removed_separators'] = array( 'edit.php', 'separator1' );
		$r = Transfer::reconcile( $c, $i, array() );
		$this->assertSame( array( 'separator-maestro-ab', 'edit.php' ), $r['config']['top_order'] );
		$this->assertSame( array( 'separator1' ), $r['config']['removed_separators'] );
		$this->assertCount( 2, $r['report'] );
	}
	public function test_duplicate_normalized_source_identity_is_refused() {
		$i = Transfer::inventory( array( array( '', '', 'edit.php' ) ), array() );
		$c = $this->config();
		$c['items'] = array( 'edit.php' => array( 'title' => 'A' ), 'edit.php?ver=2' => array( 'title' => 'B' ) );
		$this->expectException( \InvalidArgumentException::class );
		Transfer::reconcile( $c, $i, array() );
	}
	public function test_literal_and_escaped_duplicate_json_members_are_refused() {
		$file = $this->file( $this->config() );
		foreach ( array( 'edit.php', 'edit\u002ephp' ) as $second ) {
			$duplicate = str_replace( '"items":{}', '"items":{"edit.php":{"title":"First"},"' . $second . '":{"title":"Second"}}', $file );
			try {
				Transfer::parse( $duplicate );
				$this->fail( 'Duplicate JSON members must not be overwritten silently.' );
			} catch ( \InvalidArgumentException $e ) {
				$this->assertNotEmpty( $e->getMessage() );
			}
		}
	}
	public function test_normalized_submenu_order_parent_aliases_are_refused() {
		$i = Transfer::inventory( array( array( '', '', 'tools.php' ) ), array( 'tools.php' => array( array( '', '', 'a' ), array( '', '', 'b' ) ) ) );
		$c = $this->config();
		$c['sub_order'] = array( 'tools.php' => array( 'a' ), 'tools.php?ver=1' => array( 'b' ) );
		$this->expectException( \InvalidArgumentException::class );
		Transfer::reconcile( $c, $i, array() );
	}

	public function test_entities_are_decoded_once_like_replay() {
		$raw = 'tools.php?label=&amp;copy;';
		$other = 'tools.php?label=©';
		$i = Transfer::inventory( array( array( '', '', $raw ), array( '', '', $other ) ), array() );
		$key = \Maestro\Slug::normalize_qualified( $raw );
		$this->assertSame( $raw, $i['top'][ $key ] ?? null );
	}

	public function test_parent_query_normalizes_independently_from_child() {
		$i = Transfer::inventory( array( array( '', '', 'admin.php?page=parent&ver=7' ) ), array( 'admin.php?page=parent&ver=7' => array( array( '', '', 'admin.php?page=child&ver=3' ) ) ) );
		$c = $this->config();
		$c['items']['admin.php?ver=1&page=parent>admin.php?ver=2&page=child'] = array( 'title' => 'Child' );
		$r = Transfer::reconcile( $c, $i, array() );
		$this->assertCount( 0, $r['report'] );
		$this->assertArrayHasKey( 'admin.php?page=parent&ver=7>admin.php?page=child&ver=3', $r['config']['items'] );
	}

	public function test_inventory_retains_both_shared_children_and_marks_collisions() {
		$i = Transfer::inventory( array( array( '', '', 'a?ver=1' ), array( '', '', 'a?ver=2' ) ), array( 'p' => array( array( '', '', 'shared' ) ), 'q' => array( array( '', '', 'shared' ) ) ) );
		$this->assertNull( $i['top']['a'] );
		$this->assertSame( 'p>shared', $i['sub']['p>shared'] );
		$this->assertSame( 'q>shared', $i['sub']['q>shared'] );
	}
}
