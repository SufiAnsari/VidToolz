"use client";

import { useEffect, useRef, useCallback } from "react";

interface AudioWaveformProps {
    analyserNode: AnalyserNode | null;
    isActive: boolean;
}

const WAVEFORM_COLOR_ACTIVE = "#f59e0b"; // amber-400
const WAVEFORM_COLOR_IDLE = "#374151";   // gray-700
const BACKGROUND_COLOR = "transparent";

export function AudioWaveform({ analyserNode, isActive }: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        if (!analyserNode || !isActive) {
            // Draw a flat idle line
            ctx.beginPath();
            ctx.strokeStyle = WAVEFORM_COLOR_IDLE;
            ctx.lineWidth = 1.5;
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            return;
        }

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = WAVEFORM_COLOR_ACTIVE;
        ctx.shadowBlur = 8;
        ctx.shadowColor = WAVEFORM_COLOR_ACTIVE;

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }, [analyserNode, isActive]);

    useEffect(() => {
        if (isActive && analyserNode) {
            animationFrameRef.current = requestAnimationFrame(drawWaveform);
        } else {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            // Draw idle state once
            drawWaveform();
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isActive, analyserNode, drawWaveform]);

    // Handle canvas resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeObserver = new ResizeObserver(() => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        });

        resizeObserver.observe(canvas.parentElement!);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            className="w-full h-24 rounded-2xl overflow-hidden relative"
            style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(245,158,11,0.15)",
            }}
        >
            {/* Gradient overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)",
                }}
            />
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block", background: BACKGROUND_COLOR }}
            />
            {isActive && (
                <div className="absolute top-2 right-3 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-widest">Live</span>
                </div>
            )}
        </div>
    );
}
