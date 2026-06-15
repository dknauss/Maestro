#!/usr/bin/env bash
#
# Build a runtime-only install zip — excludes tests, tooling, and docs so the
# installed plugin contains only what a site needs. Run from anywhere.
#
set -euo pipefail

SLUG="maestro-menu-editor"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/build"
STAGE="$OUT/$SLUG"

rm -rf "$STAGE" "$OUT/$SLUG.zip"
mkdir -p "$STAGE"

cp "$ROOT/$SLUG.php" "$STAGE/"
cp -r "$ROOT/includes" "$STAGE/"
cp -r "$ROOT/assets" "$STAGE/"
if [ -d "$ROOT/languages" ]; then
	cp -r "$ROOT/languages" "$STAGE/"
fi
cp "$ROOT/readme.txt" "$STAGE/"

( cd "$OUT" && zip -rq "$SLUG.zip" "$SLUG" )
unzip -tq "$OUT/$SLUG.zip"
echo "Built $OUT/$SLUG.zip"
