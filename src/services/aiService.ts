import type { RouteStop, RouteSummary, TrafficInfo, WeatherInfo, Geolocation, AiSettings } from "../types";
import * as geminiProvider from './providers/gemini';

// Hardcoded settings for the application. Provider and model can be changed here.
const aiSettings: AiSettings = {
    provider: 'gemini',
    model: 'gemini-2.5-flash'
};

const getProvider = (provider: string) => {
    switch(provider) {
        case 'gemini':
            return geminiProvider;
        // Future providers can be added here
        // case 'openai':
        //     return openaiProvider;
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

const validateSettings = () => {
    // FIX: Use process.env.API_KEY as per the guidelines.
    if (!process.env.API_KEY) {
        // FIX: Updated error message to be more general about environment variables.
        throw new Error("API key is missing. This app requires an API_KEY environment variable to be set. Please follow the setup instructions in the README.");
    }
}

export const processRouteScreenshot = (file: File): Promise<{ stops: RouteStop[], routeBlockCode?: string }> => {
    validateSettings();
    const provider = getProvider(aiSettings.provider);
    return provider.processRouteScreenshot(file, aiSettings);
}

export const optimizeRouteOrder = (stops: RouteStop[], startLocation: Geolocation | undefined, avoidLeftTurns: boolean): Promise<RouteStop[]> => {
    validateSettings();
    const provider = getProvider(aiSettings.provider);
    return provider.optimizeRouteOrder(stops, startLocation, avoidLeftTurns, aiSettings);
}

export const getRouteSummary = (stops: RouteStop[]): Promise<RouteSummary> => {
    validateSettings();
    const provider = getProvider(aiSettings.provider);
    return provider.getRouteSummary(stops, aiSettings);
}

export const getLiveTraffic = (stops: RouteStop[]): Promise<TrafficInfo> => {
    validateSettings();
    const provider = getProvider(aiSettings.provider);
    return provider.getLiveTraffic(stops, aiSettings);
}

export const getCurrentWeather = (location: Geolocation): Promise<WeatherInfo> => {
    validateSettings();
    const provider = getProvider(aiSettings.provider);
    return provider.getCurrentWeather(location, aiSettings);
};