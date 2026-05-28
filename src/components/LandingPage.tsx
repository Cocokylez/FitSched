"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Globe2,
  LockKeyhole,
  Route,
  ShieldCheck,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ACCENT, ACCENT_BD, ACCENT_DIM } from "@/lib/theme"

type LangCode = "EN" | "CN" | "JP" | "VI"

const LANGUAGES: LangCode[] = ["EN", "CN", "JP", "VI"]

const navItems = [
  { label: "Planner", href: "#planner" },
  { label: "Training", href: "#training" },
  { label: "Proof", href: "#proof" },
]

const heroMetrics = [
  { value: "7 day", label: "adaptive plan" },
  { value: "38 min", label: "open slot" },
  { value: "+1.2 FT", label: "sample reward" },
]

const plannerRows = [
  { time: "06:40", title: "Mobility primer", meta: "12 min", tone: "mint" },
  { time: "12:10", title: "Upper strength", meta: "42 min", tone: "amber" },
  { time: "18:30", title: "Evening hike", meta: "2.4 km", tone: "violet" },
]

const trainingCards: Array<{
  icon: LucideIcon
  title: string
  copy: string
  tone: string
}> = [
  {
    icon: CalendarDays,
    title: "Calendar-aware planning",
    copy: "Fits sessions into real open windows instead of pretending every day starts clean.",
    tone: "mint",
  },
  {
    icon: Dumbbell,
    title: "Workout depth",
    copy: "Strength, cardio, mobility, and home-friendly sessions stay organized in one routine.",
    tone: "amber",
  },
  {
    icon: Footprints,
    title: "Hike tracking",
    copy: "Outdoor effort counts beside gym work, with distance and route context kept visible.",
    tone: "violet",
  },
  {
    icon: Flame,
    title: "Streak momentum",
    copy: "A daily fire streak makes consistency feel visible without turning the app into noise.",
    tone: "red",
  },
]

const proofStats = [
  { label: "Plan surface", value: "Schedule" },
  { label: "Reward loop", value: "FitToken" },
  { label: "Outdoor mode", value: "Hikes" },
  { label: "Daily anchor", value: "Streaks" },
]

function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function BrandMark() {
  return (
    <span className="lp-brand-mark" aria-hidden="true">
      <Dumbbell size={17} strokeWidth={2.5} />
    </span>
  )
}

