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
const FT_DIM    = "rgba(255,107,53,0.08)"
const FT_BD     = "rgba(255,107,53,0.18)"

// ── Scroll reveal ──────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, style }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  return (
    <motion.div ref={ref} style={style}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >{children}</motion.div>
  )
}

// ── App UI mockup (hero right column) ─────────────────────────────────────────
const MOCKUP_DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const MOCKUP_EX   = [
  { name: "Bench Press",    sets: 4, reps: 8,  done: true  },
  { name: "Overhead Press", sets: 3, reps: 10, done: true  },
  { name: "Cable Flyes",    sets: 3, reps: 12, done: false },
  { name: "Lat. Raises",    sets: 3, reps: 15, done: false },
]
const MOCKUP_MU = [
  { name: "Chest", color: "#ef4444" },
  { name: "Back",  color: "#10b981" },
  { name: "Legs",  color: "#f59e0b" },
  { name: "Arms",  color: "#10b981" },
  { name: "Core",  color: "#10b981" },
]

function AppMockup() {
  return (
    <div style={{ position: "relative" }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "5%", left: "10%", width: "80%", height: "80%",
        background: `radial-gradient(circle, ${ACCENT_DIM} 0%, transparent 70%)`,
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          borderRadius: 28,
          border: "1px solid var(--border)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.045) 0%, transparent 50%), var(--panel)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.055)",
          padding: 14, overflow: "hidden",
        }}
      >
        {/* Top edge shine */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
          pointerEvents: "none",
        }} />

        {/* App topbar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderRadius: 22,
          border: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.032), transparent), color-mix(in srgb, var(--panel) 94%, transparent)",
          boxShadow: "var(--shadow)", marginBottom: 12,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" as any,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo.png" alt="" style={{ width: 22, height: 22, borderRadius: 7, objectFit: "contain" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>FitSched</span>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 999, background: FT_DIM, border: `1px solid ${FT_BD}` }}>
              <div className="streak-flame" style={{ width: 10, height: 13 }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: FT_ORANGE }}>7</span>
            </div>
            <div style={{ padding: "4px 9px", borderRadius: 999, background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}` }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: ACCENT }}>14.2 FT</span>
            </div>
          </div>
        </div>

        {/* Day strip */}
        <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
          {MOCKUP_DAYS.map((d, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center", padding: "7px 2px", borderRadius: 14,
              background: i === 2 ? ACCENT : "transparent",
              border: `1px solid ${i === 2 ? ACCENT : "var(--border)"}`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: i === 2 ? "#fff" : "var(--text-muted)" }}>{d}</div>
            </div>
          ))}
        </div>

        {/* Workout card */}
        <div style={{
          borderRadius: 20, border: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.026), transparent 46%), var(--panel)",
          boxShadow: "var(--shadow)", padding: 13, marginBottom: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 11 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Push Day · Today</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.03em" }}>Chest & Shoulders</div>
            </div>
            <div style={{ padding: "4px 10px", borderRadius: 999, background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}` }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: ACCENT }}>+1.0 FT</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {MOCKUP_EX.map((ex, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", borderRadius: 11,
                background: ex.done ? "rgba(16,185,129,0.06)" : "var(--surface-2)",
                border: `1px solid ${ex.done ? "rgba(16,185,129,0.14)" : "transparent"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    background: ex.done ? "#10b981" : "var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {ex.done && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: ex.done ? "var(--text-muted)" : "var(--text)", fontWeight: 600 }}>{ex.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{ex.sets}×{ex.reps}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Muscle recovery strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 14,
          background: "var(--surface-2)", border: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Recovery</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {MOCKUP_MU.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color, boxShadow: `0 0 5px ${m.color}55` }} />
                <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700 }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { id: "EN" as const, native: "English",    flag: "🇺🇸" },
  { id: "CN" as const, native: "中文",        flag: "🇨🇳" },
  { id: "JP" as const, native: "日本語",      flag: "🇯🇵" },
  { id: "VI" as const, native: "Tiếng Việt", flag: "🇻🇳" },
]

