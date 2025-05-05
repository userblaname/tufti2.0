import { useCallback } from 'react'
import { useAnimate } from 'framer-motion'

export function useInputAnimation() {
  const [scope, animate] = useAnimate()

  const animateFocus = useCallback(async (isFocused: boolean) => {
    await animate(
      scope.current,
      { 
        scale: isFocused ? 1.02 : 1,
        transition: { duration: 0.2 }
      }
    )
  }, [animate, scope])

  const animateSubmit = useCallback(async () => {
    await animate(
      scope.current,
      { 
        scale: [1, 0.98, 1],
        transition: { duration: 0.2 }
      }
    )
  }, [animate, scope])

  return {
    scope,
    animateFocus,
    animateSubmit
  }
}