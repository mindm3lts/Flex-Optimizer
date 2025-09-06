import { GoogleGenAI, Type } from "@google/genai";
import type { RouteStop, PackageType, RouteSummary, TrafficInfo, TrafficStatus, Geolocation } from "../types";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:image/jpeg;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

interface GeminiAddressResponse {
    stopNumber: number;
    street: string;
    city: string;
    state: string;
    zip: string;
    notes?: string;
    packageType?: string;
    tba?: string;
    packageLabel?: string;
}

interface GeminiRouteInfoResponse {
    stops: GeminiAddressResponse[];
    routeBlockCode?: string;
}


const isValidPackageType = (type: string): type is PackageType => {
    return ["Box", "Envelope", "Plastic Bag", "Custom Sized", "Unknown"].includes(type);
}

const isValidTrafficStatus = (status: string): status is TrafficStatus => {
    return ["Light", "Moderate", "Heavy", "Unknown"].includes(status);
}

export const processRouteScreenshot = async (file: File): Promise<{ stops: RouteStop[], routeBlockCode?: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const base64Image = await fileToBase64(file);
  const imagePart = {
    inlineData: {
      mimeType: file.type,
      data: base64Image,
    },
  };

  const textPart = {
    text: `Analyze this screenshot, which may be one of several, from an Amazon Flex delivery route. Extract the route's block code (e.g., "#VCA1") and all delivery addresses in the correct stop order. For each stop, extract: 'stopNumber', 'street', 'city', 'state', 'zip', 'notes', 'packageType', 'tba', and 'packageLabel'. Provide the output as a valid JSON object with a "routeBlockCode" key and a "stops" key containing an array of stop objects. If a field isn't found, use defaults.`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            routeBlockCode: { type: Type.STRING, description: "The route's block code, like '#VCA1'."},
            stops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stopNumber: { type: Type.INTEGER, description: "The stop number in the route sequence." },
                  street: { type: Type.STRING, description: "The street address, including house/apartment number." },
                  city: { type: Type.STRING, description: "The city." },
                  state: { type: Type.STRING, description: "The two-letter state abbreviation." },
                  zip: { type: Type.STRING, description: "The 5-digit zip code." },
                  notes: { type: Type.STRING, description: "Any delivery notes, e.g., 'Leave at front door'." },
                  packageType: { type: Type.STRING, description: 'The type of package, e.g., "Box", "Envelope".' },
                  tba: { type: Type.STRING, description: "The TBA tracking number." },
                  packageLabel: { type: Type.STRING, description: "The driver's aid sticker code, e.g., 'A.1Z'." },
                },
                required: ["stopNumber", "street", "city", "state", "zip"],
              },
            }
          }
        },
      },
    });

    const jsonText = response.text.trim();
    let parsedResponse: GeminiRouteInfoResponse;

    try {
      const parsedJson = JSON.parse(jsonText);
      if (typeof parsedJson !== 'object' || !Array.isArray(parsedJson.stops)) {
        console.error("Gemini API returned an invalid JSON structure:", parsedJson);
        throw new Error("Parsed JSON is not a valid route info object.");
      }
      parsedResponse = parsedJson as GeminiRouteInfoResponse;
    } catch (e) {
      console.error("Failed to parse or validate Gemini API response as JSON.");
      console.error("Received text:", jsonText);
      console.error("Parsing error:", e);
      throw new Error("The AI model returned an unexpected data format. Please try again with a clearer screenshot.");
    }
    
    const rawAddresses = parsedResponse.stops;
    rawAddresses.sort((a, b) => a.stopNumber - b.stopNumber);

    const addresses: RouteStop[] = rawAddresses.map(addr => {
      const packageType = addr.packageType && isValidPackageType(addr.packageType) ? addr.packageType : "Unknown";
      return {
        originalStopNumber: addr.stopNumber,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        label: addr.notes || '',
        packageType: packageType,
        tba: addr.tba || '',
        packageLabel: addr.packageLabel || '',
      };
    });
    
    return { stops: addresses, routeBlockCode: parsedResponse.routeBlockCode };
  } catch (error) {
    console.error("Error calling or processing Gemini API response:", error);
    if (error instanceof Error && error.message.startsWith("The AI model returned")) {
        throw error; 
    }
    throw new Error("Failed to process the image with the AI. The image might be unclear or not a valid route screenshot.");
  }
};


