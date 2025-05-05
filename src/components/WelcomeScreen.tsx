import { motion } from "framer-motion"
import { MessageCircle, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import TuftiAvatar from "@/components/chat/TuftiAvatar"

interface WelcomeScreenProps {
  onStart: (message: string) => void
}

const suggestions = [
  { id: 1, text: "Tell me about my reality film" },
  { id: 2, text: "What scene should we explore?" },
  { id: 3, text: "Help me understand my current situation" }
]

const recentChats = [
  { id: 1, title: "Exploring Life's Screenplay", time: "29 minutes ago", icon: "🎬" },
  { id: 2, title: "Reality Film Analysis", time: "4 hours ago", icon: "🎭" },
  { id: 3, title: "Scene Direction", time: "4 hours ago", icon: "🎥" }
]

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      onStart(e.currentTarget.value.trim())
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen p-4 md:p-8 bg-tufti-black"
    >
      <div className="max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-6 mb-12"
        >
          <TuftiAvatar size="lg" />
          <h1 className="text-4xl font-baroque text-tufti-white text-center">
            Welcome to Your Reality Film
          </h1>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-tufti-black/50 backdrop-blur-sm rounded-xl shadow-lg border border-tufti-red/20 p-6 mb-8"
        >
          <Input
            placeholder="What scene shall we explore today?"
            className="w-full bg-transparent text-lg focus:ring-1 focus:ring-tufti-red placeholder-tufti-silver/50"
            onKeyPress={handleKeyPress}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="ghost"
                className="text-sm bg-tufti-black/50 text-tufti-white hover:bg-tufti-red/20"
                onClick={() => onStart(suggestion.text)}
              >
                {suggestion.text}
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-baroque flex items-center gap-2 text-tufti-white">
              <MessageCircle className="w-5 h-5" />
              Previous Scenes
            </h2>
            <Button variant="ghost" className="text-tufti-red hover:text-tufti-red/80">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentChats.map((chat) => (
              <motion.div
                key={chat.id}
                whileHover={{ scale: 1.02 }}
                className="bg-tufti-black/50 backdrop-blur-sm p-6 rounded-lg border border-tufti-red/20 cursor-pointer"
                onClick={() => onStart(`Continue our discussion about ${chat.title}`)}
              >
                <div className="text-2xl mb-2">{chat.icon}</div>
                <h3 className="font-baroque text-tufti-white mb-1 line-clamp-1">{chat.title}</h3>
                <p className="text-sm text-tufti-silver/60">{chat.time}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}