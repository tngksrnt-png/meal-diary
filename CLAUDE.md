# Project Initialization & Feature Planning Rule
## Target Files
project folder root: CLAUDE.md, README.md, docs/product-contract.md

## Principle
Before generating the initial project structure for a new project, first define:
- core features
- primary user flows
- acceptance criteria for each flow
- Core E2E scenarios that must pass

Write them in docs/product-contract.md first.

Then:
1. summarize the core features in README.md
2. design routes, data model, and folder structure based on the defined flows
3. implement only after the product contract is clear

## Scope
Apply this rule:
- when starting a new project
- when resetting project architecture
- when adding a major new feature that changes core user flows

# CLAUDE.md Improvement
## Target File
Current project folder root, CLAUDE.md

## Principle
If you encounter and resolve an error, and if that error is not a simple technical mistake but caused by your knowledge limitations or coding style, propose to the user to update CLAUDE.md with a fundamental solution to prevent that error.

## Example
Situation: Wrote code following tailwindcss v3, an error occurred, and found the solution in the v4 documentation.
Improvement: "Use tailwindcss according to the V4 usage released in 2025. If unsure, refer to the documentation."

# git, supabase, vercel
- after major code write, commit and push.

# Next.js + Supabase Development Rules

**Stack is fixed:** Next.js (App Router) + TypeScript + Tailwind CSS + Motion (Framer Motion) + Zod + Supabase
**Mobile-First Design:** Always design and implement for mobile screens first, then scale up to larger screens.
**Run lint, npm run build, tsc:** Always debug after jobs done.
**Always Check Latest Document:** for example, middleware.ts is deprecated in Next 16.
**Supabase feature:** You have right to create project in supabase, git push, and so on. DO NOT ask user to create project, DO it Yourself. But, When doing Supabase native GitHub Integration, user must make an integration between supabase and github. provide " https://supabase.com/dashboard/project/.../settings/integrations" link to user and ask them to do. (User sould supabase-github integration and google cloud project setting(for google login feature) and supabase-google auth enable. So, when you first make user login feature, ask user to do them.
**offer host**: when npm run dev, turn on --host option to let user test web page in their mobile browser within same wi-fi.

---

## 1) Fixed stack and allowed libraries

Use exactly these libraries for the listed responsibilities:

* **Build/dev:** Next.js (App Router)
* **UI:** React
* **Language:** TypeScript (strict)
* **Styling:** Tailwind CSS
* **Animation:** Motion (Framer Motion)
* **Validation / runtime parsing:** Zod
* **Backend SDK:** Supabase SSR (Client/Server clients)

Do not add alternatives for the same responsibility.
Examples of forbidden additions:

* Validation: yup, joi, ajv (use Zod)
* Animation: react-spring, gsap wrappers (use Motion)
* Styling: styled-components, emotion, CSS frameworks (use Tailwind)

# CRUD, Auth features
* DO NOT use complex database queries that needs 'index' feature if not necessary. 
* write proper PostgreSQL RLS (Row Level Security) to ensure each user can access own data only.
* ALWAYS use PostgreSQL Triggers (not Next.js application code) to automatically insert a new row into public.users upon Supabase Auth signup.

---

## 2) README.md is the source of truth (keep it correct)

### Before doing any of these:

* installing a package
* creating a folder
* adding a new feature (anything user-facing or cross-cutting)

Do this first:

1. Open README.md
2. Check:
   * features (is this already implemented?)
   * project-structure (where does this belong?)
   * any conventions (naming, patterns, existing modules)

If an equivalent feature or module exists, extend it. Do not re-create it.

### After doing any of these:

* installing/removing/upgrading packages
* creating a folder
* adding a new feature

Update README.md immediately:

* project-structure: add the new folder/module and its role (one line)
* features: add/adjust the feature description and entry points

### After any change

Verify these three agree with each other:

* README.md (what exists and how to run it)
* package.json (scripts + deps)
* package-lock.json (locked dependency graph)

No contradictions allowed.

---

## 3) Dependency management with npm (reproducible installs)

### Rules

* Use **npm only**.
* Commit **package-lock.json** with every dependency change.
* Do not edit package-lock.json manually.

---

## 4) Project structure (prevents duplicate code)

Use this structure and meanings:

src
+-- app               # App Router domain. Keep files route-level only. If it exceeds 500 lines, split into features/.
+-- assets            # assets folder can contain all the static files such as images, fonts, etc.
+-- components        # shared components used across the entire application
+-- features          # Only split domains that exceed 500 lines; keep this as empty as possible.
+-- lib               # supabase related files and shared libraries
|   +-- supabase      # config files (server.ts, client.ts, middleware.ts). each config value must come from .env
|   +-- auth.ts       # supabase auth related codes like handleSignOut, handleSignIn, GoogleLoginButton 
+-- utils             # shared utility functions
+-- types             # shared types and Zod schemas
.env.local, .gitignore, next.config.mjs, package-lock.json, package.json, README.md, tsconfig.json, public/, node_modules/

---

## 5) TypeScript rules (keep correctness under AI-generated churn)

* tsconfig.json must keep:
  * "strict": true
  * "noUncheckedIndexedAccess": true (recommended)
  * "noImplicitOverride": true (recommended)
* Do not use any.
  * Use unknown for untrusted values.
  * Narrow with Zod or type guards.

---

## 6) Supabase rules (SSR support, modular imports)

* Use @supabase/ssr for Next.js App Router.
* Create Supabase clients in exactly one place: src/lib/supabase/.
* No other file calls createBrowserClient or createServerClient directly.
* Config comes from environment variables only. Never hardcode secrets.

---

## 7) Motion (Framer Motion) rules (consistent animation strategy)

* Use Motion components for animation (motion.div, etc.).
* Prefer variants for consistency:
  * store common variants/presets in src/lib/motionPresets.ts
* Do not introduce additional animation libraries.

---

## 8) Tailwind rules (avoid style drift and class chaos)

* Use Tailwind for all styling.
* Keep global CSS minimal.
* Define all custom colors using CSS variables in the main stylesheet (or tailwind theme file, depending on version) to avoid hardcoding hex values in components.

---

## 9) Supabase config & RLS setup

Supabase project values (URL, Anon Key) should be loaded via environment variables (.env.local). For proper protection, write PostgreSQL RLS policies instead of relying on frontend logic:

* **general** (table) / **public access**: allow read for everyone (e.g., USING (true)).
* **users** (table) / **id**: restrict access as follows:

-- RLS Policy Example
CREATE POLICY "Individuals can view their own data" 
ON users FOR SELECT 
USING (auth.uid() = id);

---

## 10) Server Components vs Client Components

* **Default to Server Components:** Always write components as Server Components by default.
* **Use "use client" sparingly:** Only use when using React hooks, Browser APIs, or Motion components.
* Push Client Components as far down the tree as possible.
* Use **Server Actions** ("use server") for data mutations instead of separate API routes when possible.
* **Data Mutation & Caching:** When using Server Actions to mutate data, ALWAYS implement revalidatePath to ensure the UI reflects the new database state.
* **Env Vars:** If you introduce a new environment variable, you MUST add a dummy version of it to .env.example.