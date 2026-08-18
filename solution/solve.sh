#!/usr/bin/env bash
set -euo pipefail

mkdir -p lib
cat > lib/transcription.ts <<'EOF'
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
    if (!file) return { ok: false, status: 400, error: "No file provided" };
    if (file.size <= 0) return { ok: false, status: 400, error: "File is empty" };
    if (file.size > MAX_TRANSCRIPTION_FILE_BYTES) {
        return { ok: false, status: 400, error: "File exceeds the 25 MiB limit" };
    }
    if (!SUPPORTED_MIME_TYPES.has(file.type.toLowerCase())) {
        return { ok: false, status: 415, error: "Unsupported media type" };
    }
    return { ok: true };
}

export function clientSafeUpstreamError(status: number): { status: number; error: string } {
    if (status === 408 || status === 504) {
        return { status: 504, error: "Transcription service timed out" };
    }
    if (status === 429) {
        return { status: 503, error: "Transcription service is temporarily unavailable" };
    }
    return { status: 502, error: "Transcription service failed" };
}
EOF

cat > app/api/transcribe/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { clientSafeUpstreamError, validateTranscriptionFile } from "@/lib/transcription";

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const UPSTREAM_TIMEOUT_MS = 30_000;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const fileValue = formData.get("file");
        const file = fileValue instanceof File ? fileValue : null;
        const validation = validateTranscriptionFile(file);

        if (!validation.ok) {
            return NextResponse.json({ error: validation.error }, { status: validation.status });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("GROQ_API_KEY is not configured");
            return NextResponse.json({ error: "Transcription service is not configured" }, { status: 500 });
        }

        const groqFormData = new FormData();
        groqFormData.append("file", file);
        groqFormData.append("model", "whisper-large-v3-turbo");
        groqFormData.append("response_format", "json");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        try {
            const response = await fetch(GROQ_TRANSCRIPTION_URL, {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}` },
                body: groqFormData,
                signal: controller.signal,
            });

            if (!response.ok) {
                const safeError = clientSafeUpstreamError(response.status);
                return NextResponse.json({ error: safeError.error }, { status: safeError.status });
            }

            let data: unknown;
            try {
                data = await response.json();
            } catch {
                return NextResponse.json({ error: "Transcription service returned an invalid response" }, { status: 502 });
            }

            const text =
                typeof data === "object" && data !== null && "text" in data && typeof data.text === "string"
                    ? data.text
                    : null;

            if (text === null) {
                return NextResponse.json({ error: "Transcription service returned an invalid response" }, { status: 502 });
            }

            return NextResponse.json({ text });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return NextResponse.json({ error: "Transcription service timed out" }, { status: 504 });
            }
            console.error("Transcription upstream request failed");
            return NextResponse.json({ error: "Transcription service failed" }, { status: 502 });
        } finally {
            clearTimeout(timeout);
        }
    } catch {
        console.error("Transcription request could not be processed");
        return NextResponse.json({ error: "Invalid transcription request" }, { status: 400 });
    }
}
EOF
