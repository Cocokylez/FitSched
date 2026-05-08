"use client"
import { useState, useRef, useEffect } from 'react'
import { Globe, Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'

export default function HeaderButtons() {
  const { theme, toggleTheme } = useTheme()
  const { language, changeLanguage } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '50%',
    width: 36, height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text)',
    flexShrink: 0
  }

  const languages = [
    { code: 'EN', label: '🇺🇸 English' },
    { code: 'CN', label: '🇨🇳 中文' },
    { code: 'JP', label: '🇯🇵 日本語' },
    { code: 'VI', label: '🇻🇳 Tiếng Việt' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button onClick={() => setLangOpen(prev => !prev)} style={btnStyle}>
          <Globe size={16} />
        </button>

        <AnimatePresence>
          {langOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 44, right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: '140px',
                zIndex: 99999,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}
            >
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code)
                    setLangOpen(false)
                  }}
                  style={{
                    background: language === lang.code
                      ? 'var(--surface-2)' : 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: language === lang.code
                      ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: language === lang.code ? 700 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={toggleTheme} style={btnStyle}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}