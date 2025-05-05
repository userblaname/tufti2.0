import { memo, useState } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ActionButton from './ActionButton'
import { useToast } from '@/components/ui/use-toast'

const NotificationButton = memo(() => {
  const [hasNotifications, setHasNotifications] = useState(false)
  const { toast } = useToast()

  const handleClick = () => {
    toast({
      title: "Notifications",
      description: hasNotifications 
        ? "You have no new notifications" 
        : "Notifications are currently disabled"
    })
    setHasNotifications(false)
  }

  return (
    <div className="relative">
      <ActionButton
        icon={Bell}
        label="Notifications"
        onClick={handleClick}
      />
      <AnimatePresence>
        {hasNotifications && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-tufti-red rounded-full"
          />
        )}
      </AnimatePresence>
    </div>
  )
})

NotificationButton.displayName = 'NotificationButton'

export default NotificationButton