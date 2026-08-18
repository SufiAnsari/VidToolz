"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Cpu, FileAudio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingStatusProps {
    status: "idle" | "uploading" | "transcribing" | "completed" | "error";
    progress?: number;
    modelName?: string;
}

export function ProcessingStatus({ status, progress, modelName }: ProcessingStatusProps) {
    const steps = [
        {
            id: "uploading",
            label: "Uploading File",
            icon: Cpu,
            description: "Sending audio to Groq servers",
        },
        {
            id: "transcribing",
            label: "Transcribing",
            icon: Sparkles,
            description: "Generating text using Whisper on Groq",
        },
    ];

    const getCurrentStepIndex = () => {
        switch (status) {
            case "uploading": return 0;
            case "transcribing": return 1;
            case "completed": return 2;
            default: return -1;
        }
    };

    const currentStepIndex = getCurrentStepIndex();

    if (status === "idle" || status === "error") return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl mx-auto mt-8 p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-2xl"
        >
            <div className="space-y-6">
                {steps.map((step, index) => {
                    const isCompleted = currentStepIndex > index;
                    const isCurrent = currentStepIndex === index;
                    const isPending = currentStepIndex < index;

                    return (
                        <div key={step.id} className="relative flex items-start gap-4">
                            {/* Connector Line */}
                            {index !== steps.length - 1 && (
                                <div
                                    className={cn(
                                        "absolute left-[15px] top-[30px] w-[2px] h-[calc(100%+16px)] transition-colors duration-500",
                                        isCompleted ? "bg-primary" : "bg-white/10"
                                    )}
                                />
                            )}

                            <div className="relative z-10 flex-shrink-0 mt-1">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                        isCompleted
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : isCurrent
                                                ? "bg-primary/20 border-primary text-primary animate-pulse"
                                                : "bg-transparent border-white/10 text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Circle className="w-5 h-5" />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 pt-1.5">
                                <div className="flex items-center justify-between">
                                    <h3
                                        className={cn(
                                            "text-sm font-medium transition-colors duration-300",
                                            isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        {step.label}
                                    </h3>
                                    {isCurrent && step.id === "uploading" && progress !== undefined && (
                                        <span className="text-xs font-mono text-primary">{progress.toFixed(0)}%</span>
                                    )}
                                </div>

                                <p
                                    className={cn(
                                        "text-xs mt-1 transition-colors duration-300",
                                        isCurrent ? "text-muted-foreground" : "text-muted-foreground/50"
                                    )}
                                >
                                    {step.description}
                                </p>

                                {/* Progress Bar for Upload */}
                                {isCurrent && step.id === "uploading" && progress !== undefined && (
                                    <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
