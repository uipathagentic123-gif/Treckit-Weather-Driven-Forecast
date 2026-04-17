import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, SupplyAnalysis } from "../types";
import { OBFUSCATED_PRODUCTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeSupplyChain(weather: WeatherData): Promise<SupplyAnalysis> {
  const productList = OBFUSCATED_PRODUCTS.map(p => `${p.name} (${p.category})`).join(", ");
  
  const prompt = `
    Analyze the following weather conditions and provide supply chain and manufacturing advice for a consumer goods company.
    
    Current Weather:
    - Temperature: ${weather.temperature}°C
    - Condition: ${weather.condition}
    - Humidity: ${weather.humidity}%
    - Precipitation: ${weather.precipitation}mm
    
    Products to consider: ${productList}
    
    Tasks:
    1. For each product, determine if the current weather warrants an 'Increase Supply', 'Maintain Supply', or 'Decrease Supply' in the immediate region. 
       - Provide a brief reason explaining the correlation between the weather and consumer behavior.
    2. Provide manufacturing advice specifically for the NEXT QUARTER (the upcoming 3-month block). 
       - You MUST include ALL ${OBFUSCATED_PRODUCTS.length} products in this forecast.
       - Decide if we should 'Scale Up', 'Steady', or 'Scale Down' production now to meet that future demand.
    3. For each product, specify the best raw materials and packaging materials required that would improve sales (e.g., eco-friendly packaging, premium raw ingredients, moisture-resistant materials for humid weather).
       - Provide a 'salesImpactNote' explaining why these materials will drive sales.
    4. Provide a general seasonal outlook summary.
    
    Important: This is a Strategic Advisory tool. It does NOT know the user's actual inventory levels. Recommendations are relative to a standard baseline.
    
    Strictly use the product names as provided: ${OBFUSCATED_PRODUCTS.map(p => p.name).join(", ")}.
    Do NOT mention the company name 'Reckitt' or 'Treckit' or the original product names.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productRecommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING },
                category: { type: Type.STRING },
                currentAction: { type: Type.STRING, enum: ["Increase Supply", "Maintain Supply", "Decrease Supply"] },
                reason: { type: Type.STRING }
              },
              required: ["productName", "category", "currentAction", "reason"]
            }
          },
          manufacturingForecast: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING },
                forecastAction: { type: Type.STRING, enum: ["Scale Up", "Steady", "Scale Down"] },
                confidence: { type: Type.NUMBER },
                strategicNote: { type: Type.STRING }
              },
              required: ["productName", "forecastAction", "confidence", "strategicNote"]
            }
          },
          materialStrategy: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING },
                rawMaterial: { type: Type.STRING },
                packagingMaterial: { type: Type.STRING },
                salesImpactNote: { type: Type.STRING }
              },
              required: ["productName", "rawMaterial", "packagingMaterial", "salesImpactNote"]
            }
          },
          seasonalOutlook: { type: Type.STRING }
        },
        required: ["productRecommendations", "manufacturingForecast", "materialStrategy", "seasonalOutlook"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  return {
    currentWeather: weather,
    ...result
  };
}
