"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { translations, Language } from "@/lib/language"

type TranslationValue = string
type TranslationSet = Record<string, TranslationValue>

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationSet
}

const LanguageContext = createContext<LanguageContextType>({
  language: "EN",
  setLanguage: () => {},
  t: translations.EN,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("EN")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem("language") as Language) || "EN"
    setLanguageState(saved)
    document.documentElement.setAttribute("lang", saved.toLowerCase())
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
    document.documentElement.setAttribute("lang", lang.toLowerCase())
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
