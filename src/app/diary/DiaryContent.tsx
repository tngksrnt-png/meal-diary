"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import NavBar from "@/components/NavBar";
import DatePicker from "@/components/DatePicker";
import MealCard from "@/components/MealCard";
import NutritionSummary from "@/components/NutritionSummary";
import { getMealsByDate } from "@/actions/meals";
import { fadeInUp } from "@/lib/motionPresets";
import type { MealWithItems } from "@/types";

function getToday(): string {
  return new Date().toISOString().split("T")[0]!;
}

export default function DiaryContent({ userName }: { userName?: string }) {
  const [date, setDate] = useState(getToday);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async (d: string) => {
    setLoading(true);
    const data = await getMealsByDate(d);
    setMeals(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeals(date);
  }, [date, fetchMeals]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  return (
    <div className="min-h-screen bg-apple-gray">
      <NavBar userName={userName} />

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Date Picker */}
        <div className="mb-6">
          <DatePicker value={date} onChange={handleDateChange} />
        </div>

        {/* Nutrition Summary */}
        <div className="mb-6">
          <NutritionSummary meals={meals} />
        </div>

        {/* Meals List */}
        <div className="space-y-3">
          <AnimatePresence>
            {loading ? (
              <div className="py-12 text-center text-[14px] text-apple-text/40">
                불러오는 중...
              </div>
            ) : meals.length === 0 ? (
              <motion.div
                {...fadeInUp}
                className="py-12 text-center text-[14px] text-apple-text/40"
              >
                기록된 식사가 없습니다
              </motion.div>
            ) : (
              meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </AnimatePresence>
        </div>

        {/* Add Meal FAB */}
        <Link
          href={`/diary/record?date=${date}`}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-apple-blue text-[24px] text-white shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] active:scale-[0.9] transition-transform"
        >
          +
        </Link>
      </main>
    </div>
  );
}
