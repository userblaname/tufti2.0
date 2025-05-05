import { INPUT_LIMITS } from './constants'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateInput(value: string): ValidationResult {
  if (!value.trim()) {
    return {
      isValid: false,
      error: 'Message cannot be empty'
    }
  }

  if (value.length < INPUT_LIMITS.minLength) {
    return {
      isValid: false,
      error: `Message must be at least ${INPUT_LIMITS.minLength} characters`
    }
  }

  if (value.length > INPUT_LIMITS.maxLength) {
    return {
      isValid: false,
      error: `Message cannot exceed ${INPUT_LIMITS.maxLength} characters`
    }
  }

  return { isValid: true }
}

export function sanitizeInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}