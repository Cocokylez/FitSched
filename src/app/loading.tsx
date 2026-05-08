"use client"

import { motion } from 'framer-motion'

export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: '20px',
          fontWeight: '800',
          color: 'var(--text)',
          letterSpacing: '-0.5px'
        }}
      >
        FitSched
      </motion.div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2
            }}
            style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--text-muted)'
            }}
          />
        ))}
      </div>
    </div>
  )
}
