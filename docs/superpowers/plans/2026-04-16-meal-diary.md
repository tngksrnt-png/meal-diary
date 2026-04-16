# Meal Diary (식단 기록) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app where users select a date + meal time, upload a food photo, and Gemini Flash-Lite analyzes it to record food items and calories — creating a comprehensive diet tracker.

**Architecture:** Next.js App Router with Supabase Auth (Google login), Database (meals + meal_items), and Storage (webp photos). Photos are converted to webp and resized to max 800px width on the client before upload. A Server Action sends the image to Gemini 3.1 Flash-Lite for food analysis, then stores results in Supabase. Apple-inspired design system per DESIGN.md.

**Tech Stack:** Next.js (App Router) / TypeScript (strict) / Tailwind CSS / Motion / Zod / Supabase SSR / Google Gemini 3.1 Flash-Lite API / browser-image-compression

---

## File Structure

```
C:/dev/test/
├── docs/
│   └── product-contract.md          # Product contract (acceptance criteria)
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (SF Pro font, global providers)
│   │   ├── page.tsx                  # Landing/redirect page
│   │   ├── globals.css              # Tailwind + Apple design tokens
│   │   ├── login/
│   │   │   └── page.tsx             # Login page with Google sign-in
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts         # Supabase Auth callback handler
│   │   └── diary/
│   │       ├── page.tsx             # Main diary page (date view, meal list)
│   │       ├── record/
│   │       │   └── page.tsx         # New meal record (upload + analysis)
│   │       └── [id]/
│   │           └── page.tsx         # Meal detail view
│   ├── components/
│   │   ├── DatePicker.tsx           # Date selector (default today)
│   │   ├── MealTimeSelector.tsx     # Breakfast/Lunch/Dinner/Snack tabs
│   │   ├── PhotoUploader.tsx        # Photo upload + webp conversion + preview
│   │   ├── MealCard.tsx             # Meal summary card for diary list
│   │   ├── NutritionSummary.tsx     # Daily calorie/nutrition summary
│   │   └── NavBar.tsx               # Apple-style glass navigation bar
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   ├── server.ts            # Server Supabase client
│   │   │   └── middleware.ts        # Supabase auth middleware
│   │   ├── auth.ts                  # Auth helpers (signIn, signOut, GoogleLoginButton)
│   │   ├── gemini.ts                # Gemini API client (server-only)
│   │   └── motionPresets.ts         # Shared animation variants
│   ├── actions/
│   │   ├── meals.ts                 # Server Actions: create/read/delete meals
│   │   └── analyze.ts              # Server Action: analyze photo with Gemini
│   ├── utils/
│   │   └── imageConverter.ts        # Client-side webp conversion + resize
│   └── types/
│       └── index.ts                 # Zod schemas + TypeScript types
├── middleware.ts                     # Next.js root middleware (auth guard)
├── .env.local                       # Supabase + Gemini keys (git-ignored)
├── .env.example                     # Template for env vars
├── next.config.mjs                  # Next.js config
├── tailwind.config.ts               # Tailwind with Apple design tokens
├── tsconfig.json                    # Strict TypeScript
└── package.json
```

## Database Schema

```
public.users
├── id          UUID (PK, references auth.users.id)
├── email       TEXT
├── name        TEXT
├── avatar_url  TEXT
└── created_at  TIMESTAMPTZ

public.meals
├── id          UUID (PK, default gen_random_uuid())
├── user_id     UUID (FK → users.id)
├── date        DATE
├── meal_type   TEXT ('breakfast' | 'lunch' | 'dinner' | 'snack')
├── photo_url   TEXT (Supabase Storage public URL)
├── total_calories  INTEGER
├── analyzed_at TIMESTAMPTZ
└── created_at  TIMESTAMPTZ

public.meal_items
├── id          UUID (PK, default gen_random_uuid())
├── meal_id     UUID (FK → meals.id ON DELETE CASCADE)
├── name        TEXT (음식 이름)
├── calories    INTEGER
├── amount      TEXT (예: '1인분', '200g')
└── created_at  TIMESTAMPTZ
```

## Supabase Storage

- Bucket: `meal-photos` (public)
- Path pattern: `{user_id}/{date}/{meal_type}_{timestamp}.webp`
- Max file size: 2MB (webp after conversion)

---

## Phase 0: Infrastructure Setup

### Task 1: Create GitHub Repository

**Files:**
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Initialize git repo and create .gitignore**

```bash
cd /c/dev/test
git init
```

Then create `.gitignore`:

```gitignore
# dependencies
node_modules/
.pnp
.pnp.js

# testing
coverage/

# next.js
.next/
out/

# production
build/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 2: Create initial README.md**

```markdown
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

