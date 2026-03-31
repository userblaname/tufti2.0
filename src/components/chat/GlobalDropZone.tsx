import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlobalDropZoneProps {
    isDragging: boolean
}

export default function GlobalDropZone({ isDragging }: GlobalDropZoneProps) {
    return (
        <AnimatePresence>
            {isDragging && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                        "fixed inset-4 z-50 rounded-3xl overflow-hidden",
                        "border-2 border-dashed border-emerald-500/50",
                        "bg-black/40 backdrop-blur-md",
                        "flex flex-col items-center justify-center",
                        "pointer-events-none" // Allow events to pass through to the drop handler on window
                    )}
                >
                    {/* Glowing Border Pulse Effect */}
                    <motion.div
                        className="absolute inset-0 bg-emerald-500/10"
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    <motion.div
                        initial={{ scale: 0.8, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", damping: 20 }}
                        className="relative z-10 flex flex-col items-center gap-4 text-center p-8 rounded-2xl bg-black/40 border border-white/10"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ y: [-5, 5, -5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="p-6 rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                            >
                                <FileUp className="w-12 h-12" />
                            </motion.div>

                            {/* Magnetic Ripples */}
                            <motion.div
                                className="absolute inset-0 rounded-full border border-emerald-500/30"
                                animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                Release to Upload
                            </h2>
                            <p className="text-zinc-400 text-sm font-medium tracking-wide">
                                Drop your files into the reality stream
                            </p>
                        </div>

                        {/* Visual cue for compression */}
                        <div className="flex gap-4 mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-500/80 font-mono bg-emerald-500/10 px-2 py-1 rounded">
                                Auto-Compress
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-emerald-500/80 font-mono bg-emerald-500/10 px-2 py-1 rounded">
                                Analysis Ready
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
