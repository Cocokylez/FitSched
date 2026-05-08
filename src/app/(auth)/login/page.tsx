"use client"

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export default function LoginPage() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setIsDark(saved === 'dark')
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    const val = next ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', val)
    localStorage.setItem('theme', val)
  }

  const bg = isDark ? '#1a1a1a' : '#f5f5f0'
  const cardBg = isDark ? '#242424' : '#ffffff'
  const inputBg = isDark ? '#2f2f2f' : '#f0f0eb'
  const border = isDark ? '#383838' : '#e0e0d8'
  const textPrimary = isDark ? 'white' : '#1a1a1a'
  const textSecondary = isDark ? '#888888' : '#888888'
  const gradient = isDark ? 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)' : 'linear-gradient(180deg, #e8e8e0 0%, #f5f5f0 100%)'
  const btnBg = isDark ? '#2f2f2f' : '#e8e8e0'

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          height: '40vh',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 900, color: textPrimary, letterSpacing: '-1px' }}>FitSched</div>
        <div style={{ fontSize: '13px', color: textSecondary, marginTop: '6px' }}>Your schedule. Your pace.</div>
      </motion.div>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        style={{
          background: cardBg,
          borderRadius: '28px 28px 0 0',
          padding: '32px 24px 40px',
          position: 'relative',
          zIndex: 2,
          marginTop: '-28px',
          flex: 1,
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: textPrimary, marginBottom: '4px' }}>Welcome back</div>
            <div style={{ fontSize: '13px', color: textSecondary, marginBottom: '24px' }}>Sign in to continue</div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: textSecondary, marginBottom: '6px' }}>EMAIL</div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                background: inputBg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                color: textPrimary,
                fontSize: '14px',
                outline: 'none',
                width: '100%',
                marginBottom: '16px',
                boxSizing: 'border-box' as const,
              }}
            />
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: textSecondary, marginBottom: '6px' }}>PASSWORD</div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                background: inputBg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                color: textPrimary,
                fontSize: '14px',
                outline: 'none',
                width: '100%',
                marginBottom: '24px',
                boxSizing: 'border-box' as const,
              }}
            />
          </motion.div>

          <motion.div variants={fadeIn}>
            <button
              onClick={async () => { await signIn('credentials', { email, password, callbackUrl: '/schedule' }) }}
              style={{
                width: '100%',
                background: textPrimary,
                color: bg,
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '20px',
              }}
            >
              Sign In
            </button>
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: `1px solid ${border}` }} />
              <span style={{ fontSize: '11px', color: textSecondary }}>or continue with</span>
              <hr style={{ flex: 1, border: 'none', borderTop: `1px solid ${border}` }} />
            </div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <button
              onClick={() => { signIn('google', { callbackUrl: '/schedule' }) }}
              style={{
                width: '100%',
                background: btnBg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: '14px',
                color: textPrimary,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px',
              }}
            >
              <img src="/google.svg" width={16} height={16} alt="Google" />
              Continue with Google
            </button>
          </motion.div>

          <motion.div variants={fadeIn}>
            <p style={{ textAlign: 'center', fontSize: '12px', color: textSecondary, margin: 0 }}>
              Don&apos;t have an account?{' '}
              <span
                style={{ color: textPrimary, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => router.push('/register')}
              >
                Sign Up
              </span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: btnBg,
          border: `1px solid ${border}`,
          borderRadius: '50%', width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: textPrimary,
        }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}
