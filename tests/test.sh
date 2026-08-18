#!/usr/bin/env bash
set -euo pipefail

route="app/api/transcribe/route.ts"
helper="lib/transcription.ts"
route_check="tests/verify-route.mjs"

fail() { echo "FAIL: $1" >&2; exit 1; }

[ -f "$route" ] || fail "transcription route is missing"
[ -f "$helper" ] || fail "reusable transcription helper is missing"
[ -f "$route_check" ] || fail "route verifier is missing"
[ -f "tests/verify-transcription.mjs" ] || fail "policy verifier is missing"

# Compile the deterministic module and exercise behavior with boundary and randomized
# inputs. This checks policy rather than rewarding a particular implementation layout.
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
./node_modules/.bin/tsc \
  --target ES2022 --module commonjs --moduleResolution node --esModuleInterop \
  --skipLibCheck --outDir "$tmp_dir" "$helper"
node tests/verify-transcription.mjs "$tmp_dir/lib/transcription.js"

# Check the route's integration responsibilities that cannot be reached without a
# real provider. The checker deliberately verifies data flow, not exact formatting.
node "$route_check" "$route"

# Independent build check catches broken TypeScript/imports.
npm run build >/tmp/odyssey-build.log 2>&1 || { cat /tmp/odyssey-build.log; fail "Next.js production build failed"; }

echo "PASS: resilient transcription gateway checks passed"
