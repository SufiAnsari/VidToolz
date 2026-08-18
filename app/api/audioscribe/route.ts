import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Groq's Whisper API limit
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

// Supported formats by Groq Whisper
// flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
const SUPPORTED_EXTENSIONS = new Set([
    "webm", "wav", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "flac",
]);

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const apiKey = formData.get("apiKey") as string | null;
        const promptContext = (formData.get("prompt") as string | null) ?? "";

        if (!file) return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
        if (!apiKey) return NextResponse.json({ error: "Groq API key is required." }, { status: 400 });
        if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: "File exceeds 25 MB limit." }, { status: 413 });
        if (file.size === 0) return NextResponse.json({ text: "" });

        // Determine file name to send — Groq infers format from extension
        const originalName = file.name ?? "chunk.webm";
        const ext = originalName.split(".").pop()?.toLowerCase() ?? "webm";
        const filename = SUPPORTED_EXTENSIONS.has(ext) ? originalName : `chunk.webm`;

        const groqForm = new FormData();
        groqForm.append("file", file, filename);
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("response_format", "json");
        groqForm.append("language", "en");

        if (promptContext.trim()) {
            groqForm.append("prompt", promptContext.slice(-200));
        }

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: groqForm,
        });

        if (!groqRes.ok) {
            let errorMessage = "Transcription failed.";
            try {
                const errData = await groqRes.json();
                errorMessage = errData?.error?.message ?? errorMessage;
            } catch { /* ignore */ }
            return NextResponse.json({ error: errorMessage }, { status: groqRes.status });
        }

        const data = await groqRes.json();
        return NextResponse.json({ text: data?.text ?? "" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error.";
        console.error("[AudioScribe API]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
