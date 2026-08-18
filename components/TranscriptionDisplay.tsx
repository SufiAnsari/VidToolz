"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptionDisplayProps {
    transcription: string;
    isLoading: boolean;
    error?: string | null;
}

export function TranscriptionDisplay({ transcription, isLoading, error }: TranscriptionDisplayProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!transcription) return;
        await navigator.clipboard.writeText(transcription);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!transcription) return;
        const blob = new Blob([transcription], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transcription.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!transcription && !isLoading && !error) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto mt-8"
        >
            <div className="relative rounded-2xl border border-border/50 glass-card overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        <span className="ml-3 font-mono text-sm text-muted-foreground/80">transcription.txt</span>
                    </div>
                    {transcription && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                title="Download as TXT"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                <span>Download</span>
                            </button>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                        <span className="text-green-500">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 min-h-[200px] max-h-[500px] overflow-y-auto custom-scrollbar bg-black/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                <Loader2 className="relative w-10 h-10 animate-spin text-primary" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground animate-pulse">
                                Transcribing media... <span className="text-primary/80">Powered by Groq</span>
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                            </div>
                            <p className="font-semibold text-lg mb-1">Transcription Failed</p>
                            <p className="text-sm opacity-80 max-w-xs mx-auto">{error}</p>
                        </div>
                    ) : (
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                            {transcription}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
