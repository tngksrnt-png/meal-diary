"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { type MealWithItems, MEAL_TYPE_LABELS } from "@/types";
import { fadeInUp } from "@/lib/motionPresets";

export default function MealCard({ meal }: { meal: MealWithItems }) {
  return (
    <motion.div {...fadeInUp}>
      <Link
        href={`/diary/${meal.id}`}
        className="flex gap-4 rounded-[8px] bg-white p-4 active:bg-black/5 transition-colors"
      >
        {meal.photo_url && (
          <img
            src={meal.photo_url}
            alt={MEAL_TYPE_LABELS[meal.meal_type]}
            className="h-20 w-20 flex-shrink-0 rounded-[8px] object-cover"
          />
        )}
        <div className="flex flex-1 flex-col justify-center">
          <div className="text-[14px] font-semibold text-apple-blue">
            {MEAL_TYPE_LABELS[meal.meal_type]}
          </div>
          <div className="mt-1 text-[21px] font-semibold leading-[1.19] text-apple-text tracking-[0.231px]">
            {meal.total_calories} kcal
          </div>
          <div className="mt-1 text-[12px] text-apple-text/50">
            {meal.meal_items.map((item) => item.name).join(", ")}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
