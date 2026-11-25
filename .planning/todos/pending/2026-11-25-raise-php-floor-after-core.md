---
created: 2026-11-25T00:00:00.000Z
title: Raise the PHP floor after WordPress core drops PHP 7.4
area: compatibility
trigger: WordPress core announces a minimum PHP above 7.4
files:
  - maestro-menu-editor.php (Requires PHP header)
  - readme.txt (Requires PHP, upgrade notice)
  - composer.json (require.php)
  - phpcs.xml.dist (PHPCompatibility testVersion)
  - .github/workflows/ci.yml (php-lint and unit matrices)
---

## Decision (Dan, 2026-11-25)

Keep `Requires PHP: 7.4` for now. Follow WordPress core's minimum rather than
lead it: when core drops 7.4, raise Maestro's floor in the **next minor
release**, never in a patch release.

## Why not now

- Core's minimum has been 7.4 since WordPress 7.0, and 7.1 kept it
  ([make/core, 2026-01-09](https://make.wordpress.org/core/2026/01/09/dropping-support-for-php-7-2-and-7-3/),
  [7.1 hosting page](https://make.wordpress.org/hosting/handbook/compatibility/version/7-1/)).
- Core retires a PHP version once it falls below about 5% of sites. In January
  2026, 7.4 was about 22% of WordPress sites, so a higher floor now would lock
  out roughly one site in five.
- The code gains little. 8.0 brings `match`, nullsafe `?->`, named arguments,
  constructor promotion and union types; 8.1 adds enums and readonly
  properties. WordPress already polyfills `str_contains`, `str_starts_with` and
  `str_ends_with`, so those are usable today.

## When the trigger fires

1. Match core's new minimum (likely 8.0 or 8.1) in the plugin header,
   readme.txt, composer.json `require.php` and phpcs `testVersion`.
2. Drop the retired versions from the CI matrices. "Unit tests (PHP 7.4)" is a
   required check on main, so update branch protection in the same change.
3. Add a readme.txt upgrade notice naming the new minimum.
4. Check dev tooling still resolves on the new floor (PHPUnit 9.6,
   yoast/phpunit-polyfills, PHPStan).

CI already covers PHP 7.4 through 8.5 (#295), so the top of the range is tested
in the meantime.
