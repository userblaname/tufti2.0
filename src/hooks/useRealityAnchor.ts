import { useState, useCallback, useEffect } from 'react';

interface WeatherData {
    temperature: number;
    condition: string;
    isDay: boolean;
    windSpeed: number;
}

interface RealityContext {
    location: string | null;
    coords: { lat: number; lng: number } | null;
    weather: WeatherData | null;
    localTime: string;
    error: string | null;
    isLoading: boolean;
    permission: 'prompt' | 'granted' | 'denied';
}

const WEATHER_CODES: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

export const useRealityAnchor = () => {
    const [context, setContext] = useState<RealityContext>({
        location: null,
        coords: null,
        weather: null,
        localTime: '',
        error: null,
        isLoading: false,
        permission: 'prompt'
    });

    const [isActive, setIsActive] = useState(() => {
        try { return localStorage.getItem('tufti_reality_anchor') === '1' } catch { return false }
    });

    // Toggle anchor
    const toggleAnchor = useCallback(() => {
        const newState = !isActive;
        setIsActive(newState);
        localStorage.setItem('tufti_reality_anchor', newState ? '1' : '0');

        if (newState) {
            // Reset state to allow fresh try
            setContext(prev => ({ ...prev, error: null, permission: 'prompt' }));
            // Effect will trigger updateReality
        }
    }, [isActive]);

    // Fetch weather from Open-Meteo
    const fetchWeather = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,is_day,weather_code,wind_speed_10m&timezone=auto`
            );
            const data = await response.json();
            const current = data.current;

            return {
                temperature: current.temperature_2m,
                condition: WEATHER_CODES[current.weather_code] || 'Unknown',
                isDay: current.is_day === 1,
                windSpeed: current.wind_speed_10m
            };
        } catch (err) {
            console.error('Failed to fetch weather:', err);
            return null;
        }
    };

    // Reverse Geocoding
    const fetchLocationName = async (lat: number, lng: number) => {
        try {
            // Zoom 16 = Neighborhood/Street level (was 10/City)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
            );
            const data = await response.json();
            const addr = data.address;

            // Prioritize specific district/suburb over general city
            const specific = addr.suburb || addr.quarter || addr.neighbourhood || addr.residential || addr.district;
            const general = addr.city || addr.town || addr.village || addr.municipality;

            if (specific && general && specific !== general) {
                return `${specific}, ${general}`;
            }
            return specific || general || 'Unknown Location';
        } catch (err) {
            return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        }
    };

    const updateReality = useCallback(async () => {
        // Prevent loops: if we are denied, loading, or have error, STOP.
        if (!navigator.geolocation) {
            setContext(prev => ({ ...prev, error: 'Geolocation not supported', permission: 'denied' }));
            return;
        }

        // Use functional state update to check current permission without dependency cycle
        // But here we need to read it before dispatching. context.permission is in scope.
        if (context.permission === 'denied' || context.isLoading) {
            console.log('[REALITY ANCHOR] ⚠️ Skipping update (denied or loading)');
            return;
        }

        console.log('[REALITY ANCHOR] 🔄 Updating reality...');
        setContext(prev => ({ ...prev, isLoading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`[REALITY ANCHOR] 📍 Located: ${latitude}, ${longitude}`);

                // Parallel fetch
                const [weather, locationName] = await Promise.all([
                    fetchWeather(latitude, longitude),
                    fetchLocationName(latitude, longitude)
                ]);

                setContext({
                    location: locationName,
                    coords: { lat: latitude, lng: longitude },
                    weather,
                    localTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    error: null,
                    isLoading: false,
                    permission: 'granted'
                });
            },
            (error) => {
                console.warn('[REALITY ANCHOR] ❌ Location denied/error:', error.message);

                // IMPORTANT: Disable anchor immediately to prevent loop
                setIsActive(false);
                localStorage.setItem('tufti_reality_anchor', '0');

                setContext(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error.message,
                    permission: 'denied'
                }));
            },
            { timeout: 10000, maximumAge: 600000 } // Cache for 10 mins
        );
    }, [context.permission, context.isLoading]); // Add deps

    // Format context for Tufti
    const getRealityPrompt = useCallback(() => {
        if (!isActive || !context.location) return null;

        const { location, weather, localTime } = context;
        let weatherStr = weather
            ? `${weather.condition}, ${weather.temperature}°C, ${weather.isDay ? 'Daytime' : 'Nighttime'}`
            : 'Unknown weather';

        return `CURRENT PHYSICAL REALITY FRAME:
- User Location: ${location}
- Local Time: ${localTime}
- Environment: ${weatherStr}
(Use this to ground your observations in the user's immediate physical reality)`;
    }, [isActive, context]);

    // Initial load if active
    useEffect(() => {
        // We check isActive AND permission here to be safe
        if (isActive && context.permission !== 'denied') {
            updateReality();
        }
    }, [isActive]); // updateReality is stable? No, it depends on context now.

    // If updateReality depends on context, and context changes during update...
    // Only triggering effect on [isActive] is safer if we trust isActive toggling.
    // But if updateReality changes, we might want to run it? No.
    // Let's keep effect dep to [isActive] and let usage control it.

    return {
        context,
        isActive,
        toggleAnchor,
        getRealityPrompt
    };
};
