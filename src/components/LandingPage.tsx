"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Flame, Zap, Navigation, BarChart2,
  Calendar, CheckCheck, Dumbbell, ChevronDown, Globe2,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ACCENT, ACCENT_DIM, ACCENT_BD } from "@/lib/theme"

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode
  delay?: number
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 26 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.58, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Phone mockup — intentionally always dark (showing a phone screen) ──────────

const WEEK_DAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"]
const MOCK_CARDS = [
  { time: "07:00", label: "Morning Run", tag: "CARDIO",    dot: "#f59e0b" },
  { time: "12:30", label: "Upper Body",  tag: "STRENGTH",  dot: ACCENT    },
  { time: "19:00", label: "Yoga Flow",   tag: "FLEX",      dot: "#818cf8" },
]

function PhoneMockup() {
  return (
    <motion.div
      animate={{ y: [0, -11, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: 248, flexShrink: 0,
        borderRadius: 42,
        background: "#0c1210",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: [
          "0 64px 120px rgba(0,0,0,0.7)",
          "0 0 0 1px rgba(255,255,255,0.04)",
          "inset 0 1px 0 rgba(255,255,255,0.06)",
          `0 0 80px -20px rgba(107,191,184,0.18)`,
        ].join(", "),
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Dynamic island */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        width: 110, height: 32, borderRadius: 20, background: "#000", zIndex: 10,
      }} />

      {/* Top bar */}
      <div style={{
        padding: "52px 14px 10px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{
          fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800,
          color: "rgba(255,255,255,0.82)", letterSpacing: "-0.02em",
        }}>FitSched</span>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
          borderRadius: 20, padding: "3px 8px",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: ACCENT }}>TUE</span>
        </div>
      </div>

      {/* Week strip */}
      <div style={{ padding: "0 12px 12px", display: "flex", gap: 4 }}>
        {WEEK_DAYS.map((d, i) => {
          const active = i === 2
          return (
            <div key={i} style={{
              flex: 1, borderRadius: 10, padding: "5px 0",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: active
                ? "linear-gradient(145deg, #7dd4cc, #5aaea7)"
                : "rgba(255,255,255,0.045)",
              boxShadow: active ? "0 3px 10px rgba(107,191,184,0.3)" : "none",
            }}>
              <span style={{
                fontSize: 6.5, fontWeight: 800, letterSpacing: "0.04em",
                color: active ? "#0b1715" : "rgba(255,255,255,0.32)",
              }}>{d.slice(0, 3)}</span>
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: 12, fontWeight: 900, lineHeight: 1,
                color: active ? "#0b1715" : "rgba(255,255,255,0.78)",
              }}>{i + 14}</span>
            </div>
          )
        })}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.055)", marginBottom: 10 }} />

      {/* Section label */}
      <div style={{ padding: "0 14px 8px" }}>
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
        }}>Morning</span>
      </div>

      {/* Cards */}
      <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        {MOCK_CARDS.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.11, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderRadius: 13,
              background: "rgba(255,255,255,0.038)",
              border: "1px solid rgba(255,255,255,0.065)",
              padding: "9px 11px",
              display: "flex", alignItems: "center", gap: 9,
            }}
          >
            <div style={{
              width: 3, height: 34, borderRadius: 2, background: c.dot, flexShrink: 0,
              boxShadow: `0 0 6px ${c.dot}44`,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 11.5, fontWeight: 800,
                color: "rgba(255,255,255,0.88)", marginBottom: 2,
              }}>{c.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.33)" }}>{c.time}</span>
                <span style={{
                  fontSize: 7.5, fontWeight: 900, letterSpacing: "0.08em",
                  color: ACCENT, background: ACCENT_DIM,
                  borderRadius: 4, padding: "1px 4px",
                }}>{c.tag}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* AI badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75, type: "spring", stiffness: 260, damping: 22 }}
          style={{
            marginTop: 3, marginBottom: 16,
            borderRadius: 12,
            background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
            padding: "7px 11px",
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          <CheckCheck size={11} color={ACCENT} strokeWidth={2.5} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: ACCENT }}>
            Plan ready
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Marquee strip ──────────────────────────────────────────────────────────────

