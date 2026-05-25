"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Dumbbell, Flame, Zap } from "lucide-react"
import { ACCENT } from "@/lib/theme"

type Transaction = {
  id: string
  amount: number
  reason: string
  createdAt: string
  workoutName: string
}

function formatFT(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const REASON_META: Record<string, { label: string; icon: typeof Dumbbell; color: string }> = {
  workout_complete:         { label: "Workout completed", icon: Dumbbell, color: ACCENT },
  workout_complete_boosted: { label: "Workout (2× boost)", icon: Zap,     color: "#eab308" },
  streak_bonus:             { label: "Streak bonus",       icon: Flame,    color: "#f97316" },
}

export default function WithdrawalPage() {
  const { status } = useSession()
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/tokens")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setBalance(d.balance); setTransactions(d.transactions || []) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div style={{ minHeight: "100vh", padding: "18px 16px 80px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/settings")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 20px" }}
        >
          <ArrowLeft size={16} strokeWidth={2.2} />
          Settings
        </button>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, padding: "28px 24px 24px", marginBottom: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.28)", display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
              FT
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>FitTokens</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Earned from workouts</div>
            </div>
          </div>

          <div style={{ fontSize: 44, fontWeight: 950, color: "var(--text)", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {loading ? "—" : formatFT(balance ?? 0)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>FT balance</div>
        </motion.div>

        {/* How you earn */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "18px 20px", marginBottom: 12 }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 14 }}>HOW YOU EARN</div>
          {[
            { icon: Dumbbell, color: ACCENT, bg: "rgba(107,191,184,0.12)", title: "Complete a workout", detail: "+1.00 FT per session" },
            { icon: Flame,    color: "#f97316", bg: "rgba(249,115,22,0.12)", title: "Streak bonus",        detail: "Up to +0.20 FT extra" },
            { icon: Zap,      color: "#8ab4ff", bg: "rgba(138,180,255,0.12)", title: "Verification bonus", detail: "Full score = full reward" },
          ].map(({ icon: Icon, color, bg, title, detail }) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{detail}</div>
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Streak bonus decreases gradually as your streak grows — keeping things consistent matters more than big numbers.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent earnings */}
        {!loading && transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", marginBottom: 12 }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", padding: "14px 18px 10px" }}>RECENT EARNINGS</div>
            {transactions.map((tx, i) => {
              const meta = REASON_META[tx.reason] ?? REASON_META.workout_complete
              const Icon = meta.icon
              return (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color={meta.color} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.workoutName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{meta.label} · {formatDate(tx.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    +{formatFT(tx.amount)}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Withdrawal coming soon */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "20px", textAlign: "center" }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: ACCENT, fontSize: 13, fontWeight: 900 }}>
            FT
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Withdrawals coming soon</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
            Your balance is safe. Withdrawals will be available once the reward system launches.
          </div>
        </motion.div>

      </div>
    </div>
  )
}
