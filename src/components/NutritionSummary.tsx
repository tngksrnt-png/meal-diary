"use client";

import { motion } from "motion/react";
import { type MealWithItems } from "@/types";
import { fadeIn } from "@/lib/motionPresets";

export default function NutritionSummary({ meals }: { meals: MealWithItems[] }) {
  const totalCalories = meals.reduce((sum, m) => sum + m.total_calories, 0);
  const mealCount = meals.length;

  return (
    <motion.div
      {...fadeIn}
      className="rounded-[8px] bg-apple-black p-6 text-center"
    >
      <div className="text-[12px] font-semibold uppercase tracking-wider text-white/50">
        오늘의 총 칼로리
      </div>
      <div className="mt-2 text-[40px] font-semibold leading-[1.1] text-white">
        {totalCalories.toLocaleString()}
        <span className="ml-1 text-[17px] font-normal text-white/60">kcal</span>
      </div>
      <div className="mt-2 text-[14px] text-white/40">
        {mealCount}끼 기록됨
      </div>
    </motion.div>
  );
}