function Navbar() {
  const { language, changeLanguage, t } = useLanguage()

  return (
    <header className="lp-nav-wrap">
      <nav className="lp-nav" aria-label="Primary navigation">
        <Link href="/" className="lp-brand" aria-label="FitSched home">
          <BrandMark />
          <span>{t.fitSched}</span>
        </Link>

        <div className="lp-nav-links">
          {navItems.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="lp-nav-actions">
          <div className="lp-language" aria-label="Language selector">
            <Globe2 size={15} />
            {LANGUAGES.map((lang) => (
              <button
                type="button"
                key={lang}
                className={language === lang ? "active" : ""}
                onClick={() => changeLanguage(lang)}
                aria-pressed={language === lang}
              >
                {lang}
              </button>
            ))}
          </div>
          <Link href="/login" className="lp-link-button lp-link-button-quiet">
            {t.signIn}
          </Link>
          <Link href="/register" className="lp-link-button lp-link-button-solid">
            {t.createAccount}
          </Link>
        </div>
      </nav>
    </header>
  )
}

function HeroScene() {
  return (
    <div className="lp-hero-scene" aria-hidden="true">
      <div className="lp-map-lines" />

      <motion.div
        className="lp-scene-card lp-scene-calendar"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="lp-card-head">
          <span>Today</span>
          <span className="lp-status-dot">Synced</span>
        </div>
        <div className="lp-mini-week">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span className={index === 4 ? "selected" : ""} key={`${day}-${index}`}>
              {day}
            </span>
          ))}
        </div>
        <div className="lp-session-list">
          {plannerRows.map((row) => (
            <div className={`lp-session-row ${row.tone}`} key={row.title}>
              <span>{row.time}</span>
              <strong>{row.title}</strong>
              <em>{row.meta}</em>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="lp-scene-card lp-scene-workout"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="lp-workout-ring">
          <span>78</span>
          <small>readiness</small>
        </div>
        <div>
          <p>Next session</p>
          <h3>Upper strength</h3>
          <div className="lp-chip-row">
            <span>Push</span>
            <span>Pull</span>
            <span>Core</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="lp-scene-card lp-scene-token"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Flame size={22} />
        <div>
          <span>Fire streak</span>
          <strong>14 days</strong>
        </div>
        <b>+1.2 FT</b>
      </motion.div>
    </div>
  )
}

function Hero() {
  return (
    <section className="lp-hero">
      <HeroScene />
      <div className="lp-hero-inner">
        <FadeIn className="lp-hero-copy-wrap">
          <div className="lp-kicker">
            <Flame size={16} />
            Training that respects the calendar
          </div>
          <h1>FitSched</h1>
          <p className="lp-hero-copy">
            A focused fitness planner for busy weeks: schedule workouts, track
            hikes, keep streaks alive, and turn completed effort into FitToken
            progress.
          </p>
          <div className="lp-hero-actions">
            <Link href="/register" className="lp-primary-cta">
              Start planning
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="lp-secondary-cta">
              Sign in
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.14} className="lp-hero-metrics">
          {heroMetrics.map((metric) => (
            <div key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </FadeIn>
      </div>
      <div className="lp-hero-next">Next: scheduling system</div>
    </section>
  )
}

function PlannerPreview() {
  return (
    <div className="lp-planner-preview">
      <div className="lp-preview-toolbar">
        <div>
          <span>Friday</span>
          <strong>Open windows</strong>
        </div>
        <button type="button" aria-label="Calendar is locked">
          <LockKeyhole size={15} />
        </button>
      </div>

      <div className="lp-timeline">
        {plannerRows.map((row, index) => (
          <div className="lp-timeline-row" key={row.title}>
            <span className="lp-time">{row.time}</span>
            <div className={`lp-time-card ${row.tone}`}>
              <div>
                <strong>{row.title}</strong>
                <span>{row.meta} window</span>
              </div>
              {index === 1 ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}
            </div>
          </div>
        ))}
      </div>

      <div className="lp-preview-footer">
        <span>
          <ShieldCheck size={16} />
          Private by design
        </span>
        <span>
          <Zap size={16} />
          Auto-adjusted
        </span>
      </div>
    </div>
  )
}

function PlannerSection() {
  return (
    <section className="lp-section" id="planner">
      <div className="lp-section-head">
        <FadeIn>
          <span className="lp-section-label">Planner</span>
          <h2>The day decides the plan.</h2>
        </FadeIn>
        <FadeIn delay={0.08}>
          <p>
            FitSched turns scattered calendar gaps into a realistic training
            agenda, then keeps workout, hike, and recovery context on the same
            surface.
          </p>
        </FadeIn>
      </div>

      <div className="lp-system-grid">
        <FadeIn className="lp-system-main">
          <PlannerPreview />
        </FadeIn>

        <FadeIn delay={0.12} className="lp-system-side">
          <div className="lp-side-module">
            <Activity size={20} />
            <span>Readiness signal</span>
            <strong>Balanced load</strong>
            <p>Today&apos;s session adapts around available time and recent activity.</p>
          </div>
          <div className="lp-side-module">
            <Route size={20} />
            <span>Outdoor context</span>
            <strong>Hike included</strong>
            <p>Route-based effort contributes to the same weekly training view.</p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function TrainingSection() {
  return (
    <section className="lp-section lp-training" id="training">
      <div className="lp-section-head lp-section-head-centered">
        <FadeIn>
          <span className="lp-section-label">Training</span>
          <h2>One system for the work you actually do.</h2>
        </FadeIn>
        <FadeIn delay={0.08}>
          <p>
            The landing experience mirrors the app: quiet surfaces, clear
            progress, and enough detail to decide the next move fast.
          </p>
        </FadeIn>
      </div>

      <div className="lp-training-grid">
        {trainingCards.map((card, index) => {
          const Icon = card.icon
          return (
            <FadeIn delay={index * 0.06} className={`lp-training-card ${card.tone}`} key={card.title}>
              <div className="lp-icon-box">
                <Icon size={22} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </FadeIn>
          )
        })}
      </div>
    </section>
  )
}

function ProofSection() {
  return (
    <section className="lp-section lp-proof" id="proof">
      <FadeIn className="lp-proof-panel">
        <div className="lp-proof-copy">
          <span className="lp-section-label">Proof</span>
          <h2>Built for the person whose schedule keeps changing.</h2>
          <p>
            FitSched keeps the critical signals visible: what fits today, what
            counts toward progress, and where consistency is building.
          </p>
          <Link href="/register" className="lp-inline-cta">
            Create your schedule
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="lp-proof-stats">
          {proofStats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="lp-close">
      <FadeIn className="lp-close-inner">
        <div>
          <span className="lp-section-label">FitToken ready</span>
          <h2>Start with the next open slot.</h2>
          <p>
            Build a week that respects your calendar, tracks the work, and keeps
            momentum visible without adding clutter.
          </p>
        </div>
        <Link href="/register" className="lp-primary-cta">
          Open FitSched
          <ArrowRight size={18} />
        </Link>
      </FadeIn>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-brand">
        <BrandMark />
        <span>FitSched</span>
      </div>
      <div className="lp-footer-links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/login">Sign in</Link>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <main className="lp-page">
      <style>{`
        .lp-page {
          --lp-max: 1180px;
          min-height: 100dvh;
          overflow-x: hidden;
          background:
            linear-gradient(180deg, rgba(107, 191, 184, 0.08), transparent 340px),
            linear-gradient(90deg, rgba(250, 204, 21, 0.04), transparent 26%, rgba(129, 140, 248, 0.05) 74%, transparent),
            var(--bg);
          color: var(--text);
          position: relative;
        }

        .lp-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.72), transparent 72%);
          z-index: 0;
        }

        .lp-nav-wrap,
        .lp-hero,
        .lp-section,
        .lp-close,
        .lp-footer {
          position: relative;
          z-index: 1;
        }

        .lp-nav-wrap {
          position: fixed;
          top: 18px;
          left: 0;
          right: 0;
          z-index: 20;
          padding: 0 20px;
        }

        .lp-nav {
          max-width: var(--lp-max);
          margin: 0 auto;
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 9px 10px 9px 14px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(10, 15, 14, 0.74);
          backdrop-filter: blur(20px);
          box-shadow: 0 22px 70px rgba(0,0,0,0.34);
        }

        .lp-brand,
        .lp-footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
          text-decoration: none;
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
        }

        .lp-brand-mark {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0b1715;
          background: ${ACCENT};
          box-shadow: 0 0 0 1px rgba(255,255,255,0.16), 0 14px 34px rgba(107,191,184,0.22);
        }

        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.025);
        }

        .lp-nav-links a,
        .lp-footer-links a {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 12px;
          transition: color 0.2s ease, background 0.2s ease;
        }

        .lp-nav-links a:hover,
        .lp-footer-links a:hover {
          color: var(--text);
          background: rgba(255,255,255,0.05);
        }

        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lp-language {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 42px;
          padding: 0 8px;
          color: var(--text-muted);
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .lp-language button {
          height: 28px;
          min-width: 32px;
          border: 0;
          color: var(--text-muted);
          background: transparent;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .lp-language button.active {
          color: #071312;
          background: ${ACCENT};
        }

        .lp-link-button,
        .lp-primary-cta,
        .lp-secondary-cta,
        .lp-inline-cta {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          white-space: nowrap;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }

        .lp-link-button:hover,
        .lp-primary-cta:hover,
        .lp-secondary-cta:hover,
        .lp-inline-cta:hover {
          transform: translateY(-1px);
        }

        .lp-link-button {
          padding: 0 14px;
        }

        .lp-link-button-quiet,
        .lp-secondary-cta {
          color: var(--text);
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
        }

        .lp-link-button-solid,
        .lp-primary-cta,
        .lp-inline-cta {
          color: #071312;
          background: ${ACCENT};
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 20px 46px rgba(107,191,184,0.2);
        }

        .lp-primary-cta,
        .lp-secondary-cta {
          padding: 0 20px;
        }

        .lp-hero {
          min-height: 100dvh;
          padding: 132px 20px 72px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .lp-hero-inner {
          width: 100%;
          max-width: var(--lp-max);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .lp-hero-copy-wrap {
          max-width: 670px;
        }

        .lp-kicker,
        .lp-section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: ${ACCENT};
          background: ${ACCENT_DIM};
          border: 1px solid ${ACCENT_BD};
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 900;
        }

        .lp-hero h1 {
          margin: 20px 0 18px;
          font-family: var(--font-display);
          font-size: 108px;
          line-height: 0.9;
          font-weight: 900;
          letter-spacing: 0;
        }

        .lp-hero-copy {
          max-width: 640px;
          margin: 0;
          color: var(--text-muted);
          font-size: 20px;
          line-height: 1.65;
          font-weight: 600;
        }

        .lp-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .lp-hero-metrics {
          width: min(760px, 100%);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          margin-top: 54px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(11,17,15,0.68);
          backdrop-filter: blur(18px);
        }

        .lp-hero-metrics div {
          padding: 20px 22px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        .lp-hero-metrics div:last-child {
          border-right: 0;
        }

        .lp-hero-metrics strong,
        .lp-proof-stats strong {
          display: block;
          font-family: var(--font-display);
          font-size: 28px;
          line-height: 1;
        }

        .lp-hero-metrics span,
        .lp-proof-stats span {
          display: block;
          margin-top: 8px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .lp-hero-next {
          position: absolute;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
          opacity: 0.76;
        }

        .lp-hero-scene {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .lp-map-lines {
          position: absolute;
          inset: 96px 0 0 38%;
          opacity: 0.48;
          background:
            linear-gradient(90deg, transparent 0 22%, rgba(107,191,184,0.22) 22% 22.3%, transparent 22.3% 100%),
            linear-gradient(180deg, transparent 0 38%, rgba(250,204,21,0.16) 38% 38.3%, transparent 38.3% 100%),
            repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 18px);
          mask-image: linear-gradient(90deg, transparent, #000 22%, #000 82%, transparent);
        }

        .lp-scene-card {
          position: absolute;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(13,19,17,0.78);
          backdrop-filter: blur(22px);
          box-shadow: 0 34px 90px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .lp-scene-calendar {
          width: 410px;
          right: 8%;
          top: 21%;
          padding: 18px;
        }

        .lp-card-head,
        .lp-preview-toolbar,
        .lp-preview-footer,
        .lp-scene-token {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .lp-card-head span:first-child,
        .lp-preview-toolbar span,
        .lp-side-module span {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .lp-status-dot {
          color: ${ACCENT};
          background: ${ACCENT_DIM};
          border: 1px solid ${ACCENT_BD};
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .lp-mini-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin: 18px 0;
        }

        .lp-mini-week span {
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.07);
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 900;
          background: rgba(255,255,255,0.03);
        }

        .lp-mini-week span.selected {
          color: #071312;
          background: ${ACCENT};
        }

        .lp-session-list {
          display: grid;
          gap: 8px;
        }

        .lp-session-row {
          display: grid;
          grid-template-columns: 56px 1fr auto;
          align-items: center;
          gap: 12px;
          min-height: 48px;
          padding: 0 12px;
          background: rgba(255,255,255,0.045);
          border-left: 3px solid ${ACCENT};
        }

        .lp-session-row span,
        .lp-session-row em {
          color: var(--text-muted);
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }

        .lp-session-row strong {
          font-size: 13px;
        }

        .lp-session-row.amber,
        .lp-time-card.amber {
          border-color: #facc15;
        }

        .lp-session-row.violet,
        .lp-time-card.violet {
          border-color: #818cf8;
        }

        .lp-scene-workout {
          width: 340px;
          right: 22%;
          bottom: 18%;
          display: grid;
          grid-template-columns: 104px 1fr;
          align-items: center;
          gap: 18px;
          padding: 18px;
        }

        .lp-workout-ring {
          width: 94px;
          height: 94px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 9px solid rgba(107,191,184,0.24);
          box-shadow: inset 0 0 0 2px rgba(250,204,21,0.28);
        }

        .lp-workout-ring span {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 900;
        }

        .lp-workout-ring small,
        .lp-scene-workout p,
        .lp-scene-token span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          margin: 0;
        }

        .lp-scene-workout h3 {
          margin: 5px 0 12px;
          font-size: 20px;
          font-family: var(--font-display);
        }

        .lp-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .lp-chip-row span {
          padding: 6px 8px;
          color: var(--text);
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          font-size: 11px;
          font-weight: 800;
        }

        .lp-scene-token {
          width: 280px;
          right: 6%;
          bottom: 31%;
          padding: 16px;
        }

        .lp-scene-token svg {
          color: #f87171;
        }

        .lp-scene-token strong,
        .lp-scene-token b {
          display: block;
          margin-top: 3px;
          font-size: 18px;
        }

        .lp-scene-token b {
          color: ${ACCENT};
        }

        .lp-section {
          max-width: var(--lp-max);
          margin: 0 auto;
          padding: 96px 20px;
        }

        .lp-section-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 460px);
          align-items: end;
          gap: 40px;
          margin-bottom: 34px;
        }

        .lp-section-head-centered {
          max-width: 760px;
          margin-left: auto;
          margin-right: auto;
          text-align: center;
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .lp-section h2,
        .lp-close h2,
        .lp-proof h2 {
          margin: 14px 0 0;
          font-family: var(--font-display);
          font-size: 52px;
          line-height: 1.02;
          font-weight: 900;
          letter-spacing: 0;
        }

        .lp-section-head p,
        .lp-training-card p,
        .lp-side-module p,
        .lp-proof-copy p,
        .lp-close p {
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.72;
          font-weight: 600;
          margin: 0;
        }

        .lp-system-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.7fr);
          gap: 18px;
          align-items: stretch;
        }

        .lp-system-main,
        .lp-system-side,
        .lp-training-card,
        .lp-proof-panel,
        .lp-close-inner {
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(13,19,17,0.72);
          box-shadow: 0 30px 90px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
        }

        .lp-planner-preview {
          padding: 22px;
          min-height: 520px;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 54px 54px;
        }

        .lp-preview-toolbar {
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .lp-preview-toolbar strong {
          display: block;
          margin-top: 5px;
          font-family: var(--font-display);
          font-size: 25px;
        }

        .lp-preview-toolbar button {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255,255,255,0.08);
          color: ${ACCENT};
          background: rgba(255,255,255,0.035);
        }

        .lp-timeline {
          display: grid;
          gap: 14px;
          margin: 34px 0;
        }

        .lp-timeline-row {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 14px;
          align-items: stretch;
        }

        .lp-time {
          padding-top: 18px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 900;
        }

        .lp-time-card {
          min-height: 96px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border-left: 4px solid ${ACCENT};
          background: rgba(255,255,255,0.055);
        }

        .lp-time-card strong {
          display: block;
          margin-bottom: 8px;
          font-family: var(--font-display);
          font-size: 22px;
        }

        .lp-time-card span {
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 800;
        }

        .lp-time-card svg {
          color: ${ACCENT};
          flex: 0 0 auto;
        }

        .lp-preview-footer {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 18px;
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        .lp-preview-footer span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          color: var(--text);
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          font-size: 13px;
          font-weight: 800;
        }

        .lp-system-side {
          display: grid;
          gap: 18px;
          padding: 18px;
        }

        .lp-side-module {
          min-height: 210px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 12px;
          padding: 22px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.07);
        }

        .lp-side-module svg {
          color: ${ACCENT};
        }

        .lp-side-module strong {
          display: block;
          font-family: var(--font-display);
          font-size: 26px;
          line-height: 1.05;
        }

        .lp-training {
          padding-top: 76px;
        }

        .lp-training-grid {
          display: grid;
          grid-template-columns: 1.25fr 0.9fr 0.9fr;
          gap: 18px;
          align-items: stretch;
        }

        .lp-training-card {
          min-height: 290px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }

        .lp-training-card:first-child {
          grid-row: span 2;
          min-height: 598px;
        }

        .lp-training-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          height: 4px;
          background: ${ACCENT};
        }

        .lp-training-card.amber::before {
          background: #facc15;
        }

        .lp-training-card.violet::before {
          background: #818cf8;
        }

        .lp-training-card.red::before {
          background: #f87171;
        }

        .lp-icon-box {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: ${ACCENT};
          border: 1px solid ${ACCENT_BD};
          background: ${ACCENT_DIM};
        }

        .lp-training-card.amber .lp-icon-box {
          color: #facc15;
          border-color: rgba(250,204,21,0.24);
          background: rgba(250,204,21,0.1);
        }

        .lp-training-card.violet .lp-icon-box {
          color: #a5b4fc;
          border-color: rgba(129,140,248,0.24);
          background: rgba(129,140,248,0.1);
        }

        .lp-training-card.red .lp-icon-box {
          color: #f87171;
          border-color: rgba(248,113,113,0.25);
          background: rgba(248,113,113,0.1);
        }

        .lp-training-card h3 {
          margin: 0;
          font-family: var(--font-display);
          font-size: 29px;
          line-height: 1.08;
        }

        .lp-proof {
          padding-top: 74px;
        }

        .lp-proof-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 430px);
          gap: 36px;
          align-items: stretch;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(107,191,184,0.11), transparent 36%),
            rgba(13,19,17,0.76);
        }

        .lp-proof-copy {
          padding: 26px 8px 26px 8px;
        }

        .lp-proof-copy p {
          max-width: 620px;
          margin-top: 18px;
        }

        .lp-inline-cta {
          width: fit-content;
          margin-top: 28px;
          padding: 0 18px;
        }

        .lp-proof-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .lp-proof-stats div {
          min-height: 142px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 18px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .lp-close {
          padding: 40px 20px 96px;
        }

        .lp-close-inner {
          max-width: var(--lp-max);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 32px;
          background:
            linear-gradient(90deg, rgba(250,204,21,0.08), transparent 34%),
            linear-gradient(135deg, rgba(107,191,184,0.16), transparent 46%),
            rgba(13,19,17,0.78);
        }

        .lp-close h2 {
          margin-bottom: 12px;
        }

        .lp-close p {
          max-width: 650px;
        }

        .lp-footer {
          max-width: var(--lp-max);
          margin: 0 auto;
          padding: 26px 20px 36px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .lp-footer-links {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        @media (max-width: 1100px) {
          .lp-nav-links {
            display: none;
          }

          .lp-scene-calendar {
            right: -70px;
            opacity: 0.68;
          }

          .lp-scene-workout,
          .lp-scene-token {
            display: none;
          }

          .lp-training-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .lp-training-card:first-child {
            grid-row: auto;
            min-height: 320px;
          }
        }

        @media (max-width: 820px) {
          .lp-nav-wrap {
            top: 10px;
            padding: 0 10px;
          }

          .lp-nav {
            min-height: 58px;
          }

          .lp-language {
            display: none;
          }

          .lp-link-button-quiet {
            display: none;
          }

          .lp-link-button {
            padding: 0 12px;
          }

          .lp-hero {
            min-height: 92dvh;
            padding-top: 112px;
            align-items: flex-start;
          }

          .lp-hero h1 {
            font-size: 68px;
            line-height: 0.95;
          }

          .lp-hero-copy {
            font-size: 17px;
            line-height: 1.6;
          }

          .lp-hero-metrics,
          .lp-section-head,
          .lp-system-grid,
          .lp-proof-panel,
          .lp-close-inner {
            grid-template-columns: 1fr;
          }

          .lp-hero-metrics {
            margin-top: 36px;
          }

          .lp-hero-metrics div {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }

          .lp-hero-metrics div:last-child {
            border-bottom: 0;
          }

          .lp-hero-next {
            display: none;
          }

          .lp-scene-calendar {
            width: 350px;
            right: -178px;
            top: 48%;
            opacity: 0.32;
          }

          .lp-section {
            padding: 72px 16px;
          }

          .lp-section h2,
          .lp-close h2,
          .lp-proof h2 {
            font-size: 38px;
            line-height: 1.08;
          }

          .lp-training-grid {
            grid-template-columns: 1fr;
          }

          .lp-training-card,
          .lp-training-card:first-child {
            min-height: 250px;
          }

          .lp-close-inner {
            display: grid;
            padding: 24px;
          }
        }

        @media (max-width: 560px) {
          .lp-brand {
            font-size: 0;
          }

          .lp-brand-mark {
            width: 34px;
            height: 34px;
          }

          .lp-link-button-solid {
            font-size: 13px;
          }

          .lp-hero {
            min-height: 96dvh;
            padding-left: 16px;
            padding-right: 16px;
          }

          .lp-hero h1 {
            font-size: 50px;
          }

          .lp-kicker,
          .lp-section-label {
            font-size: 11px;
          }

          .lp-hero-actions {
            align-items: stretch;
          }

          .lp-primary-cta,
          .lp-secondary-cta {
            width: 100%;
          }

          .lp-timeline-row {
            grid-template-columns: 1fr;
          }

          .lp-time {
            padding-top: 0;
          }

          .lp-proof-stats {
            grid-template-columns: 1fr;
          }

          .lp-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-page *,
          .lp-page *::before,
          .lp-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <Navbar />
      <Hero />
      <PlannerSection />
      <TrainingSection />
      <ProofSection />
      <ClosingCta />
      <Footer />
    </main>
  )
}
