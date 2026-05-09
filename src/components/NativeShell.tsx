"use client"

import { useEffect } from "react"
import { StatusBar, Style } from "@capacitor/status-bar"
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { Keyboard } from "@capacitor/keyboard"
import { App } from "@capacitor/app"
import { registerNativePush } from "@/lib/push-native"

export function NativeShell() {
  useEffect(() => {
    const isNative = typeof (window as any).Capacitor !== "undefined"

    if (!isNative) return

    StatusBar.setStyle({ style: Style.Default })
    StatusBar.setOverlaysWebView({ overlay: false })

    Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("keyboard-open")
    })
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("keyboard-open")
    })

    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        App.exitApp()
      }
    })

    registerNativePush()
  }, [])

  const handleTap = () => {
    if (typeof (window as any).Capacitor !== "undefined") {
      Haptics.impact({ style: ImpactStyle.Light })
    }
  }

  return (
    <div
      onClick={handleTap}
      style={{ display: "contents" }}
      aria-hidden="true"
    />
  )
}
