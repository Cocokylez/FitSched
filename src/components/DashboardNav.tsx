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
  const lockedVisibleUntil = useRef(0)
  const ticking = useRef(false)
  const { theme } = useTheme()
  const { t } = useLanguage()
  const hideNav = pathname.startsWith("/exercise")
  const currentIndex = navItems.findIndex((item) => pathname.startsWith(item.href))
  const [travelIndex, setTravelIndex] = useState(Math.max(currentIndex, 0))
  const activeIndex = currentIndex >= 0 ? travelIndex : -1

  useEffect(() => {
    if (currentIndex >= 0) setTravelIndex(currentIndex)
  }, [currentIndex])

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

    const scrollEls = Array.from(document.querySelectorAll<HTMLElement>("[data-dashboard-scroll], main"))
      .filter((el, index, list) => list.indexOf(el) === index)

    const els = scrollEls.length ? scrollEls : [document.documentElement]

    const getScrollY = (target?: HTMLElement | null) => {
      if (target) return target.scrollTop
      return Math.max(window.scrollY, ...els.map((el) => el.scrollTop))
    }

    setVisible(true)
    lastScrollY.current = getScrollY()
    ticking.current = false

    const updateFromY = (currentScrollY: number) => {
      if (Date.now() < lockedVisibleUntil.current) {
        setVisible(true)
        lastScrollY.current = currentScrollY
        return
      }

      const delta = currentScrollY - lastScrollY.current

      if (currentScrollY <= 10) {
        setVisible(true)
      } else if (delta > 18) {
        setVisible(false)
      } else if (delta < -10) {
        setVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    const handleScroll = (event?: Event) => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const target = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
          updateFromY(getScrollY(target))
          ticking.current = false
        })
        ticking.current = true
      }
    }

    els.forEach((el) => el.addEventListener("scroll", handleScroll, { passive: true }))
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      els.forEach((el) => el.removeEventListener("scroll", handleScroll))
      window.removeEventListener("scroll", handleScroll)
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
            position: "relative",
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
            overflow: "hidden",
          }}>
            {activeIndex >= 0 && (
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ x: `${activeIndex * 100}%` }}
                transition={{ type: "spring", stiffness: 250, damping: 25, mass: 0.78 }}
                style={{
                  position: "absolute",
                  top: 6,
                  bottom: 6,
                  left: 6,
                  width: `calc((100% - 12px) / ${navItems.length})`,
                  borderRadius: "20px",
                  background: "linear-gradient(180deg, rgba(107,191,184,0.2), rgba(107,191,184,0.08))",
                  border: "1px solid rgba(107,191,184,0.25)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 28px rgba(107,191,184,0.12)",
                  pointerEvents: "none",
                }}
              />
            )}
            {navItems.map((item, index) => {
              const isActive = index === activeIndex
              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    lockedVisibleUntil.current = Date.now() + 700
                    setVisible(true)
                    setTravelIndex(index)
                    router.push(item.href)
                  }}
                  whileTap={{ scale: 0.96 }}
                  animate={{ y: isActive ? -1 : 0 }}
                  style={{
                    position: "relative",
                    zIndex: 1,
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
