<div align="center">

# 🏋️ FitSched

### Your schedule. Your pace.

*An AI-powered workout scheduler that automatically fits
workouts into your free time using Google Calendar.*

![Version](https://img.shields.io/badge/version-1.0.0-white?style=flat-square&labelColor=1a1a1a)
![Next.js](https://img.shields.io/badge/Next.js-15-white?style=flat-square&labelColor=1a1a1a)
![License](https://img.shields.io/badge/license-MIT-white?style=flat-square&labelColor=1a1a1a)
![Status](https://img.shields.io/badge/status-in%20development-orange?style=flat-square&labelColor=1a1a1a)

</div>

---

## ✨ Features

- 📅 **Google Calendar Sync** — reads your schedule and finds free slots automatically
- 🤖 **AI Workout Planner** — powered by DeepSeek AI, recommends workouts based on your availability
- 🔄 **Non-repetitive Workouts** — tracks previous weeks to keep routines fresh
- 🌐 **Multi-language** — supports English, Chinese, Japanese, and Vietnamese
- 🌙 **Dark / Light Mode** — theme preference saved across sessions
- 📱 **Mobile First** — designed for mobile, works on desktop too
- ⚡ **Real-time Sync** — workout plans appear directly in your schedule timeline

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Auth | NextAuth.js |
| Database | PostgreSQL + Prisma |
| AI | DeepSeek API |
| Calendar | Google Calendar API |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Cloud project with Calendar API enabled
- DeepSeek API key

### Installation

```bash
# Clone the repo
git clone https://github.com/Cocokylez/FitSched.git
cd FitSched

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Push database schema
npx prisma db push
npx prisma generate

# Run development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=your_postgresql_url
AUTH_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_calendar_client_secret
GOOGLE_API_KEY=your_deepseek_api_key
AUTH_TRUST_HOST=true
```

---

## 📱 Screenshots

> Coming soon

---

## 🗺️ Roadmap

- [x] Google Calendar integration
- [x] AI workout recommendations
- [x] Non-repetitive weekly plans
- [x] Multi-language support
- [x] Dark / light mode
- [ ] Push notifications
- [ ] Workout history & progress tracking
- [ ] Social features
- [ ] iOS / Android app

---

## 👨‍💻 Author

**AKC** — [@Cocokylez](https://github.com/Cocokylez)

---

<div align="center">
  <sub>Built with 💪 by AKC</sub>
</div>