function Navbar() {
  const { language, changeLanguage, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40) }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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
      animate={{
        opacity: 1, y: 0,
        marginLeft: scrolled ? 40 : 16,
        marginRight: scrolled ? 40 : 16,
        padding: scrolled ? "10px 14px 10px 18px" : "12px 16px 12px 20px",
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "sticky", top: 12, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(180deg, rgba(255,255,255,0.035), transparent), color-mix(in srgb, var(--panel) 94%, transparent)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" as any,
        borderRadius: 28, border: "1px solid var(--border)",
        boxShadow: scrolled ? "var(--shadow-lg)" : "var(--shadow-md)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <img src="/logo.png" alt="FitSched" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 8 }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>FitSched</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div ref={langRef} style={{ position: "relative" }}>
          <button onClick={() => setLangOpen(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 999, padding: "7px 13px",
            color: "var(--text-muted)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <Globe2 size={13} strokeWidth={2.2} />
            <span>{language}</span>
            <ChevronDown size={11} strokeWidth={2.2} style={{ transform: langOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
          </button>
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, width: 180,
                  background: "var(--panel)", border: "1px solid var(--border)",
                  borderRadius: 16, padding: 5, zIndex: 50,
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {LANG_OPTIONS.map((item, i) => {
                  const active = item.id === language
                  return (
                    <button key={item.id} onClick={() => { changeLanguage(item.id); setLangOpen(false) }} style={{
                      width: "100%", background: active ? ACCENT_DIM : "transparent",
                      border: `1px solid ${active ? ACCENT_BD : "transparent"}`,
                      borderRadius: 11, padding: "9px 11px",
                      color: active ? ACCENT : "var(--text-muted)",
                      display: "flex", alignItems: "center", gap: 10,
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: "pointer", fontFamily: "inherit",
                      marginBottom: i < LANG_OPTIONS.length - 1 ? 2 : 0,
                    }}>
                      <span style={{ fontSize: 18 }}>{item.flag}</span>
                      <span style={{ flex: 1, textAlign: "left" }}>{item.native}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: active ? ACCENT : "var(--text-muted)", opacity: active ? 1 : 0.4 }}>{item.id}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Link href="/register" style={{
          display: "flex", alignItems: "center", gap: 6,
          background: ACCENT, color: "#fff",
          borderRadius: 999, padding: "8px 18px",
          fontSize: 13, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em",
        }}>
          {t.createAccount}
        </Link>
      </div>
    </motion.nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────────
function Hero() {
  const { t } = useLanguage()
  return (
    <section style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "60px 28px", position: "relative", overflow: "hidden",
    }}>
      {/* Blue glows matching the app's dashboard-shell-bg */}
      <div style={{
        position: "absolute", top: -240, left: -180, width: 900, height: 900,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(18,101,254,0.13) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 40, right: -120, width: 600, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(18,101,254,0.05) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", position: "relative" }}>
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          style={{ marginBottom: 44 }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
            borderRadius: 999, padding: "5px 14px",
            fontSize: 10, fontWeight: 900, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, display: "inline-block" }} />
            Fitness · Tokens · Habits
          </span>
        </motion.div>

        {/* Split: text left, mockup right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }} className="lp-hero-grid">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{
                margin: "0 0 22px",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(52px, 7vw, 96px)",
                fontWeight: 800, lineHeight: 0.92,
                letterSpacing: "-0.04em", color: "var(--text)",
              }}
            >
              TRAIN.<br />
              <span style={{ color: ACCENT }}>GET<br />REWARDED.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              style={{ margin: "0 0 30px", fontSize: 16, lineHeight: 1.72, color: "var(--text-muted)", fontWeight: 500, maxWidth: 380 }}
            >
              {t.lpHeroBody}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 30 }}
            >
              <Link href="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: ACCENT, color: "#fff",
                borderRadius: 999, padding: "13px 24px",
                fontSize: 14, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em",
              }}>
                {t.createAccount}
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link href="#features" style={{
                color: "var(--text-muted)", textDecoration: "none",
                fontSize: 13, fontWeight: 700,
                borderBottom: "1px solid var(--border)", paddingBottom: 2,
              }}>
                {t.lpSeeHow}
              </Link>
            </motion.div>

            {/* FitToken pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 14,
                padding: "14px 18px",
                background: FT_DIM, border: `1px solid ${FT_BD}`,
                borderRadius: 16,
              }}
            >
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: FT_ORANGE, fontVariantNumeric: "tabular-nums" }}>+1.0 FT</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: FT_ORANGE }}>per completed workout</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>Base Network · EVM</div>
              </div>
            </motion.div>
          </div>

          <AppMockup />
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ marginTop: 72, borderTop: "1px solid var(--border)", paddingTop: 30, display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}
          className="lp-hero-stats"
        >
          {[
            { v: "80+",     l: "Exercises" },
            { v: "+1.0 FT", l: "Per session" },
            { v: "GPS",     l: "Hike tracking" },
            { v: "Free",    l: "No card needed" },
          ].map((s, i) => (
            <div key={i} style={{
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
              padding: "0 24px", paddingLeft: i === 0 ? 0 : 24,
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────────
function HowItWorks() {
  const STEPS = [
    {
      num: "01", icon: Calendar, color: ACCENT,
      title: "Schedule",
      desc: "Set your weekly training goal. FitSched builds a smart plan around your muscle recovery, readiness, and available equipment.",
    },
    {
      num: "02", icon: Dumbbell, color: "#818cf8",
      title: "Train",
      desc: "Follow the guided session. Device motion sensors verify each movement so every rep earns you the full token reward.",
    },
    {
      num: "03", icon: Zap, color: FT_ORANGE,
      title: "Earn",
      desc: "Finish the session and earn FitTokens — tracked off-chain, claimable to your Base wallet. Streak bonuses stack on top.",
    },
  ]
  return (
    <section style={{ borderTop: "1px solid var(--border)", padding: "100px 28px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 80 }}>
            <h2 style={{
              margin: 0, fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.0,
              letterSpacing: "-0.04em", color: "var(--text)",
            }}>
              How it works
            </h2>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>3 steps</span>
          </div>
        </FadeIn>

        <div>
          {STEPS.map((step, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div style={{
                display: "grid", gridTemplateColumns: "72px 200px 1fr",
                gap: 40, alignItems: "flex-start",
                padding: "40px 0", borderTop: "1px solid var(--border)",
              }} className="lp-step-row">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", paddingTop: 8 }}>
                  {step.num}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `${step.color}12`, border: `1px solid ${step.color}24`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <step.icon size={20} color={step.color} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>
                    {step.title}
                  </div>
                </div>
                <div style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.72, fontWeight: 500, maxWidth: 480, paddingTop: 8 }}>
                  {step.desc}
                </div>
              </div>
            </FadeIn>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
      </div>
    </section>
  )
}

// ── FitToken section ───────────────────────────────────────────────────────────
function FitTokenSection() {
  return (
    <section style={{ borderTop: "1px solid var(--border)", padding: "100px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: -200, right: -200, width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="lp-ft-grid">
          <FadeIn>
            <div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(56px, 9vw, 108px)", fontWeight: 900, lineHeight: 0.92,
                letterSpacing: "-0.04em", color: FT_ORANGE, fontVariantNumeric: "tabular-nums", marginBottom: 14,
              }}>
                +1.0<br />FT
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Per Completed Workout</div>
              <div style={{ marginTop: 24, display: "inline-flex", alignItems: "center", gap: 7, background: FT_DIM, border: `1px solid ${FT_BD}`, borderRadius: 999, padding: "6px 14px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: FT_ORANGE }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: FT_ORANGE, letterSpacing: "0.1em" }}>BASE NETWORK · EVM</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.12}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h2 style={{
                margin: 0, fontFamily: "var(--font-display)",
                fontSize: "clamp(24px, 3vw, 38px)", fontWeight: 800, lineHeight: 1.1,
                letterSpacing: "-0.04em", color: "var(--text)",
              }}>
                Real crypto rewards<br />for real effort.
              </h2>
              <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.72, fontWeight: 500 }}>
                Every workout earns FitTokens — tracked off-chain, claimable to your Base wallet. Streak bonuses, verification multipliers, and weekly boosts mean the harder you train, the more you earn.
              </p>
              {/* Reward table — app panel style */}
              <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)" }}>
                {[
                  { label: "Base workout",       value: "+1.0 FT" },
                  { label: "7-day streak bonus",  value: "+0.20 FT" },
                  { label: "Motion verified",      value: "Full reward" },
                ].map((row, i, arr) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px",
                    background: i % 2 === 0 ? "var(--surface-2)" : "transparent",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 900, color: FT_ORANGE, fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
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
    { icon: Zap,        color: ACCENT,     title: "Smart Scheduling",    desc: "Weekly plans built around your recovery, muscle readiness, and goals." },
    { icon: Flame,      color: FT_ORANGE,  title: "Streak System",       desc: "Daily streaks with freeze protection so one bad day doesn't reset everything." },
    { icon: Navigation, color: "#818cf8",  title: "GPS Hike Tracking",   desc: "Log outdoor hikes with live GPS route recording and elevation data." },
    { icon: Dumbbell,   color: "#34d399",  title: "Motion Verification", desc: "Device sensors confirm every rep and award full token rewards." },
    { icon: BarChart2,  color: "#f59e0b",  title: "Achievements",        desc: "Unlock badges and track personal records across every muscle group." },
    { icon: Calendar,   color: "#e879f9",  title: "Calendar Sync",       desc: "Push your workout schedule directly to Google Calendar." },
  ]
  return (
    <section id="features" style={{ borderTop: "1px solid var(--border)", padding: "100px 28px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <h2 style={{
              margin: 0, fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, lineHeight: 1.05,
              letterSpacing: "-0.04em", color: "var(--text)",
            }}>
              {t.lpEveryTool}<br />
              <span style={{ color: "var(--text-muted)" }}>{t.lpNothingYouDont}</span>
            </h2>
          </div>
        </FadeIn>

        {/* 2-column list — no generic card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 64 }} className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 0.07}>
              <div style={{
                display: "flex", gap: 18, alignItems: "flex-start",
                padding: "28px 0", borderTop: "1px solid var(--border)",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `${f.color}12`, border: `1px solid ${f.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
                }}>
                  <f.icon size={17} color={f.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, fontWeight: 500 }}>{f.desc}</div>
                </div>
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
    <section style={{ borderTop: "1px solid var(--border)", padding: "120px 28px", textAlign: "center" }}>
      <FadeIn>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{
            margin: "0 0 20px", fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, lineHeight: 0.94,
            letterSpacing: "-0.045em", color: "var(--text)",
          }}>
            Start training<br />today.
          </h2>
          <p style={{ margin: "0 0 40px", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.72, fontWeight: 500 }}>
            {t.lpCtaBody}
          </p>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: ACCENT, color: "#fff",
            borderRadius: 999, padding: "14px 32px",
            fontSize: 14, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            {t.lpGetStartedFree}
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <div style={{ marginTop: 18, fontSize: 11, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Free · No credit card
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
      borderTop: "1px solid var(--border)", padding: "24px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      maxWidth: 1200, margin: "0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/logo.png" alt="FitSched" style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 6, opacity: 0.4 }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-muted)" }}>FitSched</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/privacy" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700, opacity: 0.6 }}>Privacy</Link>
        <Link href="/terms"   style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700, opacity: 0.6 }}>Terms</Link>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, opacity: 0.5 }}>{t.lpFooterTagline}</span>
      </div>
    </footer>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div style={{ minHeight: "100dvh", overflowX: "hidden" }}>
      <style>{`
        @media (max-width: 768px) {
          .lp-hero-grid     { grid-template-columns: 1fr !important; gap: 48px !important; }
          .lp-hero-stats    { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-hero-stats > *:nth-child(odd)  { border-right: 1px solid var(--border) !important; }
          .lp-hero-stats > *:nth-child(even) { border-right: none !important; padding-left: 20px !important; }
          .lp-hero-stats > *:nth-child(-n+2) { border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 4px; }
          .lp-step-row      { grid-template-columns: 48px 1fr !important; gap: 16px 20px !important; }
          .lp-step-row > *:last-child { grid-column: 1 / -1; padding-top: 0 !important; }
          .lp-ft-grid       { grid-template-columns: 1fr !important; gap: 40px !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; column-gap: 0 !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .lp-hero-grid  { grid-template-columns: 1.1fr 0.9fr !important; gap: 40px !important; }
          .lp-step-row   { grid-template-columns: 60px 160px 1fr !important; gap: 24px !important; }
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
