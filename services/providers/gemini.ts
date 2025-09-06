import { GoogleGenAI, Type } from "@google/genai";
import type { RouteStop, RouteSummary, TrafficInfo, WeatherInfo, Geolocation, AiSettings } from "../../types";

// Initialize the Google GenAI client once using the environment variable.
// The API key's presence is validated in the aiService layer before any provider functions are called.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:..." prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Gemini Error (${context}):`, error);

    if (error instanceof SyntaxError) {
        return new Error(`The AI returned an invalid response while ${context}. The screenshot might be blurry or the AI model produced malformed JSON.`);
    }

    let message = `An unexpected error occurred while ${context}. The AI service may be temporarily unavailable.`;
    let errorDetails = '';

    if (error && typeof error === 'object' && 'message' in error) {
        errorDetails = String(error.message).toLowerCase();
    } else if (error instanceof Error) {
        errorDetails = error.message.toLowerCase();
    }
    
    if (errorDetails.includes('api key not valid')) {
        message = 'Your API key is invalid or expired. Please ensure the API_KEY environment variable is set correctly.';
    } else if (errorDetails.includes('permission denied')) {
        message = 'The API key is missing permissions. Please check your Google Cloud project settings.';
    } else if (errorDetails.includes('quota') || errorDetails.includes('resource_exhausted')) {
        message = 'You have exceeded your API quota for the day. Please check your usage limits or try again later.';
    } else if (errorDetails.includes('fetch failed') || errorDetails.includes('network') || errorDetails.includes('dns')) {
        message = 'Could not connect to the AI service. Please check your internet connection.';
    } else if (errorDetails.includes('candidate was blocked due to safety')) {
        message = 'The request was blocked due to safety settings. Try a different request.';
    }

    return new Error(message);
};


export const processRouteScreenshot = async (file: File, settings: AiSettings): Promise<{ stops: RouteStop[], routeBlockCode?: string }> => {
  const base64Image = await fileToBase64(file);

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Image,
            },
          },
          {
            text: `Analyze this Amazon Flex route screenshot. Extract all delivery stops. For each stop, provide:
- originalStopNumber (integer)
- street (string)
- city (string)
- state (string)
- zip (string)
- tba (string)
- packageLabel (string, e.g., "A.1Z")
- packageType (enum: "Box", "Envelope", "Plastic Bag", "Custom Sized", "Unknown")
- stopType (enum: "House", "Apartment", "Business", "Locker", "Unknown")
- isPriority (boolean, true if a priority stop)
- deliveryWindowEnd (string, in "HH:mm" format if present)

Also, find the Route Block Code (e.g., "VCN3 - 4:00 PM - 4.5 hrs").
Set 'label' for each stop to an empty string by default.
Output ONLY a valid JSON object matching the provided schema.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            routeBlockCode: { type: Type.STRING, description: 'The route block code, e.g., VCN3 - 4:00 PM - 4.5 hrs' },
            stops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalStopNumber: { type: Type.INTEGER },
                  street: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  zip: { type: Type.STRING },
                  label: { type: Type.STRING, description: "Any notes or labels. Defaults to empty string." },
                  packageType: { type: Type.STRING, enum: ["Box", "Envelope", "Plastic Bag", "Custom Sized", "Unknown"] },
                  tba: { type: Type.STRING },
                  packageLabel: { type: Type.STRING },
                  stopType: { type: Type.STRING, enum: ["House", "Apartment", "Business", "Locker", "Unknown"] },
                  isPriority: { type: Type.BOOLEAN },
                  deliveryWindowEnd: { type: Type.STRING },
                },
                required: ["originalStopNumber", "street", "city", "state", "zip", "packageType", "tba", "packageLabel", "stopType", "label"],
              },
            },
          },
          required: ["stops"],
        },
      },
    });

    const resultText = response.text.trim();
    const parsedResult = JSON.parse(resultText);
    const stopsWithStatus = parsedResult.stops.map((stop: RouteStop) => ({
      ...stop,
      status: 'pending' as const,
    }));
    return { ...parsedResult, stops: stopsWithStatus };
  } catch (e) {
    throw handleGeminiError(e, "processing the route screenshot");
  }
};

export const optimizeRouteOrder = async (stops: RouteStop[], startLocation: Geolocation | undefined, avoidLeftTurns: boolean | undefined, settings: AiSettings): Promise<RouteStop[]> => {
  const prompt = `
    Optimize the following list of delivery stops for an Amazon Flex driver to find the most efficient route that minimizes travel time and distance.
    ${startLocation ? `The route must start from the current location: latitude ${startLocation.lat}, longitude ${startLocation.lon}.` : ''}
    ${avoidLeftTurns ? 'The driver prefers to avoid left turns where possible. Please factor this into the optimization.' : ''}
    
    The output must be the full list of stops, reordered for optimal efficiency.
    Each stop object in the output must be identical in structure to the input objects. Do not add, remove, or alter any fields, including optional ones like 'status', 'completedAt', or 'isCurrentStop'.
    Input Stops:
    ${JSON.stringify(stops, null, 2)}
    Return ONLY the reordered list of stops as a valid JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalStopNumber: { type: Type.INTEGER },
              street: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              zip: { type: Type.STRING },
              label: { type: Type.STRING },
              packageType: { type: Type.STRING },
              tba: { type: Type.STRING },
              packageLabel: { type: Type.STRING },
              stopType: { type: Type.STRING },
              type: { type: Type.STRING },
              deliveryWindowEnd: { type: Type.STRING },
              isPriority: { type: Type.BOOLEAN },
              status: { type: Type.STRING, enum: ["pending", "delivered", "attempted", "skipped"] },
              completedAt: { type: Type.STRING },
              isCurrentStop: { type: Type.BOOLEAN },
            },
            required: ["originalStopNumber", "street", "city", "state", "zip", "label", "packageType", "tba", "packageLabel", "stopType"],
          },
        },
      },
    });
    
    const resultText = response.text.trim();
    return JSON.parse(resultText);
  } catch (e) {
    throw handleGeminiError(e, "optimizing the route order");
  }
};

