"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { AuthTopControls } from '@/components/AuthTopControls'
import { AuthGoogleButton } from '@/components/AuthGoogleButton'

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Email or password is incorrect')
      return
    }

    try {
      const response = await fetch('/api/onboarding', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        router.push(data?.onboardingCompleted ? '/schedule' : '/onboarding')
        return
      }
    } catch {}

    router.push('/schedule')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', padding: '0 16px 24px' }}>
      <AuthTopControls />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          minHeight: '36vh',
          background: "linear-gradient(180deg, rgba(107,191,184,0.1) 0%, transparent 78%)",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>{t.fitSched}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>{t.tagline}</div>
      </motion.div>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '28px',
          padding: '32px 24px 40px',
          position: 'relative',
          zIndex: 2,
          margin: '-28px auto 0',
          width: '100%',
          maxWidth: '480px',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{t.welcomeBack}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>{t.signInContinue}</div>
          </motion.div>

          <form onSubmit={handleSubmit}>
          {error && (
            <motion.div variants={fadeIn}>
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid #ff4444',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#ff6666',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px' }}>{t.email}</div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 16px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                width: '100%',
                marginBottom: '16px',
                boxSizing: 'border-box' as const,
              }}
            />
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px' }}>{t.password}</div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 16px',
                color: 'var(--text)',
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
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'var(--text)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '20px',
                opacity: loading ? 0.55 : 1,
              }}
            >
              {loading ? 'Signing in...' : t.signIn}
            </button>
          </motion.div>
          </form>

          <motion.div variants={fadeIn}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.orContinueWith}</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            </div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <AuthGoogleButton label={t.continueGoogle} />
          </motion.div>

          <motion.div variants={fadeIn}>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              {t.noAccount}{' '}
              <span
                style={{ color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => router.push('/register')}
              >
                {t.signUp}
              </span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

    </div>
  )
}
