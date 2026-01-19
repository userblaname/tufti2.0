// src/hooks/useTTS.ts
// Text-to-Speech hook using Azure Neural TTS for natural voice

import { useState, useCallback, useRef, useEffect } from 'react'

interface TTSState {
    isSpeaking: boolean
    isLoading: boolean
    currentMessageId: string | null
    error: string | null
}

export function useTTS() {
    const [state, setState] = useState<TTSState>({
        isSpeaking: false,
        isLoading: false,
        currentMessageId: null,
        error: null
    })

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Stop speaking
    const stop = useCallback(() => {
        // Abort fetch if in progress
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

        // Stop audio if playing
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            audioRef.current = null
        }

        setState(prev => ({
            ...prev,
            isSpeaking: false,
            isLoading: false,
            currentMessageId: null
        }))
    }, [])

    // Speak text using Azure Neural TTS
    const speak = useCallback(async (text: string, messageId?: string) => {
        // Cancel any ongoing speech
        stop()

        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            currentMessageId: messageId || null
        }))

        try {
            abortControllerRef.current = new AbortController()

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'TTS failed' }))
                throw new Error(error.error || 'TTS request failed')
            }

            // Get audio blob and create URL
            const audioBlob = await response.blob()
            const audioUrl = URL.createObjectURL(audioBlob)

            // Create audio element and play
            audioRef.current = new Audio(audioUrl)

            audioRef.current.onplay = () => {
                setState(prev => ({
                    ...prev,
                    isSpeaking: true,
                    isLoading: false
                }))
            }

            audioRef.current.onended = () => {
                URL.revokeObjectURL(audioUrl)
                setState(prev => ({
                    ...prev,
                    isSpeaking: false,
                    currentMessageId: null
                }))
            }

            audioRef.current.onerror = () => {
                URL.revokeObjectURL(audioUrl)
                setState(prev => ({
                    ...prev,
                    isSpeaking: false,
                    isLoading: false,
                    currentMessageId: null,
                    error: 'Audio playback failed'
                }))
            }

            await audioRef.current.play()

        } catch (error: any) {
            if (error.name === 'AbortError') {
                // User cancelled, not an error
                return
            }
            console.error('[TTS] Error:', error)
            setState(prev => ({
                ...prev,
                isSpeaking: false,
                isLoading: false,
                currentMessageId: null,
                error: error.message || 'TTS error'
            }))
        }
    }, [stop])

    // Toggle speak for a message
    const toggleSpeak = useCallback((text: string, messageId: string) => {
        if ((state.isSpeaking || state.isLoading) && state.currentMessageId === messageId) {
            stop()
        } else {
            speak(text, messageId)
        }
    }, [state.isSpeaking, state.isLoading, state.currentMessageId, speak, stop])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop()
        }
    }, [stop])

    return {
        ...state,
        speak,
        stop,
        toggleSpeak
    }
}
