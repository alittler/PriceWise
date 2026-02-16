
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from "../types";

export const analyzeGroceryImage = async (base64Image: string): Promise<AnalysisResponse | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1],
            },
          },
          {
            text: "Analyze this grocery item or price tag. Extract the product name, brand, total price, quantity, and unit. Be accurate with weights and currency. Categorize it as 'weight', 'volume', or 'count'."
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            price: { type: Type.NUMBER },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING, description: "Examples: g, kg, ml, l, oz, lb, unit, counts" },
            category: { type: Type.STRING, enum: ['weight', 'volume', 'count'] }
          },
          required: ["name", "price", "quantity", "unit", "category"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AnalysisResponse;
  } catch (error) {
    console.error("Error analyzing image:", error);
    return null;
  }
};