export const optimizeRouteOrder = async (stops: RouteStop[], startLocation?: Geolocation): Promise<RouteStop[]> => {
  if (stops.length < 2) return stops;
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const promptInput = stops.map(s => ({
    originalStopNumber: s.originalStopNumber,
    address: `${s.street}, ${s.city}, ${s.state} ${s.zip}`
  }));
  
  let promptText = `You are an expert route optimization assistant for delivery drivers. I have a list of stops identified by their 'originalStopNumber' and address: ${JSON.stringify(promptInput)}.`;

  if (startLocation) {
    promptText += ` The driver is starting from the GPS coordinates: latitude ${startLocation.lat}, longitude ${startLocation.lon}.`;
  }

  promptText += ` Reorder these stops to create the most efficient delivery route. Provide the response as a JSON array of objects, where each object contains only the 'originalStopNumber' in the new optimized sequence. For example, if the optimal route is stop 5, then stop 2, your response should be [{ "originalStopNumber": 5 }, { "originalStopNumber": 2 }].`;


  const textPart = {
    text: promptText
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalStopNumber: { type: Type.INTEGER },
            },
            required: ["originalStopNumber"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    let optimizedOrder: { originalStopNumber: number }[];
    try {
      optimizedOrder = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse optimized order response:", jsonText, e);
      throw new Error("AI returned an invalid format for the optimized route.");
    }
    
    if (!Array.isArray(optimizedOrder) || optimizedOrder.some(item => typeof item.originalStopNumber !== 'number')) {
      throw new Error("AI response for optimized route is not in the expected format.");
    }

    const stopMap = new Map(stops.map(s => [s.originalStopNumber, s]));
    const reorderedStops = optimizedOrder
      .map(orderInfo => stopMap.get(orderInfo.originalStopNumber))
      .filter((s): s is RouteStop => s !== undefined);
    
    if (reorderedStops.length !== stops.length) {
       console.warn("Optimized route length differs from original. Some stops may have been dropped by the AI.", { original: stops.length, optimized: reorderedStops.length });
       // Fallback or partial result could be handled here. For now, we return what we got.
    }

    return reorderedStops;

  } catch (error) {
    console.error("Error calling Gemini API for route optimization:", error);
    throw new Error("Failed to get an optimized route from the AI. Please try again.");
  }
};


export const getRouteSummary = async (stops: RouteStop[]): Promise<RouteSummary> => {
  if (stops.length === 0) {
    return { totalStops: 0, totalDistance: "0 miles", totalTime: "0 minutes" };
  }
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const addressesString = stops.map(s => `"${s.street}, ${s.city}, ${s.state} ${s.zip}"`).join(', ');

  const textPart = {
    text: `Given the following list of ordered delivery addresses: [${addressesString}], calculate the estimated total driving distance and total driving time for the entire route. Assume travel is by car and starts at the first address and ends at the last. Provide the response as a single JSON object with two keys: "totalDistance" (a string like "X miles" or "X km") and "totalTime" (a string like "X hours Y minutes").`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalDistance: { type: Type.STRING, description: "The estimated total driving distance, e.g., '52.3 miles'." },
            totalTime: { type: Type.STRING, description: "The estimated total driving time, e.g., '2 hours 15 minutes'." },
          },
          required: ["totalDistance", "totalTime"],
        },
      },
    });

    const jsonText = response.text.trim();
    const summaryData = JSON.parse(jsonText);

    return {
      totalStops: stops.length,
      totalDistance: summaryData.totalDistance,
      totalTime: summaryData.totalTime,
    };
  } catch (error) {
    console.error("Error calling Gemini API for route summary:", error);
    throw new Error("Failed to get route summary from the AI.");
  }
};

export const getLiveTraffic = async (stops: RouteStop[]): Promise<TrafficInfo> => {
  if (stops.length < 2) {
    return { status: "Unknown", summary: "At least two stops are needed to analyze traffic.", lastUpdated: new Date().toLocaleTimeString() };
  }
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const addressesString = stops.map(s => `"${s.street}, ${s.city}, ${s.state} ${s.zip}"`).join('; ');

  const textPart = {
    text: `Analyze the current, real-time traffic conditions for a delivery route between the following ordered stops: ${addressesString}. Provide a concise analysis as a JSON object with two keys: "status" (one of "Light", "Moderate", or "Heavy") and "summary" (a brief, one-sentence description of the current traffic conditions, mentioning any significant delays or clear areas).`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: 'Traffic status: "Light", "Moderate", or "Heavy".' },
            summary: { type: Type.STRING, description: "A brief summary of traffic conditions." },
          },
          required: ["status", "summary"],
        },
      },
    });

    const jsonText = response.text.trim();
    const trafficData = JSON.parse(jsonText);
    
    const status = isValidTrafficStatus(trafficData.status) ? trafficData.status : "Unknown";

    return {
      status: status,
      summary: trafficData.summary,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (error) {
    console.error("Error calling Gemini API for live traffic:", error);
    throw new Error("Failed to get live traffic data from the AI.");
  }
};