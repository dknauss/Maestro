#!/usr/bin/env bash
#
# Build the UX state gallery: start the UX lab in WordPress Playground (the built
# plugin, the lab menus, and the seeded users and settings), photograph each editor
# state at desktop, tablet, and phone sizes, and write ux-gallery/index.html.
#
# Usage: npm run ux:gallery   (or: bash bin/ux-gallery.sh)
# Needs: npm ci and `npx playwright install chromium`. No Docker.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${MAESTRO_LAB_PORT:-9411}"
OUT="$ROOT/ux-gallery"
LOG="$ROOT/build/ux-lab-server.log"

cd "$ROOT"
bash bin/build.sh >/dev/null
rm -rf "$OUT"
mkdir -p "$OUT" build

npx --yes @wp-playground/cli@3.1.61 server \
	--port="$PORT" \
	--mount-before-install="./build/maestro-menu-editor:/wordpress/wp-content/plugins/maestro-menu-editor" \
	--mount-before-install="./playground/ux-lab/maestro-ux-lab.php:/wordpress/wp-content/mu-plugins/maestro-ux-lab.php" \
	--mount-before-install="./playground/ux-lab/seed.php:/wordpress/maestro-ux-lab-seed.php" \
	--blueprint=playground/ux-lab/blueprint-local.json \
	>"$LOG" 2>&1 &
SERVER=$!
# npx starts the server as a child process, so stop it by its port, not just npx.
stop_server() {
	kill "$SERVER" 2>/dev/null || true
	pkill -f -- "server --port=$PORT" 2>/dev/null || true
}
trap stop_server EXIT

# Playground downloads WordPress and runs the blueprint before it answers.
for _ in $(seq 1 120); do
	if grep -q "Ready!" "$LOG" 2>/dev/null; then
		break
	fi
	if ! kill -0 "$SERVER" 2>/dev/null; then
		cat "$LOG"
		echo "The UX lab server stopped before it was ready." >&2
		exit 1
	fi
	sleep 2
done
if ! grep -q "Ready!" "$LOG"; then
	cat "$LOG"
	echo "The UX lab server did not start within 4 minutes." >&2
	exit 1
fi

MAESTRO_LAB_URL="http://127.0.0.1:$PORT" MAESTRO_GALLERY_DIR="$OUT" \
	npx playwright test --config=playwright.ux-gallery.config.ts

node bin/build-ux-gallery.mjs "$OUT"
