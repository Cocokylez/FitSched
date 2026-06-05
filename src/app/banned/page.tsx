import Link from "next/link"

const CONTACT_EMAIL = "support@fitsched.app"

// Shown when a banned account tries to use the app (dashboard layout redirects
// here). Self-contained styling so it renders regardless of theme state.
export default function BannedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0f0e",
        color: "#f5f7f6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 12 }}>🚫</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>
        Account suspended
      </div>
      <p style={{ fontSize: 14, color: "#9aa3a1", maxWidth: 320, lineHeight: 1.6, marginBottom: 28 }}>
        This account has been suspended for activity that violates our Terms of Service —
        such as manipulating FitToken rewards. If you believe this is a mistake, contact us.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          style={{ background: "#1265fe", color: "#fff", borderRadius: 14, padding: "13px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
        >
          Contact support
        </a>
        <Link
          href="/api/auth/force-signout"
          style={{ background: "transparent", color: "#f5f7f6", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: "13px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
        >
          Sign out
        </Link>
      </div>
    </div>
  )
}
