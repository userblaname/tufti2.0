import { memo, useState } from 'react'
import { Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ActionButton from './ActionButton'
import { Input } from '@/components/ui/input'

const SearchButton = memo(() => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <ActionButton
        icon={Search}
        label="Search"
        onClick={() => setIsOpen(!isOpen)}
        active={isOpen}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 200 }}
            exit={{ opacity: 0, width: 0 }}
            className="absolute right-full mr-2 top-0"
          >
            <Input
              type="search"
              placeholder="Search scenes..."
              className="h-9 bg-tufti-surface/40 border-tufti-gold/10"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

SearchButton.displayName = 'SearchButton'

export default SearchButton