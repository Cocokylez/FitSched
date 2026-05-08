"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { SkeletonCard } from "@/components/Skeleton"

const cardStyle = {
  background: "var(--surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "16px 20px",
  marginBottom: "10px",
  width: "100%",
  boxSizing: "border-box" as const,
}

const sectionLabelStyle = {
  fontSize: "10px",
  fontWeight: "600",
  letterSpacing: "0.12em",
  color: "var(--text-muted)",
  marginBottom: "8px",
  marginTop: "20px",
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language, cycleLanguage } = useLanguage()
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  const checkCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/sync")
      if (res.ok) {
        const data = await res.json()
        setIsCalendarConnected(data.connected)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "authenticated") checkCalendar()
  }, [status, checkCalendar])

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/workout-log")
        .then(r => r.json())
        .then(data => setLogs(data))
    }
  }, [status])

  const connectCalendar = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/calendar/connect")
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      }
    } catch {}
    setConnecting(false)
  }

  const syncCalendar = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" })
      if (res.ok) checkCalendar()
    } catch {}
    setSyncing(false)
  }

  const disconnectCalendar = async () => {
    try {
      const res = await fetch("/api/calendar/sync", { method: "DELETE" })
      if (res.ok) setIsCalendarConnected(false)
    } catch {}
  }

  const togglePush = async () => {
    if (!("Notification" in window)) return
    if (pushEnabled) { setPushEnabled(false); return }
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      setPushEnabled(true)
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
        })
        await fetch("/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })
      } catch {}
    }
  }

  return (
    <div style={{ padding: "20px 16px 24px", minHeight: "100vh", background: "var(--bg)" }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "var(--text)", marginBottom: "20px" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.settings}
            </motion.span>
          </div>
        </motion.div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SkeletonCard height="72px" />
            <SkeletonCard height="100px" />
            <SkeletonCard height="60px" />
            <SkeletonCard height="60px" />
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <div style={cardStyle}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>{session?.user?.name || "User"}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{session?.user?.email}</div>
            </div>
          </motion.div>
        )}

        {!loading && (
          <>
        <motion.div variants={fadeUp}>
          <div style={sectionLabelStyle}>{t.calendar}</div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={cardStyle}>
            {isCalendarConnected ? (
              <>
                <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.googleConnected}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{t.readOnly}</div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button onClick={syncCalendar} disabled={syncing} style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    color: "var(--text)",
                    fontSize: "13px",
                    cursor: "pointer",
                    opacity: syncing ? 0.5 : 1,
                  }}>
                    {syncing ? t.syncing : <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{t.syncNow}</motion.span>}
                  </button>
                  <button onClick={disconnectCalendar} style={{
                    background: "rgba(255,50,50,0.15)",
                    border: "1px solid rgba(255,50,50,0.3)",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    color: "#d96060",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}>
                    {t.disconnect}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{t.connectCalendar}</div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.4 }}>
                  {t.syncDescription}
                </p>
                  <button onClick={connectCalendar} disabled={connecting} style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "10px 20px",
                    color: "var(--text)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: connecting ? 0.5 : 1,
                }}>
                  {connecting ? t.connecting : t.signInWithGoogle}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={sectionLabelStyle}>{t.preferences}</div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.pushNotifications}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{pushEnabled ? t.enabled : t.workoutReminders}</div>
            </div>
            <div onClick={togglePush} style={{ width: 48, height: 28, borderRadius: 14, position: "relative", background: pushEnabled ? "var(--text)" : "var(--border)", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e8e8e8", position: "absolute", top: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transition: "transform 0.2s", transform: pushEnabled ? "translateX(24px)" : "translateX(3px)" }} />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.language}</div>
            <motion.button
              onClick={cycleLanguage}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "6px 14px",
                color: "var(--text)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                minWidth: "48px",
                textAlign: "center",
              }}
            >
              <motion.span
                key={language}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                {language}
              </motion.span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.version}</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>1.0.0</div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={sectionLabelStyle}>{t.stats}</div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              ["100%", t.autoScheduled],
              ["25m", t.avgWorkout],
              ["0", t.decisions],
              ["7", t.days],
            ].map(([value, label], i) => (
              <div key={i} style={{ ...cardStyle, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text)" }}>{value}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
          </>
        )}

        {logs.length > 0 && (
          <motion.div variants={fadeUp}>
            <div style={sectionLabelStyle}>WORKOUT HISTORY</div>
            {logs.slice(0, 5).map((log, i) => (
              <div key={i} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "14px 16px",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}>
                    {log.workoutName}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}>
                    {new Date(log.completedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  background: "var(--surface-2)",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}>
                  {log.exercises.length} exercises
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" as const, delay: 0.7 }}
      >
        <button onClick={async () => { await signOut({ callbackUrl: '/login', redirect: true }) }} style={{
          width: "100%",
          marginTop: "20px",
          background: "rgba(255,50,50,0.1)",
          border: "1px solid rgba(255,50,50,0.25)",
          borderRadius: "14px",
          padding: "13px",
          color: "#d96060",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {t.signOut}
          </motion.span>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.85 }}
      >
        <div style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
          {t.fitSched} v1.0.0
        </div>
      </motion.div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
