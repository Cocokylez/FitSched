// ─────────────────────────────────────────────────────────────────────────────
//  Android home-screen widget bridge
//
//  Call updateWidget(streak, tokens) anywhere the web app refreshes data.
//  On web / iOS the function is a no-op, so it's safe to call unconditionally.
// ─────────────────────────────────────────────────────────────────────────────

import { Capacitor, registerPlugin } from "@capacitor/core"

interface FitSchedWidgetPlugin {
  updateData(data: { streak: number; tokens: number }): Promise<void>
}

// Lazily create the plugin handle so we never call registerPlugin on web
let _plugin: FitSchedWidgetPlugin | null = null

function plugin(): FitSchedWidgetPlugin | null {
  if (typeof window === "undefined") return null          // SSR
  if (!Capacitor.isNativePlatform()) return null          // web / desktop
  if (!_plugin) {
    _plugin = registerPlugin<FitSchedWidgetPlugin>("FitSchedWidget")
  }
  return _plugin
}

/**
 * Push current streak + FitToken balance to the Android home-screen widget.
 *
 * Safe to call on web — silently ignored.
 *
 * @example
 *   // after fetching fresh streak / token data:
 *   updateWidget(streak, fitTokenBalance)
 */
export async function updateWidget(streak: number, tokens: number): Promise<void> {
  const p = plugin()
  if (!p) return
  try {
    await p.updateData({ streak, tokens })
  } catch {
    // Widget not added to home screen yet — ignore
  }
}
