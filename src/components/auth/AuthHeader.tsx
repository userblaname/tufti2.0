import { motion } from 'framer-motion'
import { Film } from 'lucide-react'

export default function AuthHeader() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-12"
    >
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="inline-block mb-6"
      >
        <Film className="w-16 h-16 text-tufti-red" />
      </motion.div>
      
      <h1 className="text-4xl md:text-5xl font-baroque text-tufti-white mb-4">
        Welcome to Reality Film
      </h1>
      <p className="text-lg text-tufti-silver/80 max-w-md mx-auto">
        Sign in to begin your journey of conscious reality creation
      </p>
    </motion.div>
  )
}