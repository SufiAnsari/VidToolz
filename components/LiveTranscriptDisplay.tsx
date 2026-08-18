"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Download, Users } from "lucide-react";

interface LiveTranscriptDisplayProps {
    rawTranscript: string;
    diarizedTranscript: string;
    isCapturing: boolean;
    isDiarizing: boolean;
    error?: string | null;
    onDiarize?: () => void;
    showDiarizeButton?: boolean;
}

type Tab = "raw" | "speakers";

export function LiveTranscriptDisplay({
    rawTranscript,
    diarizedTranscript,
    isCapturing,
    isDiarizing,
    error,
    onDiarize,
    showDiarizeButton = false,
}: LiveTranscriptDisplayProps) {
    const [activeTab, setActiveTab] = useState<Tab>("raw");
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom as transcript grows
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [rawTranscript, diarizedTranscript, activeTab]);

    const activeText = activeTab === "raw" ? rawTranscript : diarizedTranscript;

    const handleCopy = async () => {
        if (!activeText) return;
        await navigator.clipboard.writeText(activeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!activeText) return;
        const filename =
            activeTab === "raw" ? "transcript_raw.txt" : "transcript_speakers.txt";
        const blob = new Blob([activeText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isEmpty = !rawTranscript && !isCapturing && !error;
    if (isEmpty) return null;

    // Render diarized transcript with speaker highlighting
    const renderDiarized = (text: string) => {
        const speakerColors: Record<string, string> = {
            "Speaker 1": "text-amber-400",
            "Speaker 2": "text-sky-400",
            "Speaker 3": "text-emerald-400",
            "Speaker 4": "text-rose-400",
            "Speaker 5": "text-violet-400",
            "Speaker 6": "text-orange-400",
        };

        const lines = text.split("\n").filter(Boolean);
        return lines.map((line, i) => {
            const match = line.match(/^\[(Speaker \d+)\]:\s*(.*)/);
            if (match) {
                const [, speaker, content] = match;
                const colorClass = speakerColors[speaker] ?? "text-primary";
                return (
                    <p key={i} className="mb-3 leading-relaxed">
                        <span className={`font-bold text-xs uppercase tracking-widest mr-2 ${colorClass}`}>
                            {speaker}
                        </span>
                        <span className="text-foreground/90 font-mono text-sm">{content}</span>
                    </p>
                );
            }
            return (
                <p key={i} className="mb-2 text-foreground/90 font-mono text-sm leading-relaxed">
                    {line}
                </p>
            );
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto mt-6"
        >
            <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
                style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(16px)" }}>

                {/* Header bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    {/* Tab switcher */}
                    <div className="flex items-center gap-1 p-1 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.3)" }}>
                        {(["raw", "speakers"] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                id={`transcript-tab-${tab}`}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                                    activeTab === tab
                                        ? "bg-primary text-primary-foreground shadow"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab === "raw" ? "Raw Transcript" : "Speaker View"}
                            </button>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                        {showDiarizeButton && rawTranscript && !isDiarizing && (
                            <button
                                id="diarize-btn"
                                onClick={onDiarize}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                    hover:bg-sky-500/10 text-sky-400 border border-sky-500/20 transition-colors mr-2"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Identify Speakers
                            </button>
                        )}
                        {isDiarizing && (
                            <span className="text-xs text-sky-400 mr-2 animate-pulse">
                                Analysing speakers...
                            </span>
                        )}
                        {activeText && (
                            <>
                                <button
                                    id="transcript-download-btn"
                                    onClick={handleDownload}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                        hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    id="transcript-copy-btn"
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                        hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {copied ? (
                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Transcript body */}
                <div
                    ref={scrollRef}
                    className="p-6 min-h-[200px] max-h-[420px] overflow-y-auto"
                    style={{ scrollBehavior: "smooth" }}
                >
                    <AnimatePresence mode="wait">
                        {error ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-10 text-destructive"
                            >
                                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center
                                    justify-center mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                        strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" x2="12" y1="8" y2="12" />
                                        <line x1="12" x2="12.01" y1="16" y2="16" />
                                    </svg>
                                </div>
                                <p className="font-semibold mb-1">Error</p>
                                <p className="text-sm opacity-80 text-center max-w-xs">{error}</p>
                            </motion.div>
                        ) : activeTab === "speakers" && diarizedTranscript ? (
                            <motion.div key="speakers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {renderDiarized(diarizedTranscript)}
                            </motion.div>
                        ) : activeTab === "speakers" && !diarizedTranscript ? (
                            <motion.div
                                key="speakers-empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                            >
                                <Users className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm">Click &ldquo;Identify Speakers&rdquo; to generate the speaker view.</p>
                            </motion.div>
                        ) : rawTranscript ? (
                            <motion.div key="raw" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                                    {rawTranscript}
                                    {isCapturing && (
                                        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse
                                            rounded-sm align-middle" />
                                    )}
                                </p>
                            </motion.div>
                        ) : isCapturing ? (
                            <motion.div
                                key="waiting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                            >
                                <div className="flex gap-1.5 mb-4">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="w-2 h-2 rounded-full bg-primary animate-bounce"
                                            style={{ animationDelay: `${i * 0.15}s` }}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm">Listening… transcript will appear here.</p>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>

                {/* Live indicator bottom bar */}
                {isCapturing && (
                    <div className="px-5 py-2 border-t border-white/5 flex items-center gap-2"
                        style={{ background: "rgba(0,0,0,0.2)" }}>
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                            Capturing — transcript updates every 5 seconds
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
