"use client";

import { handleSignOut } from "@/lib/auth";

export default function NavBar({ userName }: { userName?: string }) {
  return (
    <nav className="sticky top-0 z-50 flex h-12 items-center justify-between px-4 backdrop-blur-[20px] backdrop-saturate-[180%] bg-black/80">
      <a href="/diary" className="text-[14px] font-semibold text-white tracking-[-0.224px]">
        Meal Diary
      </a>
      <div className="flex items-center gap-4">
        {userName && (
          <span className="text-[12px] text-white/60">{userName}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-[12px] text-white/80 hover:text-white transition-colors"
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
