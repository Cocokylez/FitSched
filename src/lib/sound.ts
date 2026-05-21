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
