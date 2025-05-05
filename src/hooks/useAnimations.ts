import { useCallback } from 'react'
import { useAnimate } from 'framer-motion'

export function useAnimations() {
  const [scope, animate] = useAnimate()

  const animateHeight = useCallback(async (open: boolean) => {
    await animate(
      scope.current,
      { height: open ? 'auto' : 0 },
      { duration: 0.2, ease: 'easeInOut' }
    )
  }, [animate, scope])

  const animateScale = useCallback(async (target: string, scale: number) => {
    await animate(
      target,
      { scale },
      { duration: 0.2, ease: 'easeInOut' }
    )
  }, [animate])

  const animateFade = useCallback(async (target: string, visible: boolean) => {
    await animate(
      target,
      { opacity: visible ? 1 : 0 },
      { duration: 0.2, ease: 'easeInOut' }
    )
  }, [animate])

  return {
    scope,
    animateHeight,
    animateScale,
    animateFade
  }
}