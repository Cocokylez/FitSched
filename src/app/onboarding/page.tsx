"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Dumbbell,
  Gauge,
  HeartPulse,
  Link2,
  Ruler,
  Scale,
  Shield,
  SkipForward,
  Target,
  Trophy,
  UserRound,
} from "lucide-react"

const steps = ["goal", "body", "injury", "target", "experience", "frequency", "calendar"]

const goals = [
  { id: "lose_weight", Icon: Target, label: "Lose Weight", sub: "Burn fat, get leaner" },
  { id: "build_muscle", Icon: Dumbbell, label: "Build Muscle", sub: "Get stronger, gain mass" },
  { id: "stay_active", Icon: HeartPulse, label: "Stay Active", sub: "General fitness & health" },
  { id: "improve_endurance", Icon: Activity, label: "Endurance", sub: "Cardio & stamina" },
]

const muscleTargets = [
  { id: "CHEST", Icon: ChestMuscleIcon, label: "Chest" },
  { id: "BACK", Icon: BackMuscleIcon, label: "Back" },
  { id: "LEGS", Icon: LegsMuscleIcon, label: "Legs" },
  { id: "SHOULDERS", Icon: ShouldersMuscleIcon, label: "Shoulders" },
  { id: "ARMS", Icon: ArmsMuscleIcon, label: "Arms" },
  { id: "CORE", Icon: CoreMuscleIcon, label: "Core" },
  { id: "FULL_BODY", Icon: FullBodyMuscleIcon, label: "Full Body" },
]

const levels = [
  { id: "beginner", Icon: UserRound, label: "Beginner", sub: "Less than 1 year" },
  { id: "intermediate", Icon: Gauge, label: "Intermediate", sub: "1-3 years" },
  { id: "advanced", Icon: Trophy, label: "Advanced", sub: "3+ years" },
]

const frequencies = [
  { id: 2, Icon: CalendarDays, label: "2x a week", sub: "Easy going" },
  { id: 3, Icon: CalendarCheck, label: "3x a week", sub: "Recommended" },
  { id: 4, Icon: CalendarRange, label: "4x a week", sub: "Serious" },
  { id: 5, Icon: CalendarClock, label: "5x a week", sub: "Intense" },
]

