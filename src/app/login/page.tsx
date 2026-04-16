"use client";

import { handleGoogleSignIn } from "@/lib/auth";
import { motion } from "motion/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-apple-black px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm text-center"
      >
        <h1 className="mb-2 text-[40px] font-semibold leading-[1.1] text-white">
          Meal Diary
        </h1>
        <p className="mb-12 text-[17px] font-normal leading-[1.47] text-white/80">
          AI로 간편하게 식단을 기록하세요
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full rounded-[8px] bg-apple-blue px-4 py-3 text-[17px] font-normal text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          Google로 로그인
        </button>
      </motion.div>
    </div>
  );
}
