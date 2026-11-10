import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the UX state gallery (tests/ux-gallery/), kept apart from
 * the E2E suite so `npm run test:e2e` never runs it.
 *
 * bin/ux-gallery.sh starts the UX lab in WordPress Playground and sets
 * MAESTRO_LAB_URL. Playground logs the admin in on the first request, so there is
 * no login step.
 */
export default defineConfig( {
	testDir: './tests/ux-gallery',
	timeout: 60_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: 'list',
	use: {
		baseURL: process.env.MAESTRO_LAB_URL || 'http://127.0.0.1:9411',
		browserName: 'chromium',
		navigationTimeout: 60_000,
		// A control missing at some size should be recorded quickly, not wait out the test.
		actionTimeout: 15_000,
		...( process.env.PLAYWRIGHT_CHROMIUM_PATH
			? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
			: {} ),
	},
} );
