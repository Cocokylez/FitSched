import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "FitSched <onboarding@resend.dev>"
const APP_URL = process.env.NEXTAUTH_URL || "https://fitsched.vercel.app"

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your FitSched email",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#111514;color:#e8f0ef;border-radius:16px;">
        <div style="font-size:24px;font-weight:900;color:#1265fe;margin-bottom:8px;">FitSched</div>
        <h1 style="font-size:20px;font-weight:800;margin:0 0 12px;">Verify your email</h1>
        <p style="color:#8fa89e;font-size:14px;line-height:1.6;margin:0 0 28px;">
          Welcome! Click the button below to verify your email address and activate your account. The link expires in 24 hours.
        </p>
        <a href="${url}" style="display:inline-block;background:#1265fe;color:#111514;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
          Verify email
        </a>
        <p style="color:#4a6460;font-size:12px;margin:24px 0 0;line-height:1.6;">
          If you didn't create a FitSched account, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your FitSched password",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#111514;color:#e8f0ef;border-radius:16px;">
        <div style="font-size:24px;font-weight:900;color:#1265fe;margin-bottom:8px;">FitSched</div>
        <h1 style="font-size:20px;font-weight:800;margin:0 0 12px;">Reset your password</h1>
        <p style="color:#8fa89e;font-size:14px;line-height:1.6;margin:0 0 28px;">
          Someone requested a password reset for your account. If that was you, click the button below. The link expires in 1 hour.
        </p>
        <a href="${url}" style="display:inline-block;background:#1265fe;color:#111514;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
          Reset password
        </a>
        <p style="color:#4a6460;font-size:12px;margin:24px 0 0;line-height:1.6;">
          If you didn't request this, you can safely ignore this email. Your password will not change.
        </p>
      </div>
    `,
  })
}
