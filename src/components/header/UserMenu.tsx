import { memo } from 'react'
import { User, Settings, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import ActionButton from './ActionButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserMenuProps {
  userName?: string
}

const UserMenu = memo(({ userName }: UserMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <div>
        <ActionButton
          icon={User}
          label="User menu"
          className="border-tufti-red/20"
        />
      </div>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      className="w-56 bg-tufti-surface/95 backdrop-blur-md border-tufti-red/20"
    >
      <DropdownMenuLabel className="font-baroque text-tufti-white">
        {userName || 'Guest Director'}
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-tufti-red/20" />
      <DropdownMenuItem className="text-tufti-silver hover:text-tufti-white">
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="text-tufti-silver hover:text-tufti-white">
        <LogOut className="mr-2 h-4 w-4" />
        <span>Sign out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
))

UserMenu.displayName = 'UserMenu'

export default UserMenu