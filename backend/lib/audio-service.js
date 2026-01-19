/**
 * GPT-Audio Voice Synthesis Service
 * 
 * Enables Tufti to speak her responses aloud using Azure's gpt-audio model.
 * This module handles the API calls to Azure OpenAI for audio generation.
 */

const AZURE_AUDIO_ENDPOINT = process.env.AZURE_AUDIO_ENDPOINT ||
    'https://abdelghafour-7062-resource.cognitiveservices.azure.com/openai/deployments/gpt-audio/chat/completions';
const AZURE_AUDIO_API_KEY = process.env.AZURE_AUDIO_API_KEY;
const AZURE_AUDIO_API_VERSION = process.env.AZURE_AUDIO_API_VERSION || '2024-05-01-preview';

// Available voice options for gpt-audio
const VOICES = {
    alloy: 'alloy',       // Neutral, balanced
    echo: 'echo',         // Warm, conversational
    fable: 'fable',       // Expressive, storytelling
    onyx: 'onyx',         // Deep, authoritative
    nova: 'nova',         // Friendly, upbeat
    shimmer: 'shimmer'    // Clear, gentle
};

// Default voice for Tufti - "shimmer" for that ancient, ethereal quality
const DEFAULT_VOICE = 'shimmer';

/**
 * Generate audio from text using Azure gpt-audio
 * 
 * @param {string} text - The text to convert to speech
 * @param {string} voice - Voice option (default: shimmer)
 * @returns {Promise<{audioData: string, format: string}>} - Base64-encoded audio data
 */
async function generateAudio(text, voice = DEFAULT_VOICE) {
    if (!AZURE_AUDIO_API_KEY) {
        throw new Error('AZURE_AUDIO_API_KEY not configured');
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Text is required for audio generation');
    }

    // Clean the text for audio (remove markdown, suggestions tags, etc.)
    const cleanedText = cleanTextForAudio(text);

    console.log(`[AudioService] Generating audio for ${cleanedText.length} characters with voice: ${voice}`);

    const requestBody = {
        model: 'gpt-audio',
        modalities: ['text', 'audio'],
        audio: {
            voice: voice,
            format: 'wav'
        },
        messages: [
            {
                role: 'system',
                content: `You are Tufti, an ancient priestess. Read the following text aloud with a calm, mystical, and wise tone. 
                Speak slowly and deliberately, as if sharing ancient wisdom. 
                Add natural pauses for dramatic effect where appropriate.`
            },
            {
                role: 'user',
                content: cleanedText
            }
        ]
    };

    const url = `${AZURE_AUDIO_ENDPOINT}?api-version=${AZURE_AUDIO_API_VERSION}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_AUDIO_API_KEY
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[AudioService] API Error:', response.status, errorText);
        throw new Error(`Audio generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.audio?.data) {
        console.error('[AudioService] Unexpected response structure:', JSON.stringify(data, null, 2));
        throw new Error('No audio data in response');
    }

    const audioData = data.choices[0].message.audio.data;

    console.log(`[AudioService] Audio generated successfully (${audioData.length} bytes base64)`);

    return {
        audioData,
        format: 'wav',
        voice
    };
}

/**
 * Clean text for audio generation
 * Removes markdown, suggestions tags, and other non-speakable content
 * 
 * @param {string} text - Raw text content
 * @returns {string} - Cleaned text suitable for speech
 */
function cleanTextForAudio(text) {
    let cleaned = text;

    // Remove suggestions block
    cleaned = cleaned.replace(/<suggestions>[\s\S]*?<\/suggestions>/gi, '');

    // Remove markdown bold/italic
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

    // Remove markdown links but keep link text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // Remove headers
    cleaned = cleaned.replace(/^#+\s*/gm, '');

    // Remove horizontal rules
    cleaned = cleaned.replace(/^[-*_]{3,}$/gm, '');

    // Remove bullet points but keep content
    cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Get available voices
 * @returns {Object} - Available voice options
 */
function getAvailableVoices() {
    return VOICES;
}

module.exports = {
    generateAudio,
    cleanTextForAudio,
    getAvailableVoices,
    VOICES,
    DEFAULT_VOICE
};
