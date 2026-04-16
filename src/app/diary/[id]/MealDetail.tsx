"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import NavBar from "@/components/NavBar";
import { deleteMeal } from "@/actions/meals";
import { MEAL_TYPE_LABELS, type MealWithItems } from "@/types";
import { fadeInUp } from "@/lib/motionPresets";

export default function MealDetail({ meal }: { meal: MealWithItems }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("이 식사 기록을 삭제하시겠습니까?")) return;
    setDeleting(true);
    const result = await deleteMeal(meal.id);
    if (result.success) {
      router.push("/diary");
    } else {
      setDeleting(false);
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

        {/* Photo */}
        {meal.photo_url && (
          <motion.img
            {...fadeInUp}
            src={meal.photo_url}
            alt={MEAL_TYPE_LABELS[meal.meal_type]}
            className="mb-6 w-full rounded-[12px] object-cover"
          />
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="text-[14px] font-semibold text-apple-blue">
            {MEAL_TYPE_LABELS[meal.meal_type]} · {meal.date}
          </div>
          <div className="mt-1 text-[40px] font-semibold leading-[1.1] text-apple-text">
            {meal.total_calories} kcal
          </div>
        </div>

        {/* Items */}
        <div className="mb-6 space-y-2">
          {meal.meal_items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[8px] bg-white p-4"
            >
              <div>
                <div className="text-[17px] text-apple-text">{item.name}</div>
                {item.amount && (
                  <div className="text-[12px] text-apple-text/50">{item.amount}</div>
                )}
              </div>
              <div className="text-[17px] font-semibold text-apple-text">
                {item.calories} kcal
              </div>
            </div>
          ))}
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full rounded-[8px] border border-red-300 px-4 py-3 text-[17px] text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "기록 삭제"}
        </button>
      </main>
    </div>
  );
}
