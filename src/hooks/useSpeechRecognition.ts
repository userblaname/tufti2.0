// src/hooks/useSpeechRecognition.ts
// Voice input hook using Web Speech API

import { useState, useCallback, useRef, useEffect } from 'react'

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
    resultIndex: number
}

interface SpeechRecognitionResultList {
    length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
    isFinal: boolean
    length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onresult: (event: SpeechRecognitionEvent) => void
    onerror: (event: Event) => void
    onend: () => void
    onstart: () => void
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition
        webkitSpeechRecognition: new () => SpeechRecognition
    }
}

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [isSupported, setIsSupported] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const recognitionRef = useRef<SpeechRecognition | null>(null)

    // Check if Web Speech API is supported
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        setIsSupported(!!SpeechRecognition)

        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true
            recognitionRef.current.lang = 'en-US' // Default, will auto-detect

            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = ''
                let interim = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i]
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript
                    } else {
                        interim += result[0].transcript
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript)
                }
                setInterimTranscript(interim)
            }

            recognitionRef.current.onerror = (event: Event) => {
                console.error('[Speech] Error:', event)
                setError('Speech recognition error')
                setIsListening(false)
            }

            recognitionRef.current.onend = () => {
                setIsListening(false)
                setInterimTranscript('')
            }

            recognitionRef.current.onstart = () => {
                setIsListening(true)
                setError(null)
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort()
            }
        }
    }, [])

    const startListening = useCallback(() => {
        if (!recognitionRef.current) return

        setTranscript('')
        setInterimTranscript('')
        setError(null)

        try {
            recognitionRef.current.start()
        } catch (err) {
            console.error('[Speech] Start error:', err)
            setError('Could not start speech recognition')
        }
    }, [])

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return
        recognitionRef.current.stop()
    }, [])

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening()
        } else {
            startListening()
        }
    }, [isListening, startListening, stopListening])

    // Get full text (final + interim for display)
    const fullTranscript = transcript + interimTranscript

    return {
        isListening,
        transcript,
        interimTranscript,
        fullTranscript,
        isSupported,
        error,
        startListening,
        stopListening,
        toggleListening,
        clearTranscript: () => {
            setTranscript('')
            setInterimTranscript('')
        }
    }
}
