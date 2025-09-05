import { GoogleGenAI, Type } from "@google/genai";
import type { RouteStop, PackageType } from "../types";

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

const isValidPackageType = (type: string): type is PackageType => {
    return ["Box", "Envelope", "Plastic Bag", "Custom Sized", "Unknown"].includes(type);
}

export const processRouteScreenshot = async (file: File): Promise<RouteStop[]> => {
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
    text: `Analyze this screenshot of an Amazon Flex delivery route. Extract all delivery addresses in the correct stop order. For each stop, extract the following details: 'stopNumber', 'street', 'city', 'state', 'zip', 'notes' (any delivery notes), 'packageType' (e.g., "Box", "Envelope", "Plastic Bag", "Custom Sized"), 'tba' (the long tracking number), and 'packageLabel' (the driver's aid sticker, e.g., "A.1Z"). Provide the output as a valid JSON array. If a field is not found, use an empty string or a sensible default like "Unknown" for packageType.`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        },
      },
    });

    const jsonText = response.text.trim();
    let rawAddresses: GeminiAddressResponse[];

    try {
      const parsedJson = JSON.parse(jsonText);
      if (!Array.isArray(parsedJson)) {
        console.error("Gemini API returned a non-array JSON object:", parsedJson);
        throw new Error("Parsed JSON is not an array.");
      }
      rawAddresses = parsedJson;
    } catch (e) {
      console.error("Failed to parse or validate Gemini API response as a JSON array.");
      console.error("Received text:", jsonText);
      console.error("Parsing error:", e);
      throw new Error("The AI model returned an unexpected data format. Please try again with a clearer screenshot.");
    }
    
    // Sort by stop number just in case the model doesn't return them in order
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
    
    return addresses;
  } catch (error) {
    console.error("Error calling or processing Gemini API response:", error);
    if (error instanceof Error && error.message.startsWith("The AI model returned")) {
        throw error; 
    }
    throw new Error("Failed to process the image with the AI. The image might be unclear or not a valid route screenshot.");
  }
};