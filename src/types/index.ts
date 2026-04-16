import { z } from "zod";

// Meal type enum
export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

// Meal item (from Gemini analysis)
export const MealItemSchema = z.object({
  name: z.string(),
  calories: z.number().int().nonnegative(),
  amount: z.string(),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// Gemini analysis response
export const GeminiAnalysisSchema = z.object({
  items: z.array(MealItemSchema),
  totalCalories: z.number().int().nonnegative(),
});
export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;

// Database meal record
export const MealSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(), // DATE as string 'YYYY-MM-DD'
  meal_type: MealTypeSchema,
  photo_url: z.string().nullable(),
  total_calories: z.number().int(),
  analyzed_at: z.string().nullable(),
  created_at: z.string(),
});
export type Meal = z.infer<typeof MealSchema>;

// Meal with items (joined query)
export const MealWithItemsSchema = MealSchema.extend({
  meal_items: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      calories: z.number().int(),
      amount: z.string().nullable(),
    })
  ),
});
export type MealWithItems = z.infer<typeof MealWithItemsSchema>;

// Form input for creating a meal
export const CreateMealInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: MealTypeSchema,
});
export type CreateMealInput = z.infer<typeof CreateMealInputSchema>;
