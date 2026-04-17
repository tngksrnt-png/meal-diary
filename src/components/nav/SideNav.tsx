"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const PRIMARY = [
  { href: "/", label: "그룹 대시보드" },
  { href: "/org", label: "조직도" },
  { href: "/companies", label: "법인" },
];

const ADMIN = [
  { href: "/admin/import", label: "Excel 업로드" },
  { href: "/admin/org", label: "조직 구조" },
  { href: "/admin/settings", label: "드롭다운 설정" },
  { href: "/admin/users", label: "허용 이메일" },
];

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative block rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "text-[var(--brand)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-lg bg-[var(--brand-soft)]"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span className="relative">{label}</span>
    </Link>
  );
}

export function SideNav({ email }: { email: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="card w-full p-4 md:h-fit md:sticky md:top-4">
      <div className="px-2 pb-3 border-b border-[var(--border)]">
        <div className="text-base font-semibold tracking-tight">ReNA HR</div>
        <div className="text-xs text-[var(--fg-subtle)] mt-0.5 truncate">{email}</div>
      </div>
      <nav className="flex flex-col gap-1 py-3">
        {PRIMARY.map((i) => (
          <NavItem key={i.href} href={i.href} label={i.label} active={isActive(i.href)} />
        ))}
      </nav>
      <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
        Admin
      </div>
      <nav className="flex flex-col gap-1 pb-2">
        {ADMIN.map((i) => (
          <NavItem key={i.href} href={i.href} label={i.label} active={isActive(i.href)} />
        ))}
      </nav>
      <form action="/auth/logout" method="post" className="pt-2 border-t border-[var(--border)]">
        <button className="btn w-full justify-center" type="submit">
          로그아웃
        </button>
      </form>
    </aside>
  );
}
