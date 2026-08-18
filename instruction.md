# Resilient VidToolz transcription gateway

Harden and refactor the `/api/transcribe` endpoint in this Next.js application so it is safe and reliable for production use.

## Requirements

1. The Groq credential must come only from the server-side `GROQ_API_KEY` environment variable. Do not accept, forward, log, or expose an API key supplied by the browser.
2. Reject requests that do not contain a file with HTTP 400 and a stable JSON error shape.
3. Reject empty files and files larger than 25 MiB with HTTP 400. Accept common audio/video MIME types and reject unsupported types with HTTP 415.
4. Forward the file to Groq using the existing Whisper model and return only `{ "text": string }` on success.
5. Abort an upstream request after 30 seconds and return HTTP 504 with a stable client-safe error. Do not leak upstream response bodies, credentials, stack traces, or implementation details.
6. Handle malformed/non-JSON upstream error responses without throwing another exception. All upstream failures must produce a predictable JSON error shape and an appropriate 5xx status.
7. Keep the endpoint implementation testable: move validation/error-normalization logic that can be deterministic into a small reusable module under `lib/` rather than hiding all behavior inside the route handler.
8. Preserve the existing UI contract: successful callers still receive `data.text`, and ordinary client errors remain non-2xx responses with an `error` field.

The solution must work with the existing Next.js/TypeScript project, must not require runtime network access other than the real Groq call in production, and must not add a new third-party dependency merely for validation or error handling.

A correct solution should be robust against malformed input, upstream failures, missing environment configuration, and attempts to smuggle credentials through request fields.
