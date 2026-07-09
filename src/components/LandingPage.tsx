"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Flame, Zap, Navigation, BarChart2,
  Calendar, Dumbbell, ChevronDown, Globe2, ChevronLeft,
  Coins, Sparkles, Activity, Trophy,
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

// ── Phone Screen 1: Schedule ───────────────────────────────────────────────────
const SCHED_DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const SCHED_EX = [
  { name: "Bench Press",    sets: 4, reps: 8,  done: true  },
  { name: "Overhead Press", sets: 3, reps: 10, done: true  },
  { name: "Cable Flyes",    sets: 3, reps: 12, done: false },
  { name: "Lat. Raises",    sets: 3, reps: 15, done: false },
]
const SCHED_MU_COLORS = ["#ef4444", "#10b981", "#f59e0b", "#10b981", "#10b981"]

function ScheduleScreen() {
  const { t } = useLanguage()
  const SCHED_MU = [
    { name: t.lpmMuChest, color: SCHED_MU_COLORS[0] },
    { name: t.lpmMuBack,  color: SCHED_MU_COLORS[1] },
    { name: t.lpmMuLegs,  color: SCHED_MU_COLORS[2] },
    { name: t.lpmMuArms,  color: SCHED_MU_COLORS[3] },
    { name: t.lpmMuCore,  color: SCHED_MU_COLORS[4] },
  ]
  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 7, height: "100%" }}>
      {/* Topbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 10px", borderRadius: 16,
        border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <img src="/logo.png" alt="" style={{ width: 18, height: 18, borderRadius: 5, objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>FitSched</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 999, background: FT_DIM, border: `1px solid ${FT_BD}` }}>
            <div className="streak-flame" style={{ width: 8, height: 11 }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: FT_ORANGE }}>7</span>
          </div>
          <div style={{ padding: "3px 7px", borderRadius: 999, background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}` }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: ACCENT }}>14.2 FT</span>
          </div>
        </div>
      </div>

      {/* Day strip */}
      <div style={{ display: "flex", gap: 2 }}>
        {SCHED_DAYS.map((d, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", padding: "5px 1px", borderRadius: 10,
            background: i === 2 ? ACCENT : "transparent",
            border: `1px solid ${i === 2 ? ACCENT : "var(--border)"}`,
          }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: i === 2 ? "#fff" : "var(--text-muted)" }}>{d}</div>
          </div>
        ))}
      </div>

      {/* Workout card */}
      <div style={{
        borderRadius: 16, border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.026)", padding: 10, flex: 1,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 7, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{t.lpmPushDay} · {t.todayLabel}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.03em" }}>{t.lpmChestShoulders}</div>
          </div>
          <div style={{ padding: "3px 8px", borderRadius: 999, background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}` }}>
            <span style={{ fontSize: 8, fontWeight: 900, color: ACCENT }}>+1.0 FT</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {SCHED_EX.map((ex, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 8px", borderRadius: 8,
              background: ex.done ? "rgba(16,185,129,0.06)" : "var(--surface-2)",
              border: `1px solid ${ex.done ? "rgba(16,185,129,0.14)" : "transparent"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                  background: ex.done ? "#10b981" : "var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {ex.done && (
                    <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 9, color: ex.done ? "var(--text-muted)" : "var(--text)", fontWeight: 600 }}>{ex.name}</span>
              </div>
              <span style={{ fontSize: 8, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{ex.sets}×{ex.reps}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recovery strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", borderRadius: 12,
        background: "var(--surface-2)", border: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 7, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>{t.lpmRecovery}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {SCHED_MU.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, boxShadow: `0 0 4px ${m.color}55` }} />
              <span style={{ fontSize: 7, color: "var(--text-muted)", fontWeight: 700 }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Phone Screen 2: Active Workout ─────────────────────────────────────────────
const ACTIVE_EXES = ["Bench Press", "Overhead Press", "Cable Flyes"]
const TOTAL_SETS = 4

function ActiveScreen() {
  const { t } = useLanguage()
  const [set, setSet] = useState(1)
  const [exIdx, setExIdx] = useState(0)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setSet(s => {
        if (s < TOTAL_SETS) return s + 1
        setExIdx(e => (e + 1) % ACTIVE_EXES.length)
        return 1
      })
    }, 900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setVerified(false)
    const t = setTimeout(() => setVerified(true), 380)
    return () => clearTimeout(t)
  }, [set, exIdx])

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={13} strokeWidth={2.5} color="var(--text-muted)" />
        <AnimatePresence mode="wait">
          <motion.span
            key={exIdx}
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            {ACTIVE_EXES[exIdx]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Big set counter */}
      <div style={{ textAlign: "center", paddingTop: 4 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${exIdx}-${set}`}
            initial={{ opacity: 0, scale: 0.65, y: -14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.2, y: 14 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 80, fontWeight: 900, lineHeight: 1,
              color: "var(--text)", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums",
            }}>
              {set}
            </div>
          </motion.div>
        </AnimatePresence>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>
          {t.lpmSetsReps}
        </div>

        {/* Set dots */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 12 }}>
          {Array.from({ length: TOTAL_SETS }).map((_, i) => (
            <div key={i} style={{
              width: i < set ? 22 : 7, height: 6, borderRadius: 3,
              background: i < set ? ACCENT : "var(--border)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--surface-2)", borderRadius: 6, height: 4, overflow: "hidden", margin: "0 2px" }}>
        <motion.div
          animate={{ width: `${(set / TOTAL_SETS) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height: "100%", background: ACCENT, borderRadius: 6 }}
        />
      </div>

      {/* Motion verified badge */}
      <AnimatePresence>
        {verified && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18 }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 12,
              background: "rgba(16,185,129,0.07)",
              border: "1px solid rgba(16,185,129,0.18)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5.5" stroke="#10b981" strokeWidth="1" />
              <path d="M3.5 6L5 7.5L8.5 4" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981" }}>{t.lpRewardVerified}</span>
            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>+0.25 FT</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest timer */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{t.lpmRest}</div>
      </div>

      {/* CTA + home bar */}
      <div style={{ marginTop: "auto" }}>
        <div className="clay-key" style={{
          padding: "11px", borderRadius: 14,
          textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "-0.01em", cursor: "default",
        }}>
          {t.lpmCompleteSet} {set}
        </div>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14 }}>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
        </div>
      </div>
    </div>
  )
}

