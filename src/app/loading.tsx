"use client"

import { FitSchedLoader } from "@/components/LoadingScreen"

export default function Loading() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <FitSchedLoader />
    </div>
  )
}
