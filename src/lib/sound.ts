const cache: Record<string, HTMLAudioElement> = {}

export function playSound(file: string, volume = 0.72) {
  if (typeof window === "undefined") return
  try {
    if (!cache[file]) cache[file] = new Audio(`/sounds/${file}`)
    const audio = cache[file].cloneNode() as HTMLAudioElement
    audio.volume = volume
    audio.play().catch(() => {})
  } catch {
    // Audio unavailable — silent fail
  }
}

export function playSoundLoop(file: string, volume = 0.72): () => void {
  if (typeof window === "undefined") return () => {}
  try {
    // Use Web Audio API so we can apply gain > 1.0 to quiet source files
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (AudioCtx) {
      const ctx = new AudioCtx() as AudioContext
      const audio = new Audio(`/sounds/${file}`)
      audio.loop = true
      audio.crossOrigin = "anonymous"
      const source = ctx.createMediaElementSource(audio)
      const gain = ctx.createGain()
      gain.gain.value = volume          // > 1.0 is fine here
      source.connect(gain)
      gain.connect(ctx.destination)
      audio.play().catch(() => {})
      return () => {
        audio.pause()
        audio.currentTime = 0
        ctx.close().catch(() => {})
      }
    }
  } catch {}
  // Fallback: plain HTML audio (capped at 1.0)
  const audio = new Audio(`/sounds/${file}`)
  audio.loop = true
  audio.volume = Math.min(volume, 1)
  audio.play().catch(() => {})
  return () => { audio.pause(); audio.currentTime = 0 }
}
