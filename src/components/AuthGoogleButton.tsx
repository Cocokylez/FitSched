"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface AuthGoogleButtonProps {
  label: string
  callbackPath?: string
}

export function AuthGoogleButton({
  label,
  callbackPath = "/schedule",
}: AuthGoogleButtonProps) {
  const popupRef = useRef<Window | null>(null)
  const closeCheckRef = useRef<number | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadProviders = async () => {
      try {
        const response = await fetch("/api/auth/providers")
        if (!response.ok) return

        const providers = await response.json()
        if (mounted) setGoogleAvailable(Boolean(providers?.google))
      } catch {}
    }

    loadProviders()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "fitsched:google-auth-complete") return

      setWaiting(false)
      if (closeCheckRef.current) window.clearInterval(closeCheckRef.current)
      popupRef.current?.close()
      window.location.assign(event.data.next || callbackPath)
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
      if (closeCheckRef.current) window.clearInterval(closeCheckRef.current)
    }
  }, [callbackPath])

  const startGooglePopup = () => {
    if (!googleAvailable) return

    const popupUrl = new URL("/auth/google-popup", window.location.origin)
    popupUrl.searchParams.set("next", callbackPath)
    const width = 460
    const height = 640
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)

    const popup = window.open(
      popupUrl.toString(),
      "fitsched-google-login",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    if (!popup) {
      window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackPath)}`
      return
    }

    popupRef.current = popup
    popup.focus()
    setWaiting(true)

    if (closeCheckRef.current) window.clearInterval(closeCheckRef.current)
    closeCheckRef.current = window.setInterval(() => {
      if (popup.closed) {
        setWaiting(false)
        if (closeCheckRef.current) window.clearInterval(closeCheckRef.current)
      }
    }, 500)
  }

  return (
    <button
      type="button"
      onClick={startGooglePopup}
      disabled={waiting || !googleAvailable}
      style={{
        width: "100%",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px",
        color: "var(--text)",
        fontSize: "14px",
        cursor: waiting || !googleAvailable ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginBottom: "24px",
        opacity: waiting || !googleAvailable ? 0.7 : 1,
      }}
    >
      <Image src="/google.svg" width={16} height={16} alt="Google" />
      {!googleAvailable ? "Google sign in unavailable" : waiting ? "Waiting for Google..." : label}
    </button>
  )
}
