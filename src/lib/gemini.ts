import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisSchema, type GeminiAnalysis } from "@/types";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ANALYSIS_PROMPT = `You are a nutritionist AI. Analyze this food photo and identify each food item visible.

For each item, provide:
- name: Korean name of the food (한국어)
- calories: estimated calories (kcal) as an integer
- amount: estimated portion size (e.g., "1인분", "200g", "1개")

Respond ONLY with valid JSON in this exact format:
{
  "items": [
    { "name": "음식이름", "calories": 300, "amount": "1인분" }
  ],
  "totalCalories": 300
}

Be accurate with Korean food calorie estimates. If unsure, use standard serving sizes.`;

export async function analyzeFood(
  imageBase64: string,
  mimeType: string
): Promise<GeminiAnalysis> {
  const response = await client.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: ANALYSIS_PROMPT },
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text) as unknown;
  return GeminiAnalysisSchema.parse(parsed);
}
