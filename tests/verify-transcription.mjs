import assert from "node:assert/strict";
import { File } from "node:buffer";
import { pathToFileURL } from "node:url";

const modulePath = process.argv[2];
assert.ok(modulePath, "compiled helper path is required");

const helper = await import(pathToFileURL(modulePath).href);
assert.equal(typeof helper.validateTranscriptionFile, "function");
assert.equal(typeof helper.clientSafeUpstreamError, "function");
assert.equal(helper.MAX_TRANSCRIPTION_FILE_BYTES, 25 * 1024 * 1024);

const validate = helper.validateTranscriptionFile;
const valid = (size, type) => new File([Buffer.alloc(size)], "media.bin", { type });

for (const missing of [null, undefined]) {
  const result = validate(missing);
  assert.deepEqual(result, { ok: false, status: 400, error: result.error });
  assert.equal(typeof result.error, "string");
}

for (const type of ["audio/mpeg", "audio/wav", "audio/webm", "video/mp4", "video/webm"]) {
  assert.deepEqual(validate(valid(1, type)), { ok: true }, `should accept ${type}`);
}

for (const type of ["text/plain", "application/octet-stream", "image/png", ""]) {
  const result = validate(valid(1, type));
  assert.equal(result.ok, false, `should reject ${type || "empty MIME type"}`);
  assert.equal(result.status, 415);
  assert.equal(typeof result.error, "string");
}

for (const size of [0, helper.MAX_TRANSCRIPTION_FILE_BYTES + 1, helper.MAX_TRANSCRIPTION_FILE_BYTES + 1537]) {
  const result = validate(valid(size, "audio/mpeg"));
  assert.equal(result.ok, false, `should reject ${size} byte file`);
  assert.equal(result.status, 400);
  assert.equal(typeof result.error, "string");
}
assert.deepEqual(validate(valid(helper.MAX_TRANSCRIPTION_FILE_BYTES, "audio/mpeg")), { ok: true });

for (let index = 0; index < 8; index += 1) {
  const size = 1 + Math.floor(Math.random() * (helper.MAX_TRANSCRIPTION_FILE_BYTES - 1));
  assert.deepEqual(validate(valid(size, "audio/mpeg")), { ok: true });
}

for (const [upstream, expected] of [[408, 504], [504, 504], [429, 503], [400, 502], [401, 502], [500, 502]]) {
  const result = helper.clientSafeUpstreamError(upstream);
  assert.equal(result.status, expected, `unexpected mapping for ${upstream}`);
  assert.equal(typeof result.error, "string");
  assert.ok(result.error.length > 0);
  assert.doesNotMatch(result.error, /groq|upstream|token|key|authorization/i);
}

console.log("PASS: transcription validation and upstream error policy verified");
