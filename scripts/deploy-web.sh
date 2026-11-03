#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Keep the deployed version untouched if the build fails.
exec 9>"${PUBLISH_ROOT:-/www/blog-data}/publish.lock"
flock -n 9 || { echo "Another web deployment is running." >&2; exit 1; }
pnpm build:web
RELEASES="${BLOG_RELEASES_DIR:-/www/blog-data/releases}"
RELEASE="$RELEASES/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$RELEASE"
cp -a apps/web/dist/. "$RELEASE/"
test -s "$RELEASE/index.html"
chmod -R a+rX "$RELEASE"
ln -s "$RELEASE" "$RELEASES/.current-$$"
mv -Tf "$RELEASES/.current-$$" "$RELEASES/current"
echo "Published web release: $RELEASE"
