# Church Events & Interactive Seating Reservation System
### مناسبات الكنيسة ونظام حجز المقاعد التفاعلي

A modern, multilingual web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**. It provides real-time event updates, interactive 2D seating plan reservations with instant conflict detection, admin event management with 5MB image storage, and VIP 8-digit access code validation.

---

## 🗄️ Automated Supabase Database from Code

This repository contains the standard **Supabase Infrastructure-as-Code** structure. When you connect this repository to your Supabase project, Supabase automatically reads your migration files and builds the entire database schema, security rules (RLS), storage buckets, and seed data directly from the code!

### Included Database Assets:
- `supabase/config.toml`: Official project configuration for Supabase CLI and GitHub integrations.
- `supabase/migrations/20260401000000_create_church_events_schema.sql`: Full database schema including:
  - `church_events`: Events with multilingual titles, descriptions, dates, and JSON seating blueprints.
  - `church_registrations`: Public registrations, seats/tables booked, and payment flags.
  - `church_admin_codes`: 8-digit admin reservation access codes.
  - Performance indexes for high-speed queries.
  - Row Level Security (RLS) policies for secure anonymous & authenticated operations.
  - Supabase Storage bucket `event-images` with 5MB file size limits and image mime-type validation.
  - Realtime publication setup (`supabase_realtime`) for live multi-screen syncing.
- `supabase/seed.sql`: Rich initial seed data with parish events, interactive table/chair layouts, and test admin codes.
- `.github/workflows/supabase.yml`: Automated GitHub Actions CI/CD pipeline running `supabase db push` whenever code is pushed to your repository.

---

## 🚀 How to Connect Supabase to GitHub

You can choose either of the following two standard methods to have Supabase build your database from this repository:

### Method 1: Supabase Dashboard GitHub Integration (1-Click, Recommended)

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. In the left navigation menu, go to **Project Settings** (gear icon) ➔ **Integrations** ➔ **GitHub**.
3. Click **Connect to GitHub** and authorize Supabase to access your repository.
4. Select this repository from your GitHub account and specify your production branch (e.g. `main`).
5. **Done!** Supabase will automatically read the `supabase/migrations` folder and execute all migrations and schema updates whenever you push code changes to GitHub.

---

### Method 2: GitHub Actions Automated CI/CD

If you prefer deploying migrations through GitHub Actions:
1. In your GitHub repository, navigate to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Add the following repository secrets:
   - `SUPABASE_ACCESS_TOKEN`: Generated at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
   - `SUPABASE_PROJECT_ID`: Found in your Supabase project URL or General Settings (e.g. `xyzabcdefghijklmnopqrst`).
   - `SUPABASE_DB_PASSWORD`: Your database password configured during project creation.
3. Every push to `main` will automatically trigger `.github/workflows/supabase.yml`, link the project via the official Supabase CLI, and run `supabase db push`.

---

## ⚙️ Connecting the App to Your Supabase Instance

Once your database is built:
1. In your Supabase Dashboard, go to **Project Settings** ➔ **API**.
2. Copy your **Project URL** and **Project API Key** (`anon` public key).
3. Set them in your environment (`.env.local` or your hosting provider):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

*Note: The app also provides full local caching and offline fallback, so if Supabase credentials are not yet entered, the app continues to function smoothly with local storage.*

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
