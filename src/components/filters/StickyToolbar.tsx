import type { ReactNode } from "react";

/**
 * 스코프(BU/법인/사업장)와 탭이 스크롤 시에도 보이도록 묶는 sticky 컨테이너.
 * 자식은 ScopeFilter, ScopeTabs 등 클라이언트 컴포넌트.
 */
export function StickyToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 -mx-3 md:-mx-4 px-3 md:px-4 pt-1 pb-2 backdrop-blur bg-[var(--bg)]/85 border-b border-[var(--border)]">
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
