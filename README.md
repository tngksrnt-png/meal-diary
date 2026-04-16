# Meal Diary (식단 기록)

AI-powered meal tracking app. Upload food photos and get automatic calorie analysis.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Database, Storage)
- Google Gemini 3.1 Flash-Lite (food photo analysis)
- Motion (Framer Motion)

## Features

- [ ] Google login via Supabase Auth
- [ ] Date picker + meal time selector (아침/점심/저녁/간식)
- [ ] Photo upload with webp conversion (max 800px width)
- [ ] AI food analysis (Gemini) → food items + calories
- [ ] Daily meal diary view with calorie summary
- [ ] Meal detail view

## Getting Started

```bash
npm install
cp .env.example .env.local  # fill in your keys
npm run dev -- --host
```

## Project Structure

See `docs/product-contract.md` for full product contract.

```
src/
├── app/          # App Router pages
├── components/   # Shared UI components
├── lib/          # Supabase clients, Gemini client, auth helpers
├── actions/      # Server Actions
├── utils/        # Image conversion utilities
└── types/        # Zod schemas and types
```
