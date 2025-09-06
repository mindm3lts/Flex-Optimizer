import { GoogleGenAI, Type } from "@google/genai";
import type { RouteStop, RouteSummary, TrafficInfo, WeatherInfo, Geolocation } from "../types";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const processRouteScreenshot = async (file: File): Promise<{ stops: RouteStop[], routeBlockCode?: string }> => {
  const base64Image = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  try {
    return JSON.parse(resultText);
  } catch (e) {
    console.error("Failed to parse JSON response for screenshot processing:", resultText, e);
    if (e instanceof SyntaxError) {
        throw new Error("The AI returned an invalid response. The screenshot may be blurry or unreadable. Please try again.");
    }
    throw new Error("Could not understand the route data from the screenshot. Check image quality.");
  }
};

export const optimizeRouteOrder = async (stops: RouteStop[], startLocation?: Geolocation, avoidLeftTurns?: boolean): Promise<RouteStop[]> => {
  const prompt = `
    Optimize the following list of delivery stops for an Amazon Flex driver to find the most efficient route that minimizes travel time and distance.
    ${startLocation ? `The route must start from the current location: latitude ${startLocation.lat}, longitude ${startLocation.lon}.` : ''}
    ${avoidLeftTurns ? 'The driver prefers to avoid left turns where possible. Please factor this into the optimization.' : ''}
    
    The output must be the full list of stops, reordered for optimal efficiency.
    Each stop object in the output must be identical in structure to the input objects. Do not add, remove, or alter any fields.
    Input Stops:
    ${JSON.stringify(stops, null, 2)}
    Return ONLY the reordered list of stops as a valid JSON array.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
          },
          required: ["originalStopNumber", "street", "city", "state", "zip", "label", "packageType", "tba", "packageLabel", "stopType"],
        },
      },
    },
  });
  
  const resultText = response.text.trim();
  try {
    return JSON.parse(resultText);
  } catch (e) {
    console.error("Failed to parse JSON response for optimization:", resultText, e);
    if (e instanceof SyntaxError) {
        throw new Error("The AI returned an invalid response during optimization. Please try again.");
    }
    throw new Error("Could not parse the optimized route from the AI response.");
  }
};

export const getRouteSummary = async (stops: RouteStop[]): Promise<RouteSummary> => {
    if (stops.length === 0) {
        return { totalStops: 0, totalDistance: "0 miles", totalTime: "0 minutes" };
    }
    const addresses = stops.map(s => `"${s.street}, ${s.city}"`);
    const prompt = `
        Calculate the estimated total driving distance (in miles) and time for a route with these stops: ${addresses.join(', ')}.
        Provide the total distance and total time in a human-readable format (e.g., "35.5 miles", "1 hour 25 minutes").
        Return a JSON object with keys "totalDistance" and "totalTime".
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    try {
        const summary = JSON.parse(resultText);
        return {
            ...summary,
            totalStops: stops.length,
        };
    } catch (e) {
        console.error("Failed to parse JSON response for summary:", resultText, e);
        if (e instanceof SyntaxError) {
            throw new Error("The AI returned an invalid summary response. Please try again.");
        }
        throw new Error("Could not parse the route summary from the AI response.");
    }
};

export const getLiveTraffic = async (stops: RouteStop[]): Promise<TrafficInfo> => {
    if (stops.length === 0) {
        return { status: "Unknown", summary: "No route to analyze.", lastUpdated: new Date().toLocaleTimeString() };
    }
    const waypoints = stops.map(s => `"${s.city}, ${s.state}"`).join(' through ');
    const prompt = `Provide a traffic summary for a route in the area of ${waypoints}. Give a status ("Light", "Moderate", "Heavy", or "Unknown") and a brief summary. Respond in JSON format.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

    try {
        const data = JSON.parse(response.text);
        return { ...data, lastUpdated: new Date().toLocaleTimeString() };
    } catch (e) {
        console.error("Failed to parse traffic data", e);
        return { status: "Unknown", summary: "Could not retrieve traffic data.", lastUpdated: new Date().toLocaleTimeString() };
    }
};

export const getCurrentWeather = async (location: Geolocation): Promise<WeatherInfo> => {
  const prompt = `What is the current weather at latitude ${location.lat} and longitude ${location.lon}? Provide the temperature (in Fahrenheit, e.g., "72°F") and a brief condition description (e.g., "Clear", "Cloudy"). Respond in JSON format with keys "temperature" and "condition".`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          temperature: { type: Type.STRING },
          condition: { type: Type.STRING },
        },
        required: ["temperature", "condition"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse weather data", e);
    return { temperature: 'N/A', condition: 'Could not retrieve weather data.' };
  }
};