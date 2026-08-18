#!/usr/bin/env bash
set -euo pipefail

route="app/api/transcribe/route.ts"
helper="lib/transcription.ts"

fail() { echo "FAIL: $1" >&2; exit 1; }

[ -f "$route" ] || fail "transcription route is missing"
[ -f "$helper" ] || fail "reusable transcription helper is missing"

# Security: credentials must come from the server environment, not the request.
grep -Eq 'process\.env\.GROQ_API_KEY' "$route" || fail "route does not use GROQ_API_KEY"
! grep -Eq 'formData\.get\(["'"']apiKey["'"']\)' "$route" || fail "route still accepts apiKey from the browser"
! grep -Eq 'Authorization.*formData' "$route" || fail "request data is used to construct authorization"

# Validation and stable status handling.
grep -Eq 'validateTranscriptionFile' "$route" || fail "route does not delegate deterministic validation"
grep -Eq '415' "$helper" || fail "unsupported media types are not rejected"
grep -Eq '25 \* 1024 \* 1024' "$helper" || fail "25 MiB limit is missing"
grep -Eq 'file\.size <= 0' "$helper" || fail "empty files are not rejected"

# Reliability: bounded upstream request and safe error mapping.
grep -Eq 'AbortController' "$route" || fail "upstream timeout is missing"
grep -Eq '30_000' "$route" || fail "30 second timeout is missing"
grep -Eq 'clientSafeUpstreamError' "$route" || fail "upstream errors are not normalized"
grep -Eq 'response\.json\(\)' "$route" || fail "success response is not parsed"

# The route must return the UI contract and must not expose upstream bodies.
grep -Eq 'NextResponse\.json\(\{ text \}\)' "$route" || fail "success contract is not preserved"
! grep -Eq 'errorData\.error|errorData\.message|await response\.text\(\)' "$route" || fail "upstream error details may leak to clients"

# Independent build check catches broken TypeScript/imports.
npm run build >/tmp/odyssey-build.log 2>&1 || { cat /tmp/odyssey-build.log; fail "Next.js production build failed"; }

echo "PASS: resilient transcription gateway checks passed"
