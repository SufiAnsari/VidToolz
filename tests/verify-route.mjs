import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routePath = process.argv[2];
assert.ok(routePath, "route path is required");
const source = await readFile(routePath, "utf8");

const mustMatch = (pattern, message) => assert.match(source, pattern, message);
const mustNotMatch = (pattern, message) => assert.doesNotMatch(source, pattern, message);

// Browser-controlled fields must never influence server credentials.
mustMatch(/process\.env\.GROQ_API_KEY/, "server environment key is required");
mustNotMatch(/formData\.get\(\s*["']apiKey["']\s*\)/i, "browser API keys are forbidden");
mustNotMatch(/(?:authorization|bearer)[\s\S]{0,180}formData/i, "request form data must not construct authorization");

// The route must call the reusable policy rather than duplicate only enough code to
// satisfy module tests, and it must preserve the existing production integration.
mustMatch(/validateTranscriptionFile\s*\(/, "file validation must be delegated");
mustMatch(/clientSafeUpstreamError\s*\(/, "upstream errors must be normalized");
mustMatch(/https:\/\/api\.groq\.com\/openai\/v1\/audio\/transcriptions/, "Groq transcription endpoint is required");
mustMatch(/whisper-large-v3-turbo/, "existing Whisper model must be retained");
mustMatch(/new\s+AbortController\s*\(/, "abort controller is required");
mustMatch(/setTimeout\s*\([\s\S]{0,100}(?:30_000|30000)/, "30 second timeout is required");
mustMatch(/clearTimeout\s*\(/, "timeout must be cleared");
mustMatch(/signal\s*:/, "fetch must receive the abort signal");

// Success payloads must be parsed and guarded; failure bodies must not be reflected.
mustMatch(/await\s+response\.json\s*\(/, "upstream success JSON must be parsed");
mustMatch(/typeof\s+data\.text\s*===\s*["']string["']|typeof\s+data\s*===\s*["']object["'][\s\S]{0,220}["']text["']\s+in\s+data/, "success text must be type-checked");
mustMatch(/NextResponse\.json\s*\(\s*\{\s*text\s*\}/, "success response must remain { text }");
mustNotMatch(/errorData\.(?:error|message)|await\s+response\.text\s*\(/, "upstream error bodies must not be exposed");

console.log("PASS: route security and integration checks verified");
