import { notFound } from "next/navigation";
import { getMealById } from "@/actions/meals";
import MealDetail from "./MealDetail";

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meal = await getMealById(id);

  if (!meal) notFound();

  return <MealDetail meal={meal} />;
}
