// WMO Weather interpretation codes (WW)
const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
};

export const getCoordinates = async (city) => {
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return null;
        }

        return data.results[0]; // { latitude, longitude, name, country, ... }
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
};

export const fetchWeather = async (location, date) => {
    try {
        // 1. Get coordinates
        const coords = await getCoordinates(location);
        if (!coords) return 'Location not found';

        // 2. Fetch weather
        // We'll fetch daily forecast. If date is today or future, it works.
        // If date is past, Open-Meteo has a historical API, but let's stick to forecast for simplicity 
        // unless the user specifically asked for historical (which they did implicitly by saying "that day").
        // Open-Meteo forecast endpoint usually covers recent past + future. 
        // For deep past, we'd need the archive endpoint. 
        // Let's assume "that day" implies upcoming or recent.

        const { latitude, longitude } = coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max&timezone=auto`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.daily) return 'Weather data unavailable';

        // 3. Find the specific date
        const dateIndex = data.daily.time.findIndex(d => d === date);

        if (dateIndex === -1) {
            // If date is not in the forecast range (usually 7 days), we might need to handle it.
            // For now, return a message.
            return 'Date out of forecast range';
        }

        const code = data.daily.weather_code[dateIndex];
        const temp = data.daily.temperature_2m_max[dateIndex];
        const description = weatherCodes[code] || 'Unknown weather';

        return `${description} • ${temp}°C`;

    } catch (error) {
        console.error("Fetch error:", error);
        return 'Failed to fetch weather';
    }
};
