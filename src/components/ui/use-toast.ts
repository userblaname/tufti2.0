import { useState, useEffect, useCallback } from "react"

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

interface Toast extends ToastOptions {
  id: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    const timeouts = toasts.map((toast) => {
      return setTimeout(() => {
        removeToast(toast.id)
      }, toast.duration || 5000)
    })

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [toasts, removeToast])

  const toast = useCallback(
    ({ title, description, variant = "default", duration = 5000 }: ToastOptions) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prevToasts) => [
        ...prevToasts,
        { id, title, description, variant, duration },
      ])
      return id
    },
    []
  )

  return {
    toast,
    toasts,
    removeToast,
  }
}