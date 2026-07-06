import { test as base, expect } from '@playwright/test';
import { execFileSync } from 'child_process';

/**
 * Shared test fixtures for the in-place editor E2E suite.
 *
 * Test isolation: the plugin stores every menu override in ONE WordPress option
 * (MAESTRO_OPTION = 'maestro_config'), shared across the whole wp-env tests
 * instance. There is no per-test database. Without an explicit reset, state
 * mutated by one spec leaks into the next — e.g. the HARD-03 save-race specs
 * rename Posts to "ArticlesRaceC" and, when their cleanup DELETE loses the race,
 * leave Posts modified, which then fails unrelated specs that assert the natural
 * "Posts" label.
 *
 * The `maestroCleanConfig` auto-fixture deletes that option before every test so
 * each one starts from the natural WordPress menu, independent of prior leakage.
 * This is true isolation at the data layer — stronger than relying on each spec's
 * own end-of-test cleanup, which by definition cannot run when a race or crash
 * leaves state behind.
 */

/**
 * Delete the single shared plugin option on the wp-env *tests* instance via
 * wp-cli — the same harness/auth path auth.setup.ts uses.
 *
 * `wp option delete` is idempotent for our purposes: when the option is already
 * absent (the clean baseline) wp-cli exits non-zero, which we deliberately
 * swallow. Any real failure (Docker down, env not started) still surfaces as a
 * test failure downstream when the page can't reach a clean menu.
 */
function resetMaestroConfig(): void {
	try {
		execFileSync(
			'npx',
			[ 'wp-env', 'run', 'tests-cli', 'wp', 'option', 'delete', 'maestro_config' ],
			{ stdio: 'ignore' }
		);
	} catch ( e ) {
		// Non-zero exit means the option was already absent — that IS the desired
		// clean state, so ignore it. (wp-cli: "Could not delete 'maestro_config'
		// option. Does it exist?")
	}
}

/**
 * Extended `test` that wipes shared plugin state before every test.
 *
 * Specs must import { test, expect } from './fixtures' (not '@playwright/test')
 * to get this isolation.
 */
export const test = base.extend< {
	maestroCleanConfig: void;
	suppressFirstRunTour: boolean;
	maestroSuppressTour: void;
} >( {
	maestroCleanConfig: [
		async ( {}, use ) => {
			resetMaestroConfig();
			await use();
		},
		{ auto: true },
	],

	// Opt-out knob: a spec that exercises the first-run tour sets this false via
	// test.use({ suppressFirstRunTour: false }).
	suppressFirstRunTour: [ true, { option: true } ],

	// Suppress the auto-launching first-run guided tour so its (focus-trapping,
	// aria-modal) tooltip doesn't intercept clicks/focus in editor specs. The
	// seen-flag must be set BEFORE the editor script runs, so use addInitScript
	// (runs on every navigation), not a post-load evaluate.
	maestroSuppressTour: [
		async ( { page, suppressFirstRunTour }, use ) => {
			if ( suppressFirstRunTour ) {
				await page.addInitScript( () => {
					try {
						window.localStorage.setItem( 'maestroFirstRunDone', '1' );
					} catch ( e ) {
						// Private browsing / blocked storage — the tour simply may show.
					}
				} );
			}
			await use();
		},
		{ auto: true },
	],
} );

export { expect };
