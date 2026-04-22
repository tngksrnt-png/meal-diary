"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Item = { href: string; label: string; icon: React.ReactNode };

const icons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  org: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="5" rx="1" />
      <rect x="3" y="15" width="6" height="5" rx="1" />
      <rect x="15" y="15" width="6" height="5" rx="1" />
      <path d="M12 7v4M6 15v-2h12v2" />
    </svg>
  ),
  building: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2" />
    </svg>
  ),
  upload: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  ),
  sliders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h10M18 7h2M4 12h6M14 12h6M4 17h14M18 17h2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
};

const PRIMARY: Item[] = [
  { href: "/", label: "대시보드", icon: icons.home },
  { href: "/employees", label: "직원 명단", icon: icons.building },
  { href: "/org", label: "조직도", icon: icons.org },
];

const ADMIN: Item[] = [
  { href: "/admin/import", label: "Excel 업로드", icon: icons.upload },
  { href: "/admin/org", label: "조직 구조", icon: icons.sliders },
  { href: "/admin/settings", label: "드롭다운 설정", icon: icons.settings },
  { href: "/admin/users", label: "허용 이메일", icon: icons.users },
];

function NavItem({
  item,
  active,
  onClick,
}: {
  item: Item;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-3 h-10 px-3 rounded-md transition-colors ${
        active ? "text-white" : "text-white/70 hover:text-white hover:bg-[var(--dark-2)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="sidenav-active"
          className="absolute inset-0 rounded-md bg-[var(--dark-2)]"
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        />
      )}
      <span className="relative">{item.icon}</span>
      <span className="relative text-[13px] truncate">{item.label}</span>
    </Link>
  );
}

function NavBody({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <>
      <div className="flex items-center gap-2 px-2 py-2 mb-1">
        <div className="w-7 h-7 rounded-md bg-[var(--brand)] text-white font-bold flex items-center justify-center text-[13px]">R</div>
        <div className="text-white text-[13px] font-semibold tracking-tight">ReNA HR</div>
      </div>
      <div className="px-3 pb-1 label-eyebrow text-white/55">그룹</div>
      {PRIMARY.map((i) => (
        <NavItem key={i.href} item={i} active={isActive(i.href)} onClick={onItemClick} />
      ))}
      <div className="px-3 pt-3 pb-1 label-eyebrow text-white/55">관리</div>
      {ADMIN.map((i) => (
        <NavItem key={i.href} item={i} active={isActive(i.href)} onClick={onItemClick} />
      ))}
      <div className="flex-1" />
      <form action="/auth/logout" method="post">
        <button
          type="submit"
          className="flex items-center gap-3 h-9 px-3 w-full rounded-md text-white/70 hover:text-white hover:bg-[var(--dark-2)] transition-colors text-[13px]"
        >
          {icons.logout}
          <span>로그아웃</span>
        </button>
      </form>
    </>
  );
}

export function SideNav() {
  return (
    <aside className="on-dark hidden md:flex sticky top-3 self-start w-[180px] bg-[var(--dark)] rounded-md p-2 flex-col gap-0.5 min-h-[calc(100vh-1.5rem)]">
      <NavBody />
    </aside>
  );
}

/** Hamburger button + slide-in drawer for screens < md. Renders nothing on md+. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-white hover:bg-white/10"
      >
        {icons.menu}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="on-dark md:hidden fixed left-0 top-0 z-50 h-full w-[260px] bg-[var(--dark)] p-2 flex flex-col gap-0.5"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white/70 hover:text-white hover:bg-[var(--dark-2)]"
                >
                  {icons.close}
                </button>
              </div>
              <NavBody onItemClick={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
