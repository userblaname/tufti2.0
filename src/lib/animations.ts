import type { Variants } from 'framer-motion'

export const messageAnimation: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
}

export const layoutTransition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 1
}