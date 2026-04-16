import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Diary | 식단 기록",
  description: "AI-powered meal tracking. Upload food photos for automatic calorie analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-apple-gray">
        {children}
      </body>
    </html>
  );
}
