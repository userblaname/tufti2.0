import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border bg-transparent px-4 py-2 text-base shadow-sm transition-all duration-200",
          "text-tufti-white placeholder:text-tufti-silver/40",
          "font-modern placeholder:font-modern",
          "border-tufti-silver/20 focus:border-tufti-red focus:ring-1 focus:ring-tufti-red",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tufti-red/50",
          "hover:border-tufti-red/50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }