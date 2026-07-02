#!/usr/bin/env bash
#
# Release-prep helper — bumps version strings across the plugin.
#
# Usage: bin/prep-release.sh <VERSION>
#   VERSION  Semantic version without leading v, e.g. 1.1.1
#
# What it updates:
#   - maestro-menu-editor.php   * Version: header + MAESTRO_VERSION constant
#   - readme.txt                Stable tag:
#
# The stable Playground demo (playground/blueprint-stable.json) installs the
# plugin from the WordPress.org directory, which always serves the current
# Stable tag — so there is no per-release blueprint ref to bump here.
#
# Run this in the version-bump PR before the release tag is created.
#
set -euo pipefail

VERSION="${1:-}"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Error: VERSION must match x.y.z (no leading v)." >&2
	echo "Usage: $(basename "${BASH_SOURCE[0]}") <VERSION>" >&2
	exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_FILE="$ROOT/maestro-menu-editor.php"
README_TXT="$ROOT/readme.txt"

# ---------------------------------------------------------------------------
# maestro-menu-editor.php — plugin header Version: and MAESTRO_VERSION define
# ---------------------------------------------------------------------------
perl -pi -e "s/( \* Version:\s+)[0-9]+\.[0-9]+\.[0-9]+/\${1}$VERSION/" "$PLUGIN_FILE"
perl -pi -e "s/(define\( 'MAESTRO_VERSION', ')[0-9]+\.[0-9]+\.[0-9]+(')/\${1}$VERSION\${2}/" "$PLUGIN_FILE"

# ---------------------------------------------------------------------------
# readme.txt — Stable tag:
# ---------------------------------------------------------------------------
perl -pi -e "s/(Stable tag:\s+)[0-9]+\.[0-9]+\.[0-9]+/\${1}$VERSION/" "$README_TXT"

# ---------------------------------------------------------------------------
# Sanity: the plugin file must still parse after the bump (guards against a
# regex that corrupts the header or the MAESTRO_VERSION define).
# ---------------------------------------------------------------------------
if command -v php >/dev/null 2>&1; then
	php -l "$PLUGIN_FILE" >/dev/null || {
		echo "Error: $PLUGIN_FILE failed 'php -l' after the version bump — aborting." >&2
		exit 1
	}
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "Version bumped to v$VERSION in:"
echo "  $PLUGIN_FILE"
echo "  $README_TXT"
echo ""
echo "Next steps:"
echo "  1. Update readme.txt changelog + Upgrade Notice for v$VERSION."
echo "  2. Commit all changes on a release branch (e.g. release/v$VERSION)."
echo "  3. Open a PR against main for human review."
echo "  4. After the PR merges, tag v$VERSION on main."
echo ""
