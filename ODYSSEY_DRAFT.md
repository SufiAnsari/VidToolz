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

`tests/test.sh` performs multiple independent checks: server-side credential sourcing, rejection of browser API-key input, reusable validation logic, empty/oversized/unsupported-file handling, timeout enforcement, upstream error normalization, response-contract preservation, upstream-error non-leakage, and a full Next.js production build. The decisive checks are kept in the canonical verifier entrypoint; a public-facing task description tells the agent what behaviors are required without exposing provider credentials or test data.

## Binary success condition

The canonical verifier exits with status 0 and the production Next.js build succeeds after the agent's changes.

## Partial score strategy

Suggested scoring: 20% credential isolation, 20% input validation, 20% timeout/error normalization, 15% response-contract correctness, 15% reusable/testable design, 10% production build. A submission that fails the build receives zero overall because it is not a runnable solution.

## Anticipated exploits

- Hard-code a response for the verifier: defeated because the verifier checks implementation properties and a real production build.
- Continue accepting `apiKey` from form data: explicitly rejected.
- Return provider error bodies verbatim: explicitly rejected.
- Only add string literals without integrating them: route/helper relationship and build checks catch this.
- Remove the API call entirely to avoid failure handling: the verifier requires the existing Groq endpoint, model, and `{ text }` contract.
- Add a third-party validation dependency: unnecessary and contrary to the task; the reference uses platform primitives and existing dependencies only.
