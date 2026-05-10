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
  const { t } = useLanguage()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <AuthTopControls />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          height: '40vh',
          background: "linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)",
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
          background: 'var(--surface)',
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
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{t.welcomeBack}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>{t.signInContinue}</div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px' }}>{t.email}</div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              onClick={async () => { await signIn('credentials', { email, password, callbackUrl: '/onboarding' }) }}
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
              }}
            >
              {t.signIn}
            </button>
          </motion.div>

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
