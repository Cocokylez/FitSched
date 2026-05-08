"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/context/ThemeContext"
import { useLanguage } from "@/context/LanguageContext"

const navItems = [
  {
    id: "schedule",
    label: "Schedule",
    href: "/schedule",
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: "ai",
    label: "AI",
    href: "/ai",
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    id: "workout",
    label: "Workout",
    href: "/workout",
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h2v5H3z"/><path d="M19 9.5h2v5h-2z"/><path d="M5 12h14"/></svg>,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const { theme } = useTheme()
  const { t } = useLanguage()

  const navStyle = theme === "dark" ? {
    background: "rgba(30, 30, 30, 0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.3)",
  } : {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
    boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.1)",
  }

  useEffect(() => {
    const el = document.querySelector("main")
    if (!el) return

    const handleScroll = () => {
      const currentScrollY = el.scrollTop

      if (currentScrollY < 10) {
        setVisible(true)
      } else if (currentScrollY > lastScrollY.current + 5) {
        setVisible(false)
      } else if (currentScrollY < lastScrollY.current - 5) {
        setVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bottom-nav"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            zIndex: 9998,
          }}
        >
          <div style={{
            ...navStyle,
            padding: "12px 0 20px",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              width: "100%",
              maxWidth: "500px",
              margin: "0 auto",
            }}>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 16px",
                    }}
                  >
                    <span style={{ color: isActive ? "var(--text)" : "var(--text-muted)", display: "flex" }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      color: isActive ? "var(--text)" : "var(--text-muted)",
                    }}>
                      {t[item.id as keyof typeof t]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
