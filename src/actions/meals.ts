"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MealType, MealItem, MealWithItems } from "@/types";

export async function createMeal(input: {
  date: string;
  mealType: MealType;
  photoFile: File;
  items: MealItem[];
  totalCalories: number;
}): Promise<{ success: true; mealId: string } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  try {
    // 1. Upload photo to Storage
    const timestamp = Date.now();
    const filePath = `${user.id}/${input.date}/${input.mealType}_${timestamp}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("meal-photos")
      .upload(filePath, input.photoFile, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from("meal-photos")
      .getPublicUrl(filePath);

    // 3. Insert meal record
    const { data: meal, error: mealError } = await supabase
      .from("meals")
      .insert({
        user_id: user.id,
        date: input.date,
        meal_type: input.mealType,
        photo_url: urlData.publicUrl,
        total_calories: input.totalCalories,
        analyzed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (mealError || !meal) throw mealError;

    // 4. Insert meal items
    const itemsToInsert = input.items.map((item) => ({
      meal_id: meal.id,
      name: item.name,
      calories: item.calories,
      amount: item.amount,
    }));

    const { error: itemsError } = await supabase
      .from("meal_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    revalidatePath("/diary");
    return { success: true, mealId: meal.id };
  } catch (error) {
    console.error("Create meal failed:", error);
    return { success: false, error: "식사 기록에 실패했습니다" };
  }
}

export async function getMealsByDate(date: string): Promise<MealWithItems[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("meals")
    .select(`
      *,
      meal_items (id, name, calories, amount)
    `)
    .eq("user_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch meals failed:", error);
    return [];
  }

  return (data ?? []) as MealWithItems[];
}

export async function getMealById(id: string): Promise<MealWithItems | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meals")
    .select(`
      *,
      meal_items (id, name, calories, amount)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as MealWithItems;
}

export async function deleteMeal(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  // Get meal to find photo path
  const { data: meal } = await supabase
    .from("meals")
    .select("photo_url")
    .eq("id", id)
    .single();

  // Delete meal (meal_items cascade-deleted)
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: "삭제에 실패했습니다" };

  // Delete photo from storage
  if (meal?.photo_url) {
    const url = new URL(meal.photo_url);
    const pathParts = url.pathname.split("/meal-photos/");
    const storagePath = pathParts[1];
    if (storagePath) {
      await supabase.storage.from("meal-photos").remove([storagePath]);
    }
  }

  revalidatePath("/diary");
  return { success: true };
}
