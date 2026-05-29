"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Flame, Zap, Navigation, BarChart2,
  Calendar, Dumbbell, ChevronDown, Globe2,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ACCENT, ACCENT_DIM, ACCENT_BD } from "@/lib/theme"

const FT_ORANGE = "#FF6B35"

// ── Scroll reveal ──────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  return (
    <motion.div ref={ref} style={style}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >{children}</motion.div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { id: "EN" as const, native: "English",   flag: "🇺🇸" },
  { id: "CN" as const, native: "中文",       flag: "🇨🇳" },
  { id: "JP" as const, native: "日本語",     flag: "🇯🇵" },
  { id: "VI" as const, native: "Tiếng Việt", flag: "🇻🇳" },
]

function Navbar() {
  const { language, changeLanguage, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!langOpen) return
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [langOpen])

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "sticky", top: 0, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        background: "rgba(10,10,10,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <img src="/logo.png" alt="FitSched" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 7 }} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>FitSched</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div ref={langRef} style={{ position: "relative" }}>
          <button onClick={() => setLangOpen(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "7px 13px",
            color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <Globe2 size={13} strokeWidth={2.2} />
            <span>{language}</span>
            <ChevronDown size={11} strokeWidth={2.2} style={{ transform: langOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
          </button>
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, width: 180,
                  background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16, padding: 5, zIndex: 50,
                  boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
                }}
              >
                {LANG_OPTIONS.map((item, i) => {
                  const active = item.id === language
                  return (
                    <button key={item.id} onClick={() => { changeLanguage(item.id); setLangOpen(false) }} style={{
                      width: "100%", background: active ? ACCENT_DIM : "transparent",
                      border: `1px solid ${active ? ACCENT_BD : "transparent"}`,
                      borderRadius: 11, padding: "9px 11px",
                      color: active ? ACCENT : "rgba(255,255,255,0.75)",
                      display: "flex", alignItems: "center", gap: 10,
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: "pointer", fontFamily: "inherit",
                      marginBottom: i < LANG_OPTIONS.length - 1 ? 2 : 0,
                    }}>
                      <span style={{ fontSize: 18 }}>{item.flag}</span>
                      <span style={{ flex: 1, textAlign: "left" }}>{item.native}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: active ? ACCENT : "rgba(255,255,255,0.25)" }}>{item.id}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Link href="/register" style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#fff", color: "#0a0a0a",
          borderRadius: 999, padding: "8px 18px",
          fontSize: 13, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em",
        }}>
          {t.createAccount}
        </Link>
      </div>
    </motion.nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const { t } = useLanguage()
  return (
    <section style={{
      minHeight: "100dvh", background: "#0a0a0a",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: "60px 28px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
        `,
        backgroundSize: "72px 72px",
      }} />
      {/* Blue ambient glow */}
      <div style={{
        position: "absolute", bottom: -160, left: -120, width: 700, height: 700,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(18,101,254,0.10) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", position: "relative" }}>
        {/* Eyebrow */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} style={{ marginBottom: 36 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(18,101,254,0.1)", border: "1px solid rgba(18,101,254,0.2)",
            borderRadius: 999, padding: "5px 14px",
            fontSize: 10, fontWeight: 900, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
            Fitness · Tokens · Habits
          </span>
        </motion.div>

        {/* Split layout: huge headline left, content right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "flex-end" }} className="lp-hero-grid">
          {/* Left — giant headline */}
          <motion.h1
            initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
              margin: 0,
              fontSize: "clamp(62px, 9vw, 120px)",
              fontWeight: 950, lineHeight: 0.9,
              letterSpacing: "-0.04em", color: "#fff",
            }}
          >
            TRAIN.<br />
            <span style={{ color: ACCENT }}>GET<br />REWARDED.</span>
          </motion.h1>

          {/* Right — body + CTAs + FT pill */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 6 }}
          >
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", fontWeight: 500, maxWidth: 380 }}>
              {t.lpHeroBody}
            </p>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#fff", color: "#0a0a0a",
                borderRadius: 14, padding: "14px 24px",
                fontSize: 14, fontWeight: 900, textDecoration: "none", letterSpacing: "-0.01em",
              }}>
                {t.createAccount}
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link href="#features" style={{
                color: "rgba(255,255,255,0.35)", textDecoration: "none",
                fontSize: 13, fontWeight: 700,
                borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: 2,
              }}>
                {t.lpSeeHow}
              </Link>
            </div>

            {/* FitToken pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 20px",
              background: "rgba(255,107,53,0.07)",
              border: "1px solid rgba(255,107,53,0.18)",
              borderRadius: 14, maxWidth: 340,
            }}>
              <span style={{ fontSize: 30, fontWeight: 950, letterSpacing: "-0.04em", color: FT_ORANGE, fontVariantNumeric: "tabular-nums" }}>+1.0 FT</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: FT_ORANGE }}>per completed workout</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginTop: 2 }}>Base Network · EVM</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom data strip */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          style={{ marginTop: 60, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28, display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}
          className="lp-hero-stats"
        >
          {[
            { v: "80+", l: "Exercises" },
            { v: "+1.0 FT", l: "Per session" },
            { v: "GPS", l: "Hike tracking" },
            { v: "Free", l: "No card needed" },
          ].map((s, i) => (
            <div key={i} style={{
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
              padding: "0 24px", paddingLeft: i === 0 ? 0 : 24,
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── How it works ───────────────────────────────────────────────────────────────
function HowItWorks() {
  const STEPS = [
    { num: "01", icon: Calendar,  color: ACCENT,      title: "Schedule", desc: "Set your weekly goal. FitSched builds a smart plan around your recovery and muscle readiness." },
    { num: "02", icon: Dumbbell,  color: "#818cf8",   title: "Train",    desc: "Follow the guided session. Motion tracking verifies every rep for a full token reward." },
    { num: "03", icon: Zap,       color: FT_ORANGE,   title: "Earn",     desc: "Complete the session, claim FitTokens to your Base wallet. Streak bonuses stack." },
  ]
  return (
    <section style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "100px 28px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <p style={{ margin: "0 0 64px", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
            How it works
          </p>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }} className="lp-steps-grid">
          {STEPS.map((step, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div style={{
                padding: "40px 32px",
                borderTop: `2px solid ${step.color}`,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                background: "rgba(255,255,255,0.015)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)", marginBottom: 28, fontFamily: "monospace" }}>{step.num} /</div>
                <step.icon size={20} color={step.color} strokeWidth={1.8} style={{ marginBottom: 18, display: "block" }} />
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontWeight: 500 }}>{step.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FitToken section ───────────────────────────────────────────────────────────
function FitTokenSection() {
  return (
    <section style={{
      background: "#0d0d0d",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "100px 28px", overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", top: -200, right: -200, width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,53,0.05) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="lp-ft-grid">
          {/* Left */}
          <FadeIn>
            <div>
              <div style={{
                fontSize: "clamp(56px, 9vw, 108px)", fontWeight: 950, lineHeight: 0.95,
                letterSpacing: "-0.04em", color: FT_ORANGE, fontVariantNumeric: "tabular-nums", marginBottom: 14,
              }}>+1.0<br />FT</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 800, letterSpacing: "0.1em" }}>PER COMPLETED WORKOUT</div>
              <div style={{ marginTop: 24, display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 999, padding: "6px 14px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: FT_ORANGE }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: FT_ORANGE, letterSpacing: "0.1em" }}>BASE NETWORK · EVM</span>
              </div>
            </div>
          </FadeIn>

          {/* Right */}
          <FadeIn delay={0.12}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.2vw, 38px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.03em", color: "#fff" }}>
                Real crypto rewards<br />for real effort.
              </h2>
              <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.42)", lineHeight: 1.72, fontWeight: 500 }}>
                Every workout earns FitTokens — tracked off-chain, claimable to your Base wallet. Streak bonuses, verification multipliers, and weekly boosts mean the harder you train, the more you earn.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Base workout",        value: "+1.0 FT" },
                  { label: "7-day streak bonus",  value: "+0.20 FT" },
                  { label: "Motion verified",      value: "Full reward" },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 16px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: FT_ORANGE, fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ── Features ───────────────────────────────────────────────────────────────────
function Features() {
  const { t } = useLanguage()
  const FEATURES = [
    { icon: Zap,       color: ACCENT,     title: "Smart Scheduling",    desc: "Weekly plans built around your recovery, muscle readiness, and goals." },
    { icon: Flame,     color: FT_ORANGE,  title: "Streak System",       desc: "Daily streaks with freeze protection so one bad day doesn't reset everything." },
    { icon: Navigation,color: "#818cf8",  title: "GPS Hike Tracking",   desc: "Log outdoor hikes with live GPS route recording and elevation data." },
    { icon: Dumbbell,  color: "#34d399",  title: "Motion Verification", desc: "Device motion sensors confirm every rep and award full token rewards." },
    { icon: BarChart2, color: "#f59e0b",  title: "Achievements",        desc: "Unlock badges and track personal records across every muscle group." },
    { icon: Calendar,  color: "#e879f9",  title: "Calendar Sync",       desc: "Push your workout schedule directly to Google Calendar." },
  ]

  return (
    <section id="features" style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "100px 28px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#fff" }}>
              {t.lpEveryTool}<br />
              <span style={{ color: "rgba(255,255,255,0.25)" }}>{t.lpNothingYouDont}</span>
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <div style={{
                padding: "32px 28px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                borderRight: i % 3 !== 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${f.color}12`, border: `1px solid ${f.color}24`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <f.icon size={16} color={f.color} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.65, fontWeight: 500 }}>{f.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────────────────────────
function CtaBlock() {
  const { t } = useLanguage()
  return (
    <section style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "120px 28px", textAlign: "center" }}>
      <FadeIn>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 22px", fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 950, lineHeight: 0.96, letterSpacing: "-0.045em", color: "#fff" }}>
            Start training<br />today.
          </h2>
          <p style={{ margin: "0 0 40px", fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.7, fontWeight: 500 }}>
            {t.lpCtaBody}
          </p>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", color: "#0a0a0a",
            borderRadius: 14, padding: "15px 32px",
            fontSize: 14, fontWeight: 900, textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            {t.lpGetStartedFree}
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <div style={{ marginTop: 18, fontSize: 11, color: "rgba(255,255,255,0.18)", fontWeight: 700, letterSpacing: "0.04em" }}>
            FREE · NO CREDIT CARD
          </div>
        </div>
      </FadeIn>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useLanguage()
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "24px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      maxWidth: 1200, margin: "0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/logo.png" alt="FitSched" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 6, opacity: 0.5 }} />
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.3)" }}>FitSched</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/privacy" style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textDecoration: "none", fontWeight: 700 }}>Privacy</Link>
        <Link href="/terms"   style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textDecoration: "none", fontWeight: 700 }}>Terms</Link>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontWeight: 600 }}>{t.lpFooterTagline}</span>
      </div>
    </footer>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", overflowX: "hidden" }}>
      <style>{`
        @media (max-width: 768px) {
          .lp-hero-grid    { grid-template-columns: 1fr !important; gap: 40px !important; }
          .lp-hero-stats   { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-hero-stats > *:nth-child(odd)  { border-right: 1px solid rgba(255,255,255,0.07) !important; }
          .lp-hero-stats > *:nth-child(even) { border-right: none !important; padding-left: 24px !important; }
          .lp-hero-stats > *:nth-child(-n+2) { border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 20px; margin-bottom: 4px; }
          .lp-steps-grid   { grid-template-columns: 1fr !important; }
          .lp-steps-grid > * { border-right: none !important; }
          .lp-ft-grid      { grid-template-columns: 1fr !important; gap: 40px !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-features-grid > * { border-right: none !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .lp-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-features-grid > *:nth-child(even) { border-right: none !important; }
          .lp-features-grid > *:nth-child(odd)  { border-right: 1px solid rgba(255,255,255,0.07) !important; }
        }
      `}</style>
      <Navbar />
      <Hero />
      <HowItWorks />
      <FitTokenSection />
      <Features />
      <CtaBlock />
      <Footer />
    </div>
  )
}
