"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Hike page uses position:fixed internally — a transform-based parent traps
  // fixed children to the parent's bounds instead of the viewport, blocking the map.
  if (pathname === "/hike") return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
