import { type ClassValue } from "clsx"
import { cn } from "./utils"

// Layout
export const layoutStyles = {
  fullScreen: "min-h-screen",
  container: "container mx-auto px-4",
  centered: "flex items-center justify-center",
  column: "flex flex-col",
}

// Glass effects
export const glassStyles = {
  panel: "backdrop-blur-md bg-white/10 border border-white/20",
  dark: "backdrop-blur-md bg-tufti-black/90 border border-tufti-red/20",
  input: "bg-white/10 border-white/20",
}

// Text styles
export const textStyles = {
  heading: "font-baroque text-tufti-white",
  body: "font-modern text-tufti-silver",
  label: "text-sm font-medium text-tufti-silver",
}

// Animation classes
export const animationStyles = {
  float: "animate-baroque-float",
  filmRoll: "animate-film-roll",
  fadeInOut: "animate-fade-in-out",
}

// Input styles
export const inputStyles = {
  base: cn(
    "w-full rounded-lg px-4 py-2",
    "text-tufti-white placeholder:text-tufti-silver/40",
    "border border-tufti-silver/20",
    "focus:border-tufti-red focus:ring-1 focus:ring-tufti-red",
    "transition-all duration-200"
  ),
  glass: cn(
    "bg-white/10 border-white/20",
    "focus:border-[#4A8ED5] focus:ring-[#4A8ED5]",
    "placeholder-white/60"
  ),
}

// Button styles
export const buttonStyles = {
  base: cn(
    "rounded-lg px-4 py-2",
    "font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2"
  ),
  primary: cn(
    "bg-tufti-red text-tufti-white",
    "hover:bg-tufti-red/90",
    "focus:ring-tufti-red/50"
  ),
  ghost: cn(
    "bg-transparent text-tufti-white",
    "hover:bg-white/5",
    "focus:ring-white/20"
  ),
}

// Helper function to combine utility classes
export function createStyles(...classNames: ClassValue[]) {
  return cn(...classNames)
}