export const getRouteSummary = async (stops: RouteStop[], settings: AiSettings): Promise<RouteSummary> => {
    if (stops.length === 0) {
        return { totalStops: 0, totalDistance: "0 miles", totalTime: "0 minutes" };
    }
    const addresses = stops.map(s => `"${s.street}, ${s.city}"`);
    const prompt = `
        Calculate the estimated total driving distance (in miles) and time for a route with these stops: ${addresses.join(', ')}.
        Provide the total distance and total time in a human-readable format (e.g., "35.5 miles", "1 hour 25 minutes").
        Return a JSON object with keys "totalDistance" and "totalTime".
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: settings.model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        totalDistance: { type: Type.STRING },
                        totalTime: { type: Type.STRING },
                    },
                    required: ["totalDistance", "totalTime"],
                },
            },
        });
        
        const resultText = response.text.trim();
        const summary = JSON.parse(resultText);
        return {
            ...summary,
            totalStops: stops.length,
        };
    } catch (e) {
        throw handleGeminiError(e, "calculating the route summary");
    }
};

export const getLiveTraffic = async (stops: RouteStop[], settings: AiSettings): Promise<TrafficInfo> => {
    if (stops.length === 0) {
        return { status: "Unknown", summary: "No route to analyze.", lastUpdated: new Date().toLocaleTimeString() };
    }
    const waypoints = stops.map(s => `"${s.city}, ${s.state}"`).join(' through ');
    const prompt = `Provide a traffic summary for a route in the area of ${waypoints}. Give a status ("Light", "Moderate", "Heavy", or "Unknown") and a brief summary. Respond in JSON format.`;
    
    try {
        const response = await ai.models.generateContent({
            model: settings.model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        status: { type: Type.STRING, enum: ["Light", "Moderate", "Heavy", "Unknown"] },
                        summary: { type: Type.STRING },
                    },
                    required: ["status", "summary"]
                }
            }
        });

        const data = JSON.parse(response.text);
        return { ...data, lastUpdated: new Date().toLocaleTimeString() };
    } catch (e) {
        const err = handleGeminiError(e, "fetching live traffic");
        return { status: "Unknown", summary: err.message, lastUpdated: new Date().toLocaleTimeString() };
    }
};

export const getCurrentWeather = async (location: Geolocation, settings: AiSettings): Promise<WeatherInfo> => {
  const prompt = `What is the current weather at latitude ${location.lat} and longitude ${location.lon}? Provide the temperature (in Fahrenheit, e.g., "72°F"), a brief condition description (e.g., "Clear", "Partly Cloudy"), and an icon identifier. The icon identifier must be one of the following strings: "SUNNY", "CLOUDY", "RAINY", "SNOWY", "THUNDERSTORM", "WINDY", "PARTLY_CLOUDY", "UNKNOWN". Respond in JSON format with keys "temperature", "condition", and "icon".`;
  
  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            temperature: { type: Type.STRING },
            condition: { type: Type.STRING },
            icon: { type: Type.STRING, enum: ["SUNNY", "CLOUDY", "RAINY", "SNOWY", "THUNDERSTORM", "WINDY", "PARTLY_CLOUDY", "UNKNOWN"] },
          },
          required: ["temperature", "condition", "icon"],
        },
      },
    });
    return JSON.parse(response.text);
  } catch (e) {
    throw handleGeminiError(e, "fetching the current weather");
  }
};
