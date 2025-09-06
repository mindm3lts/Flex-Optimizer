import React, { useState, useEffect } from 'react';
import { getCurrentWeather } from '../services/geminiService';
import type { WeatherInfo } from '../types';
import { ThermometerIcon, WarningIcon } from './icons';

export const LiveConditions: React.FC = () => {
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setIsLoading(false);
            return;
        }

        const fetchWeather = () => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const weatherData = await getCurrentWeather({ lat: latitude, lon: longitude });
                        setWeather(weatherData);
                        setError(null);
                    } catch (err) {
                        console.error("Failed to fetch weather data:", err);
                        setError("Could not retrieve weather data.");
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
                    <ThermometerIcon className="w-5 h-5 mr-2 text-cyan-500 dark:text-cyan-400" />
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