"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, AlertTriangle, Monitor } from "lucide-react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { LiveTranscriptDisplay } from "@/components/LiveTranscriptDisplay";
import Link from "next/link";

// ── Configuration ─────────────────────────────────────────────────────────────
const CHUNK_DURATION_MS = 5000; // Each MediaRecorder cycle length
const PROMPT_CONTEXT_CHARS = 200;

// ── Types ─────────────────────────────────────────────────────────────────────
type CaptureState = "idle" | "requesting" | "capturing" | "stopping" | "stopped";
type CaptureMode = "microphone" | "system";

interface ChunkError { time: string; message: string; }

function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AudioScribePage() {
    const [groqKey, setGroqKey] = useState("");
    const [geminiKey, setGeminiKey] = useState("");
    const [captureMode, setCaptureMode] = useState<CaptureMode>("microphone");
    const [captureState, setCaptureState] = useState<CaptureState>("idle");
    const [rawTranscript, setRawTranscript] = useState("");
    const [diarizedTranscript, setDiarizedTranscript] = useState("");
    const [isDiarizing, setIsDiarizing] = useState(false);
    const [errors, setErrors] = useState<ChunkError[]>([]);
    const [captureError, setCaptureError] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Refs — stable values accessible inside intervals / callbacks
    const groqKeyRef = useRef(groqKey);
    const rawTranscriptRef = useRef(rawTranscript);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeRecorderRef = useRef<MediaRecorder | null>(null);
    const isCyclingRef = useRef(false); // true while capture is running
    const mimeTypeRef = useRef("");

    useEffect(() => { groqKeyRef.current = groqKey; }, [groqKey]);
    useEffect(() => { rawTranscriptRef.current = rawTranscript; }, [rawTranscript]);

    // ── Elapsed timer ──────────────────────────────────────────────────────────
    const startElapsedTimer = useCallback(() => {
        setElapsedSeconds(0);
        elapsedIntervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }, []);

    const stopElapsedTimer = useCallback(() => {
        if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    }, []);

    const formatElapsed = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    // ── Send a single completed WebM blob to Groq ──────────────────────────────
    const sendBlob = useCallback(async (blob: Blob) => {
        const key = groqKeyRef.current;
        if (!key || blob.size < 500) return;

        try {
            const formData = new FormData();
            // Use .webm extension — Groq Whisper accepts WebM/Opus natively
            formData.append("file", blob, "chunk.webm");
            formData.append("apiKey", key);
            const ctx = rawTranscriptRef.current.slice(-PROMPT_CONTEXT_CHARS);
            if (ctx) formData.append("prompt", ctx);

            const res = await fetch("/api/audioscribe", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error ?? "Transcription failed");

            const text: string = (data.text ?? "").trim();
            if (text) setRawTranscript(prev => prev ? `${prev} ${text}` : text);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Chunk error";
            setErrors(prev => [...prev.slice(-4), { time: getTimestamp(), message: msg }]);
        }
    }, []);

    // ── Recorder cycling: stop current → collect blob → start next ─────────────
    // Each cycle produces one self-contained WebM file (header + data).
    const runCycle = useCallback((audioTrack: MediaStreamTrack) => {
        if (!isCyclingRef.current) return;

        const mime = mimeTypeRef.current;
        const stream = new MediaStream([audioTrack]);
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
        activeRecorderRef.current = recorder;

        const chunks: Blob[] = [];
        recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = () => {
            if (chunks.length > 0) {
                const blob = new Blob(chunks, { type: mime || "audio/webm" });
                sendBlob(blob);
            }
            // Immediately start the next cycle while still capturing
            if (isCyclingRef.current) runCycle(audioTrack);
        };

        recorder.start();

        // Schedule stop after CHUNK_DURATION_MS
        cycleTimeoutRef.current = setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
        }, CHUNK_DURATION_MS);
    }, [sendBlob]);

    // ── Core: wire up a MediaStream and begin cycling ──────────────────────────
    const startFromStream = useCallback((stream: MediaStream) => {
        mediaStreamRef.current = stream;

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            setCaptureError("No audio track found. For System Audio: share a Chrome Tab and tick 'Also share audio'.");
            stream.getTracks().forEach(t => t.stop());
            setCaptureState("idle");
            return;
        }

        // Web Audio for waveform visualiser
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserNodeRef.current = analyser;

        // Pick best MIME type
        mimeTypeRef.current = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";

        isCyclingRef.current = true;
        setCaptureState("capturing");
        startElapsedTimer();
        runCycle(audioTracks[0]);

        // Auto-stop if the user stops sharing from the browser UI
        audioTracks[0].addEventListener("ended", () => {
            if (isCyclingRef.current) handleStopRef.current?.();
        }, { once: true });
    }, [runCycle, startElapsedTimer]);

    // ── Stop capture ───────────────────────────────────────────────────────────
    const handleStopCapture = useCallback(async () => {
        isCyclingRef.current = false; // prevents runCycle from starting another cycle

        if (cycleTimeoutRef.current) { clearTimeout(cycleTimeoutRef.current); cycleTimeoutRef.current = null; }
        stopElapsedTimer();

        // Stop the active recorder — onstop will sendBlob for the final chunk
        const rec = activeRecorderRef.current;
        if (rec && rec.state === "recording") {
            await new Promise<void>(resolve => { rec.onstop = () => resolve(); rec.stop(); });
        }
        activeRecorderRef.current = null;

        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;

        if (audioCtxRef.current?.state !== "closed") await audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserNodeRef.current = null;

        setCaptureState("stopped");
    }, [stopElapsedTimer]);

    // Stable ref so the track.ended handler can call it without stale closure
    const handleStopRef = useRef(handleStopCapture);
    useEffect(() => { handleStopRef.current = handleStopCapture; }, [handleStopCapture]);

    // ── Start: Microphone ──────────────────────────────────────────────────────
    const handleStartMic = useCallback(async () => {
        if (!groqKey.trim()) { setCaptureError("Please enter your Groq API key."); return; }
        setCaptureError(null); setErrors([]); setRawTranscript(""); setDiarizedTranscript("");
        setCaptureState("requesting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
            });
            startFromStream(stream);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Permission denied";
            setCaptureError(msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("not allowed")
                ? "Microphone access was denied. Allow microphone access in your browser settings and try again."
                : `Could not access microphone: ${msg}`);
            setCaptureState("idle");
        }
    }, [groqKey, startFromStream]);

    // ── Start: System Audio ────────────────────────────────────────────────────
    const handleStartSystem = useCallback(async () => {
        if (!groqKey.trim()) { setCaptureError("Please enter your Groq API key."); return; }
        setCaptureError(null); setErrors([]); setRawTranscript(""); setDiarizedTranscript("");
        setCaptureState("requesting");
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // Chrome needs video:true to show the audio option
                audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 16000 },
            });
            // Drop the video track immediately — we only need audio
            stream.getVideoTracks().forEach(t => t.stop());

            if (stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach(t => t.stop());
                setCaptureError("No audio was shared. Share a Chrome Tab and tick 'Also share audio' at the bottom of the dialog.");
                setCaptureState("idle");
                return;
            }
            startFromStream(stream);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Permission denied";
            const cancelled = ["denied", "cancel", "abort"].some(k => msg.toLowerCase().includes(k));
            setCaptureError(cancelled ? "Screen sharing was cancelled." : `Could not start capture: ${msg}`);
            setCaptureState("idle");
        }
    }, [groqKey, startFromStream]);

    // ── Speaker diarization ────────────────────────────────────────────────────
    const handleDiarize = useCallback(async () => {
        if (!rawTranscript.trim()) return;
        if (!geminiKey.trim()) {
            setErrors(prev => [...prev, { time: getTimestamp(), message: "Gemini API key required for speaker identification." }]);
            return;
        }
        setIsDiarizing(true);
        try {
            const res = await fetch("/api/diarize", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: rawTranscript, apiKey: geminiKey }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Diarization failed");
            setDiarizedTranscript(data.diarized ?? rawTranscript);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Diarization error";
            setErrors(prev => [...prev.slice(-4), { time: getTimestamp(), message: msg }]);
            setDiarizedTranscript(`[Speaker 1]: ${rawTranscript}`);
        } finally {
            setIsDiarizing(false);
        }
    }, [rawTranscript, geminiKey]);

    // ── Cleanup on unmount ─────────────────────────────────────────────────────
    useEffect(() => () => {
        isCyclingRef.current = false;
        if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
        if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    const isCapturing = captureState === "capturing";
    const isIdle = captureState === "idle";
    const isStopped = captureState === "stopped";
    const handleStartCapture = captureMode === "microphone" ? handleStartMic : handleStartSystem;

    return (
        <main className="min-h-screen mesh-gradient-bg text-foreground flex flex-col items-center relative overflow-hidden selection:bg-primary/30">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-500/8 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-amber-500/8 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.12 }} />
            </div>

            <div className="w-full max-w-4xl mx-auto px-4 py-10 z-10 flex flex-col items-center">
                {/* Back nav */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="self-start mb-8">
                    <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m15 18-6-6 6-6" /></svg>
                        VidToolz Suite
                    </Link>
                </motion.div>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="text-center mb-10">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md shadow-lg">
                        <span className="relative flex h-2 w-2 mr-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                        </span>
                        <span className="text-xs font-medium tracking-widest text-cyan-400 uppercase">Live Audio Capture</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tighter">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-400 to-amber-400">AudioScribe</span>
                    </h1>
                    <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto font-light leading-relaxed">
                        Capture live audio, generate real-time transcripts, and identify speakers with{" "}
                        <span className="text-primary font-medium">AI</span>.
                    </p>
                </motion.div>

                {/* Main panel */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-full glass-panel rounded-3xl p-8 md:p-10 flex flex-col gap-7 relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

                    {/* Mode switcher */}
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Capture Source</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button id="mode-microphone" disabled={isCapturing}
                                onClick={() => { if (!isCapturing) { setCaptureMode("microphone"); setCaptureError(null); } }}
                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left disabled:cursor-not-allowed ${captureMode === "microphone" ? "border-cyan-500/50 bg-cyan-500/8" : "border-white/10 hover:border-white/20"}`}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${captureMode === "microphone" ? "bg-cyan-500/15 text-cyan-400" : "bg-white/5 text-muted-foreground"}`}>
                                    <Mic className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${captureMode === "microphone" ? "text-cyan-300" : "text-foreground"}`}>
                                        Microphone
                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">Recommended</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Records directly from your mic. Works everywhere — great for meetings &amp; in-person calls.</p>
                                </div>
                            </button>

                            <button id="mode-system" disabled={isCapturing}
                                onClick={() => { if (!isCapturing) { setCaptureMode("system"); setCaptureError(null); } }}
                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left disabled:cursor-not-allowed ${captureMode === "system" ? "border-amber-500/50 bg-amber-500/8" : "border-white/10 hover:border-white/20"}`}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${captureMode === "system" ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-muted-foreground"}`}>
                                    <Monitor className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${captureMode === "system" ? "text-amber-300" : "text-foreground"}`}>System Audio</p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Captures tab audio via screen share. Share a <strong className="text-foreground/70">Tab</strong> and tick <strong className="text-foreground/70">&ldquo;Also share audio&rdquo;</strong>.</p>
                                </div>
                            </button>
                        </div>

                        {/* System audio guide */}
                        <AnimatePresence>
                            {captureMode === "system" && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <div className="flex items-start gap-3 p-4 rounded-2xl text-sm" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-muted-foreground leading-relaxed">
                                            <p className="font-semibold text-amber-300 text-xs uppercase tracking-wide mb-2">Chrome Setup</p>
                                            <ol className="list-decimal ml-4 space-y-1 text-xs">
                                                <li>Click <strong className="text-foreground/80">Start Capture</strong></li>
                                                <li>In the dialog, pick the <strong className="text-foreground/80">Chrome Tab</strong> tab (not Window/Screen)</li>
                                                <li>Select the tab playing audio</li>
                                                <li>Check <strong className="text-foreground/80">&ldquo;Also share audio&rdquo;</strong> at the bottom</li>
                                                <li>Click <strong className="text-foreground/80">Share</strong></li>
                                            </ol>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* API key inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label htmlFor="groq-key" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                                Groq API Key <span className="text-destructive">*</span>
                            </label>
                            <div className="relative group">
                                <input id="groq-key" type="password" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_..." disabled={isCapturing}
                                    className="w-full p-4 pl-5 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 font-mono text-sm shadow-inner disabled:opacity-50 disabled:cursor-not-allowed" />
                                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="gemini-key" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                                Gemini API Key <span className="text-muted-foreground/50">(Optional — speaker ID)</span>
                            </label>
                            <div className="relative group">
                                <input id="gemini-key" type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..."
                                    className="w-full p-4 pl-5 rounded-xl bg-black/40 border border-white/10 focus:border-sky-500/50 focus:bg-black/60 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all duration-300 font-mono text-sm shadow-inner" />
                                <div className="absolute inset-0 rounded-xl bg-sky-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                            </div>
                        </div>
                    </div>

                    {/* Waveform */}
                    <AudioWaveform analyserNode={analyserNodeRef.current} isActive={isCapturing} />

                    {/* Capture error */}
                    <AnimatePresence>
                        {captureError && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                className="flex items-start gap-3 p-4 rounded-xl text-sm"
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-300 leading-relaxed">{captureError}</p>
                                    {captureMode === "system" && (
                                        <button onClick={() => { setCaptureMode("microphone"); setCaptureError(null); }}
                                            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                                            Switch to Microphone mode instead →
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Control button */}
                    <div className="flex flex-col items-center gap-4">
                        <AnimatePresence mode="wait">
                            {isIdle || isStopped ? (
                                <motion.button key="start" id="start-capture-btn"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={handleStartCapture}
                                    className="flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg relative overflow-hidden group transition-all"
                                    style={{
                                        background: captureMode === "microphone"
                                            ? "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #6366f1 100%)"
                                            : "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
                                        color: "#fff",
                                        boxShadow: captureMode === "microphone" ? "0 8px 30px rgba(6,182,212,0.25)" : "0 8px 30px rgba(245,158,11,0.25)",
                                    }}>
                                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                    <Mic className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">
                                        {isStopped ? "Start New Capture" : captureMode === "microphone" ? "Start Microphone Capture" : "Start System Audio Capture"}
                                    </span>
                                </motion.button>
                            ) : captureState === "requesting" ? (
                                <motion.div key="requesting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-3 px-10 py-5 rounded-2xl text-muted-foreground text-lg"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    {captureMode === "microphone" ? "Requesting microphone access…" : "Waiting for screen share…"}
                                </motion.div>
                            ) : isCapturing ? (
                                <motion.button key="stop" id="stop-capture-btn"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={handleStopCapture}
                                    className="flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg transition-all group relative overflow-hidden"
                                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                                    <span className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                    <MicOff className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">Stop Capture</span>
                                    <span className="relative z-10 ml-2 font-mono text-base text-red-400">{formatElapsed(elapsedSeconds)}</span>
                                </motion.button>
                            ) : (
                                <motion.div key="stopping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-3 px-10 py-5 rounded-2xl text-muted-foreground text-lg"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    Finalising transcript…
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Chunk warnings */}
                        <AnimatePresence>
                            {errors.length > 0 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full max-w-xl overflow-hidden">
                                    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                        <div className="px-4 py-2 flex items-center gap-2 border-b border-amber-500/10">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Warnings — recording continues</span>
                                        </div>
                                        <div className="px-4 py-3 space-y-1 max-h-28 overflow-y-auto">
                                            {errors.map((e, i) => (
                                                <p key={i} className="text-xs text-amber-300/80 font-mono">
                                                    <span className="text-amber-500/60">[{e.time}]</span> {e.message}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Transcript */}
                    <LiveTranscriptDisplay
                        rawTranscript={rawTranscript}
                        diarizedTranscript={diarizedTranscript}
                        isCapturing={isCapturing}
                        isDiarizing={isDiarizing}
                        error={captureError && !rawTranscript ? captureError : null}
                        onDiarize={handleDiarize}
                        showDiarizeButton={isStopped && !!rawTranscript}
                    />
                </motion.div>
            </div>

            <footer className="w-full py-8 text-center text-xs text-muted-foreground/30 mt-auto">
                <p>AUDIOSCRIBE · POWERED BY GROQ WHISPER + GEMINI</p>
            </footer>
        </main>
    );
}
