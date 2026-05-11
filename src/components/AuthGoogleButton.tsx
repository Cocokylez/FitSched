"use client"

import Image from "next/image"
import { signIn } from "next-auth/react"
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
  const [checkingGoogle, setCheckingGoogle] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const loadProviders = async () => {
      try {
        const response = await fetch("/api/auth/providers")
        if (!response.ok) return

        const providers = await response.json()
        if (mounted) setGoogleAvailable(Boolean(providers?.google))
      } catch {}
      finally {
        if (mounted) setCheckingGoogle(false)
      }
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

  const startGooglePopup = async () => {
    if (!googleAvailable || checkingGoogle || waiting) return

    setError("")
    setWaiting(true)

    const completeUrl = new URL("/auth/popup-complete", window.location.origin)
    completeUrl.searchParams.set("next", callbackPath)
    const width = 460
    const height = 640
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)

    const popup = window.open(
      "",
      "fitsched-google-login",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    if (!popup) {
      await signIn("google", { redirectTo: completeUrl.toString() })
      return
    }

    popupRef.current = popup
    popup.document.write(`
      <!doctype html>
      <title>FitSched</title>
      <body style="margin:0;background:#171717;color:#f4f4f4;font-family:system-ui;display:grid;min-height:100vh;place-items:center;text-align:center">
        <div>
          <div style="font-size:20px;font-weight:800;margin-bottom:8px">FitSched</div>
          <div style="font-size:13px;color:#9ca3af">Opening Google sign in...</div>
        </div>
      </body>
    `)
    popup.focus()

    try {
      const result = await signIn("google", {
        redirect: false,
        redirectTo: completeUrl.toString(),
      })

      if (result?.url) {
        popup.location.href = result.url
      } else {
        popup.close()
        setWaiting(false)
        setError("Google sign in could not start.")
        return
      }
    } catch {
      popup.close()
      setWaiting(false)
      setError("Google sign in could not start.")
      return
    }

    if (closeCheckRef.current) window.clearInterval(closeCheckRef.current)
    closeCheckRef.current = window.setInterval(() => {
      if (popup.closed) {
        setWaiting(false)
        if (closeCheckRef.current) window.clearInterval(closeCheckRef.current)
      }
    }, 500)
  }

  return (
    <>
    <button
      type="button"
      onClick={startGooglePopup}
      disabled={waiting || checkingGoogle || !googleAvailable}
      style={{
        width: "100%",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px",
        color: "var(--text)",
        fontSize: "14px",
        cursor: waiting || checkingGoogle || !googleAvailable ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginBottom: "24px",
        opacity: waiting || checkingGoogle || !googleAvailable ? 0.7 : 1,
      }}
    >
      <Image src="/google.svg" width={16} height={16} alt="Google" />
      {checkingGoogle ? "Checking Google..." : !googleAvailable ? "Google sign in unavailable" : waiting ? "Waiting for Google..." : label}
    </button>
    {error && (
      <div style={{ color: "#ff6666", fontSize: "12px", textAlign: "center", marginTop: "-14px", marginBottom: "16px" }}>
        {error}
      </div>
    )}
    </>
  )
}
