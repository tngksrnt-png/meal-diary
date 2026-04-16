"use server";

import { analyzeFood } from "@/lib/gemini";
import type { GeminiAnalysis } from "@/types";

export async function analyzeFoodPhoto(
  formData: FormData
): Promise<{ success: true; data: GeminiAnalysis } | { success: false; error: string }> {
  const file = formData.get("photo") as File | null;
  if (!file) {
    return { success: false, error: "사진을 선택해주세요" };
  }

  try {
    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const analysis = await analyzeFood(base64, file.type || "image/webp");
    return { success: true, data: analysis };
  } catch (error) {
    console.error("Analysis failed:", error);
    return { success: false, error: "음식 분석에 실패했습니다. 다시 시도해주세요." };
  }
}
