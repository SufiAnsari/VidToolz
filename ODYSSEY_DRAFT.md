# Odyssey Draft — VidToolz Resilient Transcription Gateway

## Task identity

- **title:** Harden VidToolz's Transcription Gateway for Production
- **workingSlug:** `vidtoolz-resilient-transcription-gateway`
- **collectionFamily:** `Product clone`
- **taskFamily:** `systems_integration`
- **verifierFamily:** `programmatic`

## Objective

Harden and refactor VidToolz's `/api/transcribe` endpoint so it securely obtains the Groq credential from the server environment, validates uploaded media, enforces a 25 MiB request limit, applies a 30-second upstream timeout, normalizes upstream failures into stable client-safe responses, rejects malformed upstream success payloads, and moves deterministic validation/error mapping into a reusable TypeScript module. Preserve the existing `{ text }` success contract used by the Transcriptr UI.

## Motivation

VidToolz is a real transcription application. The current endpoint accepts a credential from the browser and forwards upstream errors directly to the client. A production transcription gateway should isolate credentials, reject invalid media before an external call, bound long-running requests, and expose stable errors that do not leak provider details. The task represents realistic backend hardening and integration work rather than a synthetic algorithm exercise.

## Difficulty explanation

The task requires coordinated changes across a Next.js route and a reusable TypeScript module while preserving an existing frontend contract. A strong solution must distinguish client validation failures from upstream failures, correctly handle missing credentials, malformed upstream JSON, timeout cancellation, unsupported media, oversized/empty files, and unexpected request values. Several seemingly correct implementations fail by continuing to trust a browser-supplied API key, leaking provider error bodies, forgetting to clear a timeout, accepting arbitrary MIME types, or breaking the existing response shape. The reference solution demonstrates that the task is achievable, while the verifier checks independent security, validation, reliability, contract, and build properties.

## Expert time estimate

2.5 hours.

## Environment summary

Node.js 20, Next.js 14, React 18, TypeScript 5, and the dependencies pinned by the repository lockfile. The repository is a working VidToolz application. The rollout and verifier require no runtime internet access. The production endpoint may contact Groq when deployed, but the benchmark verifier uses source-level checks plus a local production build.

## Resource estimate

- `cpuMillis`: 2000
- `memoryMb`: 4096
- `storageMb`: 8192
- `gpuCount`: 0
- `agentTimeoutSec`: 10800
- `verifierTimeoutSec`: 1800

## Network requirements

- **mode:** `none`
- **justification:** The task and verifier are deterministic and do not require network access during rollout or grading.

## Oracle strategy

`solution/solve.sh` creates the reusable `lib/transcription.ts` helper and replaces the intentionally insecure starter route with the reference implementation. The reference is designed to satisfy the complete instruction set and pass the verifier without external services.

## Verification strategy

`tests/test.sh` compiles the deterministic helper and runs behavior-level checks across missing, empty, boundary-sized, oversized, supported, unsupported, and randomized valid files. It independently checks upstream-status normalization, then validates route-level secret isolation, timeout/cancellation wiring, safe upstream parsing, model/endpoint preservation, and the `{ text }` success contract. A full Next.js production build is the final integration check. The verifier does not contact Groq or rely on fixed transcription outputs.

## Binary success condition

The canonical verifier exits with status 0 and the production Next.js build succeeds after the agent's changes.

## Partial score strategy

Suggested scoring: 20% credential isolation, 20% input validation, 20% timeout/error normalization, 15% response-contract correctness, 15% reusable/testable design, 10% production build. A submission that fails the build receives zero overall because it is not a runnable solution.

## Anticipated exploits

- Hard-code a response for the verifier: defeated because the helper is exercised with randomized valid sizes plus boundary cases, and the route must retain the real endpoint/model/data flow.
- Continue accepting `apiKey` from form data: explicitly rejected, including any use of form data to construct authorization.
- Return provider error bodies verbatim: explicitly rejected.
- Only add a disconnected helper: route-to-helper integration is checked and the production build must succeed.
- Remove the API call entirely to avoid failure handling: the verifier requires the existing Groq endpoint, model, and `{ text }` contract.
- Add a third-party validation dependency: unnecessary and contrary to the task; the reference uses platform primitives and existing dependencies only.

## Difficulty check

The task is deliberately a multi-constraint integration change, not a one-line input validation patch. A viable implementation must correctly combine the Next.js request boundary, multipart `FormData`, server-only credential ownership, byte/MIME policy, cancellation semantics, upstream status classification, malformed JSON/payload handling, and a frontend-compatible response shape. The verifier rejects common partial implementations such as validation without route integration, an abort controller without a wired signal or cleanup, raw provider-error reflection, or a helper that only handles fixed example inputs. The reference solution is compact enough to be realistically achievable, but the number of interacting failure modes and the source/build/behavior checks support the 2.5-hour expert estimate.
