/**
 * RelatedSuggestions - Elite AI-Generated follow-up suggestions
 * Parses suggestions from Tufti's <suggestions> block for truly predictive questions
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { getSuggestions } from '@/lib/suggestions';
import { cn } from '@/lib/utils';

interface RelatedSuggestionsProps {
    lastAIResponse: string;
    lastUserMessage?: string;
    isGenerating: boolean;
    onSuggestionClick: (suggestion: string) => void;
    className?: string;
}

/**
 * Parse AI-generated suggestions from the response
 * Looks for <suggestions>...</suggestions> block
 */
function parseAISuggestions(response: string): string[] | null {
    const match = response.match(/<suggestions>([\s\S]*?)<\/suggestions>/i);
    if (!match) return null;

    const content = match[1].trim();
    const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith('-'));

    // Clean up any markdown or brackets
    const cleaned = lines.map(line =>
        line.replace(/^\[|\]$/g, '').replace(/^-\s*/, '').trim()
    ).filter(line => line.length > 10 && line.length < 80);

    return cleaned.length >= 2 ? cleaned.slice(0, 3) : null;
}

/**
 * Remove the suggestions block from display text
 */
export function stripSuggestionsBlock(text: string): string {
    return text.replace(/<suggestions>[\s\S]*?<\/suggestions>/gi, '').trim();
}

const RelatedSuggestions = memo(({
    lastAIResponse,
    lastUserMessage,
    isGenerating,
    onSuggestionClick,
    className
}: RelatedSuggestionsProps) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Generate suggestions when AI finishes responding
    useEffect(() => {
        if (!isGenerating && lastAIResponse && lastAIResponse.length > 50) {
            // Try to parse AI-generated suggestions first
            const aiSuggestions = parseAISuggestions(lastAIResponse);

            if (aiSuggestions && aiSuggestions.length >= 2) {
                // Use AI-generated suggestions (elite mode)
                setSuggestions(aiSuggestions);
            } else {
                // Fallback to keyword-based suggestions
                const keywordSuggestions = getSuggestions(
                    lastAIResponse,
                    3,
                    lastUserMessage
                );
                setSuggestions(keywordSuggestions);
            }

            // Delay showing for smooth appearance
            setTimeout(() => setShowSuggestions(true), 500);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    }, [isGenerating, lastAIResponse, lastUserMessage]);

    const handleClick = (suggestion: string) => {
        onSuggestionClick(suggestion);
        setShowSuggestions(false);
    };

    if (!showSuggestions || suggestions.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("mt-4 space-y-2", className)}
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider font-medium"
                >
                    <ArrowRight className="w-3 h-3" />
                    <span>Related</span>
                </motion.div>

                {/* Suggestions Grid */}
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                        <motion.button
                            key={suggestion}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            onClick={() => handleClick(suggestion)}
                            className={cn(
                                "group relative px-4 py-2.5 rounded-xl text-sm text-left overflow-hidden",
                                "bg-zinc-900/60 border border-zinc-800/60",
                                "hover:bg-zinc-800/80 hover:border-amber-500/40",
                                "transition-all duration-300",
                                "text-zinc-400 hover:text-zinc-100",
                                "max-w-full",
                                "shadow-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                            )}
                        >
                            {/* Spotlight Border Glow */}
                            <div className="absolute inset-0 rounded-xl border border-amber-500/0 group-hover:border-amber-500/30 transition-colors duration-300" />

                            {/* Inner Shimmer on Hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent" />

                            <span className="flex items-center gap-2 relative z-10">
                                <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                <span className="line-clamp-2">{suggestion}</span>
                            </span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
});

RelatedSuggestions.displayName = 'RelatedSuggestions';

export default RelatedSuggestions;
