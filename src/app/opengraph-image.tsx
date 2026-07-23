import { ImageResponse } from "next/og"
import { readFile } from "fs/promises"
import { join } from "path"

// Branded 1200×630 social-share card. Replaces the old 512×512 square logo so
// links rendered on iMessage / X / Discord / Slack show a proper banner.
export const alt = "FitSched — Workout Planner & Fitness Tracker"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  // Embed the logo as a data URL (best-effort — render still works without it).
  let logo: string | null = null
  try {
    const buf = await readFile(join(process.cwd(), "public", "logo.png"))
    logo = `data:image/png;base64,${buf.toString("base64")}`
  } catch {}

  const chips = ["Workout scheduling", "Streaks", "FitTokens", "GPS hikes"]

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0b0f0e",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* brand glows */}
        <div style={{ position: "absolute", top: -180, left: -140, width: 760, height: 760, borderRadius: 760, background: "radial-gradient(circle, rgba(18,101,254,0.30), rgba(18,101,254,0) 70%)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -220, right: -160, width: 640, height: 640, borderRadius: 640, background: "radial-gradient(circle, rgba(255,107,53,0.16), rgba(255,107,53,0) 70%)", display: "flex" }} />

        {/* logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image isn't supported inside ImageResponse (Satori) */}
          {logo ? <img src={logo} width={104} height={104} alt="" style={{ borderRadius: 24 }} /> : null}
          <div style={{ display: "flex", fontSize: 104, fontWeight: 800, letterSpacing: "-5px", marginLeft: logo ? 30 : 0 }}>
            FitSched
          </div>
        </div>

        {/* tagline */}
        <div style={{ display: "flex", marginTop: 30, fontSize: 40, color: "#9aa3a1", letterSpacing: "-1px", maxWidth: 940, lineHeight: 1.3 }}>
          Plan workouts, track progress, log hikes, and earn FitTokens.
        </div>

        {/* feature chips */}
        <div style={{ display: "flex", marginTop: 42 }}>
          {chips.map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                marginRight: 16,
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid rgba(18,101,254,0.42)",
                background: "rgba(18,101,254,0.12)",
                color: "#5b9bff",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {c}
            </div>
          ))}
        </div>

        {/* url footer */}
        <div style={{ position: "absolute", bottom: 56, left: 96, display: "flex", fontSize: 26, fontWeight: 700, color: "#1265fe", letterSpacing: "-0.5px" }}>
          fitsched.vercel.app
        </div>
      </div>
    ),
    { ...size },
  )
}
