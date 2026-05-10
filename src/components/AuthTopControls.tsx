"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Globe2, Moon, Sun } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"

const languages = [
  { id: "EN" as const, label: "English" },
  { id: "CN" as const, label: "中文" },
  { id: "JP" as const, label: "日本語" },
  { id: "VI" as const, label: "Tiếng Việt" },
]

export function AuthTopControls() {
  const { language, changeLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        right: "16px",
        zIndex: 10,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "relative", pointerEvents: "auto" }}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Choose language"
          style={{
            minWidth: 76,
            height: 38,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "#ef4444",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(239,68,68,0.28)",
          }}
        >
          <Globe2 size={15} strokeWidth={2.2} />
          {language}
          <ChevronDown
            size={14}
            strokeWidth={2.2}
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: "46px",
                left: 0,
                width: 150,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "6px",
                boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
              }}
            >
              {languages.map((item) => {
                const active = item.id === language
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      changeLanguage(item.id)
                      setOpen(false)
                    }}
                    style={{
                      width: "100%",
                      background: active ? "rgba(239,68,68,0.16)" : "transparent",
                      border: "none",
                      borderRadius: "10px",
                      padding: "9px 10px",
                      color: active ? "#ef4444" : "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{item.label}</span>
                    <span style={{ color: active ? "#ef4444" : "var(--text-muted)", fontSize: "11px" }}>{item.id}</span>
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle dark and light mode"
        style={{
          width: 38,
          height: 38,
          borderRadius: "999px",
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          pointerEvents: "auto",
        }}
      >
        {theme === "dark" ? <Sun size={17} strokeWidth={2.1} /> : <Moon size={17} strokeWidth={2.1} />}
      </button>
    </div>
  )
}