function MarqueeStrip() {
  const { t } = useLanguage()
  return (
    <div style={{
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      padding: "13px 0",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", gap: 36,
        animation: "lp-marquee 30s linear infinite",
        whiteSpace: "nowrap",
      }}>
        {[...t.lpMarqueeItems, ...t.lpMarqueeItems].map((item, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.09em",
            textTransform: "uppercase", color: "var(--text-muted)",
            flexShrink: 0,
          }}>
            <span style={{
              width: 4, height: 4, borderRadius: "50%",
              background: ACCENT, display: "inline-block", flexShrink: 0,
            }} />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Bento feature cards ────────────────────────────────────────────────────────

const BAR_HEIGHTS = [28, 44, 36, 52, 40, 62, 48, 70, 56, 66]

function ScheduleCard() {
  const { t } = useLanguage()
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 28,
      padding: "28px 28px 24px",
      height: "100%", display: "flex", flexDirection: "column", gap: 20,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={15} color={ACCENT} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: ACCENT }}>
              {t.lpPlanGenerator}
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22, fontWeight: 800, lineHeight: 1.15,
            color: "var(--text)", letterSpacing: "-0.025em",
          }}>
            {t.lpPlanLine1}<br />{t.lpPlanLine2}
          </div>
        </div>
      </div>

      {/* Mini week grid */}
      <div style={{ display: "flex", gap: 5 }}>
        {["M","T","W","T","F","S","S"].map((d, i) => {
          const filled = [0, 1, 3, 4].includes(i)
          return (
            <div key={i} style={{
              flex: 1, borderRadius: 8, padding: "6px 0",
              background: filled ? ACCENT_DIM : "var(--surface-2)",
              border: `1px solid ${filled ? ACCENT_BD : "transparent"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: filled ? ACCENT : "var(--text-muted)" }}>{d}</span>
              {filled && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }} />}
            </div>
          )
        })}
      </div>

      {/* Sample sessions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: t.lpSessionPush,  time: t.lpSessionPushTime,  color: ACCENT },
          { label: t.lpSessionRest,  time: t.lpSessionRestTime,  color: "var(--border)" },
          { label: t.lpSessionLower, time: t.lpSessionLowerTime, color: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 10px", borderRadius: 10,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{s.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StreakCard() {
  const { t } = useLanguage()
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 28, padding: "24px",
      display: "flex", flexDirection: "column", gap: 16, height: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "rgba(255, 116, 77, 0.12)", border: "1px solid rgba(255,116,77,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Flame size={15} color="#ff744d" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "#ff9066" }}>
          {t.lpStreakTitle}
        </span>
      </div>

      <div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 52, fontWeight: 900, lineHeight: 1,
          color: "var(--text)", letterSpacing: "-0.04em",
        }}>23</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>{t.lpDaysInARow}</div>
      </div>

      {/* Flame dots row */}
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < 11 ? "linear-gradient(90deg, #ff744d, #ffb64d)" : "var(--surface-2)",
          }} />
        ))}
      </div>

      <div style={{
        background: "rgba(255,116,77,0.09)",
        border: "1px solid rgba(255,116,77,0.18)",
        borderRadius: 12, padding: "8px 12px",
        fontSize: 11, fontWeight: 700, color: "#ff9066",
      }}>
        {t.lpLongestRun}
      </div>
    </div>
  )
}

function ProgressCard() {
  const { t } = useLanguage()
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 28, padding: "24px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BarChart2 size={15} color="#818cf8" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "#818cf8" }}>
            {t.lpProgressLabel}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{t.lpLast10Days}</span>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flex: 1, height: h, borderRadius: 4,
              background: i === 9
                ? `linear-gradient(180deg, ${ACCENT}, #4aaa9d)`
                : "var(--surface-2)",
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.03em",
          }}>7 / 10</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{t.lpSessionsCompleted}</div>
        </div>
        <div style={{
          background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
          borderRadius: 10, padding: "6px 10px",
          fontSize: 11, fontWeight: 800, color: ACCENT,
        }}>{t.lpVsLastWeek}</div>
      </div>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { id: "EN" as const, native: "English",     flag: "🇺🇸" },
  { id: "CN" as const, native: "中文",          flag: "🇨🇳" },
  { id: "JP" as const, native: "日本語",        flag: "🇯🇵" },
  { id: "VI" as const, native: "Tiếng Việt",   flag: "🇻🇳" },
]

function Navbar() {
  const { language, changeLanguage, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!langOpen) return
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [langOpen])

  const current = LANG_OPTIONS.find(l => l.id === language)!

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "sticky", top: 12, zIndex: 40,
        margin: "12px 16px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px 12px 20px",
        borderRadius: 999,
        background: "color-mix(in srgb, var(--panel) 92%, transparent)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        backdropFilter: "blur(18px)",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `linear-gradient(135deg, ${ACCENT}, #4aaa9d)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(107,191,184,0.35)",
        }}>
          <Dumbbell size={15} color="#0d1f1e" strokeWidth={2.5} />
        </div>
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em",
          color: "var(--text)",
        }}>FitSched</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

        {/* ── Language picker ── */}
        <div ref={langRef} style={{ position: "relative" }}>
          <button
            onClick={() => setLangOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
              borderRadius: 999, padding: "7px 12px",
              color: ACCENT, fontSize: 12, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            <Globe2 size={13} color={ACCENT} strokeWidth={2.2} />
            <span style={{ letterSpacing: "0.04em" }}>{language}</span>
            <ChevronDown
              size={12} strokeWidth={2.2} color={ACCENT}
              style={{ transform: langOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
            />
          </button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  width: 180,
                  background: "var(--panel)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid var(--border)",
                  borderRadius: 16, padding: 5,
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 50,
                }}
              >
                {LANG_OPTIONS.map((item, i) => {
                  const active = item.id === language
                  return (
                    <button
                      key={item.id}
                      onClick={() => { changeLanguage(item.id); setLangOpen(false) }}
                      style={{
                        width: "100%",
                        background: active ? ACCENT_DIM : "transparent",
                        border: `1px solid ${active ? ACCENT_BD : "transparent"}`,
                        borderRadius: 11, padding: "9px 11px",
                        color: active ? ACCENT : "var(--text)",
                        display: "flex", alignItems: "center", gap: 10,
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit",
                        marginBottom: i < LANG_OPTIONS.length - 1 ? 2 : 0,
                        transition: "background 0.12s, border-color 0.12s",
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.flag}</span>
                      <span style={{ flex: 1, textAlign: "left" }}>{item.native}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                        color: active ? ACCENT : "var(--text-muted)", opacity: active ? 1 : 0.6,
                      }}>{item.id}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <Link href="/register" style={{
          display: "flex", alignItems: "center", gap: 6,
          background: ACCENT, color: "#0d1f1e",
          borderRadius: 999, padding: "8px 16px",
          fontSize: 13, fontWeight: 800, textDecoration: "none",
          fontFamily: "var(--font-display)",
          boxShadow: "0 2px 10px rgba(107,191,184,0.28)",
        }}>
          {t.createAccount}
          <ArrowRight size={14} strokeWidth={2.5} />
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
      minHeight: "100dvh",
      display: "flex", alignItems: "center",
      padding: "0 20px",
      maxWidth: 1140, margin: "0 auto",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
        gap: 48, alignItems: "center", width: "100%",
      }} className="hero-grid">
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
              borderRadius: 999, padding: "6px 14px",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, animation: "appBreath 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t.lpFitnessScheduler}
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(38px, 5.5vw, 68px)",
              fontWeight: 900, lineHeight: 1.04,
              letterSpacing: "-0.035em",
              color: "var(--text)",
              margin: 0,
            }}
          >
            {t.lpHeroLine1}<br />
            <span style={{ color: ACCENT }}>{t.lpHeroLine2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 17, lineHeight: 1.6, fontWeight: 500,
              color: "var(--text-muted)", maxWidth: 420, margin: 0,
            }}
          >
            {t.lpHeroBody}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            <Link href="/register" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: ACCENT, color: "#0d1f1e",
              borderRadius: 16, padding: "14px 24px",
              fontSize: 15, fontWeight: 900, textDecoration: "none",
              fontFamily: "var(--font-display)", letterSpacing: "-0.01em",
              boxShadow: "0 4px 20px rgba(107,191,184,0.32)",
            }}>
              {t.createAccount}
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link href="#features" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "var(--text-muted)", textDecoration: "none",
              fontSize: 14, fontWeight: 700, padding: "14px 4px",
              borderBottom: "1px solid var(--border)",
            }}>
              {t.lpSeeHow}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {[t.lpCheck1, t.lpCheck2, t.lpCheck3].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <CheckCheck size={14} color={ACCENT} strokeWidth={2.5} />
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — phone */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
          className="phone-col"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  )
}