\`\`\`bash
npm install
cp .env.example .env.local  # fill in your keys
npm run dev -- --host
\`\`\`

## Project Structure

See `docs/product-contract.md` for full product contract.

src/
├── app/          # App Router pages
├── components/   # Shared UI components
├── lib/          # Supabase clients, Gemini client, auth helpers
├── actions/      # Server Actions
├── utils/        # Image conversion utilities
└── types/        # Zod schemas and types
```

- [ ] **Step 3: Create product contract**

Create `docs/product-contract.md`:

```markdown
# Meal Diary — Product Contract

## Core Features

1. **Authentication**: Google login via Supabase Auth
2. **Meal Recording**: Date + meal time + photo → AI analysis → calorie record
3. **Diary View**: Daily meal list with calorie summary
4. **Meal Detail**: View individual meal photo, food items, calories

## Primary User Flows

### Flow 1: First-time Login
1. User opens app → sees login page
2. Clicks "Google로 로그인"
3. Completes Google OAuth
4. Redirected to diary page (today's date)
- **Acceptance:** User row created in public.users via trigger, diary page loads

### Flow 2: Record a Meal
1. User taps "+" button on diary page
2. Selects meal time (아침/점심/저녁/간식) — date defaults to today
3. Takes or selects a food photo
4. Photo auto-converts to webp (max 800px width), uploads to Storage
5. Gemini analyzes photo → returns food items + calories
6. User sees analysis results, confirms to save
7. Returns to diary page with new meal card visible
- **Acceptance:** Photo in Storage as webp ≤800px wide, meal + meal_items rows in DB, diary shows updated totals

### Flow 3: View Daily Diary
1. User sees today's meals by default
2. Can change date via date picker
3. Each meal shows: photo thumbnail, meal type, total calories
4. Daily total calories shown at top
- **Acceptance:** Correct meals shown for selected date, totals are accurate

### Flow 4: View Meal Detail
1. User taps a meal card
2. Sees full photo, list of food items with individual calories
3. Can delete the meal
- **Acceptance:** All meal_items displayed, delete removes meal + photo from Storage

## Core E2E Scenarios

1. Login → Record breakfast → See it on diary → View detail → Delete it
2. Change date → See empty state → Record meal → See it appear
3. Upload large photo → Verify webp conversion ≤800px
4. Logout → Cannot access diary (redirected to login)
```

- [ ] **Step 4: Push to GitHub**

```bash
git add .gitignore README.md CLAUDE.md DESIGN.md LLM-model.md docs/
git commit -m "chore: initial project setup with product contract"
gh repo create meal-diary --public --source=. --push
```

---

### Task 2: Create Supabase Project

- [ ] **Step 1: Create Supabase project via MCP**

Use the Supabase MCP tool to create a new project:
- Organization: use the user's existing org (list orgs first)
- Project name: `meal-diary`
- Region: `ap-northeast-2` (Seoul, closest to user)
- Database password: generate a secure one

Call `mcp__plugin_supabase_supabase__list_organizations` first, then `mcp__plugin_supabase_supabase__create_project`.

- [ ] **Step 2: Get project URL and keys**

Call `mcp__plugin_supabase_supabase__get_project_url` and `mcp__plugin_supabase_supabase__get_publishable_keys` to get:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 3: Create .env.example and .env.local**

`.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

`.env.local` — fill with real values from Step 2:

```env
NEXT_PUBLIC_SUPABASE_URL=<actual_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<actual_key>
GEMINI_API_KEY=<user_must_provide>
```

- [ ] **Step 4: Run database migrations — users table + trigger**

Execute SQL via `mcp__plugin_supabase_supabase__execute_sql`:

```sql
-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own data
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: auto-insert user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 5: Run database migrations — meals + meal_items tables**

Execute SQL via `mcp__plugin_supabase_supabase__execute_sql`:

```sql
-- Create meals table
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url TEXT,
  total_calories INTEGER DEFAULT 0,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own meals
CREATE POLICY "Users can view own meals"
  ON public.meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON public.meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON public.meals FOR DELETE
  USING (auth.uid() = user_id);

-- Create meal_items table
CREATE TABLE public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  amount TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

-- Users can read meal_items for their own meals
CREATE POLICY "Users can view own meal items"
  ON public.meal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meals
      WHERE meals.id = meal_items.meal_id
      AND meals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own meal items"
  ON public.meal_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meals
      WHERE meals.id = meal_items.meal_id
      AND meals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own meal items"
  ON public.meal_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.meals
      WHERE meals.id = meal_items.meal_id
      AND meals.user_id = auth.uid()
    )
  );
```

- [ ] **Step 6: Create Storage bucket**

Execute SQL via `mcp__plugin_supabase_supabase__execute_sql`:

