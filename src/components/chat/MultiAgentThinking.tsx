/**
 * MultiAgentThinking Component
 * 
 * Displays the 3-agent thinking chain with:
 * - Agent name + emoji
 * - Collapsible thinking content (visible by default)
 * - Progress indication
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentThought {
    agentName: string;
    agentEmoji: string;
    phase: number;
    thinking: string;
    summary?: string;
    isComplete: boolean;
}

interface MultiAgentThinkingProps {
    agents: AgentThought[];
    className?: string;
}

export const MultiAgentThinking = ({ agents, className }: MultiAgentThinkingProps) => {
    // Track which agents are expanded (all visible by default)
    const [expandedAgents, setExpandedAgents] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        agents.forEach((_, index) => {
            initial[index] = false; // Collapsed by default once complete, or initially
        });
        return initial;
    });

    const toggleAgent = (index: number) => {
        setExpandedAgents(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    if (!agents || agents.length === 0) return null;

    const allComplete = agents.every(a => a.isComplete);

    return (
        <div className={cn("flex flex-col gap-3 py-6 px-4 max-w-3xl mx-auto w-full", className)}>
            {/* Chain Progress Header */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/80 border border-white/5 shadow-sm">
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                        allComplete ? "bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" : "bg-amber-400 animate-pulse"
                    )} />
                    <span className="uppercase tracking-[0.2em] font-semibold text-zinc-400">
                        {allComplete ? "Research Synthesized" : "Elite Research in Progress"}
                    </span>
                </div>
            </div>

            {/* Agent Cards */}
            <div className="flex flex-col gap-2 relative">
                {/* Connection line */}
                <div className="absolute left-[26px] top-6 bottom-6 w-px bg-gradient-to-b from-teal-500/20 via-zinc-800 to-zinc-800/0" />

                {agents.map((agent, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                            "group relative rounded-2xl border transition-all duration-500",
                            "bg-zinc-900/30 backdrop-blur-md",
                            agent.isComplete
                                ? "border-white/5 hover:border-white/10"
                                : "border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.05)]"
                        )}
                    >
                        {/* Agent Header */}
                        <button
                            onClick={() => toggleAgent(index)}
                            className={cn(
                                "w-full flex items-center gap-4 px-4 py-3.5",
                                "transition-colors group-hover:bg-white/[0.02]"
                            )}
                        >
                            {/* Agent Emoji + Status */}
                            <div className="relative z-10 shrink-0">
                                <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500",
                                    agent.isComplete ? "bg-zinc-800/50" : "bg-teal-500/10 shadow-[0_0_12px_rgba(45,212,191,0.1)]"
                                )}>
                                    <span className="text-xl">{agent.agentEmoji}</span>
                                </div>
                                {agent.isComplete ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-teal-500 rounded-full flex items-center justify-center border-2 border-[#09090b]"
                                    >
                                        <Check className="w-2 h-2 text-white" strokeWidth={3} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute -bottom-1 -right-1"
                                    >
                                        <Loader2 className="w-3.5 h-3.5 text-teal-400" />
                                    </motion.div>
                                )}
                            </div>

                            <div className="flex flex-col items-start flex-1 min-w-0">
                                <span className={cn(
                                    "text-[12px] font-bold tracking-[0.05em] uppercase italic transition-colors",
                                    agent.isComplete ? "text-white" : "text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                                )}>
                                    {agent.agentName}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-[0.15em] flex items-center gap-1.5">
                                    {agent.isComplete ? (
                                        <span className="text-teal-500/80">AUTHENTICATED</span>
                                    ) : (
                                        <span className="animate-pulse">TRAVERSING...</span>
                                    )}
                                </span>
                            </div>

                            {/* Expand/Collapse Icon */}
                            <motion.div
                                animate={{ rotate: expandedAgents[index] ? 180 : 0 }}
                                transition={{ duration: 0.3, ease: "anticipate" }}
                                className="shrink-0"
                            >
                                <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                            </motion.div>
                        </button>

                        {/* Thinking Content */}
                        <AnimatePresence>
                            {expandedAgents[index] && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "circOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-5 pb-5 pt-1">
                                        <div className="text-sm text-zinc-400 leading-relaxed font-modern bg-black/20 rounded-xl p-4 border border-white/5 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                                            {agent.thinking || "Analyzing patterns..."}

                                            {/* Streaming indicator if not complete */}
                                            {!agent.isComplete && (
                                                <motion.span
                                                    className="inline-block w-1 h-3 bg-teal-400 ml-1 align-middle"
                                                    animate={{ opacity: [1, 0, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Research Receipt Summary */}
            <AnimatePresence>
                {allComplete && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 border-t border-zinc-900 pt-6"
                    >
                        <div className="flex flex-col gap-4 bg-zinc-900/20 rounded-2xl p-5 border border-white/[0.03]">
                            <h4 className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-600 mb-1 px-1">
                                Research Compiled
                            </h4>
                            <div className="space-y-3">
                                {agents.map((agent, i) => (
                                    <div key={i} className="flex items-start gap-4 group">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-white/5 transition-colors group-hover:border-white/20">
                                            <span className="text-sm">{agent.agentEmoji}</span>
                                        </div>
                                        <div className="flex flex-col min-w-0 pt-0.5">
                                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide">
                                                {agent.agentName}
                                            </span>
                                            <p className="text-xs text-zinc-500 line-clamp-1 italic">
                                                {agent.summary || "Synthesized finding..."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-start gap-4 group">
                                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 border border-teal-500/20">
                                        <span className="text-sm">🎬</span>
                                    </div>
                                    <div className="flex flex-col min-w-0 pt-0.5">
                                        <span className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] italic drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]">
                                            Synthesis Phase
                                        </span>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em] italic animate-pulse">
                                            Real Tufti Composer Active...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MultiAgentThinking;
