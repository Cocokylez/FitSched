"use client"

import { ReactNode } from "react"
import { MotionConfig } from "framer-motion"

export function ProvidersWrapper({ children }: { children: ReactNode }) {
  // reducedMotion="user" makes every framer-motion component honor the OS
  // "reduce motion" setting — transforms/movement are skipped while opacity
  // still cross-fades. The CSS @media block in globals.css only covers CSS
  // animations; framer drives transforms in JS, so it needs this too.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