```sql
-- Create meal-photos bucket (public for reading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'meal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to read their own photos
CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'meal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'meal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

- [ ] **Step 7: Commit infrastructure setup**

```bash
git add .env.example
git commit -m "chore: add env template for Supabase and Gemini keys"
git push
```

---

### Task 3: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /c/dev/test
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Note: Since there are existing files, use `--yes` to accept defaults. The CLI will skip existing files.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zod motion @google/genai browser-image-compression
```

- [ ] **Step 3: Configure tsconfig.json strict mode**

Ensure `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Set up Apple design tokens in globals.css**

Replace `src/app/globals.css` content:

```css
@import "tailwindcss";

@theme {
  /* Apple Design System Colors */
  --color-apple-black: #000000;
  --color-apple-gray: #f5f5f7;
  --color-apple-text: #1d1d1f;
  --color-apple-blue: #0071e3;
  --color-apple-link: #0066cc;
  --color-apple-link-dark: #2997ff;
  --color-apple-surface-1: #272729;
  --color-apple-surface-2: #262628;
  --color-apple-surface-3: #28282a;

  /* Typography */
  --font-family-display: "SF Pro Display", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  --font-family-body: "SF Pro Text", "Helvetica Neue", "Helvetica", "Arial", sans-serif;

  /* Spacing (Apple 8px base) */
  --spacing-apple-xs: 4px;
  --spacing-apple-sm: 8px;
  --spacing-apple-md: 16px;
  --spacing-apple-lg: 24px;
  --spacing-apple-xl: 40px;
  --spacing-apple-2xl: 64px;

  /* Border Radius */
  --radius-apple-sm: 5px;
  --radius-apple-md: 8px;
  --radius-apple-lg: 12px;
  --radius-apple-pill: 980px;
}

/* Base styles */
body {
  font-family: var(--font-family-body);
  color: var(--color-apple-text);
  background-color: var(--color-apple-gray);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Apple-style negative letter spacing */
h1, h2, h3 {
  font-family: var(--font-family-display);
  letter-spacing: -0.28px;
}

p, span, a, button, input, label {
  letter-spacing: -0.374px;
}

small, .text-sm {
  letter-spacing: -0.224px;
}
```

- [ ] **Step 5: Set up root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Diary | 식단 기록",
  description: "AI-powered meal tracking. Upload food photos for automatic calorie analysis.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Apple design tokens"
git push
```

---

### Task 4: Set Up Supabase Clients + Auth Middleware

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:

```tsx
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `src/lib/supabase/server.ts`:

```tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:

```tsx
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except for login and auth routes)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/diary";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Create root middleware**

Create `middleware.ts` (project root):

```tsx
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/ middleware.ts
git commit -m "feat: add Supabase clients and auth middleware"
git push
```

---

### Task 5: Auth — Google Login

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/page.tsx`

**IMPORTANT:** Before this step, ask the user to:
1. Enable Google Auth provider in Supabase Dashboard: `https://supabase.com/dashboard/project/<project-ref>/auth/providers`
2. Set up Google Cloud OAuth credentials and add the callback URL
3. Enable GitHub integration: `https://supabase.com/dashboard/project/<project-ref>/settings/integrations`

- [ ] **Step 1: Create auth helpers**

Create `src/lib/auth.ts`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export async function handleGoogleSignIn() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    console.error("Login error:", error.message);
  }
}

export async function handleSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}
```

- [ ] **Step 2: Create auth callback route**

Create `src/app/auth/callback/route.ts`:

```tsx
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/diary";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 3: Create login page**

Create `src/app/login/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Update root page to redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/diary");
}
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/login/ src/app/auth/ src/app/page.tsx
git commit -m "feat: add Google login with Supabase Auth"
git push
```

---

## Phase 1: Core Features

### Task 6: Types + Zod Schemas

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Define all types and Zod schemas**

Create `src/types/index.ts`:

```tsx
import { z } from "zod";

// Meal type enum
export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

// Meal item (from Gemini analysis)
export const MealItemSchema = z.object({
  name: z.string(),
  calories: z.number().int().nonneg(),
  amount: z.string(),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// Gemini analysis response
export const GeminiAnalysisSchema = z.object({
  items: z.array(MealItemSchema),
  totalCalories: z.number().int().nonneg(),
});
export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;

// Database meal record
export const MealSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(), // DATE as string 'YYYY-MM-DD'
  meal_type: MealTypeSchema,
  photo_url: z.string().nullable(),
  total_calories: z.number().int(),
  analyzed_at: z.string().nullable(),
  created_at: z.string(),
});
export type Meal = z.infer<typeof MealSchema>;

// Meal with items (joined query)
export const MealWithItemsSchema = MealSchema.extend({
  meal_items: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      calories: z.number().int(),
      amount: z.string().nullable(),
    })
  ),
});
export type MealWithItems = z.infer<typeof MealWithItemsSchema>;

// Form input for creating a meal
export const CreateMealInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: MealTypeSchema,
});
export type CreateMealInput = z.infer<typeof CreateMealInputSchema>;
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/types/
git commit -m "feat: add Zod schemas and TypeScript types"
git push
```

