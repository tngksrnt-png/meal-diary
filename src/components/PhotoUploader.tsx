"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { convertToWebp } from "@/utils/imageConverter";
import { scaleIn } from "@/lib/motionPresets";

interface PhotoUploaderProps {
  onPhotoReady: (file: File) => void;
  disabled?: boolean;
}

export default function PhotoUploader({ onPhotoReady, disabled }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setConverting(true);
      try {
        const { webpFile, previewUrl } = await convertToWebp(file);
        setPreview(previewUrl);
        onPhotoReady(webpFile);
      } catch (err) {
        console.error("Image conversion failed:", err);
      } finally {
        setConverting(false);
      }
    },
    [onPhotoReady]
  );

  const handleReset = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || converting}
        className="hidden"
        id="photo-input"
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            {...scaleIn}
            className="relative overflow-hidden rounded-[12px]"
          >
            <img
              src={preview}
              alt="음식 사진 미리보기"
              className="w-full rounded-[12px] object-cover"
            />
            <button
              onClick={handleReset}
              disabled={disabled}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white text-[14px] hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        ) : (
          <motion.label
            key="upload"
            {...scaleIn}
            htmlFor="photo-input"
            className={`flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-black/20 bg-white transition-colors hover:border-apple-blue hover:bg-apple-blue/5 ${
              converting ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {converting ? (
              <div className="text-[14px] text-apple-text/60">변환 중...</div>
            ) : (
              <>
                <div className="mb-2 text-[32px] text-apple-text/30">📷</div>
                <div className="text-[14px] text-apple-text/60">
                  사진을 촬영하거나 선택하세요
                </div>
              </>
            )}
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}
