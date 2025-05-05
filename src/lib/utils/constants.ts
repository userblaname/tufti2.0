// Message constants
export const MESSAGE_CACHE_SIZE = 100
export const MESSAGE_BATCH_SIZE = 20
export const MESSAGE_LOAD_DELAY = 300

// Animation constants
export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5
}

// Input validation
export const INPUT_LIMITS = {
  minLength: 1,
  maxLength: 1000,
  debounceDelay: 300
}

// Virtual scroll
export const VIRTUAL_SCROLL = {
  defaultRowHeight: 100,
  overscanCount: 5,
  scrollBehavior: 'smooth' as const
}

// Theme
export const THEME = {
  colors: {
    primary: {
      red: '#9E2B25',
      gold: '#C4A484',
      black: '#1A1A1D',
      white: '#F5F5F5'
    },
    secondary: {
      silver: '#D7D7D9',
      surface: '#242428',
      muted: '#4A4A4F'
    }
  },
  fonts: {
    baroque: 'Cinzel Decorative',
    modern: 'Josefin Sans',
    body: 'Inter'
  }
}