"use client"

import { ReactNode } from "react"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export function ProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <LanguageSwitcher />
    </LanguageProvider>
  )
}
