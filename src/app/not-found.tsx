import Link from "next/link"

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: [
        "radial-gradient(circle at 18% -8rem, rgba(107,191,184,0.16), transparent 28rem)",
        "var(--bg)",
      ].join(", "),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 24px",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: "72px",
        fontWeight: 900,
        color: "rgba(107,191,184,0.18)",
        lineHeight: 1,
        marginBottom: "16px",
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.04em",
      }}>
        404
      </div>
      <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
        Page not found
      </div>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px", maxWidth: "280px", lineHeight: 1.6 }}>
        This page doesn&apos;t exist. It may have been moved or deleted.
      </p>
      <Link href="/schedule" style={{
        background: "var(--text)",
        color: "var(--bg)",
        borderRadius: "14px",
        padding: "13px 28px",
        fontSize: "14px",
        fontWeight: 700,
        textDecoration: "none",
        display: "inline-block",
      }}>
        Go to schedule
      </Link>
    </div>
  )
}
