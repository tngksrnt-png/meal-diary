import { createClient } from "@/lib/supabase/server";
import DiaryContent from "./DiaryContent";

export default async function DiaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user!.id)
    .single();

  return <DiaryContent userName={profile?.name ?? undefined} />;
}
