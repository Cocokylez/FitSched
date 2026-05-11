import { Footprints, Mountain, Route } from "lucide-react"

const ACCENT = "#6bbfb8"

export default function HikePage() {
  return (
    <div
      data-dashboard-scroll
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "22px 16px 110px",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(107, 191, 184, 0.3)",
              background: "rgba(107, 191, 184, 0.1)",
              color: ACCENT,
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            <Footprints size={14} strokeWidth={1.9} />
            Hike
          </div>
          <h1
            style={{
              color: "var(--text)",
              fontSize: 32,
              lineHeight: 1.05,
              fontWeight: 950,
              letterSpacing: 0,
              margin: "0 0 9px",
            }}
          >
            Under construction
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 430,
            }}
          >
            The Hike section is being prepared as its own dedicated mode. Trail planning, hike sessions, and outdoor progress will live here.
          </p>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: "26px 22px",
            minHeight: 280,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(107,191,184,0.12), transparent 42%), radial-gradient(circle at 70% 24%, rgba(255,255,255,0.07), transparent 28%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", width: "100%" }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 24,
                margin: "0 auto 18px",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(107, 191, 184, 0.35)",
                background: "rgba(107, 191, 184, 0.12)",
                color: ACCENT,
              }}
            >
              <Mountain size={34} strokeWidth={1.7} />
            </div>

            <div
              style={{
                color: "var(--text)",
                fontSize: 20,
                fontWeight: 900,
                marginBottom: 7,
              }}
            >
              Trail mode is coming soon
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                lineHeight: 1.5,
                maxWidth: 360,
                margin: "0 auto 20px",
              }}
            >
              This page is ready for tomorrow's details, so the hike feature can grow without mixing into normal workouts.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { label: "Route builder", Icon: Route },
                { label: "Outdoor sessions", Icon: Footprints },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    borderRadius: 14,
                    padding: "14px 12px",
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <item.Icon size={16} strokeWidth={1.8} color={ACCENT} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
