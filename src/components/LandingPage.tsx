"use client"

import Link from "next/link"
import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import {
  ArrowRight, Flame, Zap, Navigation, BarChart2,
  Calendar, CheckCheck, Dumbbell,
} from "lucide-react"

// ── Constants ──────────────────────────────────────────────────────────────────

const ACCENT      = "#6bbfb8"
const ACCENT_DIM  = "rgba(107, 191, 184, 0.11)"
const ACCENT_BD   = "rgba(107, 191, 184, 0.22)"
const BORDER      = "rgba(255,255,255,0.075)"
const TEXT_MUTED  = "rgba(255,255,255,0.38)"

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

// ── Phone mockup ───────────────────────────────────────────────────────────────

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
          <Zap size={11} color={ACCENT} strokeWidth={2.5} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: ACCENT }}>
            AI scheduled your week
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Marquee strip ──────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  "AI Scheduling", "Streak Tracking", "GPS Hike Tracking",
  "Exercise Library", "Progress Reports", "FitTokens",
  "Workout Plans", "80+ Exercises", "Smart Calendar",
  "Habit Builder", "Rest Day Logic", "Session History",
]

function MarqueeStrip() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div style={{
      borderTop: `1px solid ${BORDER}`,
      borderBottom: `1px solid ${BORDER}`,
      padding: "13px 0",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", gap: 36,
        animation: "lp-marquee 30s linear infinite",
        whiteSpace: "nowrap",
      }}>
        {doubled.map((item, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.09em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
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
  return (
    <div style={{
      background: "rgba(255,255,255,0.032)",
      border: `1px solid ${BORDER}`,
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
              AI Scheduling
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22, fontWeight: 800, lineHeight: 1.15,
            color: "rgba(255,255,255,0.92)", letterSpacing: "-0.025em",
          }}>
            Finds your free time.<br />Fills it with training.
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
              background: filled ? ACCENT_DIM : "rgba(255,255,255,0.035)",
              border: `1px solid ${filled ? ACCENT_BD : "transparent"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: filled ? ACCENT : "rgba(255,255,255,0.25)" }}>{d}</span>
              {filled && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }} />}
            </div>
          )
        })}
      </div>

      {/* Sample sessions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "Push day", time: "07:00 – 07:45", color: ACCENT },
          { label: "Rest", time: "All day", color: "rgba(255,255,255,0.2)" },
          { label: "Lower body", time: "12:00 – 12:50", color: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 10px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{s.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StreakCard() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.032)",
      border: `1px solid ${BORDER}`,
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
          Streak
        </span>
      </div>

      <div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 52, fontWeight: 900, lineHeight: 1,
          color: "rgba(255,255,255,0.94)", letterSpacing: "-0.04em",
        }}>23</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 4 }}>days in a row</div>
      </div>

      {/* Flame dots row */}
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < 11 ? "linear-gradient(90deg, #ff744d, #ffb64d)" : "rgba(255,255,255,0.08)",
          }} />
        ))}
      </div>

      <div style={{
        background: "rgba(255,116,77,0.09)",
        border: "1px solid rgba(255,116,77,0.18)",
        borderRadius: 12, padding: "8px 12px",
        fontSize: 11, fontWeight: 700, color: "#ff9066",
      }}>
        Your longest run: 31 days
      </div>
    </div>
  )
}

function ProgressCard() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.032)",
      border: `1px solid ${BORDER}`,
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
            Progress
          </span>
        </div>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>Last 10 days</span>
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
                : "rgba(255,255,255,0.1)",
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.03em",
          }}>7 / 10</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>sessions completed</div>
        </div>
        <div style={{
          background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
          borderRadius: 10, padding: "6px 10px",
          fontSize: 11, fontWeight: 800, color: ACCENT,
        }}>+12% vs last week</div>
      </div>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
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
        border: `1px solid ${BORDER}`,
        boxShadow: "var(--shadow-md)",
        backdropFilter: "blur(18px)",
      }}
    >
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
          color: "rgba(255,255,255,0.92)",
        }}>FitSched</span>
      </div>

      <Link href="/register" style={{
        display: "flex", alignItems: "center", gap: 6,
        background: ACCENT, color: "#0d1f1e",
        borderRadius: 999, padding: "8px 16px",
        fontSize: 13, fontWeight: 800, textDecoration: "none",
        fontFamily: "var(--font-display)",
        boxShadow: "0 2px 10px rgba(107,191,184,0.28)",
        transition: "filter 0.2s, transform 0.15s",
      }}>
        Get started
        <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    </motion.nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
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
                AI Fitness Scheduler
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
              color: "rgba(255,255,255,0.95)",
              margin: 0,
            }}
          >
            Train around<br />
            <span style={{ color: ACCENT }}>your life.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 17, lineHeight: 1.6, fontWeight: 500,
              color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: 0,
            }}
          >
            FitSched reads your free windows, builds a workout plan that
            genuinely fits — then keeps you on track with streaks and
            real-time progress.
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
              Start for free
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link href="#features" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "rgba(255,255,255,0.55)", textDecoration: "none",
              fontSize: 14, fontWeight: 700, padding: "14px 4px",
              borderBottom: "1px solid rgba(255,255,255,0.14)",
            }}>
              See how it works
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {[
              "Fits any schedule — 20 min or 90 min",
              "Auto-adjusts when life gets in the way",
              "GPS hike tracking built in",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <CheckCheck size={14} color={ACCENT} strokeWidth={2.5} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.46)", fontWeight: 600 }}>{item}</span>
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
              Built different
            </span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 46px)",
            fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.92)", margin: 0,
          }}>
            Every tool you need.<br />
            <span style={{ color: "rgba(255,255,255,0.42)" }}>Nothing you don&apos;t.</span>
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

const STATS = [
  { value: "80+",    label: "exercises",          icon: Dumbbell   },
  { value: "< 2min", label: "to your first plan", icon: Zap        },
  { value: "GPS",    label: "route tracking",     icon: Navigation },
  { value: "7-day",  label: "average streak",     icon: Flame      },
]

function StatsRow() {
  return (
    <section style={{
      padding: "0 20px 80px",
      maxWidth: 1140, margin: "0 auto",
    }}>
      <FadeIn>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          border: `1px solid ${BORDER}`,
          borderRadius: 24,
          overflow: "hidden",
        }} className="stats-grid">
          {STATS.map(({ value, label, icon: Icon }, i) => (
            <div key={i} style={{
              padding: "28px 24px",
              borderRight: i < 3 ? `1px solid ${BORDER}` : "none",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <Icon size={18} color={ACCENT} strokeWidth={2} />
              <div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em",
                  color: "rgba(255,255,255,0.92)", lineHeight: 1,
                }}>{value}</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, marginTop: 4 }}>{label}</div>
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
  return (
    <section style={{ padding: "0 20px 100px", maxWidth: 1140, margin: "0 auto" }}>
      <FadeIn>
        <div style={{
          borderRadius: 32, overflow: "hidden",
          background: `
            radial-gradient(ellipse at 30% 0%, rgba(107,191,184,0.28) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 100%, rgba(107,191,184,0.14) 0%, transparent 45%),
            rgba(107,191,184,0.07)
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
                Start today
              </span>
            </div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 4vw, 44px)",
              fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em",
              color: "rgba(255,255,255,0.94)", margin: "0 0 14px",
            }}>
              Your first scheduled workout is two minutes away.
            </h2>
            <p style={{
              fontSize: 15, color: "rgba(255,255,255,0.45)",
              fontWeight: 500, lineHeight: 1.6, margin: 0,
            }}>
              No credit card. No long setup. Just your goals and your calendar.
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
            Get started free
            <ArrowRight size={17} strokeWidth={2.5} />
          </Link>
        </div>
      </FadeIn>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${BORDER}`,
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
          color: "rgba(255,255,255,0.7)",
        }}>FitSched</span>
      </div>
      <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
        AI-powered workout scheduling
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
            border-right: 1px solid ${BORDER} !important;
          }
          .stats-grid > *:nth-child(even) {
            border-right: none !important;
          }
          .stats-grid > *:nth-child(1),
          .stats-grid > *:nth-child(2) {
            border-bottom: 1px solid ${BORDER};
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
