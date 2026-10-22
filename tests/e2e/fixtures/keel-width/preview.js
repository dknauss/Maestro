/* Keel Defaults, GPL-2.0-or-later.
 * Menu-width slider implementation copied from assets/js/settings.js at
 * 3a19720. The unrelated dependent-row controls are omitted.
 */
(function () {
	'use strict';
	function parseJSONAttribute( element, name ) {
		try {
			return JSON.parse( element.getAttribute( name ) || '[]' );
		} catch ( e ) {
			return [];
		}
	}

	document.querySelectorAll( 'input[type="range"][data-keel-range]' ).forEach( function ( input ) {
		var output = document.getElementById( input.getAttribute( 'data-keel-range' ) );
		var labels = parseJSONAttribute( input, 'data-keel-range-labels' );
		var widths = parseJSONAttribute( input, 'data-keel-range-widths' );

		if ( ! output || ! document.body || ! labels.length ) {
			return;
		}

		function pos() {
			return parseInt( input.value, 10 ) || 0;
		}

		// Cheap: runs live while dragging — only the readout text changes.
		function updateLabel() {
			var text = labels[ pos() ] || labels[0];
			output.textContent = text;
			// The value a screen reader announces has to move with the word, or
			// the slider goes on saying whatever it was rendered at.
			input.setAttribute( 'aria-valuetext', text );
		}

		// Expensive: reflows the whole admin layout and reads a computed style,
		// so it runs only when the drag settles (release/keyboard), not on every
		// 'input' tick — otherwise the slider is janky.
		function applyPreview() {
			document.body.style.setProperty( '--keel-menu-preview-width', ( widths[ pos() ] || widths[0] ) + 'px' );

			var adminMenu = document.getElementById( 'adminmenu' );
			if ( adminMenu ) {
				document.body.style.setProperty( '--keel-menu-preview-bg', window.getComputedStyle( adminMenu ).backgroundColor );
			}

			document.body.classList.add( 'keel-menu-width-preview' );
		}

		input.addEventListener( 'input', updateLabel );
		input.addEventListener( 'change', applyPreview );
		input.addEventListener( 'pointerup', applyPreview );
		input.addEventListener( 'keyup', function ( event ) {
			if ( [ 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown' ].indexOf( event.key ) !== -1 ) {
				applyPreview();
			}
		} );
	} );

})();
