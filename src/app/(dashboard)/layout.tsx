import { requireAdmin } from "@/lib/auth";
import { SideNav } from "@/components/nav/SideNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 md:py-6">
      <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <SideNav email={profile.email} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
