#!/usr/bin/env bash
# Builds the play-test web version (Premium unlocked for everyone, internet relay
# for multiplayer) and publishes it to GitHub Pages at
#   https://noahswesade-ai.github.io/call-it-app/
# Usage (from the project folder):  bash tools/deploy-playtest.sh
set -euo pipefail

REPO="noahswesade-ai/call-it-app"
# Several public brokers: every phone uses all of them, so one going down is harmless.
RELAY="wss://broker.hivemq.com:8884/mqtt,wss://test.mosquitto.org:8081"

echo "▶ Building…"
rm -rf dist-web
EXPO_BASE_URL=/call-it-app EXPO_PUBLIC_RELAY_URL="$RELAY" EXPO_PUBLIC_PLAYTEST=1 \
  npx expo export -p web --output-dir dist-web

echo "▶ Publishing to the gh-pages branch…"
OUT="$(mktemp -d)"
cp -R dist-web/. "$OUT/"
cp "$OUT/index.html" "$OUT/404.html"   # lets links like /call-it-app/join open the app
touch "$OUT/.nojekyll"
(
  cd "$OUT"
  git init -q -b gh-pages
  git add -A
  git commit -q -m "Play-test web build"
  git push -q --force "https://github.com/$REPO.git" gh-pages
)

echo "▶ Turning on GitHub Pages (ignore an 'already exists' message)…"
gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true

echo "✅ Done. In a minute or two the game is live at:"
echo "   https://noahswesade-ai.github.io/call-it-app/"
