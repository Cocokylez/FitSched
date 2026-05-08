"use client"

import { useState, useRef, useEffect } from "react"
import { Globe, Sun, Moon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"

const languages = [
  { code: "EN", label: "English" },
  { code: "CN", label: "中文" },
  { code: "JP", label: "日本語" },
  { code: "VI", label: "Ti\u1ebfng Vi\u1ec7t" },
]

export function GlobalControls() {
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { language, changeLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        gap: "8px",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div ref={langRef} style={{ position: "relative" }}>
        <button
          onClick={() => setLangOpen(!langOpen)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text)",
          }}
        >
          <Globe size={16} />
        </button>

        <AnimatePresence>
          {langOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                minWidth: "120px",
                zIndex: 9999,
              }}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code as "EN" | "CN" | "JP" | "VI")
                    setLangOpen(false)
                  }}
                  style={{
                    background:
                      language === lang.code
                        ? "var(--surface-2)"
                        : "transparent",
                    border: "none",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    color:
                      language === lang.code
                        ? "var(--text)"
                        : "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: language === lang.code ? "700" : "400",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  {lang.code} {lang.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={toggleTheme}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "50%",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text)",
        }}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}