---

### Task 7: Image Converter (Client-Side WebP + Resize)

**Files:**
- Create: `src/utils/imageConverter.ts`

- [ ] **Step 1: Create image converter utility**

Create `src/utils/imageConverter.ts`:

```tsx
import imageCompression from "browser-image-compression";

const MAX_WIDTH = 800;
const MAX_SIZE_MB = 2;

/**
 * Converts an image file to webp format, resized to max 800px width.
 * Returns the converted File and a data URL for preview.
 */
export async function convertToWebp(
  file: File
): Promise<{ webpFile: File; previewUrl: string }> {
  // Compress and resize
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: MAX_WIDTH,
    maxSizeMB: MAX_SIZE_MB,
    fileType: "image/webp",
    useWebWorker: true,
  });

  // Create a File object with .webp extension
  const webpFile = new File(
    [compressed],
    file.name.replace(/\.[^.]+$/, ".webp"),
    { type: "image/webp" }
  );

  // Generate preview URL
  const previewUrl = URL.createObjectURL(webpFile);

  return { webpFile, previewUrl };
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/
git commit -m "feat: add client-side webp image converter"
git push
```

---

### Task 8: Gemini Client (Server-Only)

**Files:**
- Create: `src/lib/gemini.ts`

- [ ] **Step 1: Create Gemini analysis function**

Create `src/lib/gemini.ts`:

```tsx
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisSchema, type GeminiAnalysis } from "@/types";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ANALYSIS_PROMPT = `You are a nutritionist AI. Analyze this food photo and identify each food item visible.

For each item, provide:
- name: Korean name of the food (한국어)
- calories: estimated calories (kcal) as an integer
- amount: estimated portion size (e.g., "1인분", "200g", "1개")

Respond ONLY with valid JSON in this exact format:
{
  "items": [
    { "name": "음식이름", "calories": 300, "amount": "1인분" }
  ],
  "totalCalories": 300
}

Be accurate with Korean food calorie estimates. If unsure, use standard serving sizes.`;

export async function analyzeFood(
  imageBase64: string,
  mimeType: string
): Promise<GeminiAnalysis> {
  const response = await client.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: ANALYSIS_PROMPT },
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: GeminiAnalysisSchema,
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text) as unknown;
  return GeminiAnalysisSchema.parse(parsed);
}
```

- [ ] **Step 2: Install server-only package**

```bash
npm install server-only
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/gemini.ts package.json package-lock.json
git commit -m "feat: add Gemini food analysis client"
git push
```

---

### Task 9: Server Actions — Analyze + CRUD

**Files:**
- Create: `src/actions/analyze.ts`
- Create: `src/actions/meals.ts`

- [ ] **Step 1: Create analyze action**

Create `src/actions/analyze.ts`:

```tsx
"use server";

import { analyzeFood } from "@/lib/gemini";
import type { GeminiAnalysis } from "@/types";

export async function analyzeFoodPhoto(
  formData: FormData
): Promise<{ success: true; data: GeminiAnalysis } | { success: false; error: string }> {
  const file = formData.get("photo") as File | null;
  if (!file) {
    return { success: false, error: "사진을 선택해주세요" };
  }

  try {
    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const analysis = await analyzeFood(base64, file.type || "image/webp");
    return { success: true, data: analysis };
  } catch (error) {
    console.error("Analysis failed:", error);
    return { success: false, error: "음식 분석에 실패했습니다. 다시 시도해주세요." };
  }
}
```

- [ ] **Step 2: Create meals CRUD actions**

Create `src/actions/meals.ts`:

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MealType, MealItem, MealWithItems } from "@/types";

export async function createMeal(input: {
  date: string;
  mealType: MealType;
  photoFile: File;
  items: MealItem[];
  totalCalories: number;
}): Promise<{ success: true; mealId: string } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  try {
    // 1. Upload photo to Storage
    const timestamp = Date.now();
    const filePath = `${user.id}/${input.date}/${input.mealType}_${timestamp}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("meal-photos")
      .upload(filePath, input.photoFile, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from("meal-photos")
      .getPublicUrl(filePath);

    // 3. Insert meal record
    const { data: meal, error: mealError } = await supabase
      .from("meals")
      .insert({
        user_id: user.id,
        date: input.date,
        meal_type: input.mealType,
        photo_url: urlData.publicUrl,
        total_calories: input.totalCalories,
        analyzed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (mealError || !meal) throw mealError;

    // 4. Insert meal items
    const itemsToInsert = input.items.map((item) => ({
      meal_id: meal.id,
      name: item.name,
      calories: item.calories,
      amount: item.amount,
    }));

    const { error: itemsError } = await supabase
      .from("meal_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    revalidatePath("/diary");
    return { success: true, mealId: meal.id };
  } catch (error) {
    console.error("Create meal failed:", error);
    return { success: false, error: "식사 기록에 실패했습니다" };
  }
}

export async function getMealsByDate(date: string): Promise<MealWithItems[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("meals")
    .select(`
      *,
      meal_items (id, name, calories, amount)
    `)
    .eq("user_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch meals failed:", error);
    return [];
  }

  return (data ?? []) as MealWithItems[];
}

export async function getMealById(id: string): Promise<MealWithItems | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meals")
    .select(`
      *,
      meal_items (id, name, calories, amount)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as MealWithItems;
}

