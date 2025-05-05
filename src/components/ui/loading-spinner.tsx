import { motion } from "framer-motion"
import { Film } from "lucide-react"

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-tufti-black">
      <motion.div
        className="relative"
        animate={{ 
          rotate: 360,
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Film className="w-12 h-12 text-tufti-red" />
        </motion.div>
        <div className="w-12 h-12 rounded-full border-2 border-tufti-red/20" />
      </motion.div>
    </div>
  )
}