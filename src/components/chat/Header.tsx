import { memo } from 'react'
import { motion } from 'framer-motion'
import { Film, LogOut, Trash2 } from 'lucide-react'
import HeaderTitle from './HeaderTitle'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onClearChat: () => void
  userName?: string | null
  signOut: () => Promise<void>
}

const headerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
}

const Header = memo(({ userName, onClearChat, signOut }: HeaderProps) => {
  
  const handleSignOut = () => {
      signOut();
  };
  
  return (
    <motion.header
      className="relative bg-gradient-to-b from-tufti-surface/80 to-transparent backdrop-blur-sm py-3"
      initial="hidden"
      animate="visible"
      variants={headerVariants}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between">
          
          <div className="flex items-center">
             <HeaderTitle />
          </div>

          <div className="flex items-center space-x-2">
             <Button
               variant="ghost" 
               size="icon"
               onClick={onClearChat}
               className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
               aria-label="Delete conversation"
               title="Delete conversation"
             >
                <Trash2 className="w-4 h-4" />
             </Button>
             
             <Button
               variant="ghost" 
               size="icon"
               onClick={handleSignOut}
               className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
               aria-label="Sign out"
               title="Sign out"
             >
               <LogOut className="w-4 h-4" />
             </Button>
          </div>

        </div>
      </div>
      
      {/* Decorative bottom border */}
      {/* <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-tufti-red/20 to-transparent" /> */}
      
      {/* Ambient glow */}
      {/* <div className="absolute -bottom-20 inset-x-0 h-20 bg-gradient-to-b from-tufti-red/5 to-transparent pointer-events-none" /> */}
    </motion.header>
  );
})

Header.displayName = 'Header'

export default Header