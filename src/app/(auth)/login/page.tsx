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

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          height: '40vh',
          background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>FitSched</div>
        <div style={{ fontSize: '13px', color: '#888888', marginTop: '6px' }}>Your schedule. Your pace.</div>
      </motion.div>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        style={{
          background: '#242424',
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
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Welcome back</div>
            <div style={{ fontSize: '13px', color: '#888888', marginBottom: '24px' }}>Sign in to continue</div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: '#888888', marginBottom: '6px' }}>EMAIL</div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                background: '#2f2f2f',
                border: '1px solid #383838',
                borderRadius: '12px',
                padding: '14px 16px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                width: '100%',
                marginBottom: '16px',
                boxSizing: 'border-box' as const,
              }}
            />
          </motion.div>

          <motion.div variants={fadeIn}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: '#888888', marginBottom: '6px' }}>PASSWORD</div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                background: '#2f2f2f',
                border: '1px solid #383838',
                borderRadius: '12px',
                padding: '14px 16px',
                color: 'white',
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
                background: 'white',
                color: '#1a1a1a',
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
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #333333' }} />
              <span style={{ fontSize: '11px', color: '#888888' }}>or continue with</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #333333' }} />
            </div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <button
              onClick={() => { signIn('google', { callbackUrl: '/schedule' }) }}
              style={{
                width: '100%',
                background: '#2f2f2f',
                border: '1px solid #383838',
                borderRadius: '12px',
                padding: '14px',
                color: 'white',
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
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#888888', margin: 0 }}>
              Don&apos;t have an account?{' '}
              <span
                style={{ color: 'white', fontWeight: 700, cursor: 'pointer' }}
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
          background: '#2f2f2f',
          border: '1px solid #383838',
          borderRadius: '50%', width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white',
        }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}
