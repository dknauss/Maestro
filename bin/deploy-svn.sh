#!/usr/bin/env bash
#
# Stage a WordPress.org SVN release for the Maestro plugin.
#
# This prepares a local SVN working copy under build/svn (checkout, sync trunk,
# sync the directory-page assets, copy the version tag) and then STOPS. It does
# NOT run `svn ci` — publishing to wordpress.org is a deliberate, credentialed
# step you run yourself after reviewing `svn status`.
#
# Usage:  bin/deploy-svn.sh [VERSION]
#   VERSION defaults to the "Stable tag" in readme.txt.
#
# Notes:
#   - SVN username = your WordPress.org username (case-sensitive, e.g. dpknauss).
#   - SVN password is the separate one set at
#     https://profiles.wordpress.org/me/profile/edit/group/3/?screen=svn-password
#   - Commit access can take up to 1 hour after approval to activate.
#
set -euo pipefail

SLUG="maestro-menu-editor"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVN_URL="https://plugins.svn.wordpress.org/${SLUG}"
STAGE="$ROOT/build/$SLUG"   # runtime files, produced by build.sh
WC="$ROOT/build/svn"        # local SVN working copy (gitignored under /build/)

# --- version -----------------------------------------------------------------
VERSION="${1:-$(grep -m1 -E '^Stable tag:' "$ROOT/readme.txt" | sed -E 's/^Stable tag:[[:space:]]*//')}"
HEADER_VERSION="$(grep -m1 -E '^\s*\*?\s*Version:' "$ROOT/$SLUG.php" | sed -E 's/.*Version:[[:space:]]*//')"
if [ "$VERSION" != "$HEADER_VERSION" ]; then
	echo "WARNING: readme Stable tag ($VERSION) != main-file Version ($HEADER_VERSION)." >&2
	echo "         They must match before release. Continuing with $VERSION." >&2
fi
echo "==> Releasing $SLUG $VERSION"

# --- 1. build the runtime tree ----------------------------------------------
echo "==> Building runtime tree (bin/build.sh)"
"$ROOT/bin/build.sh" >/dev/null
[ -d "$STAGE" ] || { echo "ERROR: build stage $STAGE missing" >&2; exit 1; }

# --- 2. checkout / update the SVN working copy ------------------------------
if [ -d "$WC/.svn" ]; then
	echo "==> Updating existing working copy ($WC)"
	svn update -q "$WC"
else
	echo "==> Checking out $SVN_URL (anonymous; credentials only needed at commit)"
	svn checkout -q "$SVN_URL" "$WC"
fi
mkdir -p "$WC/trunk" "$WC/assets" "$WC/tags"

# --- 3. sync runtime files into trunk/ --------------------------------------
echo "==> Syncing runtime files -> trunk/"
rsync -a --delete --exclude='.svn/' "$STAGE/" "$WC/trunk/"

# --- 4. sync directory-page assets (banners, icons, screenshots) ------------
# These live in the SVN repo's top-level assets/ dir, NOT in trunk or the zip.
echo "==> Syncing directory assets -> assets/"
cp "$ROOT/.wordpress-org/banner-1544x500.png" \
   "$ROOT/.wordpress-org/banner-772x250.png" \
   "$ROOT/.wordpress-org/icon-128x128.png" \
   "$ROOT/.wordpress-org/icon-256x256.png" \
   "$ROOT/.wordpress-org/icon.svg" \
   "$ROOT"/.wordpress-org/screenshot-*.png \
   "$WC/assets/"

# --- 5. stage adds / deletes for SVN ----------------------------------------
echo "==> Staging adds/deletes"
( cd "$WC" && svn add --force . --depth infinity -q )
# Remove anything deleted from the working tree (missing -> svn rm).
( cd "$WC" && svn status | awk '/^!/{print $2}' | while read -r p; do svn rm --force "$p" -q; done )

# --- 6. copy the version tag -------------------------------------------------
if [ -d "$WC/tags/$VERSION" ]; then
	echo "==> Tag tags/$VERSION already exists in the working copy — leaving as-is"
else
	echo "==> Creating tag tags/$VERSION from trunk"
	( cd "$WC" && svn cp trunk "tags/$VERSION" -q )
fi

# --- 7. review + hand off the commit ----------------------------------------
echo
echo "==> Staged. Review the changes:"
( cd "$WC" && svn status )
echo
echo "Nothing has been published yet. To release, review the above, then run:"
echo
echo "    cd \"$WC\""
echo "    svn ci -m \"Release $VERSION\" --username YOUR_WP_ORG_USERNAME"
echo
echo "(SVN will prompt for your separate SVN password. After commit, the page"
echo " https://wordpress.org/plugins/$SLUG goes live; assets update within minutes,"
echo " search/profile within ~72h.)"
