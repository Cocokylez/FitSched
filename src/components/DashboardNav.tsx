"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Dumbbell, Footprints, User } from 'lucide-react'
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
    id: "hike",
    label: "Hike",
    href: "/hike",
    icon: <Footprints size={20} />,
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
  const lastTouchY = useRef(0)
  const ticking = useRef(false)
  const { theme } = useTheme()
  const { t } = useLanguage()
  const hideNav = pathname.startsWith("/exercise")

  const navStyle = theme === "dark" ? {
    background: "rgba(19, 23, 22, 0.74)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 18px 60px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255,255,255,0.05)",
  } : {
    background: "rgba(255, 255, 255, 0.76)",
    border: "1px solid rgba(17, 24, 22, 0.09)",
    boxShadow: "0 18px 44px rgba(22, 32, 30, 0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
  }

  useEffect(() => {
    if (hideNav) {
      setVisible(false)
      return
    }

    const scrollEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-dashboard-scroll], main")
    )
    const els = scrollEls.length ? scrollEls : [document.documentElement]

    const getScrollY = () => Math.max(window.scrollY, ...els.map((el) => el.scrollTop))

    setVisible(true)
    lastScrollY.current = getScrollY()
    ticking.current = false

    const updateFromY = (currentScrollY: number) => {
      if (currentScrollY <= 10) {
        setVisible(true)
      } else if (currentScrollY > lastScrollY.current + 8) {
        setVisible(false)
      } else if (currentScrollY < lastScrollY.current - 8) {
        setVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    const handleScroll = (event?: Event) => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const target = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
          updateFromY(target ? target.scrollTop : getScrollY())
          ticking.current = false
        })
        ticking.current = true
      }
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY > 6) setVisible(false)
      if (event.deltaY < -6) setVisible(true)
      handleScroll(event)
    }

    const handleTouchStart = (event: TouchEvent) => {
      lastTouchY.current = event.touches[0]?.clientY || 0
    }

    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY || 0
      const delta = lastTouchY.current - currentY
      if (delta > 6) setVisible(false)
      if (delta < -6) setVisible(true)
      lastTouchY.current = currentY
      handleScroll(event)
    }

    els.forEach((el) => el.addEventListener("scroll", handleScroll, { passive: true }))
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => {
      els.forEach((el) => el.removeEventListener("scroll", handleScroll))
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("wheel", handleWheel)
    }
  }, [pathname, hideNav])

  if (hideNav) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          key="bottom-nav"
          initial={{ y: 76, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 76, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            bottom: "max(14px, env(safe-area-inset-bottom))",
            left: 0,
            right: 0,
            zIndex: 70,
            padding: "0 14px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{
            ...navStyle,
            display: "grid",
            gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
            alignItems: "center",
            width: "100%",
            maxWidth: "430px",
            borderRadius: "28px",
            padding: "6px",
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
            pointerEvents: "auto",
          }}>
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <motion.button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  whileTap={{ scale: 0.96 }}
                  animate={{ y: isActive ? -1 : 0 }}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "3px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    minWidth: 0,
                    minHeight: 54,
                    padding: "7px 8px",
                    borderRadius: "22px",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                    overflow: "hidden",
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="dashboard-nav-active"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "20px",
                        background: "linear-gradient(180deg, rgba(107,191,184,0.18), rgba(107,191,184,0.08))",
                        border: "1px solid rgba(107,191,184,0.22)",
                      }}
                    />
                  )}
                  <motion.span
                    animate={{ scale: isActive ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    style={{ position: "relative", display: "flex", color: isActive ? "var(--accent-strong)" : "var(--text-muted)" }}
                  >
                    {item.icon}
                  </motion.span>
                  <span style={{
                    position: "relative",
                    fontFamily: "var(--font-display)",
                    fontSize: "10px",
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "0",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                  }}>
                    {t[item.id as keyof typeof t] as string}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
