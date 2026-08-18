"use client";

import { useState, useCallback } from "react";
import { VideoUpload } from "@/components/VideoUpload";
import { TranscriptionDisplay } from "@/components/TranscriptionDisplay";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type StatusType = "idle" | "uploading" | "transcribing" | "completed" | "error";

export default function Home() {
    const [file, setFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState("");
    const [status, setStatus] = useState<StatusType>("idle");
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState("");
    const [geminiApiKey, setGeminiApiKey] = useState("");
    const [rephrasedText, setRephrasedText] = useState("");
    const [isRephrasing, setIsRephrasing] = useState(false);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setTranscription("");
        setRephrasedText("");
    }, []);

    const handleTranscribe = async () => {
        if (!file || !apiKey) {
            setError("Please select a file and enter your Groq API Key.");
            return;
        }

        setStatus("uploading");
        setProgress(0);
        setError(null);
        setRephrasedText("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("apiKey", apiKey);

            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 500);

            setStatus("transcribing");
            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Transcription failed");
            }

            setTranscription(data.text);
            setStatus("completed");
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStatus("error");
        }
    };

    const handleRephrase = async () => {
        if (!transcription || !geminiApiKey) {
            setError("Please enter your Gemini API Key to rephrase.");
            return;
        }

        setIsRephrasing(true);
        setError(null);

        try {
            const response = await fetch("/api/rephrase", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: transcription,
                    apiKey: geminiApiKey,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Rephrasing failed");
            }

            setRephrasedText(data.rephrasedText);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsRephrasing(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setTranscription("");
        setRephrasedText("");
        setError(null);
        setStatus("idle");
        setProgress(0);
    };

    return (
        <main className="min-h-screen mesh-gradient-bg text-foreground flex flex-col items-center justify-center relative overflow-hidden selection:bg-primary/30">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-yellow-500/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-amber-500/10 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.15 }} />
            </div>

            <div className="w-full max-w-5xl mx-auto px-4 py-10 z-10 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md shadow-lg shadow-primary/10 hover:bg-white/10 transition-colors cursor-default">
                        <span className="relative flex h-2 w-2 mr-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-xs font-medium tracking-widest text-primary uppercase">VIDTOOLS</span>
                    </div>
                    <h1 className="text-7xl md:text-8xl font-bold mb-6 tracking-tighter">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500">Transcriptr</span>
                    </h1>
                    <p className="text-xl text-muted-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                        Next-generation audio/video transcription powered by <span className="text-primary font-medium">Groq LPU™</span>.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-full glass-panel rounded-3xl p-8 md:p-12 flex flex-col items-center gap-10 relative overflow-hidden"
                >
                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="w-full max-w-md space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="apiKey" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                                Groq API Key
                            </label>
                            <div className="relative group">
                                <input
                                    id="apiKey"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="gsk_..."
                                    className="w-full p-4 pl-5 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 font-mono text-sm shadow-inner"
                                />
                                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="geminiApiKey" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                                Gemini API Key (Optional, for Rephrasing)
                            </label>
                            <div className="relative group">
                                <input
                                    id="geminiApiKey"
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full p-4 pl-5 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 font-mono text-sm shadow-inner"
                                />
                                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                            </div>
                        </div>
                    </div>

                    <VideoUpload
                        onFileSelect={handleFileSelect}
                        selectedFile={file}
                        onClear={handleClear}
                    />

                    <AnimatePresence>
                        {file && status === "idle" && (
                            <motion.button
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleTranscribe}
                                className="px-12 py-5 btn-liquid text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 flex items-center gap-3 relative overflow-hidden group"
                            >
                                <span className="relative z-10">Initiate Transcription</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <ProcessingStatus
                        status={status}
                        progress={progress}
                    />

                    <TranscriptionDisplay
                        transcription={transcription}
                        isLoading={status === "transcribing" || status === "uploading"}
                        error={error}
                    />

                    {transcription && status === "completed" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-2xl flex flex-col items-center gap-6 mt-8"
                        >
                            <button
                                onClick={handleRephrase}
                                disabled={isRephrasing}
                                className="px-8 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRephrasing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Rephrasing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                                        <span>Rephrase with Gemini</span>
                                    </>
                                )}
                            </button>

                            {rephrasedText && (
                                <div className="w-full rounded-2xl border border-green-500/30 bg-green-900/10 p-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
                                    <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 2a10 10 0 0 1 10 10" /><path d="M12 12 2.1 12" /></svg>
                                        Rephrased Output
                                    </h3>
                                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                                        {rephrasedText}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </div>

            <footer className="w-full py-8 text-center text-xs text-muted-foreground/30 mt-auto">
                <p>POWERED BY GROQ</p>
            </footer>
        </main>
    );
}