// ── Phone Screen 3: History ────────────────────────────────────────────────────
function HistoryScreen() {
  const { t } = useLanguage()
  const HIST_ITEMS = [
    { title: t.lpmChestShoulders, tag: t.lpmPushDay, ago: t.lpmYesterday, ft: "+1.0 FT" },
    { title: t.lpmSquats,         tag: t.lpmLegDay,  ago: t.lpm2days,     ft: "+1.2 FT" },
    { title: t.lpmTrail,          tag: t.hike,       ago: t.lpm3days,     ft: "+0.8 FT" },
  ]
  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      {/* Header */}
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.04em" }}>{t.history}</div>

      {/* Streak card */}
      <div style={{
        padding: "12px 14px", borderRadius: 16,
        background: FT_DIM, border: `1px solid ${FT_BD}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="streak-flame" style={{ width: 18, height: 24 }} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: FT_ORANGE, letterSpacing: "-0.04em", lineHeight: 1 }}>7</div>
            <div style={{ fontSize: 8, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.dayStreak}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: FT_ORANGE, letterSpacing: "-0.03em" }}>24.6 FT</div>
          <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700 }}>{t.lpmThisWeek}</div>
        </div>
      </div>

      {/* Section label */}
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.lpmRecent}</div>

      {/* Workout list */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {HIST_ITEMS.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0",
            borderTop: i > 0 ? "1px solid var(--border)" : "none",
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>{item.title}</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>{item.tag} · {item.ago}</div>
            </div>
            <div style={{ padding: "3px 8px", borderRadius: 999, background: FT_DIM, border: `1px solid ${FT_BD}` }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: FT_ORANGE }}>{item.ft}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Home bar */}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "center", paddingBottom: 4 }}>
        <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
      </div>
    </div>
  )
}

// ── Phone Mockup ───────────────────────────────────────────────────────────────
function PhoneMockup() {
  const [screen, setScreen] = useState(0)
  const [dir, setDir] = useState(1)
  const COUNT = 3

  useEffect(() => {
    const t = setInterval(() => {
      setDir(1)
      setScreen(s => (s + 1) % COUNT)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  const advance = () => {
    setDir(1)
    setScreen(s => (s + 1) % COUNT)
  }

  const W = 270, H = 580, R = 50, B = 13

  const SCREENS = [
    <ScheduleScreen key="schedule" />,
    <ActiveScreen key="active" />,
    <HistoryScreen key="history" />,
  ]

  return (
    <div className="lp-phone-wrap" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {/* Ambient glow behind phone */}
      <div style={{
        position: "absolute", top: "10%", left: "5%", width: "90%", height: "80%",
        background: `radial-gradient(circle, ${ACCENT_DIM} 0%, transparent 70%)`,
        filter: "blur(50px)", pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.95, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={advance}
        style={{ position: "relative", cursor: "pointer", userSelect: "none" as const }}
      >
        {/* iPhone shell */}
        <div style={{
          width: W, height: H, borderRadius: R,
          background: "linear-gradient(145deg, #2e2e30 0%, #1c1c1e 50%, #111112 100%)",
          boxShadow: [
            "0 0 0 1px rgba(255,255,255,0.07)",
            "0 0 0 2.5px #0d0d0e",
            "0 52px 150px rgba(0,0,0,0.8)",
            "inset 0 1px 0 rgba(255,255,255,0.12)",
            "inset 0 -1px 0 rgba(0,0,0,0.5)",
          ].join(", "),
          padding: B, position: "relative",
        }}>
          {/* Silent switch */}
          <div style={{ position: "absolute", left: -3, top: 100, width: 3, height: 24, background: "#2a2a2c", borderRadius: "3px 0 0 3px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }} />
          {/* Vol up */}
          <div style={{ position: "absolute", left: -3, top: 140, width: 3, height: 52, background: "#2a2a2c", borderRadius: "3px 0 0 3px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }} />
          {/* Vol down */}
          <div style={{ position: "absolute", left: -3, top: 204, width: 3, height: 52, background: "#2a2a2c", borderRadius: "3px 0 0 3px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }} />
          {/* Power */}
          <div style={{ position: "absolute", right: -3, top: 180, width: 3, height: 72, background: "#2a2a2c", borderRadius: "0 3px 3px 0", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }} />

          {/* Screen */}
          <div style={{
            width: W - B * 2, height: H - B * 2,
            borderRadius: R - B + 2,
            background: "#111514",
            overflow: "hidden", position: "relative",
          }}>
            {/* Top edge shine */}
            <div style={{
              position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
              zIndex: 10, pointerEvents: "none",
            }} />

            {/* Dynamic Island */}
            <div style={{
              position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)",
              width: 102, height: 30, borderRadius: 20, background: "#000", zIndex: 20,
            }} />

            {/* Screen content */}
            <div style={{ paddingTop: 48, height: "100%", overflow: "hidden" }}>
              <AnimatePresence custom={dir} mode="wait">
                <motion.div
                  key={screen}
                  custom={dir}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -30, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: "100%" }}
                >
                  {SCREENS[screen]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {Array.from({ length: COUNT }).map((_, i) => (
          <div
            key={i}
            onClick={() => { setDir(i > screen ? 1 : -1); setScreen(i) }}
            style={{
              width: i === screen ? 20 : 6, height: 6, borderRadius: 3,
              background: i === screen ? ACCENT : "var(--border)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
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
  const [isMobile, setIsMobile] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

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
        marginLeft: scrolled ? (isMobile ? 10 : 40) : (isMobile ? 8 : 16),
        marginRight: scrolled ? (isMobile ? 10 : 40) : (isMobile ? 8 : 16),
        padding: scrolled ? "10px 14px 10px 18px" : "12px 16px 12px 20px",
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "sticky", top: 12, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        // Match the dashboard bottom-nav glass: low-opacity panel tint + heavy blur
        // so backdrop scenery (hero gradient, scroll content) shows through.
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), transparent), color-mix(in srgb, var(--panel) 72%, transparent)",
        backdropFilter: "blur(22px) saturate(140%)",
        WebkitBackdropFilter: "blur(22px) saturate(140%)" as any,
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
          borderRadius: 999, padding: "8px 18px",
          fontSize: 13, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }} className="lp-nav-cta clay-key">
          <span className="lp-nav-cta-full">{t.createAccount}</span>
          <span className="lp-nav-cta-short">{t.signUp}</span>
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
      padding: "clamp(40px,8vw,80px) clamp(18px,4vw,28px)", position: "relative", overflow: "hidden",
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
          style={{ marginBottom: "clamp(24px,6vw,44px)" }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
            borderRadius: 999, padding: "5px 14px",
            fontSize: 10, fontWeight: 900, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, display: "inline-block" }} />
            {t.lpEyebrow}
          </span>
        </motion.div>

        {/* Split: text left, phone right */}
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
              {t.lpHead1}<br />
              <span style={{ color: ACCENT }}>{t.lpHead2}<br />{t.lpHead3}</span>
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
              <Link href="/register" className="clay-key" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
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
                <div style={{ fontSize: 11, fontWeight: 800, color: FT_ORANGE }}>{t.lpPerWorkout}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>{t.lpBaseNetwork}</div>
              </div>
            </motion.div>
          </div>

          <PhoneMockup />
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ marginTop: "clamp(40px,6vw,72px)", borderTop: "1px solid var(--border)", paddingTop: 30, display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}
          className="lp-hero-stats"
        >
          {[
            { v: "80+",       l: t.lpStatExercisesLabel },
            { v: "+1.0 FT",   l: t.lpStatPerSession },
            { v: "GPS",       l: t.lpStatHikeTracking },
            { v: t.lpStatFree, l: t.lpStatNoCard },
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
  const { t } = useLanguage()
  const STEPS = [
    {
      num: "01", icon: Calendar, color: ACCENT,
      title: t.lpStepSchedule,
      desc: t.lpStepScheduleDesc,
    },
    {
      num: "02", icon: Dumbbell, color: "#818cf8",
      title: t.lpStepTrain,
      desc: t.lpStepTrainDesc,
    },
    {
      num: "03", icon: Coins, color: FT_ORANGE,
      title: t.lpStepEarn,
      desc: t.lpStepEarnDesc,
    },
  ]
  return (
    <section style={{ borderTop: "1px solid var(--border)", padding: "clamp(64px,9vw,100px) clamp(18px,4vw,28px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "clamp(44px,7vw,80px)" }}>
            <h2 style={{
              margin: 0, fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.0,
              letterSpacing: "-0.04em", color: "var(--text)",
            }}>
              {t.lpHowItWorks}
            </h2>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{t.lpSteps}</span>
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
  const { t } = useLanguage()
  return (
    <section style={{ borderTop: "1px solid var(--border)", padding: "clamp(64px,9vw,100px) clamp(18px,4vw,28px)", position: "relative", overflow: "hidden" }}>
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
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.lpFtPerCompleted}</div>
              <div style={{ marginTop: 24, display: "inline-flex", alignItems: "center", gap: 7, background: FT_DIM, border: `1px solid ${FT_BD}`, borderRadius: 999, padding: "6px 14px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: FT_ORANGE }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: FT_ORANGE, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.lpBaseNetwork}</span>
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
                {t.lpFtTitle}
              </h2>
              <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.72, fontWeight: 500 }}>
                {t.lpFtBody}
              </p>
              {/* Reward table — app panel style */}
              <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)" }}>
                {[
                  { label: t.lpRewardBase,     value: "+1.0 FT" },
                  { label: t.lpRewardStreak,   value: "+0.20 FT" },
                  { label: t.lpRewardVerified, value: t.lpFullReward },
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
    { icon: Sparkles,   color: ACCENT,     title: t.lpFeatSmartSched, desc: t.lpFeatSmartSchedDesc },
    { icon: Flame,      color: FT_ORANGE,  title: t.lpFeatStreak,     desc: t.lpFeatStreakDesc },
    { icon: Navigation, color: "#818cf8",  title: t.lpFeatGps,        desc: t.lpFeatGpsDesc },
    { icon: Activity,   color: "#34d399",  title: t.lpFeatMotion,     desc: t.lpFeatMotionDesc },
    { icon: Trophy,     color: "#f59e0b",  title: t.lpFeatAchieve,    desc: t.lpFeatAchieveDesc },
    { icon: Calendar,   color: "#e879f9",  title: t.lpFeatCalSync,    desc: t.lpFeatCalSyncDesc },
  ]
  return (
    <section id="features" style={{ borderTop: "1px solid var(--border)", padding: "clamp(64px,9vw,100px) clamp(18px,4vw,28px)" }}>
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
    <section style={{ borderTop: "1px solid var(--border)", padding: "clamp(72px,10vw,120px) clamp(18px,4vw,28px)", textAlign: "center" }}>
      <FadeIn>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{
            margin: "0 0 20px", fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, lineHeight: 0.94,
            letterSpacing: "-0.045em", color: "var(--text)",
          }}>
            {t.lpCtaTitle1}<br />{t.lpCtaTitle2}
          </h2>
          <p style={{ margin: "0 0 40px", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.72, fontWeight: 500 }}>
            {t.lpCtaBody}
          </p>
          <Link href="/register" className="clay-key" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            borderRadius: 999, padding: "14px 32px",
            fontSize: 14, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            {t.lpGetStartedFree}
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <div style={{ marginTop: 18, fontSize: 11, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t.lpFreeNoCard}
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
          .lp-hero-grid     { grid-template-columns: 1fr !important; gap: 36px !important; }
          .lp-hero-stats    { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-hero-stats > *:nth-child(odd)  { border-right: 1px solid var(--border) !important; }
          .lp-hero-stats > *:nth-child(even) { border-right: none !important; padding-left: 16px !important; }
          .lp-hero-stats > *:nth-child(-n+2) { border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 4px; }
          .lp-step-row      { grid-template-columns: 40px 1fr !important; gap: 12px 16px !important; }
          .lp-step-row > *:last-child { grid-column: 1 / -1; padding-top: 0 !important; }
          .lp-ft-grid       { grid-template-columns: 1fr !important; gap: 32px !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; column-gap: 0 !important; }
          .lp-phone-wrap    { transform: scale(0.88); transform-origin: top center; margin-bottom: -40px; }
          .lp-nav-cta-full  { display: none; }
          .lp-nav-cta-short { display: inline; }
        }
        @media (min-width: 769px) {
          .lp-nav-cta-full  { display: inline; }
          .lp-nav-cta-short { display: none; }
        }
        @media (max-width: 360px) {
          .lp-phone-wrap { transform: scale(0.78); transform-origin: top center; margin-bottom: -64px; }
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
