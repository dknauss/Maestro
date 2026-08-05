<?php
/**
 * Pure text-node label-replacement helper (WP-free).
 *
 * COMPAT-07: when Replay::replay() re-applies a stored plain-text label onto a
 * LIVE rendered title, third-party plugins often bake extra markup into that
 * title — trailing count bubbles (WooCommerce `Orders <span class="count-3">
 * <span>3</span></span>`) or a wrapping span around the label itself (WPForms
 * `<span style="color:#f18500">Addons</span>`). A wholesale overwrite of
 * `$menu[pos][0]` / `$submenu[parent][pos][0]` strips that markup. This class
 * instead walks the live title's DOM, finds the single human-readable text
 * node that carries the label, and swaps ONLY that node's content — leaving
 * every other node (badges, wrappers) exactly as rendered.
 *
 * Candidate rule: depth-first, document order; the first text node whose
 * trimmed value is non-empty AND not purely numeric (a bare digit run is a
 * count/badge, never the human-readable label) is the label node. Leading and
 * trailing whitespace on that node is preserved so a trailing badge keeps its
 * separating space. When no such node exists (title is entirely icon + badge
 * markup, e.g. digit-only counts), replace_label() returns null so the caller
 * falls back to a wholesale title set — today's behavior.
 *
 * Deliberately WP-free (uses only DOMDocument/libxml) so it stays in the fast
 * pure-unit suite.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Pure text-node label-replacement helper — no WordPress calls.
 *
 * @package Maestro
 */
class Title {

	/**
	 * Replace the human-readable label inside a live HTML title, preserving all
	 * surrounding markup (before AND after the label).
	 *
	 * Storage is untouched by this call — it operates only on the live title at
	 * apply time; the stored plain-text label passed in as $plain_label never
	 * changes shape here.
	 *
	 * @param mixed $live_html_title The current, fully-rendered title (may contain HTML).
	 * @param mixed $plain_label     The stored plain-text custom label to insert.
	 * @return string|null Retitled HTML, or null when no replaceable text node exists.
	 */
	public static function replace_label( $live_html_title, $plain_label ) {
		if ( ! is_string( $live_html_title ) || '' === trim( $live_html_title ) ) {
			return null;
		}
		$plain_label = is_string( $plain_label ) ? $plain_label : (string) $plain_label;

		/*
		 * Fast path: replay() runs on every admin load at PHP_INT_MAX and the
		 * common rename target is a plain-text core item with no markup to
		 * preserve, where a full DOMDocument parse + walk is pure overhead.
		 * When the live title contains no '<', short-circuit with byte-identical
		 * output to the DOM path:
		 *   - outer whitespace preserved (mirrors the label node's prefix/suffix);
		 *   - the label HTML-encoded exactly as DOMDocument::saveHTML() would
		 *     encode a text node under the UTF-8 declaration below
		 *     (htmlspecialchars ENT_NOQUOTES / UTF-8 == saveHTML: & < > encoded,
		 *     quotes and multibyte left literal). ENT_SUBSTITUTE is set so an
		 *     invalid UTF-8 label degrades to U+FFFD instead of htmlspecialchars
		 *     returning an EMPTY STRING — which would blank the menu label
		 *     outright. Config::sanitize() truncates on character boundaries so
		 *     a stored label should never be invalid; this is the second line of
		 *     defence, and it is strictly closer to the DOM path (which also
		 *     emits something visible) than the empty-string default;
		 *   - a purely numeric title (or whitespace-only) has no human-readable
		 *     label node — find_label_node() would return null — so we return
		 *     null too, letting the caller fall back to a wholesale set (N3).
		 */
		if ( false === strpos( $live_html_title, '<' ) ) {
			$trimmed = trim( $live_html_title );
			if ( '' === $trimmed || preg_match( '/^\d+$/', $trimmed ) ) {
				return null;
			}
			$encoded = htmlspecialchars( $plain_label, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8' );
			if ( preg_match( '/^(\s*).*?(\s*)$/s', $live_html_title, $m ) ) {
				return $m[1] . $encoded . $m[2];
			}
			return $encoded;
		}

		$dom             = new \DOMDocument();
		$internal_errors = libxml_use_internal_errors( true );
		$dom->loadHTML(
			'<?xml encoding="UTF-8"?><div>' . $live_html_title . '</div>',
			LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
		);
		libxml_clear_errors();
		libxml_use_internal_errors( $internal_errors );

		$wrapper = $dom->getElementsByTagName( 'div' )->item( 0 );
		if ( null === $wrapper ) {
			return null;
		}

		$label_node = self::find_label_node( $wrapper );
		if ( null === $label_node ) {
			return null;
		}

		// Preserve leading/trailing whitespace around the trimmed label run so
		// a trailing badge keeps the space that separates it from the label.
		$original = (string) $label_node->nodeValue; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- Native DOMText property, not a WP API.
		$prefix   = '';
		$suffix   = '';
		if ( preg_match( '/^(\s*).*?(\s*)$/s', $original, $m ) ) {
			$prefix = $m[1];
			$suffix = $m[2];
		}

		$label_node->nodeValue = $prefix . $plain_label . $suffix; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- Native DOMText property, not a WP API.

		$html = '';
		foreach ( $wrapper->childNodes as $child ) { // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- Native DOMNode property, not a WP API.
			$html .= $dom->saveHTML( $child );
		}

		return $html;
	}

	/**
	 * Depth-first, document-order search for the first text node whose trimmed
	 * value is non-empty and not purely numeric (a bare digit run is a
	 * count/badge, never the human-readable label). Multiple text nodes:
	 * the first one found by this rule is the primary label; every other
	 * sibling/descendant text node is left untouched by the caller.
	 *
	 * @param \DOMNode $node Node to search (element or text).
	 * @return \DOMText|null
	 */
	private static function find_label_node( \DOMNode $node ) {
		foreach ( $node->childNodes as $child ) { // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- Native DOMNode property, not a WP API.
			if ( $child instanceof \DOMText ) {
				$trimmed = trim( $child->nodeValue ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- Native DOMText property, not a WP API.
				if ( '' !== $trimmed && ! preg_match( '/^\d+$/', $trimmed ) ) {
					return $child;
				}
				continue;
			}
			if ( $child->hasChildNodes() ) {
				$found = self::find_label_node( $child );
				if ( null !== $found ) {
					return $found;
				}
			}
		}
		return null;
	}
}
