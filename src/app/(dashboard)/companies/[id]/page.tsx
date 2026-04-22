import { redirect } from "next/navigation";

export default async function CompanyRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; worksite?: string }>;
}) {
  const { id } = await params;
  const { tab = "active", worksite = "" } = await searchParams;
  const q = new URLSearchParams();
  q.set("company", id);
  if (worksite) q.set("worksite", worksite);
  q.set("tab", tab);
  redirect(`/?${q.toString()}`);
}
