import { requireAdmin } from "@/lib/auth";
import { SideNav } from "@/components/nav/SideNav";
import { TopBanner } from "@/components/nav/TopBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  return (
    <div className="mx-auto w-full px-3 md:px-4 py-3 md:py-4 2xl:max-w-[1920px]">
      <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <SideNav />
        <div className="min-w-0 flex flex-col gap-3">
          <TopBanner email={profile.email} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
