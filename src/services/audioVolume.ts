const STORAGE_KEY = 'word-castle:volume:v1'

export function getAudioVolume(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      const value = Number(saved)
      if (Number.isFinite(value) && value >= 0 && value <= 100) return value
    }
  } catch { /* Storage may be unavailable. */ }
  return 100
}

export function setAudioVolume(value: number): number {
  if (!Number.isFinite(value)) return getAudioVolume()
  const volume = Math.max(0, Math.min(100, Math.round(value)))
  try { localStorage.setItem(STORAGE_KEY, String(volume)) } catch { /* Keep current playback working. */ }
  return volume
}
