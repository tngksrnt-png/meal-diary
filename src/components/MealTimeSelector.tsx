"use client";

import { type MealType, MEAL_TYPE_LABELS } from "@/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface MealTimeSelectorProps {
  value: MealType;
  onChange: (type: MealType) => void;
}

export default function MealTimeSelector({ value, onChange }: MealTimeSelectorProps) {
  return (
    <div className="flex gap-2">
      {MEAL_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`flex-1 rounded-[8px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
            value === type
              ? "bg-apple-text text-white"
              : "bg-white text-apple-text hover:bg-black/5"
          }`}
        >
          {MEAL_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
