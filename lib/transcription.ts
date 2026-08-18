export const MAX_TRANSCRIPTION_FILE_BYTES = 25 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/webm",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
]);

export type ValidationFailure = {
    ok: false;
    status: 400 | 415;
    error: string;
};

export type ValidationSuccess = { ok: true };

export function validateTranscriptionFile(
    file: File | null | undefined,
): ValidationSuccess | ValidationFailure {
    if (!file) {
        return { ok: false, status: 400, error: "No file provided" };
    }

    if (file.size <= 0) {
        return { ok: false, status: 400, error: "File is empty" };
    }

    if (file.size > MAX_TRANSCRIPTION_FILE_BYTES) {
        return { ok: false, status: 400, error: "File exceeds the 25 MiB limit" };
    }

    if (!SUPPORTED_MIME_TYPES.has(file.type.toLowerCase())) {
        return { ok: false, status: 415, error: "Unsupported media type" };
    }

    return { ok: true };
}

export function clientSafeUpstreamError(status: number): {
    status: number;
    error: string;
} {
    if (status === 408 || status === 504) {
        return { status: 504, error: "Transcription service timed out" };
    }

    if (status === 429) {
        return { status: 503, error: "Transcription service is temporarily unavailable" };
    }

    return { status: 502, error: "Transcription service failed" };
}
