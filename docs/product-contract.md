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
