import type { GameSoundEvent } from '../game/types'
import { getAudioVolume } from './audioVolume'

type AudioContextWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }
type SoundCue = GameSoundEvent | 'start' | 'button'
type RecordingName = 'bomb_blast' | 'firework_burst' | 'go' | 'victory' | 'defeat'
const RECORDINGS: RecordingName[] = ['bomb_blast', 'firework_burst', 'go', 'victory', 'defeat']

export class SoundEffects {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private musicSources: AudioScheduledSourceNode[] = []
  private noiseBuffer: AudioBuffer | null = null
  private recordings = new Map<RecordingName, AudioBuffer>()
  private recordingLoads = new Map<RecordingName, Promise<AudioBuffer | null>>()
  private muted = false

  constructor() {
    try { this.muted = localStorage.getItem('word-castle:sfx-muted') === 'true' } catch { /* storage may be unavailable */ }
  }

  isMuted(): boolean { return this.muted }

  applyVolume(percent: number): void {
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : percent / 100, this.context.currentTime, 0.015)
    }
  }

  setMuted(value: boolean): void {
    this.muted = value
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(value ? 0 : getAudioVolume() / 100, this.context.currentTime, 0.015)
    }
    if (value) this.stopMusic()
    try { localStorage.setItem('word-castle:sfx-muted', String(value)) } catch { /* keep session choice */ }
  }

  unlock(): void {
    if (typeof window === 'undefined') return
    const Context = window.AudioContext ?? (window as AudioContextWithWebkit).webkitAudioContext
    if (!Context) return
    try {
      if (!this.context) {
        this.context = new Context()
        this.master = this.context.createGain()
        this.master.gain.value = this.muted ? 0 : getAudioVolume() / 100
        this.master.connect(this.context.destination)
      }
      if (this.context.state === 'suspended') void this.context.resume()
    } catch { /* browser has no usable audio output */ }
  }

  async preload(): Promise<void> {
    this.unlock()
    if (!this.context || typeof fetch !== 'function') return
    await Promise.all(RECORDINGS.map(name => this.loadRecording(name)))
  }

  private loadRecording(name: RecordingName): Promise<AudioBuffer | null> {
    const cached = this.recordings.get(name)
    if (cached) return Promise.resolve(cached)
    const pending = this.recordingLoads.get(name)
    if (pending) return pending
    const context = this.context
    if (!context || typeof fetch !== 'function') return Promise.resolve(null)
    const request = fetch(`${import.meta.env.BASE_URL}sfx/${name}.mp3`)
      .then(response => {
        if (!response.ok) throw new Error(`Cannot load ${name}`)
        return response.arrayBuffer()
      })
      .then(bytes => context.decodeAudioData(bytes))
      .then(buffer => {
        this.recordings.set(name, buffer)
        return buffer
      })
      .catch(() => {
        this.recordingLoads.delete(name)
        return null
      })
    this.recordingLoads.set(name, request)
    return request
  }

  private playRecording(name: RecordingName, level: number, maximumDuration: number): void {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const requestedAt = context.currentTime
    const start = (buffer: AudioBuffer | null) => {
      if (!buffer || this.muted || !this.context || !this.master ||
        this.context.currentTime - requestedAt > 0.15) return
      const at = this.context.currentTime
      const duration = Math.min(buffer.duration, maximumDuration)
      const source = this.context.createBufferSource()
      const volume = this.context.createGain()
      source.buffer = buffer
      volume.gain.setValueAtTime(0.0001, at)
      volume.gain.linearRampToValueAtTime(level, at + 0.008)
      volume.gain.setValueAtTime(level, at + Math.max(0.01, duration - 0.12))
      volume.gain.linearRampToValueAtTime(0.0001, at + duration)
      source.connect(volume).connect(this.master)
      source.onended = () => { source.disconnect(); volume.disconnect() }
      source.start(at, 0, duration)
    }
    start(this.recordings.get(name) ?? null)
    if (!this.recordings.has(name)) void this.loadRecording(name).then(start)
  }

  stopMusic(): void {
    if (!this.context || !this.musicBus) return
    const now = this.context.currentTime
    this.musicBus.gain.cancelScheduledValues(now)
    this.musicBus.gain.setTargetAtTime(0, now, 0.035)
    for (const source of this.musicSources) {
      try { source.stop(now + 0.15) } catch { /* already finished */ }
    }
    this.musicSources = []
    this.musicBus = null
  }

  private startMusic(): GainNode | null {
    this.stopMusic()
    if (!this.context || !this.master) return null
    const bus = this.context.createGain()
    bus.gain.value = 0.72
    bus.connect(this.master)
    this.musicBus = bus
    return bus
  }

  private tone(start: number, end: number, duration: number, delay: number, level: number,
    type: OscillatorType = 'sine', bus: AudioNode | null = this.master): void {
    const context = this.context
    if (!context || !bus) return
    const at = context.currentTime + delay
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(start, at)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration)
    volume.gain.setValueAtTime(0.0001, at)
    volume.gain.exponentialRampToValueAtTime(level, at + Math.min(0.018, duration / 3))
    volume.gain.setValueAtTime(level, at + Math.max(0.02, duration - 0.16))
    volume.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    oscillator.connect(volume).connect(bus)
    oscillator.onended = () => { oscillator.disconnect(); volume.disconnect() }
    oscillator.start(at)
    oscillator.stop(at + duration + 0.01)
    if (bus === this.musicBus) this.musicSources.push(oscillator)
  }

  private noise(duration: number, delay: number, level: number, cutoff: number,
    bus: AudioNode | null = this.master, filterType: BiquadFilterType = 'lowpass'): void {
    const context = this.context
    if (!context || !bus) return
    if (!this.noiseBuffer) {
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }
    const at = context.currentTime + delay
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const volume = context.createGain()
    source.buffer = this.noiseBuffer
    filter.type = filterType
    filter.frequency.setValueAtTime(cutoff, at)
    filter.frequency.exponentialRampToValueAtTime(Math.max(90, cutoff * 0.22), at + duration)
    volume.gain.setValueAtTime(0.0001, at)
    volume.gain.exponentialRampToValueAtTime(level, at + Math.min(0.012, duration / 4))
    volume.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    source.connect(filter).connect(volume).connect(bus)
    source.onended = () => { source.disconnect(); filter.disconnect(); volume.disconnect() }
    source.start(at)
    source.stop(at + duration)
    if (bus === this.musicBus) this.musicSources.push(source)
  }

  private bell(frequency: number, delay: number, duration: number, level: number, bus: AudioNode): void {
    this.tone(frequency, frequency * 1.006, duration, delay, level, 'triangle', bus)
    this.tone(frequency * 2, frequency * 2.01, duration * 0.48, delay, level * 0.22, 'sine', bus)
  }

  private drum(delay: number, level: number, bus: AudioNode): void {
    this.tone(125, 48, 0.24, delay, level, 'sine', bus)
    this.noise(0.13, delay, level * 0.42, 780, bus)
  }

  private playStart(): void {
    const bus = this.startMusic()
    if (!bus) return
    this.drum(0, 0.12, bus)
    for (const [delay, frequency, duration] of [
      [0.05, 293.66, 0.34], [0.32, 349.23, 0.34], [0.59, 440, 0.38],
      [0.91, 587.33, 0.45], [1.29, 698.46, 0.43], [1.63, 880, 0.9],
    ]) this.bell(frequency, delay, duration, 0.055, bus)
    this.drum(0.9, 0.095, bus)
    this.drum(1.62, 0.14, bus)
    this.tone(146.83, 146.83, 0.72, 0.02, 0.032, 'triangle', bus)
    this.tone(220, 220, 0.62, 0.92, 0.025, 'triangle', bus)
    for (const frequency of [293.66, 440, 587.33]) this.tone(frequency, frequency, 0.82, 1.68, 0.022, 'sine', bus)
  }

  private playVictory(): void {
    const bus = this.startMusic()
    if (!bus) return
    this.drum(0, 0.13, bus)
    for (const [delay, frequency, duration] of [
      [0.04, 587.33, 0.31], [0.27, 698.46, 0.31], [0.5, 880, 0.42],
      [0.83, 1174.66, 0.7], [1.42, 1046.5, 0.32], [1.68, 880, 0.34],
      [1.95, 698.46, 0.38], [2.24, 1174.66, 1.06],
    ]) this.bell(frequency, delay, duration, 0.052, bus)
    this.drum(0.82, 0.11, bus)
    this.drum(2.22, 0.15, bus)
    for (const frequency of [293.66, 440, 587.33, 698.46]) {
      this.tone(frequency, frequency, 1.02, 2.28, 0.022, 'triangle', bus)
    }
  }

  private playGameOver(): void {
    const bus = this.startMusic()
    if (!bus) return
    this.drum(0, 0.11, bus)
    for (const [delay, frequency, duration] of [
      [0.04, 440, 0.46], [0.42, 392, 0.43], [0.8, 349.23, 0.48],
      [1.22, 293.66, 0.57], [1.72, 261.63, 0.43], [2.06, 220, 0.88],
    ]) this.bell(frequency, delay, duration, 0.048, bus)
    this.drum(1.2, 0.085, bus)
    this.tone(146.83, 110, 1.03, 2.08, 0.042, 'triangle', bus)
    this.tone(174.61, 174.61, 0.95, 2.08, 0.018, 'sine', bus)
  }

  play(event: SoundCue): void {
    if (this.muted) return
    this.unlock()
    if (!this.context) return
    switch (event) {
      case 'button':
        this.tone(620, 880, 0.085, 0, 0.025, 'sine')
        this.tone(930, 1060, 0.065, 0.025, 0.012, 'sine')
        break
      case 'start': this.playStart(); break
      case 'go': this.playRecording('go', 1, 0.86); break
      case 'victory':
        this.playVictory()
        this.playRecording('victory', 1, 1.75)
        break
      case 'game-over':
        this.playGameOver()
        this.playRecording('defeat', 1, 2.05)
        break
      case 'shoot':
        this.tone(210, 105, 0.14, 0, 0.09, 'sine')
        this.tone(520, 280, 0.07, 0, 0.065, 'triangle')
        this.noise(0.055, 0, 0.02, 1400)
        break
      case 'wrong':
        this.tone(310, 178, 0.19, 0, 0.043, 'triangle')
        this.noise(0.075, 0, 0.014, 1050)
        break
      case 'explode':
        this.playRecording('bomb_blast', 1, 1.4)
        this.playRecording('firework_burst', 0.28, 1.3)
        break
      case 'wall':
        this.playRecording('bomb_blast', 0.82, 1.1)
    }
  }
}

export const soundEffects = new SoundEffects()
