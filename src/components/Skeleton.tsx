"use client"

import { useTheme } from '@/context/ThemeContext'

export function SkeletonLine({ 
  width = '100%', 
  height = '16px',
  borderRadius = '8px'
}: { 
  width?: string, 
  height?: string,
  borderRadius?: string 
}) {
  const { theme } = useTheme()
  return (
    <div style={{
      width, height, borderRadius,
      background: theme === 'dark'
        ? 'linear-gradient(90deg, #242424 25%, #2f2f2f 50%, #242424 75%)'
        : 'linear-gradient(90deg, #e8e8ea 25%, #f0f0f2 50%, #e8e8ea 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite ease-in-out'
    }} />
  )
}

export function SkeletonCard({ height = '80px' }: { height?: string }) {
  const { theme } = useTheme()
  return (
    <div style={{
      width: '100%', height,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '16px 20px',
      marginBottom: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      justifyContent: 'center'
    }}>
      <SkeletonLine width="40%" height="12px" />
      <SkeletonLine width="70%" height="10px" />
    </div>
  )
}

export function SkeletonExerciseRow() {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <SkeletonLine width="28px" height="28px" borderRadius="8px" />
      <SkeletonLine width="120px" height="12px" />
      <div style={{ marginLeft: 'auto' }}>
        <SkeletonLine width="48px" height="20px" borderRadius="20px" />
      </div>
    </div>
  )
}