export async function deleteMeal(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  // Get meal to find photo path
  const { data: meal } = await supabase
    .from("meals")
    .select("photo_url")
    .eq("id", id)
    .single();

  // Delete meal (meal_items cascade-deleted)
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: "삭제에 실패했습니다" };

  // Delete photo from storage
  if (meal?.photo_url) {
    const url = new URL(meal.photo_url);
    const pathParts = url.pathname.split("/meal-photos/");
    const storagePath = pathParts[1];
    if (storagePath) {
      await supabase.storage.from("meal-photos").remove([storagePath]);
    }
  }

  revalidatePath("/diary");
  return { success: true };
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/
git commit -m "feat: add server actions for meal CRUD and Gemini analysis"
git push
```

---

## Phase 2: UI Components

### Task 10: Shared Components — NavBar, DatePicker, MealTimeSelector

**Files:**
- Create: `src/components/NavBar.tsx`
- Create: `src/components/DatePicker.tsx`
- Create: `src/components/MealTimeSelector.tsx`
- Create: `src/lib/motionPresets.ts`

- [ ] **Step 1: Create motion presets**

Create `src/lib/motionPresets.ts`:

```tsx
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};
```

- [ ] **Step 2: Create NavBar**

Create `src/components/NavBar.tsx`:

```tsx
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
```

- [ ] **Step 3: Create DatePicker**

Create `src/components/DatePicker.tsx`:

```tsx
"use client";

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const today = new Date().toISOString().split("T")[0]!;
  const isToday = value === today;

  return (
    <div className="flex items-center gap-3">
      <input
        type="date"
        value={value}
        max={today}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[17px] text-apple-text outline-none focus:ring-2 focus:ring-apple-blue"
      />
      {!isToday && (
        <button
          onClick={() => onChange(today)}
          className="rounded-[980px] border border-apple-link px-3 py-1 text-[14px] text-apple-link hover:bg-apple-blue hover:text-white hover:border-apple-blue transition-colors"
        >
          오늘
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create MealTimeSelector**

Create `src/components/MealTimeSelector.tsx`:

```tsx
"use client";

import { type MealType, MEAL_TYPE_LABELS } from "@/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface MealTimeSelectorProps {
  value: MealType;
  onChange: (type: MealType) => void;
}

export default function MealTimeSelector({ value, onChange }: MealTimeSelectorProps) {
  return (
    <div className="flex gap-2">
      {MEAL_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`flex-1 rounded-[8px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
            value === type
              ? "bg-apple-text text-white"
              : "bg-white text-apple-text hover:bg-black/5"
          }`}
        >
          {MEAL_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/NavBar.tsx src/components/DatePicker.tsx src/components/MealTimeSelector.tsx src/lib/motionPresets.ts
git commit -m "feat: add NavBar, DatePicker, MealTimeSelector components"
git push
```

---

### Task 11: PhotoUploader Component

**Files:**
- Create: `src/components/PhotoUploader.tsx`

- [ ] **Step 1: Create PhotoUploader**

Create `src/components/PhotoUploader.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoUploader.tsx
git commit -m "feat: add PhotoUploader with webp conversion and preview"
git push
```

---

### Task 12: MealCard + NutritionSummary Components

**Files:**
- Create: `src/components/MealCard.tsx`
- Create: `src/components/NutritionSummary.tsx`

- [ ] **Step 1: Create MealCard**

Create `src/components/MealCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { type MealWithItems, MEAL_TYPE_LABELS } from "@/types";
import { fadeInUp } from "@/lib/motionPresets";

export default function MealCard({ meal }: { meal: MealWithItems }) {
  return (
    <motion.div {...fadeInUp}>
      <Link
        href={`/diary/${meal.id}`}
        className="flex gap-4 rounded-[8px] bg-white p-4 active:bg-black/5 transition-colors"
      >
        {meal.photo_url && (
          <img
            src={meal.photo_url}
            alt={MEAL_TYPE_LABELS[meal.meal_type]}
            className="h-20 w-20 flex-shrink-0 rounded-[8px] object-cover"
          />
        )}
        <div className="flex flex-1 flex-col justify-center">
          <div className="text-[14px] font-semibold text-apple-blue">
            {MEAL_TYPE_LABELS[meal.meal_type]}
          </div>
          <div className="mt-1 text-[21px] font-semibold leading-[1.19] text-apple-text tracking-[0.231px]">
            {meal.total_calories} kcal
          </div>
          <div className="mt-1 text-[12px] text-apple-text/50">
            {meal.meal_items.map((item) => item.name).join(", ")}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create NutritionSummary**

Create `src/components/NutritionSummary.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { type MealWithItems } from "@/types";
import { fadeIn } from "@/lib/motionPresets";

export default function NutritionSummary({ meals }: { meals: MealWithItems[] }) {
  const totalCalories = meals.reduce((sum, m) => sum + m.total_calories, 0);
  const mealCount = meals.length;

  return (
    <motion.div
      {...fadeIn}
      className="rounded-[8px] bg-apple-black p-6 text-center"
    >
      <div className="text-[12px] font-semibold uppercase tracking-wider text-white/50">
        오늘의 총 칼로리
      </div>
      <div className="mt-2 text-[40px] font-semibold leading-[1.1] text-white">
        {totalCalories.toLocaleString()}
        <span className="ml-1 text-[17px] font-normal text-white/60">kcal</span>
      </div>
      <div className="mt-2 text-[14px] text-white/40">
        {mealCount}끼 기록됨
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/MealCard.tsx src/components/NutritionSummary.tsx
git commit -m "feat: add MealCard and NutritionSummary components"
git push
```

---

## Phase 3: Pages

### Task 13: Diary Page (Main)

**Files:**
- Create: `src/app/diary/page.tsx`
- Modify: `src/app/layout.tsx` (add NavBar wrapper)

- [ ] **Step 1: Create diary page**

Create `src/app/diary/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import DiaryContent from "./DiaryContent";

export default async function DiaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user!.id)
    .single();

  return <DiaryContent userName={profile?.name ?? undefined} />;
}
```

- [ ] **Step 2: Create DiaryContent client component**

Create `src/app/diary/DiaryContent.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import NavBar from "@/components/NavBar";
import DatePicker from "@/components/DatePicker";
import MealCard from "@/components/MealCard";
import NutritionSummary from "@/components/NutritionSummary";
import { getMealsByDate } from "@/actions/meals";
import { fadeInUp } from "@/lib/motionPresets";
import type { MealWithItems } from "@/types";

function getToday(): string {
  return new Date().toISOString().split("T")[0]!;
}

export default function DiaryContent({ userName }: { userName?: string }) {
  const [date, setDate] = useState(getToday);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async (d: string) => {
    setLoading(true);
    const data = await getMealsByDate(d);
    setMeals(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeals(date);
  }, [date, fetchMeals]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  return (
    <div className="min-h-screen bg-apple-gray">
      <NavBar userName={userName} />

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Date Picker */}
        <div className="mb-6">
          <DatePicker value={date} onChange={handleDateChange} />
        </div>

        {/* Nutrition Summary */}
        <div className="mb-6">
          <NutritionSummary meals={meals} />
        </div>

        {/* Meals List */}
        <div className="space-y-3">
          <AnimatePresence>
            {loading ? (
              <div className="py-12 text-center text-[14px] text-apple-text/40">
                불러오는 중...
              </div>
            ) : meals.length === 0 ? (
              <motion.div
                {...fadeInUp}
                className="py-12 text-center text-[14px] text-apple-text/40"
              >
                기록된 식사가 없습니다
              </motion.div>
            ) : (
              meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </AnimatePresence>
        </div>

        {/* Add Meal FAB */}
        <Link
          href={`/diary/record?date=${date}`}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-apple-blue text-[24px] text-white shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] active:scale-[0.9] transition-transform"
        >
          +
        </Link>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/diary/
git commit -m "feat: add diary page with daily meal list and calorie summary"
git push
```

---

### Task 14: Record Page (Photo Upload + AI Analysis)

**Files:**
- Create: `src/app/diary/record/page.tsx`

- [ ] **Step 1: Create RecordContent client component**

Create `src/app/diary/record/RecordContent.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import NavBar from "@/components/NavBar";
import MealTimeSelector from "@/components/MealTimeSelector";
import PhotoUploader from "@/components/PhotoUploader";
import { analyzeFoodPhoto } from "@/actions/analyze";
import { createMeal } from "@/actions/meals";
import { fadeInUp } from "@/lib/motionPresets";
import type { MealType, GeminiAnalysis } from "@/types";

function getToday(): string {
  return new Date().toISOString().split("T")[0]!;
}

export default function RecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") ?? getToday();

  const [date, setDate] = useState(initialDate);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoReady = useCallback((file: File) => {
    setPhotoFile(file);
    setAnalysis(null);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!photoFile) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", photoFile);

    const result = await analyzeFoodPhoto(formData);
    if (result.success) {
      setAnalysis(result.data);
    } else {
      setError(result.error);
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    if (!photoFile || !analysis) return;
    setSaving(true);

    const result = await createMeal({
      date,
      mealType,
      photoFile,
      items: analysis.items,
      totalCalories: analysis.totalCalories,
    });

    if (result.success) {
      router.push("/diary");
    } else {
      setError(result.error);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-apple-gray">
      <NavBar />

      <main className="mx-auto max-w-lg px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-[14px] text-apple-link hover:underline"
        >
          ← 돌아가기
        </button>

        <h1 className="mb-6 text-[28px] font-semibold leading-[1.14] text-apple-text tracking-[0.196px]">
          식사 기록
        </h1>

        {/* Date */}
        <div className="mb-4">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-apple-text/50">
            날짜
          </label>
          <input
            type="date"
            value={date}
            max={getToday()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[8px] border border-black/10 bg-white px-3 py-2.5 text-[17px] text-apple-text outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        {/* Meal Time */}
        <div className="mb-6">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-apple-text/50">
            식사 시간
          </label>
          <MealTimeSelector value={mealType} onChange={setMealType} />
        </div>

        {/* Photo Upload */}
        <div className="mb-6">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-apple-text/50">
            음식 사진
          </label>
          <PhotoUploader
            onPhotoReady={handlePhotoReady}
            disabled={analyzing || saving}
          />
        </div>

        {/* Analyze Button */}
        {photoFile && !analysis && (
          <motion.button
            {...fadeInUp}
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mb-6 w-full rounded-[8px] bg-apple-blue px-4 py-3 text-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {analyzing ? "분석 중..." : "AI 음식 분석"}
          </motion.button>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-[8px] bg-red-50 p-3 text-[14px] text-red-600">
            {error}
          </div>
        )}

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div {...fadeInUp} className="mb-6">
              <h2 className="mb-3 text-[21px] font-semibold leading-[1.19] text-apple-text tracking-[0.231px]">
                분석 결과
              </h2>
              <div className="space-y-2">
                {analysis.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[8px] bg-white p-3"
                  >
                    <div>
                      <div className="text-[17px] text-apple-text">{item.name}</div>
                      <div className="text-[12px] text-apple-text/50">{item.amount}</div>
                    </div>
                    <div className="text-[17px] font-semibold text-apple-text">
                      {item.calories} kcal
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-[8px] bg-apple-black p-4 text-center">
                <div className="text-[12px] text-white/50">총 칼로리</div>
                <div className="text-[28px] font-semibold text-white">
                  {analysis.totalCalories} kcal
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full rounded-[8px] bg-apple-text px-4 py-3 text-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "기록하기"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create record page wrapper**

Create `src/app/diary/record/page.tsx`:

```tsx
import { Suspense } from "react";
import RecordContent from "./RecordContent";

export default function RecordPage() {
  return (
    <Suspense>
      <RecordContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/diary/record/
git commit -m "feat: add meal record page with photo upload and AI analysis"
git push
```

---

### Task 15: Meal Detail Page

**Files:**
- Create: `src/app/diary/[id]/page.tsx`

- [ ] **Step 1: Create meal detail page**

Create `src/app/diary/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getMealById } from "@/actions/meals";
import MealDetail from "./MealDetail";

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meal = await getMealById(id);

  if (!meal) notFound();

  return <MealDetail meal={meal} />;
}
```

- [ ] **Step 2: Create MealDetail client component**

Create `src/app/diary/[id]/MealDetail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import NavBar from "@/components/NavBar";
import { deleteMeal } from "@/actions/meals";
import { MEAL_TYPE_LABELS, type MealWithItems } from "@/types";
import { fadeInUp } from "@/lib/motionPresets";

export default function MealDetail({ meal }: { meal: MealWithItems }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("이 식사 기록을 삭제하시겠습니까?")) return;
    setDeleting(true);
    const result = await deleteMeal(meal.id);
    if (result.success) {
      router.push("/diary");
    } else {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-apple-gray">
      <NavBar />

      <main className="mx-auto max-w-lg px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-[14px] text-apple-link hover:underline"
        >
          ← 돌아가기
        </button>

        {/* Photo */}
        {meal.photo_url && (
          <motion.img
            {...fadeInUp}
            src={meal.photo_url}
            alt={MEAL_TYPE_LABELS[meal.meal_type]}
            className="mb-6 w-full rounded-[12px] object-cover"
          />
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="text-[14px] font-semibold text-apple-blue">
            {MEAL_TYPE_LABELS[meal.meal_type]} · {meal.date}
          </div>
          <div className="mt-1 text-[40px] font-semibold leading-[1.1] text-apple-text">
            {meal.total_calories} kcal
          </div>
        </div>

        {/* Items */}
        <div className="mb-6 space-y-2">
          {meal.meal_items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[8px] bg-white p-4"
            >
              <div>
                <div className="text-[17px] text-apple-text">{item.name}</div>
                {item.amount && (
                  <div className="text-[12px] text-apple-text/50">{item.amount}</div>
                )}
              </div>
              <div className="text-[17px] font-semibold text-apple-text">
                {item.calories} kcal
              </div>
            </div>
          ))}
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full rounded-[8px] border border-red-300 px-4 py-3 text-[17px] text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "기록 삭제"}
        </button>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/diary/\[id\]/
git commit -m "feat: add meal detail page with delete functionality"
git push
```

---

## Phase 4: Deploy + Final Polish

### Task 16: Vercel Deployment

- [ ] **Step 1: Link project to Vercel**

```bash
cd /c/dev/test
npx vercel link
```

Or use MCP: `mcp__plugin_vercel_vercel__deploy_to_vercel`

- [ ] **Step 2: Set environment variables on Vercel**

Use `vercel env add` or the Vercel MCP to set:
- `NEXT_PUBLIC_SUPABASE_URL` (Preview + Production)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Preview + Production)
- `GEMINI_API_KEY` (Preview + Production)

- [ ] **Step 3: Deploy to production**

```bash
npx vercel --prod
```

- [ ] **Step 4: Configure Supabase Auth redirect URL**

In Supabase Dashboard Auth settings, add the Vercel production URL to the allowed redirect URLs:
- `https://<project>.vercel.app/auth/callback`

- [ ] **Step 5: Verify deployment**

Open the Vercel URL in a browser and test:
1. Login page renders
2. Google login flow works
3. Redirect to diary page after login

- [ ] **Step 6: Commit any deployment config changes**

```bash
git add -A
git commit -m "chore: configure Vercel deployment"
git push
```

---

### Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev -- --host
```

- [ ] **Step 2: Test Flow 1 — Login**

1. Open `http://localhost:3000`
2. Should redirect to `/login`
3. Click "Google로 로그인"
4. Complete OAuth flow
5. Verify redirect to `/diary`
6. Verify user appears in `public.users` table

- [ ] **Step 3: Test Flow 2 — Record Meal**

1. Tap "+" button
2. Select meal time (점심)
3. Upload a food photo
4. Verify photo converts to webp, preview shows
5. Click "AI 음식 분석"
6. Verify analysis results appear with food items + calories
7. Click "기록하기"
8. Verify redirect to diary with new meal card

- [ ] **Step 4: Test Flow 3 — View & Navigate**

1. Verify diary page shows today's meals
2. Change date using date picker
3. Verify meals update for selected date
4. Click a meal card → verify detail page
5. Verify photo, food items, and calories display correctly

- [ ] **Step 5: Test Flow 4 — Delete**

1. On meal detail page, click "기록 삭제"
2. Confirm deletion
3. Verify redirect to diary, meal no longer visible
4. Verify photo removed from Supabase Storage

- [ ] **Step 6: Test Responsive Design**

1. Test on mobile viewport (360px-480px)
2. Verify Apple design system looks correct
3. Test photo upload via camera (mobile)

- [ ] **Step 7: Fix any issues found during testing**

Address any bugs discovered. Run:

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 8: Final commit and push**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
git push
```

---

## User Setup Required (before Task 5)

Before implementing auth, the user must complete these manual steps:

1. **Supabase-GitHub Integration**: Go to `https://supabase.com/dashboard/project/<ref>/settings/integrations` and connect GitHub
2. **Google Cloud OAuth Setup**:
   - Create a project in Google Cloud Console
   - Enable Google OAuth consent screen
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `https://<supabase-ref>.supabase.co/auth/v1/callback`
3. **Supabase Google Auth**: Go to `https://supabase.com/dashboard/project/<ref>/auth/providers`, enable Google, paste Client ID + Secret
4. **Gemini API Key**: Get from `https://aistudio.google.com/apikey` and add to `.env.local`

---

## Summary

| Phase | Tasks | What's Built |
|-------|-------|-------------|
| 0: Infrastructure | 1-4 | Git repo, Supabase project (DB + Storage + RLS), Next.js scaffold, Auth middleware |
| 1: Core | 5-9 | Auth flow, types, image converter, Gemini client, Server Actions |
| 2: UI | 10-12 | All shared components (NavBar, DatePicker, PhotoUploader, MealCard, etc.) |
| 3: Pages | 13-15 | Diary page, Record page, Detail page |
| 4: Deploy | 16-17 | Vercel deployment, E2E testing |

Total: 17 tasks, each with bite-sized steps.
