import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const EFFECTIVE_DATE = "May 21, 2026"
const APP_NAME = "FitSched"
const CONTACT_EMAIL = "support@fitsched.app"

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: "2rem" }}>
    <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "10px", letterSpacing: "-0.01em" }}>{title}</h2>
    <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.7", display: "flex", flexDirection: "column", gap: "10px" }}>
      {children}
    </div>
  </section>
)

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li style={{ paddingLeft: "4px" }}>{children}</li>
)

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: [
        "radial-gradient(circle at 18% -8rem, rgba(107,191,184,0.14), transparent 28rem)",
        "var(--bg)",
      ].join(", "),
      padding: "0 20px 64px",
    }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ padding: "24px 0 32px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/register" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none" }}>
            <ArrowLeft size={16} strokeWidth={2} />
          </Link>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>Privacy Policy</span>
        </div>

        <h1 className="display-text" style={{ fontSize: "28px", fontWeight: 900, color: "var(--text)", marginBottom: "6px" }}>Privacy Policy</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "40px" }}>Effective {EFFECTIVE_DATE}</p>

        <Section title="1. What We Collect">
          <p>When you use {APP_NAME} we collect only what is needed to make the app work:</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", margin: 0 }}>
            <Bullet><strong style={{ color: "var(--text)" }}>Account info</strong> — name, email address, and hashed password (we never store plain-text passwords).</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Profile data</strong> — height, weight, BMI, fitness goal, experience level, injury notes, and workout environment. You provide these during onboarding.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Workout data</strong> — scheduled workouts, completed sessions, exercise logs, and streak history.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>FitToken history</strong> — token earnings tied to completed workouts.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Calendar data</strong> — if you connect Google Calendar, we store your access token (encrypted) and read your calendar events solely to schedule workouts around your existing commitments.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Security logs</strong> — anonymised events such as failed login attempts, for abuse prevention only.</Bullet>
          </ul>
        </Section>

        <Section title="2. How We Use It">
          <p>We use your data exclusively to operate {APP_NAME}:</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", margin: 0 }}>
            <Bullet>Generate and personalise your workout schedule.</Bullet>
            <Bullet>Calculate your streak, BMI, and FitToken balance.</Bullet>
            <Bullet>Display your progress and history on the Report and Settings pages.</Bullet>
            <Bullet>Send push notifications you have opted into.</Bullet>
          </ul>
        </Section>

        <Section title="3. We Do Not Sell Your Data">
          <p>Your personal data is never sold, rented, or shared with advertisers or data brokers. Full stop.</p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We use the following services to run the app. Each has its own privacy policy:</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", margin: 0 }}>
            <Bullet><strong style={{ color: "var(--text)" }}>Neon (PostgreSQL)</strong> — stores all app data.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Vercel</strong> — hosts the app and edge functions.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Google OAuth</strong> — optional sign-in. We only receive your name and email from Google.</Bullet>
            <Bullet><strong style={{ color: "var(--text)" }}>Upstash (Redis)</strong> — rate limiting counters; no personal data is stored here.</Bullet>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>Your data is retained for as long as your account is active. You can permanently delete your account and all associated data from <strong style={{ color: "var(--text)" }}>Settings → Delete Account</strong>. Deletion is immediate and irreversible.</p>
        </Section>

        <Section title="6. Security">
          <p>Passwords are hashed with bcrypt. Data is transmitted over HTTPS. We enforce rate limiting and origin validation on all API endpoints. No system is perfect, but we take security seriously.</p>
        </Section>

        <Section title="7. Children">
          <p>{APP_NAME} is not directed at children under 13. If you believe a child has created an account, contact us and we will delete it promptly.</p>
        </Section>

        <Section title="8. Changes">
          <p>If we make material changes to this policy, we will update the effective date above. Continued use after changes are posted means you accept the updated policy.</p>
        </Section>

        <Section title="9. Contact">
          <p>Privacy questions or data requests: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{CONTACT_EMAIL}</a></p>
        </Section>
      </div>
    </div>
  )
}
