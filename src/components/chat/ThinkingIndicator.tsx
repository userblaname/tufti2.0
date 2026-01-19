import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';

interface ThinkingIndicatorProps {
    isThinking?: boolean;
    thoughts?: string;
}

const ETHEREAL_CONCEPTS = [
    "Aligning Probability Vectors...",
    "Composing the Reflection...",
    "Scanning the Mirror World...",
    "Activating the Plait...",
    "Sensing Outer Intention...",
    "Illuminating the Frame...",
    "Shifting the Scenery...",
    "Navigating the Space of Variations...",
    "Waking Up in the Dream...",
    "Determining the Script..."
];

export const ThinkingIndicator = ({ isThinking, thoughts }: ThinkingIndicatorProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [conceptIndex, setConceptIndex] = useState(0);

    // Cycle ethereal concepts softly
    useEffect(() => {
        if (!isThinking) return;
        const interval = setInterval(() => {
            setConceptIndex(prev => (prev + 1) % ETHEREAL_CONCEPTS.length);
        }, 2000); // Slower, more elegant transition
        return () => clearInterval(interval);
    }, [isThinking]);

    if (!isThinking && !thoughts) return null;

    return (
        <div className="flex flex-col gap-2 py-4 px-4 max-w-3xl mx-auto w-full group">
            <div
                className="flex items-center justify-between gap-3 cursor-pointer select-none bg-tufti-gunmetal/10 border border-teal-500/10 rounded-full py-2 px-4 hover:border-teal-500/30 transition-all duration-500 backdrop-blur-md w-full"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {/* Ethereal Icon */}
                    <div className="relative flex items-center justify-center w-5 h-5">
                        {isThinking ? (
                            <>
                                <motion.div
                                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-teal-400/20 rounded-full blur-md"
                                />
                                <motion.div
                                    animate={{ rotate: 180 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles className="w-4 h-4 text-teal-300" />
                                </motion.div>
                            </>
                        ) : (
                            <Sparkles className="w-4 h-4 text-teal-500/60" />
                        )}
                    </div>

                    {/* Elegant Text Flow */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                        <span className="text-teal-200/80 font-serif-display text-sm tracking-wide">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={isThinking ? conceptIndex : "done"}
                                    initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
                                    transition={{ duration: 0.8 }}
                                >
                                    {isThinking ? ETHEREAL_CONCEPTS[conceptIndex] : "Vision Crystallized"}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                    </div>
                </div>

                {/* Subtle Chevron */}
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="ml-2"
                >
                    <ChevronDown className="w-3 h-3 text-teal-500/40" />
                </motion.div>
            </div>

            {/* Expanded Thoughts View */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="
                            mt-2 ml-4 p-6 rounded-2xl 
                            bg-gradient-to-br from-tufti-gunmetal/40 to-black/20 
                            border border-teal-500/10 backdrop-blur-xl 
                            shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                            relative overflow-hidden
                        ">
                            {/* Decorative ambient glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            {/* Content */}
                            <div className="relative z-10 font-sans text-sm text-teal-100/70 leading-relaxed whitespace-pre-wrap">
                                {isThinking ? (
                                    <div className="flex items-center gap-2">
                                        <motion.div
                                            animate={{ opacity: [0.4, 1, 0.4] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-1.5 h-1.5 rounded-full bg-teal-400"
                                        />
                                        <span className="italic">The Director is contemplating...</span>
                                    </div>
                                ) : ( // Show thoughts if available, else generic completion
                                    thoughts ? thoughts : (
                                        <div className="flex flex-col gap-2">
                                            <p>The scene has been set according to your intent.</p>
                                        </div>
                                    )
                                )}
                                {/* If we want to show streaming thoughts in real-time if available: */}
                                {isThinking && thoughts && (
                                    <div className="mt-4 pt-4 border-t border-teal-500/10 opacity-60">
                                        {thoughts}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
