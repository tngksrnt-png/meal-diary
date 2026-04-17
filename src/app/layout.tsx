import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReNA Group HR Dashboard",
  description: "ReNA 그룹사 919명 인사 데이터 통합 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        {children}
      </body>
    </html>
  );
}
