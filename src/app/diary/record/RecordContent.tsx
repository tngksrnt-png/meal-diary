"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import NavBar from "@/components/NavBar";
import MealTimeSelector from "@/components/MealTimeSelector";
import PhotoUploader from "@/components/PhotoUploader";
import { analyzeFoodPhoto } from "@/actions/analyze";
import { createMeal } from "@/actions/meals";
import { fadeInUp } from "@/lib/motionPresets";
import type { MealType, GeminiAnalysis } from "@/types";

function getToday(): string {
  return new Date().toISOString().split("T")[0]!;
}

export default function RecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") ?? getToday();

  const [date, setDate] = useState(initialDate);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoReady = useCallback((file: File) => {
    setPhotoFile(file);
    setAnalysis(null);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!photoFile) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", photoFile);

    const result = await analyzeFoodPhoto(formData);
    if (result.success) {
      setAnalysis(result.data);
    } else {
      setError(result.error);
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    if (!photoFile || !analysis) return;
    setSaving(true);

    const result = await createMeal({
      date,
      mealType,
      photoFile,
      items: analysis.items,
      totalCalories: analysis.totalCalories,
    });

    if (result.success) {
      router.push("/diary");
    } else {
      setError(result.error);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-apple-gray">
      <NavBar />

      <main className="mx-auto max-w-lg px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-[14px] text-apple-link hover:underline"
        >
          ← 돌아가기
        </button>

        <h1 className="mb-6 text-[28px] font-semibold leading-[1.14] text-apple-text tracking-[0.196px]">
          식사 기록
        </h1>

        {/* Date */}
        <div className="mb-4">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-apple-text/50">
            날짜
          </label>
          <input
            type="date"
            value={date}
            max={getToday()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[8px] border border-black/10 bg-white px-3 py-2.5 text-[17px] text-apple-text outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        {/* Meal Time */}
        <div className="mb-6">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-apple-text/50">
            식사 시간
          </label>
          <MealTimeSelector value={mealType} onChange={setMealType} />
        </div>

        {/* Photo Upload */}
        <div className="mb-6">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-apple-text/50">
            음식 사진
          </label>
          <PhotoUploader
            onPhotoReady={handlePhotoReady}
            disabled={analyzing || saving}
          />
        </div>

        {/* Analyze Button */}
        {photoFile && !analysis && (
          <motion.button
            {...fadeInUp}
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mb-6 w-full rounded-[8px] bg-apple-blue px-4 py-3 text-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {analyzing ? "분석 중..." : "AI 음식 분석"}
          </motion.button>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-[8px] bg-red-50 p-3 text-[14px] text-red-600">
            {error}
          </div>
        )}

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div {...fadeInUp} className="mb-6">
              <h2 className="mb-3 text-[21px] font-semibold leading-[1.19] text-apple-text tracking-[0.231px]">
                분석 결과
              </h2>
              <div className="space-y-2">
                {analysis.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[8px] bg-white p-3"
                  >
                    <div>
                      <div className="text-[17px] text-apple-text">{item.name}</div>
                      <div className="text-[12px] text-apple-text/50">{item.amount}</div>
                    </div>
                    <div className="text-[17px] font-semibold text-apple-text">
                      {item.calories} kcal
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-[8px] bg-apple-black p-4 text-center">
                <div className="text-[12px] text-white/50">총 칼로리</div>
                <div className="text-[28px] font-semibold text-white">
                  {analysis.totalCalories} kcal
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full rounded-[8px] bg-apple-text px-4 py-3 text-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "기록하기"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
