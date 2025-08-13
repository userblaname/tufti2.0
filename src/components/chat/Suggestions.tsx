import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import type { Suggestion } from '@/lib/tufti/suggestions'
import { cn } from '@/lib/utils'

interface Props {
  suggestions: Suggestion[]
  onSelect: (s: Suggestion) => void
  className?: string
}

export const Suggestions: React.FC<Props> = ({ suggestions, onSelect, className }) => {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className={cn('px-4 md:px-6 py-2 border-t border-white/10 bg-navy-deep/70', className)}>
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <Button
              key={s.key}
              variant="outline"
              size="sm"
              className="shrink-0 h-9 rounded-xl bg-white/5 text-gray-100 border-white/15 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-accent"
              onClick={() => onSelect(s)}
              aria-label={`Ask: ${s.label}`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default Suggestions


