"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <main className="min-h-screen mesh-gradient-bg text-foreground flex flex-col items-center justify-center relative overflow-hidden selection:bg-primary/30">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-yellow-500/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-amber-500/10 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.15 }} />
            </div>

            <div className="w-full max-w-5xl mx-auto px-4 py-10 z-10 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md shadow-lg shadow-primary/10 hover:bg-white/10 transition-colors cursor-default">
                        <span className="relative flex h-2 w-2 mr-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-xs font-medium tracking-widest text-primary uppercase">VidToolz Suite</span>
                    </div>
                    <h1 className="text-7xl md:text-9xl font-bold mb-6 tracking-tighter">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500">VidToolz</span>
                    </h1>
                    <p className="text-xl text-muted-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                        A collection of premium video &amp; audio utilities powered by <span className="text-primary font-medium">AI</span>.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                    {/* Transcriptr */}
                    <Link href="/transcriptr" className="group">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="h-full glass-panel rounded-3xl p-8 flex flex-col items-start gap-5 relative overflow-hidden group-hover:bg-white/5 transition-colors border border-white/10 group-hover:border-primary/30"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent group-hover:via-primary/50 transition-all duration-500" />

                            <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">Transcriptr</h2>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    Instantly transcribe videos using Groq Whisper AI. Private, fast, and free.
                                </p>
                            </div>

                            <div className="mt-auto pt-4 flex items-center text-sm font-medium text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                                Launch Tool <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </motion.div>
                    </Link>

                    {/* AudioScribe */}
                    <Link href="/audioscribe" className="group">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="h-full glass-panel rounded-3xl p-8 flex flex-col items-start gap-5 relative overflow-hidden group-hover:bg-white/5 transition-colors border border-white/10 group-hover:border-cyan-500/30"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent group-hover:via-cyan-500/50 transition-all duration-500" />

                            {/* NEW badge */}
                            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                                style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: "#22d3ee" }}>
                                New
                            </div>

                            <div className="p-4 rounded-2xl text-cyan-400 group-hover:scale-110 transition-transform duration-300"
                                style={{ background: "rgba(6,182,212,0.1)" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" x2="12" y1="19" y2="22"/>
                                    <line x1="8" x2="16" y1="22" y2="22"/>
                                </svg>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold mb-2 text-foreground group-hover:text-cyan-400 transition-colors">AudioScribe</h2>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    Capture live system audio, generate real-time transcripts, and identify multiple speakers with AI.
                                </p>
                            </div>

                            <div className="mt-auto pt-4 flex items-center text-sm font-medium text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity">
                                Launch Tool <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </motion.div>
                    </Link>

                    {/* SubsRemovr */}
                    <a href="https://unwatermark.ai/video-subtitles-remover/" target="_blank" rel="noopener noreferrer" className="group">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="h-full glass-panel rounded-3xl p-8 flex flex-col items-start gap-5 relative overflow-hidden group-hover:bg-white/5 transition-colors border border-white/10 group-hover:border-primary/30"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent group-hover:via-primary/50 transition-all duration-500" />

                            <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 9-2 2 2 2"/><path d="m15 9 2 2-2 2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 17h8"/></svg>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">SubsRemovr</h2>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    Remove subtitles and watermarks from videos using AI. Precision masking tools included.
                                </p>
                            </div>

                            <div className="mt-auto pt-4 flex items-center text-sm font-medium text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                                Launch Tool <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </motion.div>
                    </a>
                </div>
            </div>

            <footer className="w-full py-8 text-center text-xs text-muted-foreground/30 mt-auto">
                <p>VIDTOOLZ SUITE</p>
            </footer>
        </main>
    );
}
