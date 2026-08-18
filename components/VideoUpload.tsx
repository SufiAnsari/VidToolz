"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileVideo, FileAudio, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onClear: () => void;
}

export function VideoUpload({ onFileSelect, selectedFile, onClear }: VideoUploadProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && (file.type.startsWith("video/") || file.type.startsWith("audio/"))) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const isAudio = selectedFile?.type.startsWith("audio/");

    return (
        <div className="w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                {!selectedFile ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key="upload-zone"
                    >
                        <label
                            htmlFor="video-upload"
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ease-in-out overflow-hidden group",
                                isDragging
                                    ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                                    : "border-border/50 hover:border-primary/50 hover:bg-secondary/30",
                                "glass-card"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                                <div className={cn(
                                    "p-5 rounded-full mb-4 transition-all duration-500",
                                    isDragging ? "bg-primary text-primary-foreground scale-110" : "bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
                                )}>
                                    <Upload className="w-8 h-8" />
                                </div>
                                <p className="mb-2 text-xl font-medium text-foreground">
                                    <span className="font-bold gradient-text">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-sm text-muted-foreground/80">Video (MP4, WebM) or Audio (MP3, WAV, M4A) (MAX. 25MB)</p>
                            </div>
                            <input
                                id="video-upload"
                                type="file"
                                accept="video/*,audio/*"
                                className="hidden"
                                onChange={handleFileInput}
                            />
                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </label>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key="file-preview"
                        className="relative w-full p-6 rounded-2xl border border-border/50 glass-card flex items-center gap-5 group"
                    >
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/10">
                            {isAudio ? (
                                <FileAudio className="w-8 h-8 text-primary" />
                            ) : (
                                <FileVideo className="w-8 h-8 text-primary" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold text-foreground truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono mt-1">
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            onClick={onClear}
                            className="p-3 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200 opacity-70 hover:opacity-100"
                            title="Remove file"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
