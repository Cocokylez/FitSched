"use client"

import { Globe } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { LANGUAGES } from "@/lib/language"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div style={{
      position: "fixed",
      left: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 9999,
      background: "#242424",
      border: "1px solid #333333",
      borderRadius: "20px",
      padding: "8px 0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
    }}>
      <div style={{ color: "#888888", fontSize: "16px", marginBottom: "4px" }}>
        <Globe size={16} />
      </div>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          style={{
            width: "40px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            borderRadius: "12px",
            cursor: "pointer",
            border: "none",
            color: language === lang.code ? "#1a1a1a" : "#888888",
            background: language === lang.code ? "white" : "transparent",
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
