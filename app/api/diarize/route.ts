import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DIARIZE_PROMPT = `You are an expert transcript analyst. You will receive a raw audio transcript that may contain speech from multiple speakers. Your task is to intelligently segment the transcript into speaker turns.

Rules:
- Analyse the content, speaking style, context, and topic shifts to infer different speakers.
- Label them as [Speaker 1], [Speaker 2], etc. (up to 6 speakers maximum).
- Do NOT invent or add any words. Only reorganise the existing text into speaker-labelled paragraphs.
- If the transcript appears to be a single speaker, output it as [Speaker 1] with the full text.
- Preserve the original wording exactly.
- Output ONLY the labelled transcript. No preamble, no explanations.

Format:
[Speaker 1]: <their words>
[Speaker 2]: <their words>
...

Transcript to analyse:
`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { transcript, apiKey } = body as {
            transcript?: string;
            apiKey?: string;
        };

        if (!transcript || !transcript.trim()) {
            return NextResponse.json(
                { error: "No transcript provided." },
                { status: 400 }
            );
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API key is required for speaker identification." },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent(DIARIZE_PROMPT + transcript);
        const response = await result.response;
        const diarized = response.text();

        if (!diarized || !diarized.trim()) {
            // Graceful fallback: return original transcript labelled as single speaker
            return NextResponse.json({
                diarized: `[Speaker 1]: ${transcript}`,
            });
        }

        return NextResponse.json({ diarized });
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "An unknown error occurred.";
        console.error("[Diarize API]", message);

        // Return a soft error — caller should fall back to raw transcript
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
