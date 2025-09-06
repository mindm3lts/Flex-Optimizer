import React, { useState, useEffect } from 'react';
import { getCurrentWeather } from '../services/aiService';
import type { WeatherInfo, WeatherIconType } from '../types';
import { ThermometerIcon, WarningIcon, SunIcon, CloudIcon, PartlyCloudyIcon, RainIcon, SnowIcon, ThunderstormIcon, WindyIcon } from './icons';

const WeatherIcon: React.FC<{ icon: WeatherIconType }> = ({ icon }) => {
    const commonProps = { className: "w-6 h-6 mr-2 flex-shrink-0" };
    switch (icon) {
        case 'SUNNY':
            return <SunIcon {...commonProps} className={`${commonProps.className} text-yellow-400`} />;
        case 'PARTLY_CLOUDY':
            return <PartlyCloudyIcon {...commonProps} />;
        case 'CLOUDY':
            return <CloudIcon {...commonProps} className={`${commonProps.className} text-gray-400 dark:text-gray-500`} />;
        case 'RAINY':
            return <RainIcon {...commonProps} className={`${commonProps.className} text-blue-500 dark:text-blue-400`} />;
        case 'THUNDERSTORM':
            return <ThunderstormIcon {...commonProps} className={`${commonProps.className} text-purple-500 dark:text-purple-400`} />;
        case 'SNOWY':
            return <SnowIcon {...commonProps} className={`${commonProps.className} text-cyan-300 dark:text-cyan-400`} />;
        case 'WINDY':
             return <WindyIcon {...commonProps} className={`${commonProps.className} text-gray-500 dark:text-gray-400`} />;
        case 'UNKNOWN':
        default:
            return <ThermometerIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />;
    }
};


export const LiveConditions: React.FC = () => {
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = () => {
            try {
                const cachedDataJSON = localStorage.getItem('flex-optimizer-weather-cache');
                if (cachedDataJSON) {
                    const { data, timestamp } = JSON.parse(cachedDataJSON);
                    if (Date.now() - timestamp < (15 * 60 * 1000)) { // 15 minutes cache
                        setWeather(data);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.error("Could not read from weather cache", e);
            }

            if (!navigator.geolocation) {
                setError("Geolocation is not supported by your browser.");
                setIsLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const weatherData = await getCurrentWeather({ lat: latitude, lon: longitude });
                        setWeather(weatherData);
                        setError(null);
                        
                        try {
                            const cacheEntry = { data: weatherData, timestamp: Date.now() };
                            localStorage.setItem('flex-optimizer-weather-cache', JSON.stringify(cacheEntry));
                        } catch (e) {
                             console.error("Could not save weather to cache", e);
                        }
                    } catch (err) {
                        console.error("Failed to fetch weather data:", err);
                        setError(err instanceof Error ? err.message : "Could not retrieve weather data.");
                    } finally {
                        setIsLoading(false);
                    }
                },
                (geoError) => {
                    console.error("Geolocation error:", geoError);
                    let errorMessage = "Could not get your location for weather. ";
                    if (geoError.code === geoError.PERMISSION_DENIED) {
                        errorMessage += "Please grant location permission.";
                    } else {
                        errorMessage += "Please check your device's location settings.";
                    }
                    setError(errorMessage);
                    setIsLoading(false);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 } // cache for 1 hour
            );
        };
        fetchWeather();
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return (
                 <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse mr-2"></div>
                    <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                 </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center text-yellow-600 dark:text-yellow-400/80">
                    <WarningIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            );
        }

        if (weather) {
            return (
                 <div className="flex items-center text-gray-800 dark:text-gray-300">
                    <WeatherIcon icon={weather.icon} />
                    <p className="font-semibold">{weather.temperature}</p>
                    <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                    <p>{weather.condition}</p>
                </div>
            );
        }
        
        return null;
    };

    return (
        <div className="mt-6 p-3 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-lg flex justify-center">
            {renderContent()}
        </div>
    );
};
