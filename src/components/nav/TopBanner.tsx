import { MobileNav } from "./SideNav";

export function TopBanner({ email }: { email: string }) {
  return (
    <div className="banner flex items-center justify-between px-3 md:px-5 py-2.5 md:py-4 gap-3">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <MobileNav />
        <div className="hidden sm:flex w-8 h-8 rounded-md bg-[var(--brand)] text-[var(--dark)] font-bold items-center justify-center text-sm shrink-0">
          R
        </div>
        <div className="min-w-0">
          <div className="text-[10px] md:text-[11px] uppercase tracking-widest text-white/60">
            ReNA Group
          </div>
          <div className="text-sm md:text-base font-semibold leading-tight text-white truncate">
            Human Resources Dashboard
            <span className="hidden md:inline text-white/50 font-normal"> | Overview</span>
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="hidden sm:block text-[10px] uppercase tracking-widest text-white/60">
          Signed in
        </div>
        <div className="text-[11px] md:text-sm text-white truncate max-w-[140px] md:max-w-[220px]">
          {email}
        </div>
      </div>
    </div>
  );
}
