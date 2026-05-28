import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const EFFECTIVE_DATE = "May 23, 2026"
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

export default function TermsPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: [
        "radial-gradient(circle at 18% -8rem, rgba(18,101,254,0.14), transparent 28rem)",
        "var(--bg)",
      ].join(", "),
      padding: "0 20px 64px",
    }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ padding: "24px 0 32px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none" }}>
            <ArrowLeft size={16} strokeWidth={2} />
          </Link>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>Terms of Service</span>
        </div>

        <h1 className="display-text" style={{ fontSize: "28px", fontWeight: 900, color: "var(--text)", marginBottom: "6px" }}>Terms of Service</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "40px" }}>Effective {EFFECTIVE_DATE}</p>

        <Section title="1. Acceptance">
          <p>By creating an account or using {APP_NAME}, you agree to these Terms of Service. If you do not agree, do not use the app.</p>
        </Section>

        <Section title="2. What FitSched Is">
          <p>{APP_NAME} is a personal fitness scheduling tool that helps you plan workouts, track progress, earn FitTokens for consistency, and log outdoor hikes with GPS. It is not a medical service and does not provide medical advice.</p>
          <p>Always consult a qualified healthcare professional before starting a new exercise programme, especially if you have an injury or pre-existing condition.</p>
          <p>The Hike Tracker accesses your device location while active. You grant this permission explicitly through your browser or device. You can revoke it at any time in your device settings.</p>
          <p>Route planning uses publicly available map data from OpenStreetMap, OSRM, and Valhalla. Not all lines visible on the map represent walkable trails — use the in-app map legend (available in Plan route mode) to identify routable paths. {APP_NAME} is not responsible for route accuracy on unmapped or restricted terrain.</p>
        </Section>

        <Section title="3. Your Account">
          <p>You are responsible for maintaining the confidentiality of your login credentials. You must be at least 13 years old to use {APP_NAME}.</p>
          <p>You may not create accounts on behalf of others without their consent, attempt to access another user&apos;s data, or use the service for any unlawful purpose.</p>
        </Section>

        <Section title="4. FitTokens">
          <p>FitTokens are in-app rewards earned by completing workouts. They have no monetary value, cannot be exchanged for cash, and may be modified or discontinued at any time without notice.</p>
          <p>Attempting to exploit, automate, or manipulate the token system is a violation of these terms and may result in account suspension.</p>
        </Section>

        <Section title="5. Data and Privacy">
          <p>Your use of {APP_NAME} is also governed by our <Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>, which explains what data we collect and how we use it.</p>
        </Section>

        <Section title="6. Availability">
          <p>{APP_NAME} is provided &quot;as is.&quot; We do not guarantee uninterrupted access and may modify, suspend, or discontinue features at any time. We are not liable for any loss resulting from downtime or data loss.</p>
        </Section>

        <Section title="7. Termination">
          <p>You may delete your account at any time from the Settings page. We reserve the right to suspend or terminate accounts that violate these terms.</p>
        </Section>

        <Section title="8. Changes to These Terms">
          <p>We may update these Terms from time to time. Continued use of {APP_NAME} after changes are posted constitutes your acceptance of the new terms.</p>
        </Section>

        <Section title="9. Contact">
          <p>Questions? Reach us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.</p>
        </Section>
      </div>
    </div>
  )
}
