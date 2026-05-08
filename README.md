<<<<<<< HEAD
# FitSched — Fullstack AI Workout Scheduler

A fullstack workout scheduling app that reads your Google Calendar and automatically fits workouts into your free time. Built with Next.js 15, PostgreSQL, and Gemini AI.

## Features

- **Smart Scheduling** — AI reads your calendar and finds optimal workout windows
- **AI Chat** — Chat with FitSched AI about workouts, tips, and scheduling
- **Workout Plans** — AI-generated weekly workout plans tailored to your goals
- **Exercise Library** — 20+ built-in exercises + add your own custom exercises
- **Progress Tracking** — Log workouts, track sets/reps, view charts and stats
- **Google Calendar Sync** — Read-only calendar integration
- **Push Notifications** — Get reminded before your workout window
- **Dark/Light Theme** — System-aware with manual toggle
- **PWA Ready** — Install on your phone like a native app

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Next.js API Routes, Server Actions
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js v5 (Google OAuth + Email/Password)
- **AI:** Google Gemini API
- **Calendar:** Google Calendar API
- **Notifications:** Web Push API
- **Charts:** Recharts
- **State:** Zustand
- **Icons:** Lucide React

## Setup

### 1. Install dependencies

```bash
cd fitsched-fullstack
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Run `openssl rand -base64 32` to generate
- `NEXTAUTH_URL` — `http://localhost:3000` for dev
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — NextAuth Google provider
- `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET` — Calendar API
- `GOOGLE_API_KEY` — Gemini API key
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — Push notifications

### 3. Generate VAPID keys

```bash
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('PUBLIC:', keys.publicKey); console.log('PRIVATE:', keys.privateKey);"
```

### 4. Set up the database

```bash
npm run db:generate
npm run db:push
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google OAuth Setup

### For NextAuth (Login)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web application
4. Add Authorized JavaScript Origins: `http://localhost:3000`
5. Add Authorized Redirect URI: `http://localhost:3000/api/auth/callback/google`

### For Calendar API

1. Use the same project (or create a new one)
2. Enable the Google Calendar API
3. Create another OAuth 2.0 Client ID
4. Add Redirect URI: `http://localhost:3000/api/calendar/callback`

## Project Structure

```
fitsched-fullstack/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker (push notifications)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # Login page
│   │   │   └── register/page.tsx  # Register page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard wrapper with nav
│   │   │   ├── schedule/page.tsx  # Main schedule view
│   │   │   ├── ai/page.tsx        # AI chat
│   │   │   ├── workout/page.tsx   # Workout display
│   │   │   ├── history/page.tsx   # Progress tracking
│   │   │   ├── exercises/page.tsx # Exercise library
│   │   │   └── settings/page.tsx  # Settings
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── chat/              # AI chat endpoint
│   │   │   ├── calendar/          # Calendar connect, callback, sync
│   │   │   ├── exercises/         # Exercise CRUD
│   │   │   ├── workouts/          # Plans and logs
│   │   │   └── push/              # Push notifications
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx
│   ├── components/
│   │   ├── DashboardNav.tsx       # Bottom navigation
│   │   ├── SessionProvider.tsx    # Auth provider
│   │   └── ThemeProvider.tsx      # Theme wrapper
│   ├── lib/
│   │   ├── auth.ts                # NextAuth config
│   │   ├── db.ts                  # Prisma client singleton
│   │   └── utils.ts               # Helper functions
│   └── store/
│       └── useStore.ts            # Zustand state
├── .env.example
├── package.json
└── tsconfig.json
```

## Database Schema

- **User** — Account with OAuth and credentials auth
- **Exercise** — System and user-created exercises
- **WorkoutPlan** — AI or manually created plans
- **WorkoutLog** — Completed workout sessions with sets
- **CalendarConnection** — Google Calendar OAuth tokens
- **CalendarEvent** — Synced calendar events
- **PushSubscription** — Web push notification subscriptions
- **ChatMessage** — AI chat history

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```
=======
# FitSched
FitSched is an AI-powered workout scheduler that syncs with Google Calendar to automatically fit workouts into your free time.
>>>>>>> 54223cb7187299b590ee93e460715d9509fde7ad
