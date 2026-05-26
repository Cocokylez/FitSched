"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, CheckCircle2, Dumbbell, ExternalLink, Flame,
  Loader2, Wallet, X, Zap,
} from "lucide-react"
import { ACCENT } from "@/lib/theme"

// ── Types ─────────────────────────────────────────────────────────────────────

type Transaction = {
  id:          string
  amount:      number
  reason:      string
  createdAt:   string
  workoutName: string
}

type ClaimReceipt = {
  id:            string
  txHash:        string
  amount:        number
  walletAddress: string
  createdAt:     string
}

type TokensData = {
  balance:       number
  claimable:     number
  claimed:       number
  transactions:  Transaction[]
  ftBoostArmed:  boolean
  walletAddress: string | null
  tokenDeployed: boolean
  claimReceipts: ClaimReceipt[]
}

type ClaimState = "idle" | "claiming" | "success" | "error"

export type ButtonMode =
  | "no_wallet"
  | "no_balance"
  | "below_minimum"
  | "launching_soon"
  | "ready"
  | "claiming"
  | "success"

const MIN_CLAIM_FIT = 10

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFT(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function truncateAddress(addr: string) {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function truncateTxHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

function isValidEvmAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

// Use NEXT_PUBLIC_BASE_NETWORK=testnet in .env.local for local/staging dev.
// Defaults to mainnet so production is always correct even if var is unset.
const IS_TESTNET = process.env.NEXT_PUBLIC_BASE_NETWORK === "testnet"
const BASESCAN   = IS_TESTNET ? "https://sepolia.basescan.org" : "https://basescan.org"

function basescanTxUrl(txHash: string) {
  return `${BASESCAN}/tx/${txHash}`
}

function basescanAddressUrl(addr: string) {
  return `${BASESCAN}/address/${addr}`
}

// ── Reason metadata ───────────────────────────────────────────────────────────

const REASON_META: Record<string, { label: string; icon: typeof Dumbbell; color: string }> = {
  workout_complete:         { label: "Workout completed",  icon: Dumbbell, color: ACCENT    },
  workout_complete_boosted: { label: "Workout (2× boost)", icon: Zap,      color: "#eab308" },
  streak_bonus:             { label: "Streak bonus",       icon: Flame,    color: "#f97316" },
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WithdrawalPage() {
  const { status } = useSession()
  const router     = useRouter()

  // data
  const [data,    setData]    = useState<TokensData | null>(null)
  const [loading, setLoading] = useState(true)

  // on-chain balance (lazy, only when token deployed)
  const [onChainBalance,     setOnChainBalance]     = useState<number | null>(null)
  const [loadingOnChain,     setLoadingOnChain]     = useState(false)

  // wallet input
  const [walletInput,   setWalletInput]   = useState("")
  const [editingWallet, setEditingWallet] = useState(false)
  const [savingWallet,  setSavingWallet]  = useState(false)
  const [walletSaved,   setWalletSaved]   = useState(false)
  const [walletError,   setWalletError]   = useState<string | null>(null)
  const walletInputRef = useRef<HTMLInputElement>(null)

  // claim
  const [claimState,  setClaimState]  = useState<ClaimState>("idle")
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)
  const [claimError,  setClaimError]  = useState<string | null>(null)
  const [claimAmount, setClaimAmount] = useState<number>(0)

  // redirect if not authed
  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  // load token data
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/tokens")
      .then((r) => r.ok ? r.json() : null)
      .then((d: TokensData | null) => {
        if (!d) return
        setData(d)
        setWalletInput(d.walletAddress ?? "")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  // lazy-load on-chain balance (only when token is deployed + wallet is set)
  useEffect(() => {
    if (!data?.tokenDeployed || !data?.walletAddress) return
    setLoadingOnChain(true)
    fetch("/api/tokens/onchain")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.balance != null) setOnChainBalance(d.balance) })
      .catch(() => {})
      .finally(() => setLoadingOnChain(false))
  }, [data?.tokenDeployed, data?.walletAddress])

  // ── Wallet save ─────────────────────────────────────────────────────────────

  async function saveWallet() {
    const trimmed = walletInput.trim()
    setWalletError(null)

    if (trimmed === "") {
      setSavingWallet(true)
      try {
        const r = await fetch("/api/profile", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ walletAddress: null }),
        })
        if (r.ok) {
          setData((prev) => prev ? { ...prev, walletAddress: null } : prev)
          setEditingWallet(false)
          setOnChainBalance(null)
        }
      } catch {}
      setSavingWallet(false)
      return
    }

    if (!isValidEvmAddress(trimmed)) {
      setWalletError("Must be a valid EVM address starting with 0x (42 characters)")
      return
    }

    setSavingWallet(true)
    try {
      const r = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ walletAddress: trimmed }),
      })
      if (r.ok) {
        setData((prev) => prev ? { ...prev, walletAddress: trimmed.toLowerCase() } : prev)
        setEditingWallet(false)
        setWalletSaved(true)
        setTimeout(() => setWalletSaved(false), 3000)
      } else {
        const body = await r.json()
        setWalletError(body.error ?? "Failed to save wallet address")
      }
    } catch {
      setWalletError("Network error — please try again")
    }
    setSavingWallet(false)
  }

  // ── Claim ───────────────────────────────────────────────────────────────────

  async function handleClaim() {
    if (!data || claimState === "claiming") return
    setClaimState("claiming")
    setClaimError(null)

    try {
      const r = await fetch("/api/tokens/claim", { method: "POST" })
      const body = await r.json()

      if (r.ok && body.ok) {
        setClaimAmount(body.claimedAmount)
        setClaimTxHash(body.txHash ?? null)
        setClaimState("success")
        setData((prev) =>
          prev ? { ...prev, claimable: 0, claimed: body.newClaimedTotal } : prev,
        )
        // Refresh on-chain balance after claim
        if (data.tokenDeployed && data.walletAddress) {
          fetch("/api/tokens/onchain")
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (d?.balance != null) setOnChainBalance(d.balance) })
            .catch(() => {})
        }
        window.dispatchEvent(new Event("fitsched:tokens-updated"))
      } else if (r.status === 503 && body.status === "not_deployed") {
        setClaimState("idle")
        setClaimError("launching_soon")
      } else {
        setClaimState("error")
        setClaimError(body.error ?? "Something went wrong. Please try again.")
      }
    } catch {
      setClaimState("error")
      setClaimError("Network error — please try again")
    }
  }

  // ── Derived claim button mode ───────────────────────────────────────────────

  const hasWallet  = Boolean(data?.walletAddress)
  const claimable  = data?.claimable ?? 0
  const hasBalance = claimable > 0

  function getButtonMode(): ButtonMode {
    if (claimState === "claiming")               return "claiming"
    if (claimState === "success")                return "success"
    if (!hasWallet)                              return "no_wallet"
    if (!hasBalance)                             return "no_balance"
    if (claimable < MIN_CLAIM_FIT)               return "below_minimum"
    if (!data?.tokenDeployed)                    return "launching_soon"
    return "ready"
  }

  const mode = getButtonMode()

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", padding: "18px 16px 100px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* ── Back nav ── */}
        <button
          type="button"
          onClick={() => router.push("/settings")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 20px",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.2} />
          Settings
        </button>

        {/* ── Page title ── */}
        <div style={{ marginBottom: 20 }}>
          <div className="brand-wordmark" style={{ fontSize: 28, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.5px" }}>
            FitTokens
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
            Earn FIT by working out. Claim to your Base wallet.
          </div>
        </div>

        {/* ══ WALLET CARD ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px", marginBottom: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Wallet size={16} strokeWidth={1.8} color={ACCENT} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Your Wallet</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Base network (EVM)</div>
              </div>
            </div>
            {data?.walletAddress && !editingWallet && (
              <button
                type="button"
                onClick={() => { setEditingWallet(true); setWalletError(null); setTimeout(() => walletInputRef.current?.focus(), 50) }}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer" }}
              >
                Change
              </button>
            )}
            {editingWallet && (
              <button
                type="button"
                onClick={() => { setEditingWallet(false); setWalletInput(data?.walletAddress ?? ""); setWalletError(null) }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Connected address — when set + not editing */}
          {data?.walletAddress && !editingWallet && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a
                href={basescanAddressUrl(data.walletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                title={data.walletAddress}
                className="mono-text"
                style={{
                  flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "10px 14px",
                  fontSize: 13, fontWeight: 500, color: "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  textDecoration: "none", gap: 8,
                }}
              >
                <span>{truncateAddress(data.walletAddress)}</span>
                <ExternalLink size={12} strokeWidth={2} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.6 }} />
              </a>
              <AnimatePresence>
                {walletSaved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{ display: "flex", alignItems: "center", gap: 5, color: "#4ade80", fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                  >
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                    Saved
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Input form */}
          {(!data?.walletAddress || editingWallet) && !loading && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.5 }}>
                {data?.walletAddress ? "Enter a new Base wallet address:" : "Paste your Base wallet address to receive FIT when you claim:"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={walletInputRef}
                  type="text"
                  value={walletInput}
                  onChange={(e) => { setWalletInput(e.target.value); setWalletError(null) }}
                  onKeyDown={(e) => { if (e.key === "Enter") saveWallet() }}
                  placeholder="0x…"
                  spellCheck={false}
                  className="mono-text"
                  style={{
                    flex: 1, background: "var(--surface-2)",
                    border: `1px solid ${walletError ? "#f87171" : "var(--border)"}`,
                    borderRadius: 10, padding: "10px 12px", fontSize: 13,
                    color: "var(--text)", outline: "none", minWidth: 0,
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={saveWallet}
                  disabled={savingWallet}
                  style={{
                    flexShrink: 0,
                    background: isValidEvmAddress(walletInput.trim()) ? "rgba(107,191,184,0.15)" : "var(--surface-2)",
                    border: `1px solid ${isValidEvmAddress(walletInput.trim()) ? "rgba(107,191,184,0.4)" : "var(--border)"}`,
                    color: isValidEvmAddress(walletInput.trim()) ? ACCENT : "var(--text-muted)",
                    borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 800,
                    cursor: savingWallet ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.15s, color 0.15s, border-color 0.15s",
                  }}
                >
                  {savingWallet ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                </motion.button>
              </div>
              {walletError && (
                <div style={{ fontSize: 11, color: "#f87171", marginTop: 6, fontWeight: 600 }}>{walletError}</div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                Only Base (chainId 8453) addresses are supported. Never share your private key.
              </div>
            </div>
          )}

          {loading && <div style={{ height: 40, background: "var(--surface-2)", borderRadius: 10, opacity: 0.5 }} />}
        </motion.div>

        {/* ══ BALANCE + CLAIM CARD ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px 20px", marginBottom: 12 }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: ACCENT, fontSize: 13, fontWeight: 900, flexShrink: 0,
            }}>
              FT
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>FitToken Balance</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {data?.tokenDeployed ? "Live on Base" : "Off-chain · Launching on Base"}
              </div>
            </div>
            {data?.tokenDeployed && (
              <div style={{
                marginLeft: "auto",
                background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.28)",
                borderRadius: 999, padding: "3px 10px",
                fontSize: 10, fontWeight: 800, color: "#4ade80", letterSpacing: "0.08em", flexShrink: 0,
              }}>
                LIVE
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {claimState === "success" ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ textAlign: "center", padding: "12px 0 8px" }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: ACCENT, marginBottom: 4 }}>
                  +{formatFT(claimAmount)} FIT claimed!
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Tokens sent to your Base wallet.
                </div>
                {/* On-chain balance after claim */}
                {onChainBalance != null && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: 10, padding: "8px 14px", marginBottom: 14,
                    fontSize: 13, fontWeight: 700, color: "#4ade80",
                  }}>
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                    On-chain balance: {formatFT(onChainBalance)} FIT
                  </div>
                )}
                {claimTxHash && (
                  <div>
                    <a
                      href={basescanTxUrl(claimTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ACCENT, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                    >
                      View on Basescan
                      <ExternalLink size={13} strokeWidth={2} />
                    </a>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── Normal balance state ── */
              <motion.div key="balance" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Big claimable number */}
                <div style={{ marginBottom: 6 }}>
                  <span className="number-text" style={{ fontSize: loading ? 36 : 48, fontWeight: 950, color: "var(--text)", letterSpacing: "-1.5px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {loading ? "—" : formatFT(claimable)}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 700, marginLeft: 6 }}>FIT</span>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                  Claimable balance
                  {!loading && (data?.claimed ?? 0) > 0 && (
                    <span style={{ marginLeft: 8, color: "#4ade80", fontWeight: 700 }}>
                      · {formatFT(data!.claimed)} FIT already claimed ✓
                    </span>
                  )}
                </div>

                {/* Stat chips */}
                {!loading && (data?.balance ?? 0) > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                    <div style={{ flex: 1, minWidth: 100, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                      <div className="number-text" style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>
                        {formatFT(data!.balance)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>TOTAL EARNED</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 100, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                      <div className="number-text" style={{ fontSize: 18, fontWeight: 900, color: "#4ade80", letterSpacing: "-0.5px" }}>
                        {/* Show live on-chain balance when token is deployed, otherwise DB claimed */}
                        {data?.tokenDeployed
                          ? (loadingOnChain ? "…" : onChainBalance != null ? formatFT(onChainBalance) : formatFT(data?.claimed ?? 0))
                          : formatFT(data?.claimed ?? 0)
                        }
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>
                        {data?.tokenDeployed ? "ON-CHAIN" : "CLAIMED"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Minimum claim progress bar — when below minimum */}
                {!loading && hasWallet && hasBalance && claimable < MIN_CLAIM_FIT && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Progress to minimum claim</span>
                      <span style={{ fontSize: 11, color: ACCENT, fontWeight: 800 }}>{formatFT(claimable)} / {MIN_CLAIM_FIT} FIT</span>
                    </div>
                    <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (claimable / MIN_CLAIM_FIT) * 100)}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: "100%", background: `linear-gradient(90deg, ${ACCENT}, rgba(107,191,184,0.6))`, borderRadius: 999 }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
                      {formatFT(MIN_CLAIM_FIT - claimable)} more FIT to go
                    </div>
                  </div>
                )}

                {/* Claim button */}
                <ClaimButton mode={mode} claimable={claimable} claimError={claimError} onClaim={handleClaim} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ══ HOW YOU EARN ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.10, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "18px 20px", marginBottom: 12 }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 14 }}>
            HOW YOU EARN
          </div>
          {[
            { icon: Dumbbell, color: ACCENT,    bg: "rgba(107,191,184,0.12)", title: "Complete a workout",  detail: "+1.00 FT per session" },
            { icon: Flame,    color: "#f97316", bg: "rgba(249,115,22,0.12)",  title: "Streak bonus",        detail: "Up to +0.20 FT extra" },
            { icon: Zap,      color: "#8ab4ff", bg: "rgba(138,180,255,0.12)", title: "Verification score",  detail: "Full score = full reward" },
          ].map(({ icon: Icon, color, bg, title, detail }, i, arr) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{detail}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ══ CLAIM HISTORY ═════════════════════════════════════════════════════ */}
        {!loading && (data?.claimReceipts?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", marginBottom: 12 }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", padding: "14px 18px 10px" }}>
              CLAIM HISTORY
            </div>
            {data!.claimReceipts.map((receipt, i) => (
              <div
                key={receipt.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
              >
                {/* Green check icon */}
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckCircle2 size={14} color="#4ade80" strokeWidth={2.5} />
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    +{formatFT(receipt.amount)} FIT
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span>{formatDateTime(receipt.createdAt)}</span>
                    <span>·</span>
                    <span className="mono-text">{truncateAddress(receipt.walletAddress)}</span>
                  </div>
                </div>

                {/* Basescan link */}
                <a
                  href={basescanTxUrl(receipt.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={receipt.txHash}
                  style={{ display: "flex", alignItems: "center", gap: 4, color: ACCENT, fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}
                >
                  <span className="mono-text" style={{ fontSize: 10 }}>{truncateTxHash(receipt.txHash)}</span>
                  <ExternalLink size={11} strokeWidth={2} />
                </a>
              </div>
            ))}
          </motion.div>
        )}

        {/* ══ RECENT EARNINGS ═══════════════════════════════════════════════════ */}
        {!loading && (data?.transactions?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", marginBottom: 12 }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", padding: "14px 18px 10px" }}>
              RECENT EARNINGS
            </div>
            {data!.transactions.map((tx, i) => {
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

      </div>
    </div>
  )
}

// ── Claim button component ────────────────────────────────────────────────────

function ClaimButton({
  mode,
  claimable,
  claimError,
  onClaim,
}: {
  mode:       ButtonMode
  claimable:  number
  claimError: string | null
  onClaim:    () => void
}) {
  const isDisabled = mode === "no_wallet" || mode === "no_balance" || mode === "below_minimum" || mode === "claiming"

  const config: Record<ButtonMode, { label: React.ReactNode; bg: string; border: string; color: string }> = {
    no_wallet: {
      label:  "Set wallet address first",
      bg:     "var(--surface-2)", border: "var(--border)", color: "var(--text-muted)",
    },
    no_balance: {
      label:  "No FIT to claim yet",
      bg:     "var(--surface-2)", border: "var(--border)", color: "var(--text-muted)",
    },
    below_minimum: {
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          Need {MIN_CLAIM_FIT} FIT minimum
          <span style={{ background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.25)", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 900, color: ACCENT, letterSpacing: "0.07em" }}>
            {formatFT(claimable)} / {MIN_CLAIM_FIT}
          </span>
        </span>
      ),
      bg:     "var(--surface-2)", border: "var(--border)", color: "var(--text-muted)",
    },
    launching_soon: {
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Claim {formatFT(claimable)} FIT
          <span style={{ background: "rgba(234,179,8,0.18)", border: "1px solid rgba(234,179,8,0.35)", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 900, color: "#eab308", letterSpacing: "0.07em" }}>
            LAUNCHING SOON
          </span>
        </span>
      ),
      bg:     "rgba(107,191,184,0.08)", border: "rgba(107,191,184,0.28)", color: ACCENT,
    },
    ready: {
      label:  `Claim ${formatFT(claimable)} FIT →`,
      bg:     "rgba(107,191,184,0.14)", border: "rgba(107,191,184,0.45)", color: ACCENT,
    },
    claiming: {
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          Claiming…
        </span>
      ),
      bg:     "rgba(107,191,184,0.08)", border: "rgba(107,191,184,0.22)", color: ACCENT,
    },
    success: {
      label:  "Claimed ✓",
      bg:     "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.35)", color: "#4ade80",
    },
  }

  const { label, bg, border, color } = config[mode]

  return (
    <div>
      <motion.button
        whileTap={isDisabled ? {} : { scale: 0.97 }}
        type="button"
        onClick={isDisabled ? undefined : onClaim}
        disabled={isDisabled}
        style={{
          width: "100%", background: bg, border: `1px solid ${border}`,
          borderRadius: 14, padding: "14px 20px", fontSize: 14, fontWeight: 800, color,
          cursor: isDisabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {label}
      </motion.button>

      <AnimatePresence>
        {mode === "launching_soon" && claimError === "launching_soon" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 10, fontSize: 12, color: "#eab308", fontWeight: 600, lineHeight: 1.5 }}>
              🚀 The FitToken contract is not yet live on Base. Your balance is safe and will be claimable once it launches!
            </div>
          </motion.div>
        )}
        {mode === "launching_soon" && !claimError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center" }}>
            Your {formatFT(claimable)} FIT is safe and will be claimable once the contract is live on Base.
          </motion.div>
        )}
        {mode !== "claiming" && claimError && claimError !== "launching_soon" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 10, fontSize: 12, color: "#f87171", fontWeight: 600 }}>
              {claimError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
