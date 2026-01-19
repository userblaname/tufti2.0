/**
 * Slide Service - FLUX.2-pro Image Generation
 * 
 * Generates "Target Slides" - photorealistic visualizations of users' desired realities
 * using Azure's FLUX.2-pro model for Reality Transurfing visualization practice.
 */

const OpenAI = require('openai');

// Azure FLUX.2-pro configuration
const FLUX_ENDPOINT = process.env.AZURE_FLUX_ENDPOINT || 'https://abdelghafour-7062-resource.openai.azure.com/openai/v1/';
const FLUX_API_KEY = process.env.AZURE_FLUX_API_KEY;
const FLUX_MODEL = process.env.AZURE_FLUX_MODEL || 'FLUX.2-pro';

// Initialize OpenAI client for Azure FLUX
let fluxClient = null;

function getFluxClient() {
    if (!fluxClient && FLUX_API_KEY) {
        fluxClient = new OpenAI({
            baseURL: FLUX_ENDPOINT,
            apiKey: FLUX_API_KEY
        });
        console.log('[SlideService] FLUX.2-pro client initialized');
    }
    return fluxClient;
}

/**
 * Check if FLUX service is ready
 */
function isFluxReady() {
    return !!FLUX_API_KEY;
}

/**
 * Enhance a user's vision description into an optimal FLUX prompt
 * Adds cinematic quality and Transurfing-aligned aesthetics
 */
function enhancePrompt(userVision) {
    // Add cinematic and manifestation-aligned styling
    const styleEnhancements = [
        'photorealistic',
        'cinematic lighting',
        'golden hour atmosphere',
        'aspirational mood',
        'high detail',
        'professional photography',
        '8K resolution'
    ].join(', ');

    // Clean and enhance the user's vision
    const cleanedVision = userVision
        .replace(/\[COMPOSE_SLIDE:\s*/gi, '')
        .replace(/\]/g, '')
        .trim();

    return `${cleanedVision}. ${styleEnhancements}`;
}

/**
 * Generate a Target Slide image from a vision description
 * 
 * @param {string} visionDescription - The user's described vision/goal
 * @param {object} options - Generation options
 * @returns {Promise<{success: boolean, imageBase64?: string, error?: string}>}
 */
async function generateSlide(visionDescription, options = {}) {
    const client = getFluxClient();

    if (!client) {
        console.error('[SlideService] FLUX client not initialized - missing API key');
        return {
            success: false,
            error: 'Image generation service not configured'
        };
    }

    const {
        size = '1024x1024',
        enhanceWithStyle = true
    } = options;

    try {
        console.log('[SlideService] Generating slide for vision:', visionDescription.substring(0, 100) + '...');

        // Enhance the prompt for better results
        const finalPrompt = enhanceWithStyle
            ? enhancePrompt(visionDescription)
            : visionDescription;

        console.log('[SlideService] Enhanced prompt:', finalPrompt.substring(0, 150) + '...');

        const response = await client.images.generate({
            model: FLUX_MODEL,
            prompt: finalPrompt,
            n: 1,
            size: size,
            response_format: 'b64_json'
        });

        if (response.data && response.data[0] && response.data[0].b64_json) {
            console.log('[SlideService] Slide generated successfully');
            return {
                success: true,
                imageBase64: response.data[0].b64_json,
                prompt: finalPrompt
            };
        } else {
            console.error('[SlideService] Unexpected response format:', response);
            return {
                success: false,
                error: 'Unexpected response from image service'
            };
        }

    } catch (error) {
        console.error('[SlideService] Generation error:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to generate image'
        };
    }
}

/**
 * Extract vision description from Tufti's response containing [COMPOSE_SLIDE] tag
 */
function extractSlideDescription(tuftiResponse) {
    const match = tuftiResponse.match(/\[COMPOSE_SLIDE:\s*([^\]]+)\]/i);
    return match ? match[1].trim() : null;
}

/**
 * Check if a response contains a slide offer
 */
function hasSlideOffer(tuftiResponse) {
    return /\[COMPOSE_SLIDE:/i.test(tuftiResponse);
}

module.exports = {
    generateSlide,
    enhancePrompt,
    extractSlideDescription,
    hasSlideOffer,
    isFluxReady
};
