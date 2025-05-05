import { memo } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface TuftiAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}

const TuftiAvatar = memo(({ size = 'md', className = '' }: TuftiAvatarProps) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    <Avatar className={`${sizeClasses[size]} ${className} baroque-float`}>
      <AvatarImage
        src="/assets/tufti-throne.png"
        alt="Tufti on baroque throne"
        className="object-cover"
      />
      <AvatarFallback className="bg-tufti-red text-tufti-white font-baroque">
        T
      </AvatarFallback>
    </Avatar>
  </motion.div>
))

TuftiAvatar.displayName = 'TuftiAvatar'

export default TuftiAvatar