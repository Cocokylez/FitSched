"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Dumbbell,
  Gauge,
  HeartPulse,
  Target,
  Trophy,
  UserRound,
} from "lucide-react"

const steps = ["goal", "experience", "frequency"]

const goals = [
  { id: "lose_weight", Icon: Target, label: "Lose Weight", sub: "Burn fat, get leaner" },
  { id: "build_muscle", Icon: Dumbbell, label: "Build Muscle", sub: "Get stronger, gain mass" },
  { id: "stay_active", Icon: HeartPulse, label: "Stay Active", sub: "General fitness & health" },
  { id: "improve_endurance", Icon: Activity, label: "Endurance", sub: "Cardio & stamina" },
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

export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])
  const [selections, setSelections] = useState({
    fitnessGoal: "",
    experienceLevel: "",
    workoutsPerWeek: 0,
  })

  const handleSelect = async (key: string, value: any) => {
    const updated = { ...selections, [key]: value }
    setSelections(updated)

    if (step < steps.length - 1) {
      setTimeout(() => setStep(step + 1), 300)
    } else {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      router.push("/schedule")
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
          <motion.div
            key="goal"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <p style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}>
              STEP 1 OF 3
            </p>
            <h1 style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "var(--text)",
              letterSpacing: "-0.5px",
              marginBottom: "8px",
            }}>
              What&apos;s your goal?
            </h1>
            <p style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginBottom: "28px",
            }}>
              We&apos;ll personalize your workout plan.
            </p>

            {goals.map(goal => (
              <motion.button
                key={goal.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect("fitnessGoal", goal.id)}
                style={optionStyle(selections.fitnessGoal === goal.id)}
              >
                <div style={optionIconStyle(selections.fitnessGoal === goal.id)}>
                  <goal.Icon size={20} strokeWidth={1.8} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "2px" }}>
                    {goal.label}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.6 }}>
                    {goal.sub}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="experience"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <p style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}>
              STEP 2 OF 3
            </p>
            <h1 style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "var(--text)",
              letterSpacing: "-0.5px",
              marginBottom: "8px",
            }}>
              Your experience?
            </h1>
            <p style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginBottom: "28px",
            }}>
              We&apos;ll adjust workout intensity for you.
            </p>

            {levels.map(level => (
              <motion.button
                key={level.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect("experienceLevel", level.id)}
                style={optionStyle(selections.experienceLevel === level.id)}
              >
                <div style={optionIconStyle(selections.experienceLevel === level.id)}>
                  <level.Icon size={20} strokeWidth={1.8} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "2px" }}>
                    {level.label}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.6 }}>
                    {level.sub}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="frequency"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <p style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}>
              STEP 3 OF 3
            </p>
            <h1 style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "var(--text)",
              letterSpacing: "-0.5px",
              marginBottom: "8px",
            }}>
              How often?
            </h1>
            <p style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginBottom: "28px",
            }}>
              We&apos;ll schedule workouts around your calendar.
            </p>

            {frequencies.map(freq => (
              <motion.button
                key={freq.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect("workoutsPerWeek", freq.id)}
                style={optionStyle(selections.workoutsPerWeek === freq.id)}
              >
                <div style={optionIconStyle(selections.workoutsPerWeek === freq.id)}>
                  <freq.Icon size={20} strokeWidth={1.8} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "2px" }}>
                    {freq.label}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.6 }}>
                    {freq.sub}
                  </div>
                </div>
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
          ← Back
        </motion.button>
      )}
    </div>
  )
}
