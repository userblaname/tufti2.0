import { motion } from 'framer-motion'
import { Film } from 'lucide-react'

export default function LoadingIndicator() {
  return (
    <div className="flex items-center gap-4">
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.2, 1],
        }}
        transition={{ 
          rotate: { duration: 4, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="text-tufti-red"
      >
        <Film className="w-6 h-6" />
      </motion.div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0.4 }}
              animate={{ 
                scale: [0.8, 1, 0.8],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-tufti-red to-tufti-gold"
            />
          ))}
        </div>
        <span className="text-sm text-tufti-silver/80 font-baroque italic">
          Directing the next scene...
        </span>
      </div>
    </div>
  )
}