// Smooth scroll with easing
const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function scrollToSection(sectionId: string) {
  const section = document.getElementById(sectionId)
  if (!section) return

  const headerOffset = 80
  const start = window.pageYOffset
  const target = section.getBoundingClientRect().top + window.pageYOffset - headerOffset
  const distance = target - start
  const duration = 1000
  let startTime: number | null = null

  const animation = (currentTime: number) => {
    if (startTime === null) startTime = currentTime
    const timeElapsed = currentTime - startTime
    const progress = Math.min(timeElapsed / duration, 1)
    const easeProgress = easeInOutQuad(progress)
    
    window.scrollTo(0, start + distance * easeProgress)
    
    if (timeElapsed < duration) {
      requestAnimationFrame(animation)
    }
  }
  
  requestAnimationFrame(animation)
}

// Enhanced section visibility detection with intersection observer
export function createSectionObserver(
  onSectionChange: (sectionId: string) => void,
  threshold = 0.2
) {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          onSectionChange(entry.target.id)
        }
      })
    },
    {
      rootMargin: '-100px 0px -50%',
      threshold: [threshold]
    }
  )
}

// Scroll progress indicator
export function getScrollProgress(): number {
  const winHeight = window.innerHeight
  const docHeight = document.documentElement.scrollHeight
  const scrollTop = window.pageYOffset
  return Math.min((scrollTop / (docHeight - winHeight)) * 100, 100)
}