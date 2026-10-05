import { dictionaryAudio, type Recording } from './dictionaryAudio'
import { getAudioVolume } from './audioVolume'

const VOICE_KEY = 'word-castle:voice:v1'
const ACCENT_KEY = 'word-castle:accent:v1'
const RESTART_DELAY_MS = 160
const RECORDING_WAIT_MS = 1800

export type Accent = 'en-GB' | 'en-US'

let pendingSpeak: ReturnType<typeof setTimeout> | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let activeAudio: HTMLAudioElement | null = null
let currentRecording: Recording | null = null
const recordingListeners = new Set<(recording: Recording | null) => void>()
let generation = 0
let accentFallback: Accent = 'en-GB'

function browserVoiceAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
}

function recordingAvailable(): boolean {
  return typeof Audio !== 'undefined' && typeof fetch === 'function'
}

function voiceScore(voice: SpeechSynthesisVoice, accent: Accent): number {
  const name = voice.name.toLowerCase()
  let score = voice.lang.toLowerCase() === accent.toLowerCase() ? 400 : 0
  if (/natural|neural/.test(name)) score += 310
  if (/online/.test(name)) score += 60
  if (/google (uk|us) english/.test(name)) score += 95
  if (/aria|jenny|sonia|ryan|libby|samantha|george|hazel/.test(name)) score += 55
  if (voice.default) score += 5
  return score
}

function selectedVoiceURI(): string {
  try { return localStorage.getItem(VOICE_KEY) ?? '' }
  catch { return '' }
}

function publishRecording(recording: Recording | null): void {
  currentRecording = recording
  for (const listener of recordingListeners) listener(recording)
}

function retireCurrent(): boolean {
  if (pendingSpeak !== null) { clearTimeout(pendingSpeak); pendingSpeak = null }
  if (activeAudio) {
    activeAudio.pause()
    activeAudio = null
  }
  publishRecording(null)
  if (!browserVoiceAvailable()) return false
  const synth = window.speechSynthesis
  const wasSpeaking = synth.speaking || synth.pending || activeUtterance !== null
  if (wasSpeaking) synth.cancel()
  activeUtterance = null
  return wasSpeaking
}

function recordingBeforeDeadline(word: string, accent: Accent): Promise<Recording | null> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve(null), RECORDING_WAIT_MS)
    dictionaryAudio.get(word, accent).then(
      url => { clearTimeout(timeout); resolve(url) },
      () => { clearTimeout(timeout); resolve(null) },
    )
  })
}

export const speechService = {
  supported(): boolean { return browserVoiceAvailable() || recordingAvailable() },

  applyVolume(percent: number): void {
    if (activeAudio) activeAudio.volume = percent / 100
    if (activeUtterance) activeUtterance.volume = percent / 100
  },

  getEnglishVoices(): SpeechSynthesisVoice[] {
    if (!browserVoiceAvailable()) return []
    const accent = this.getAccent()
    return window.speechSynthesis.getVoices()
      .filter(voice => /^en(?:-|_)/i.test(voice.lang))
      .sort((a, b) => voiceScore(b, accent) - voiceScore(a, accent))
  },

  getAccent(): Accent {
    try { return localStorage.getItem(ACCENT_KEY) === 'en-US' ? 'en-US' : 'en-GB' }
    catch { return accentFallback }
  },

  setAccent(accent: Accent): void {
    accentFallback = accent
    try {
      localStorage.setItem(ACCENT_KEY, accent)
      localStorage.removeItem(VOICE_KEY)
    } catch { /* Accent still works with browser defaults. */ }
  },

  getSelectedVoiceURI(): string { return selectedVoiceURI() },

  getCurrentRecording(): Recording | null { return currentRecording },

  subscribeRecording(listener: (recording: Recording | null) => void): () => void {
    recordingListeners.add(listener)
    return () => recordingListeners.delete(listener)
  },

  selectVoice(uri: string): void {
    try { localStorage.setItem(VOICE_KEY, uri) } catch { /* Voice still works without persistence. */ }
  },

  subscribeVoices(listener: () => void): () => void {
    if (!browserVoiceAvailable()) return () => {}
    const synth = window.speechSynthesis
    synth.addEventListener?.('voiceschanged', listener)
    return () => synth.removeEventListener?.('voiceschanged', listener)
  },

  prefetch(words: string[]): void {
    if (recordingAvailable()) dictionaryAudio.prefetch(words)
  },

  // The countdown follows a user click, allowing later recorded audio on
  // browsers that require a prior interaction. No synthetic intro is spoken.
  prime(): boolean { return this.supported() },

  preview(): boolean { return this.speak('hello') },

  speak(word: string, slow = false): boolean {
    if (!this.supported()) return false
    const cancelledSpeech = retireCurrent()
    const request = ++generation

    const speakInBrowser = () => {
      if (request !== generation || !browserVoiceAvailable()) return
      const issue = () => {
        pendingSpeak = null
        if (request !== generation) return
        const utterance = new SpeechSynthesisUtterance(word)
        const voices = this.getEnglishVoices()
        utterance.voice = voices.find(voice => voice.voiceURI === selectedVoiceURI()) ?? voices[0] ?? null
        utterance.lang = utterance.voice?.lang ?? this.getAccent()
        utterance.rate = slow ? 0.72 : 0.88
        utterance.pitch = 1
        utterance.volume = getAudioVolume() / 100
        utterance.onend = () => { if (activeUtterance === utterance) activeUtterance = null }
        utterance.onerror = () => { if (activeUtterance === utterance) activeUtterance = null }
        activeUtterance = utterance
        window.speechSynthesis.resume()
        window.speechSynthesis.speak(utterance)
      }
      if (cancelledSpeech) pendingSpeak = setTimeout(issue, RESTART_DELAY_MS)
      else issue()
    }

    if (!recordingAvailable() || !/^[a-z]+$/i.test(word)) {
      speakInBrowser()
      return true
    }

    // Cached lookups resolve immediately. A slow or missing API cannot keep
    // the player waiting indefinitely for a pronunciation.
    void recordingBeforeDeadline(word, this.getAccent()).then(recording => {
      if (request !== generation) return
      if (!recording) { speakInBrowser(); return }
      const audio = new Audio(recording.audioURL)
      activeAudio = audio
      audio.preload = 'auto'
      audio.playbackRate = slow ? 0.78 : 1
      audio.preservesPitch = true
      audio.volume = getAudioVolume() / 100
      let failed = false
      const playbackTimeout = setTimeout(() => fallback(), RECORDING_WAIT_MS)
      const fallback = () => {
        if (failed || request !== generation) return
        failed = true
        clearTimeout(playbackTimeout)
        audio.pause()
        activeAudio = null
        publishRecording(null)
        speakInBrowser()
      }
      audio.onerror = fallback
      audio.onended = () => { if (activeAudio === audio) activeAudio = null }
      void audio.play().then(() => {
        clearTimeout(playbackTimeout)
        if (!failed && request === generation) publishRecording(recording)
      }).catch(fallback)
    })
    return true
  },

  stop(): void {
    generation++
    retireCurrent()
  },
}
