"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/contexts/LanguageContext"

const languages = ["EN", "CN", "JP", "VI"] as const

export function LanguageCycleButton() {
  const { language, setLanguage } = useLanguage()

  const cycleLanguage = () => {
    const currentIndex = languages.indexOf(language as (typeof languages)[number])
    const nextIndex = (currentIndex + 1) % languages.length
    const next = languages[nextIndex]
    setLanguage(next)
    localStorage.setItem("language", next)
    document.documentElement.setAttribute("lang", next.toLowerCase())
  }

  return (
    <button
      onClick={cycleLanguage}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "20px",
        padding: "4px 10px",
        color: "var(--text)",
        fontSize: "11px",
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.05em",
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={language}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
        >
          {language}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
