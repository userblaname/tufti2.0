/**
 * useAudio Hook
 * 
 * Custom React hook for managing audio playback state and controls
 * for Tufti's voice synthesis feature.
 */

import { useState, useRef, useCallback } from 'react';

interface AudioState {
    isLoading: boolean;
    isPlaying: boolean;
    error: string | null;
    currentMessageId: string | null;
}

interface UseAudioReturn {
    audioState: AudioState;
    generateAndPlayAudio: (text: string, messageId: string) => Promise<void>;
    stopAudio: () => void;
    isMessagePlaying: (messageId: string) => boolean;
}

export function useAudio(): UseAudioReturn {
    const [audioState, setAudioState] = useState<AudioState>({
        isLoading: false,
        isPlaying: false,
        error: null,
        currentMessageId: null
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    /**
     * Stop any currently playing audio
     */
    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setAudioState(prev => ({
            ...prev,
            isPlaying: false,
            currentMessageId: null
        }));
    }, []);

    /**
     * Generate and play audio for a given text
     */
    const generateAndPlayAudio = useCallback(async (text: string, messageId: string) => {
        // Stop any currently playing audio
        stopAudio();

        // Set loading state
        setAudioState({
            isLoading: true,
            isPlaying: false,
            error: null,
            currentMessageId: messageId
        });

        try {
            // Call the backend gpt-audio endpoint
            const response = await fetch('/api/audio/gpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    voice: 'shimmer' // Default Tufti voice
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Audio generation failed');
            }

            const data = await response.json();

            if (!data.success || !data.audioData) {
                throw new Error('No audio data received');
            }

            // Convert base64 to audio blob
            const audioBlob = base64ToBlob(data.audioData, 'audio/wav');
            const audioUrl = URL.createObjectURL(audioBlob);

            // Create and play audio element
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            // Set up event listeners
            audio.onended = () => {
                setAudioState(prev => ({
                    ...prev,
                    isPlaying: false,
                    currentMessageId: null
                }));
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setAudioState(prev => ({
                    ...prev,
                    isPlaying: false,
                    error: 'Audio playback error',
                    currentMessageId: null
                }));
                URL.revokeObjectURL(audioUrl);
            };

            // Start playback
            await audio.play();

            setAudioState({
                isLoading: false,
                isPlaying: true,
                error: null,
                currentMessageId: messageId
            });

        } catch (error) {
            console.error('[useAudio] Error:', error);
            setAudioState({
                isLoading: false,
                isPlaying: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                currentMessageId: null
            });
        }
    }, [stopAudio]);

    /**
     * Check if a specific message is currently playing
     */
    const isMessagePlaying = useCallback((messageId: string): boolean => {
        return audioState.currentMessageId === messageId && audioState.isPlaying;
    }, [audioState.currentMessageId, audioState.isPlaying]);

    return {
        audioState,
        generateAndPlayAudio,
        stopAudio,
        isMessagePlaying
    };
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

export default useAudio;
