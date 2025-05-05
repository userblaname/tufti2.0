import { useState, useCallback } from 'react'

interface UseInputValidationProps {
  minLength?: number
  maxLength?: number
  required?: boolean
}

export function useInputValidation({
  minLength = 1,
  maxLength = 1000,
  required = true
}: UseInputValidationProps = {}) {
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((value: string) => {
    if (required && !value.trim()) {
      setError('Message is required')
      return false
    }

    if (value.length < minLength) {
      setError(`Message must be at least ${minLength} characters`)
      return false
    }

    if (value.length > maxLength) {
      setError(`Message must be less than ${maxLength} characters`)
      return false
    }

    setError(null)
    return true
  }, [minLength, maxLength, required])

  return {
    error,
    validate,
    clearError: () => setError(null)
  }
}