const calendarChoices = [
  { id: "connect", Icon: Link2, label: "Connect Google Calendar", sub: "Best for automatic scheduling" },
  { id: "skip", Icon: SkipForward, label: "Skip for now", sub: "You can connect it later" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState({
    fitnessGoal: "",
    heightCm: "",
    weightKg: "",
    hasInjury: false,
    injuryNotes: "",
    targetMuscles: [] as string[],
    experienceLevel: "",
    workoutsPerWeek: 0,
    calendarPreference: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return

    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding")
        if (!res.ok) return

        const data = await res.json()
        if (data?.onboardingCompleted) router.replace("/schedule")
      } catch {}
    }

    checkOnboarding()
  }, [status, router])

  const persistPreferences = (updated = selections) => {
    localStorage.setItem("fitsched-onboarding-preferences", JSON.stringify({
      targetMuscles: updated.targetMuscles,
      heightCm: updated.heightCm,
      weightKg: updated.weightKg,
      bmi: calculateBmi(updated.heightCm, updated.weightKg),
      hasInjury: updated.hasInjury,
      injuryNotes: updated.injuryNotes,
      calendarPreference: updated.calendarPreference,
    }))
  }

  const saveProfile = async (updated = selections) => {
    persistPreferences(updated)

    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
  }

  const finishOnboarding = async (updated = selections) => {
    await saveProfile(updated)

    if (updated.calendarPreference === "connect") {
      try {
        const res = await fetch("/api/calendar/connect")
        if (res.ok) {
          const data = await res.json()
          window.location.href = data.url
          return
        }
      } catch {}
    }

    router.push("/schedule")
  }

  const handleSelect = async (key: string, value: string | number | boolean) => {
    const updated = { ...selections, [key]: value }
    setSelections(updated)

    if (step < steps.length - 1) {
      setTimeout(() => setStep(step + 1), 300)
    } else {
      await finishOnboarding(updated)
    }
  }

  const toggleTarget = (target: string) => {
    setSelections((current) => {
      const exists = current.targetMuscles.includes(target)
      return {
        ...current,
        targetMuscles: exists
          ? current.targetMuscles.filter((item) => item !== target)
          : [...current.targetMuscles, target],
      }
    })
  }

  const optionStyle = (selected: boolean) => ({
    background: selected ? "var(--text)" : "var(--surface)",
    border: `1px solid ${selected ? "var(--text)" : "var(--border)"}`,
    borderRadius: "16px",
    padding: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    width: "100%",
    marginBottom: "10px",
    transition: "all 0.2s",
    color: selected ? "var(--bg)" : "var(--text)",
  })

  const optionIconStyle = (selected: boolean) => ({
    width: 40,
    height: 40,
    borderRadius: "10px",
    background: selected ? "var(--bg)" : "var(--surface-2)",
    border: `1px solid ${selected ? "var(--bg)" : "var(--border)"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: selected ? "var(--text)" : "var(--text-muted)",
    flexShrink: 0,
  })

  const stepLabel = `STEP ${step + 1} OF ${steps.length}`
  const bmi = calculateBmi(selections.heightCm, selections.weightKg)

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      padding: "40px 20px 32px",
      maxWidth: "480px",
      margin: "0 auto",
    }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "40px" }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: "3px",
            borderRadius: "2px",
            background: i <= step ? "var(--text)" : "var(--border)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="goal" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="What's your goal?" body="We'll personalize your workout plan." />

            {goals.map(goal => (
              <motion.button key={goal.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelect("fitnessGoal", goal.id)} style={optionStyle(selections.fitnessGoal === goal.id)}>
                <div style={optionIconStyle(selections.fitnessGoal === goal.id)}>
                  <goal.Icon size={20} strokeWidth={1.8} />
                </div>
                <OptionText label={goal.label} sub={goal.sub} />
              </motion.button>
            ))}
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="body" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="Body basics?" body="Height and weight help FitSched estimate your BMI." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <NumberField
                label="Height"
                value={selections.heightCm}
                suffix="cm"
                Icon={Ruler}
                onChange={(value) => setSelections((current) => ({ ...current, heightCm: value }))}
              />
              <NumberField
                label="Weight"
                value={selections.weightKg}
                suffix="kg"
                Icon={Scale}
                onChange={(value) => setSelections((current) => ({ ...current, weightKg: value }))}
              />
            </div>

            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "14px 16px",
              marginTop: "12px",
              color: "var(--text)",
            }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Estimated BMI</div>
              <div style={{ fontSize: "24px", fontWeight: 900 }}>{bmi ? bmi.toFixed(1) : "--"}</div>
            </div>

            <button
              onClick={() => setStep(step + 1)}
              disabled={!bmi}
              style={{
                width: "100%",
                marginTop: "18px",
                border: "none",
                borderRadius: "14px",
                padding: "14px",
                background: "var(--text)",
                color: "var(--bg)",
                fontSize: "14px",
                fontWeight: 800,
                cursor: bmi ? "pointer" : "default",
                opacity: bmi ? 1 : 0.45,
              }}
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="injury" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="Any injuries?" body="This helps FitSched stay more careful with your plan." />

            <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleSelect("hasInjury", false)} style={optionStyle(!selections.hasInjury)}>
              <div style={optionIconStyle(!selections.hasInjury)}>
                <Shield size={20} strokeWidth={1.8} />
              </div>
              <OptionText label="No injuries" sub="Train normally" />
            </motion.button>

            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setSelections((current) => ({ ...current, hasInjury: true }))} style={optionStyle(selections.hasInjury)}>
              <div style={optionIconStyle(selections.hasInjury)}>
                <AlertTriangle size={20} strokeWidth={1.8} />
              </div>
              <OptionText label="I have an injury" sub="FitSched will use a safer plan" />
            </motion.button>

            {selections.hasInjury && (
              <textarea
                value={selections.injuryNotes}
                onChange={(event) => setSelections((current) => ({ ...current, injuryNotes: event.target.value }))}
                placeholder="Example: knee pain, shoulder injury, lower back..."
                rows={4}
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  color: "var(--text)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            )}

            {selections.hasInjury && (
              <button
                onClick={() => setStep(step + 1)}
                style={{
                  width: "100%",
                  marginTop: "18px",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px",
                  background: "var(--text)",
                  color: "var(--bg)",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="target" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="What do you want to grow?" body="Choose the muscle groups you care about most." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {muscleTargets.map(target => {
                const selected = selections.targetMuscles.includes(target.id)
                return (
                  <motion.button key={target.id} whileTap={{ scale: 0.98 }} onClick={() => toggleTarget(target.id)} style={{ ...optionStyle(selected), marginBottom: 0, padding: "14px", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={optionIconStyle(selected)}>
                      <target.Icon />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{target.label}</div>
                  </motion.button>
                )
              })}
            </div>

            <button
              onClick={() => setStep(step + 1)}
              disabled={selections.targetMuscles.length === 0}
              style={{
                width: "100%",
                marginTop: "18px",
                border: "none",
                borderRadius: "14px",
                padding: "14px",
                background: "var(--text)",
                color: "var(--bg)",
                fontSize: "14px",
                fontWeight: 800,
                cursor: selections.targetMuscles.length ? "pointer" : "default",
                opacity: selections.targetMuscles.length ? 1 : 0.45,
              }}
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="experience" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="Your experience?" body="We'll adjust workout intensity for you." />

            {levels.map(level => (
              <motion.button key={level.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelect("experienceLevel", level.id)} style={optionStyle(selections.experienceLevel === level.id)}>
                <div style={optionIconStyle(selections.experienceLevel === level.id)}>
                  <level.Icon size={20} strokeWidth={1.8} />
                </div>
                <OptionText label={level.label} sub={level.sub} />
              </motion.button>
            ))}
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="frequency" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="How often?" body="We'll schedule workouts around your calendar." />

            {frequencies.map(freq => (
              <motion.button key={freq.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelect("workoutsPerWeek", freq.id)} style={optionStyle(selections.workoutsPerWeek === freq.id)}>
                <div style={optionIconStyle(selections.workoutsPerWeek === freq.id)}>
                  <freq.Icon size={20} strokeWidth={1.8} />
                </div>
                <OptionText label={freq.label} sub={freq.sub} />
              </motion.button>
            ))}
          </motion.div>
        )}

        {step === 6 && (
          <motion.div key="calendar" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="Connect your schedule?" body="Calendar sync gives FitSched better workout windows." />

            {calendarChoices.map(choice => (
              <motion.button key={choice.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelect("calendarPreference", choice.id)} style={optionStyle(selections.calendarPreference === choice.id)}>
                <div style={optionIconStyle(selections.calendarPreference === choice.id)}>
                  <choice.Icon size={20} strokeWidth={1.8} />
                </div>
                <OptionText label={choice.label} sub={choice.sub} />
              </motion.button>
            ))}
          </motion.div>
        )}

      </AnimatePresence>

      {step > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setStep(step - 1)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "13px",
            cursor: "pointer",
            marginTop: "16px",
            padding: "8px 0",
          }}
        >
          Back
        </motion.button>
      )}
    </div>
  )
}

function StepHeader({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <>
      <p style={{
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.15em",
        color: "var(--text-muted)",
        marginBottom: "8px",
      }}>
        {label}
      </p>
      <h1 style={{
        fontSize: "26px",
        fontWeight: 900,
        color: "var(--text)",
        letterSpacing: "-0.5px",
        marginBottom: "8px",
      }}>
        {title}
      </h1>
      <p style={{
        fontSize: "13px",
        color: "var(--text-muted)",
        marginBottom: "28px",
      }}>
        {body}
      </p>
    </>
  )
}

function OptionText({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontSize: "12px", opacity: 0.6 }}>
        {sub}
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  suffix,
  Icon,
  onChange,
}: {
  label: string
  value: string
  suffix: string
  Icon: typeof Ruler
  onChange: (value: string) => void
}) {
  return (
    <label style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "14px",
      color: "var(--text)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 700 }}>
        <Icon size={16} strokeWidth={1.8} />
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            minWidth: 0,
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: "24px",
            fontWeight: 900,
          }}
        />
        <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 700 }}>{suffix}</span>
      </div>
    </label>
  )
}

function calculateBmi(heightCm: string | number, weightKg: string | number) {
  const height = Number(heightCm)
  const weight = Number(weightKg)
  if (!height || !weight) return 0
  return weight / ((height / 100) ** 2)
}

function MuscleIconSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ChestMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M16 8v15" />
      <path d="M15 10c-5.2-2.4-9.2.2-10 5.5 2.8 1.4 7.7 1.3 10-2.3" />
      <path d="M17 10c5.2-2.4 9.2.2 10 5.5-2.8 1.4-7.7 1.3-10-2.3" />
      <path d="M8 20c2.5 1.8 5.6 1.9 8 0 2.4 1.9 5.5 1.8 8 0" />
    </MuscleIconSvg>
  )
}

function BackMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M16 6v20" />
      <path d="M13.5 8c-4 .7-6.7 4.2-8.1 9.8 3.5-.3 6.2-2.6 8.1-6.2" />
      <path d="M18.5 8c4 .7 6.7 4.2 8.1 9.8-3.5-.3-6.2-2.6-8.1-6.2" />
      <path d="M12 17c-1.4 2.7-1.7 5.2-1 7" />
      <path d="M20 17c1.4 2.7 1.7 5.2 1 7" />
      <path d="M14 24h4" />
    </MuscleIconSvg>
  )
}

function LegsMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M12 7c1.8 3.9 2.4 8.4 1.4 13.4L11.8 27" />
      <path d="M20 7c-1.8 3.9-2.4 8.4-1.4 13.4l1.6 6.6" />
      <path d="M13.5 8h5" />
      <path d="M10 15c2 .5 3.2 1.8 3.6 3.7" />
      <path d="M22 15c-2 .5-3.2 1.8-3.6 3.7" />
      <path d="M13 22c-1.4.9-2.3 2.4-2.8 4.2" />
      <path d="M19 22c1.4.9 2.3 2.4 2.8 4.2" />
    </MuscleIconSvg>
  )
}

function ShouldersMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M10 11c-3.6.4-6 2.7-7 6.7" />
      <path d="M22 11c3.6.4 6 2.7 7 6.7" />
      <path d="M10 11c1.4-2.4 3.4-3.6 6-3.6s4.6 1.2 6 3.6" />
      <path d="M11 15c1.4 1.2 3 1.8 5 1.8s3.6-.6 5-1.8" />
      <path d="M9 20c2.1 2.5 4.4 3.7 7 3.7s4.9-1.2 7-3.7" />
    </MuscleIconSvg>
  )
}

function ArmsMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M12 7c-2.9 1.7-4.3 4.4-4.1 8.1" />
      <path d="M20 7c2.9 1.7 4.3 4.4 4.1 8.1" />
      <path d="M8.3 15c-2.2 1-3.3 2.9-3.3 5.7 2.8.4 5-.7 6.5-3.3" />
      <path d="M23.7 15c2.2 1 3.3 2.9 3.3 5.7-2.8.4-5-.7-6.5-3.3" />
      <path d="M12 7c1.3 1.1 2.6 1.7 4 1.7S18.7 8.1 20 7" />
      <path d="M11.2 17.4c-.9 2.7-.4 5 .9 7" />
      <path d="M20.8 17.4c.9 2.7.4 5-.9 7" />
    </MuscleIconSvg>
  )
}

function CoreMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M16 7v20" />
      <path d="M11 9c1.7 1.5 3.3 2.2 5 2.2s3.3-.7 5-2.2" />
      <path d="M11 13h10" />
      <path d="M10.5 17h11" />
      <path d="M11 21h10" />
      <path d="M13 13v8" />
      <path d="M19 13v8" />
      <path d="M11.5 25c2.9 1.5 6.1 1.5 9 0" />
    </MuscleIconSvg>
  )
}

function FullBodyMuscleIcon() {
  return (
    <MuscleIconSvg>
      <path d="M16 5.5a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z" />
      <path d="M16 10.5v8" />
      <path d="M10 13c2.2-1.4 4.2-2.1 6-2.1s3.8.7 6 2.1" />
      <path d="M10 13l-2.5 7" />
      <path d="M22 13l2.5 7" />
      <path d="M13.5 18.5l-2.2 8" />
      <path d="M18.5 18.5l2.2 8" />
      <path d="M12.2 16.5c2.4 1.5 5.2 1.5 7.6 0" />
    </MuscleIconSvg>
  )
}
