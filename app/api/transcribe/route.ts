import { NextResponse } from "next/server";
import {
    clientSafeUpstreamError,
    validateTranscriptionFile,
} from "@/lib/transcription";

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
                typeof data === "object" &&
                data !== null &&
                "text" in data &&
                typeof data.text === "string"
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
    } catch (error) {
        console.error("Transcription request could not be processed");
        return NextResponse.json({ error: "Invalid transcription request" }, { status: 400 });
    }
}