// ── Feature bento ─────────────────────────────────────────────────────────────

function Features() {
  const { t } = useLanguage()
  return (
    <section id="features" style={{ padding: "80px 20px", maxWidth: 1140, margin: "0 auto" }}>
      <FadeIn>
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
            borderRadius: 999, padding: "5px 13px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: ACCENT, letterSpacing: "0.09em", textTransform: "uppercase" }}>
              {t.lpBuiltDifferent}
            </span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 46px)",
            fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em",
            color: "var(--text)", margin: 0,
          }}>
            {t.lpEveryTool}<br />
            <span style={{ color: "var(--text-muted)" }}>{t.lpNothingYouDont}</span>
          </h2>
        </div>
      </FadeIn>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
        gridTemplateRows: "auto auto",
        gap: 16,
      }} className="bento-grid">
        <FadeIn delay={0.05} style={{ gridColumn: 1, gridRow: "1 / 3" }}>
          <ScheduleCard />
        </FadeIn>
        <FadeIn delay={0.12} style={{ gridColumn: 2, gridRow: 1 }}>
          <StreakCard />
        </FadeIn>
        <FadeIn delay={0.18} style={{ gridColumn: 2, gridRow: 2 }}>
          <ProgressCard />
        </FadeIn>
      </div>
    </section>
  )
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function StatsRow() {
  const { t } = useLanguage()
  const STATS = [
    { value: "80+",   label: t.lpStatExercises, icon: Dumbbell   },
    { value: "7-day", label: t.lpStatPlans,     icon: Calendar   },
    { value: "GPS",   label: t.lpStatHike,      icon: Navigation },
    { value: "14+",   label: t.lpStatStreak,    icon: Flame      },
  ]
  return (
    <section style={{ padding: "0 20px 80px", maxWidth: 1140, margin: "0 auto" }}>
      <FadeIn>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          border: "1px solid var(--border)",
          borderRadius: 24,
          overflow: "hidden",
          background: "var(--surface)",
        }} className="stats-grid">
          {STATS.map(({ value, label, icon: Icon }, i) => (
            <div key={i} style={{
              padding: "28px 24px",
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <Icon size={18} color={ACCENT} strokeWidth={2} />
              <div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em",
                  color: "var(--text)", lineHeight: 1,
                }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}

// ── CTA block ─────────────────────────────────────────────────────────────────

function CtaBlock() {
  const { t } = useLanguage()
  return (
    <section style={{ padding: "0 20px 100px", maxWidth: 1140, margin: "0 auto" }}>
      <FadeIn>
        <div style={{
          borderRadius: 32, overflow: "hidden",
          background: `
            radial-gradient(ellipse at 30% 0%, rgba(107,191,184,0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 100%, rgba(107,191,184,0.09) 0%, transparent 45%),
            var(--surface)
          `,
          border: `1px solid ${ACCENT_BD}`,
          padding: "clamp(40px, 6vw, 72px) clamp(28px, 5vw, 72px)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 32, flexWrap: "wrap",
        }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Calendar size={16} color={ACCENT} strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t.lpStartToday}
              </span>
            </div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 4vw, 44px)",
              fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em",
              color: "var(--text)", margin: "0 0 14px",
            }}>
              {t.lpCtaTitle}
            </h2>
            <p style={{
              fontSize: 15, color: "var(--text-muted)",
              fontWeight: 500, lineHeight: 1.6, margin: 0,
            }}>
              {t.lpCtaBody}
            </p>
          </div>

          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
            background: ACCENT, color: "#0d1f1e",
            borderRadius: 18, padding: "16px 28px",
            fontSize: 16, fontWeight: 900, textDecoration: "none",
            fontFamily: "var(--font-display)", letterSpacing: "-0.01em",
            boxShadow: "0 6px 24px rgba(107,191,184,0.3)",
            whiteSpace: "nowrap",
          }}>
            {t.lpGetStartedFree}
            <ArrowRight size={17} strokeWidth={2.5} />
          </Link>
        </div>
      </FadeIn>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const { t } = useLanguage()
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      padding: "28px 20px",
      maxWidth: 1140, margin: "0 auto",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: `linear-gradient(135deg, ${ACCENT}, #4aaa9d)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Dumbbell size={13} color="#0d1f1e" strokeWidth={2.5} />
        </div>
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em",
          color: "var(--text-muted)",
        }}>FitSched</span>
      </div>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
        {t.lpFooterTagline}
      </span>
    </footer>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh", overflowX: "hidden" }}>
      <style>{`
        @keyframes lp-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* Mobile overrides */
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding-top: 48px !important;
          }
          .phone-col {
            display: none !important;
          }
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid > * {
            grid-column: 1 !important;
            grid-row: auto !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .stats-grid > *:nth-child(odd) {
            border-right: 1px solid var(--border) !important;
          }
          .stats-grid > *:nth-child(even) {
            border-right: none !important;
          }
          .stats-grid > *:nth-child(1),
          .stats-grid > *:nth-child(2) {
            border-bottom: 1px solid var(--border);
          }
        }
      `}</style>

      <Navbar />
      <Hero />
      <MarqueeStrip />
      <Features />
      <StatsRow />
      <CtaBlock />
      <Footer />
    </div>
  )
}
