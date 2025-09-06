import type { RouteStop, RouteSummary, TrafficInfo, WeatherInfo, Geolocation, AiSettings } from "../types";
import * as geminiProvider from './providers/gemini';

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

const validateSettings = (settings: AiSettings) => {
    if (!settings.apiKey) {
        throw new Error("API key is missing. Please add your key in the settings menu (⚙️).");
    }
     if (!settings.model) {
        throw new Error("AI Model is not configured. Please add the model name in the settings menu (⚙️).");
    }
}

export const processRouteScreenshot = (file: File, settings: AiSettings): Promise<{ stops: RouteStop[], routeBlockCode?: string }> => {
    validateSettings(settings);
    const provider = getProvider(settings.provider);
    return provider.processRouteScreenshot(file, settings);
}

export const optimizeRouteOrder = (stops: RouteStop[], startLocation: Geolocation | undefined, avoidLeftTurns: boolean, settings: AiSettings): Promise<RouteStop[]> => {
    validateSettings(settings);
    const provider = getProvider(settings.provider);
    return provider.optimizeRouteOrder(stops, startLocation, avoidLeftTurns, settings);
}

export const getRouteSummary = (stops: RouteStop[], settings: AiSettings): Promise<RouteSummary> => {
    validateSettings(settings);
    const provider = getProvider(settings.provider);
    return provider.getRouteSummary(stops, settings);
}

export const getLiveTraffic = (stops: RouteStop[], settings: AiSettings): Promise<TrafficInfo> => {
    validateSettings(settings);
    const provider = getProvider(settings.provider);
    return provider.getLiveTraffic(stops, settings);
}

export const getCurrentWeather = (location: Geolocation, settings: AiSettings): Promise<WeatherInfo> => {
    validateSettings(settings);
    const provider = getProvider(settings.provider);
    return provider.getCurrentWeather(location, settings);
};