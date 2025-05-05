export function useHapticFeedback() {
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const lightTap = () => vibrate(10)
  const mediumTap = () => vibrate(20)
  const heavyTap = () => vibrate(30)
  const doubleTap = () => vibrate([10, 50, 10])
  const success = () => vibrate([10, 50, 20])
  const error = () => vibrate([30, 100, 30])

  return {
    lightTap,
    mediumTap,
    heavyTap,
    doubleTap,
    success,
    error
  }
}