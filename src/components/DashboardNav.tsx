"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Dumbbell, User, BarChart3 } from 'lucide-react'
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
    id: "workout",
    label: "Workout",
    href: "/workout",
    icon: <Dumbbell size={20} />,
  },
  {
    id: "progress",
    label: "Progress",
    href: "/progress",
    icon: <BarChart3 size={20} />,
  },
  {
    id: "settings",
    label: "Profile",
    href: "/settings",
    icon: <User size={20} />,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
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
    const el =
      document.querySelector<HTMLElement>("[data-dashboard-scroll]") ||
      document.querySelector<HTMLElement>("main") ||
      document.documentElement
    if (!el) return

    setVisible(true)
    lastScrollY.current = el.scrollTop || window.scrollY
    ticking.current = false

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = el.scrollTop || window.scrollY

          if (currentScrollY <= 10) {
            setVisible(true)
          } else if (currentScrollY > lastScrollY.current + 8) {
            setVisible(false)
          } else if (currentScrollY < lastScrollY.current - 8) {
            setVisible(true)
          }

          lastScrollY.current = currentScrollY
          ticking.current = false
        })
        ticking.current = true
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("touchmove", handleScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", handleScroll)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("touchmove", handleScroll)
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          key="bottom-nav"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            zIndex: 9998,
            ...navStyle,
            padding: "12px 0 20px",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
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
                    {t[item.id as keyof typeof t] as string}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
