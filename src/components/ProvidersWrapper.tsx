"use client"

import { ReactNode } from "react"
import { LanguageProvider } from "@/contexts/LanguageContext"

export function ProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  )
}
