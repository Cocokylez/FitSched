"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import {
  Activity,
  AlertTriangle,
  BicepsFlexed,
  Bone,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CircleDot,
  Dumbbell,
  FileImage,
  Gauge,
  HeartPulse,
  ImagePlus,
  Link2,
  PersonStanding,
  Ruler,
  Scale,
  Shield,
  SkipForward,
  Target,
  Trophy,
  Upload,
  UserRound,
  Zap,
} from "lucide-react"

const steps = ["goal", "body", "injury", "target", "experience", "frequency", "calendar", "schedule"]

const goals = [
  { id: "lose_weight", Icon: Target, label: "Lose Weight", sub: "Burn fat, get leaner" },
  { id: "build_muscle", Icon: Dumbbell, label: "Build Muscle", sub: "Get stronger, gain mass" },
  { id: "stay_active", Icon: HeartPulse, label: "Stay Active", sub: "General fitness & health" },
  { id: "improve_endurance", Icon: Activity, label: "Endurance", sub: "Cardio & stamina" },
]

const muscleTargets = [
  { id: "CHEST", Icon: Shield, label: "Chest" },
  { id: "BACK", Icon: Bone, label: "Back" },
  { id: "LEGS", Icon: PersonStanding, label: "Legs" },
  { id: "SHOULDERS", Icon: Zap, label: "Shoulders" },
  { id: "ARMS", Icon: BicepsFlexed, label: "Arms" },
  { id: "CORE", Icon: CircleDot, label: "Core" },
  { id: "FULL_BODY", Icon: Activity, label: "Full Body" },
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
  { id: "upload", Icon: ImagePlus, label: "Upload schedule instead", sub: "Use a screenshot or photo" },
  { id: "skip", Icon: SkipForward, label: "Skip for now", sub: "You can connect it later" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [schedulePreview, setSchedulePreview] = useState<string | null>(null)
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
    scheduleImageName: "",
    scheduleImageDataUrl: "",
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
      scheduleImageName: updated.scheduleImageName,
      scheduleImageDataUrl: updated.scheduleImageDataUrl,
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

  const handleScheduleFile = async (file?: File) => {
    if (!file) return

    localStorage.removeItem("fitsched-schedule-upload-notice-dismissed")

    if (file.type.startsWith("image/")) {
      const preview = await createSchedulePreview(file)
      setSchedulePreview(preview)
      setSelections((current) => ({
        ...current,
        scheduleImageName: file.name,
        scheduleImageDataUrl: preview,
      }))
    } else {
      setSchedulePreview(null)
      setSelections((current) => ({
        ...current,
        scheduleImageName: file.name,
        scheduleImageDataUrl: "",
      }))
    }
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
                      <target.Icon size={19} strokeWidth={1.8} />
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

        {step === 7 && (
          <motion.div key="schedule" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
            <StepHeader label={stepLabel} title="Upload your schedule?" body="Optional. Add a screenshot or photo if you don't use Google Calendar." />

            <label style={{
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: "18px",
              padding: "22px",
              minHeight: "150px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "10px",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "center",
            }}>
              {schedulePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={schedulePreview} alt="Schedule preview" style={{ maxWidth: "100%", maxHeight: "220px", borderRadius: "14px", objectFit: "cover" }} />
              ) : (
                <>
                  <div style={optionIconStyle(false)}>
                    <Upload size={20} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>
                    {selections.scheduleImageName || "Choose schedule image"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    Screenshots and photos work best.
                  </div>
                </>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => handleScheduleFile(event.target.files?.[0])}
                style={{ display: "none" }}
              />
            </label>

            {selections.scheduleImageName && !schedulePreview && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px", marginTop: "12px" }}>
                <FileImage size={14} />
                {selections.scheduleImageName}
              </div>
            )}

            <button
              onClick={() => finishOnboarding()}
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
              Finish
            </button>
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

async function createSchedulePreview(file: File) {
  const source = await readFileAsDataUrl(file)

  return new Promise<string>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const maxSide = 1200
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")

      if (!context) {
        resolve(source)
        return
      }

      canvas.width = width
      canvas.height = height
      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL("image/jpeg", 0.78))
    }
    image.onerror = () => resolve(source)
    image.src = source
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
