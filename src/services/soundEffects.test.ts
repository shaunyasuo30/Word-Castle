// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { SoundEffects } from './soundEffects'
import { GameEngine } from '../game/GameEngine'
import type { GameConfig } from '../game/types'

class AudioParamMock {
  value = 0
  peak = 0
  setValueAtTime(value: number): void { this.value = value }
  exponentialRampToValueAtTime(value: number): void { this.value = value }
  linearRampToValueAtTime(value: number): void { this.value = value; this.peak = Math.max(this.peak, value) }
  setTargetAtTime(value: number): void { this.value = value }
  cancelScheduledValues(): void {}
}

class NodeMock {
  connect(): this { return this }
  disconnect(): void {}
}

class SourceMock extends NodeMock {
  frequency = new AudioParamMock()
  buffer: unknown
  type = 'sine'
  onended: (() => void) | null = null
  constructor(private context: AudioContextMock) { super() }
  start(_at?: number, _offset?: number, duration?: number): void {
    if (this.buffer && duration !== undefined) this.context.recordingDurations.push(duration)
  }
  stop(at: number): void { this.context.stopTimes.push(at) }
}

class AudioContextMock {
  static latest: AudioContextMock
  currentTime = 0
  state = 'running'
  sampleRate = 1000
  destination = new NodeMock()
  stopTimes: number[] = []
  recordingDurations: number[] = []
  oscillatorCount = 0
  gains: Array<{ gain: AudioParamMock }> = []
  filters: Array<{ type: string; frequency: AudioParamMock }> = []
  constructor() { AudioContextMock.latest = this }
  createGain() {
    const node = Object.assign(new NodeMock(), { gain: new AudioParamMock() })
    this.gains.push(node)
    return node
  }
  createOscillator() { this.oscillatorCount++; return new SourceMock(this) }
  createBufferSource() { return new SourceMock(this) }
  createBiquadFilter() {
    const filter = Object.assign(new NodeMock(), { frequency: new AudioParamMock(), type: 'lowpass' })
    this.filters.push(filter)
    return filter
  }
  createBuffer() { return { getChannelData: () => new Float32Array(1000) } }
  decodeAudioData() { return Promise.resolve({ duration: 3 }) }
  resume() { return Promise.resolve() }
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: AudioContextMock })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (window as Window & { AudioContext?: unknown }).AudioContext })

it('plays distinct long opening and ending cues, with the opening finished before pronunciation', () => {
  for (const [cue, minimum] of [['start', 2.3], ['victory', 3.2], ['game-over', 3]] as const) {
    const sound = new SoundEffects()
    sound.play(cue)
    const lastSound = Math.max(...AudioContextMock.latest.stopTimes)
    expect(lastSound).toBeGreaterThan(minimum)
    if (cue === 'start') expect(lastSound).toBeLessThan(3.6)
  }
})

it('fades and stops an ending cue when effects are muted', () => {
  const sound = new SoundEffects()
  sound.play('victory')
  const context = AudioContextMock.latest
  sound.setMuted(true)
  expect(sound.isMuted()).toBe(true)
  expect(context.gains[0].gain.value).toBe(0)
  expect(context.stopTimes).toContain(0.15)
})

it('plays local recordings for shots and explosions without synthetic oscillators', async () => {
  const fetchRecording = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
  vi.stubGlobal('fetch', fetchRecording)
  const sound = new SoundEffects()
  await sound.preload()
  const context = AudioContextMock.latest
  expect(fetchRecording).toHaveBeenCalledTimes(7)
  expect(fetchRecording.mock.calls[0][0]).toMatch(/\/sfx\/cannon_fire_1\.mp3$/)
  sound.play('shoot')
  sound.play('explode')
  sound.play('wall')
  expect(context.recordingDurations).toEqual([1.35, 1.4, 1.3, 1.1])
  expect(context.oscillatorCount).toBe(0)
  expect(context.gains[2].gain.peak).toBeGreaterThan(context.gains[1].gain.peak)
  sound.setMuted(true)
  sound.play('shoot')
  expect(context.recordingDurations).toHaveLength(4)
})

it('plays spoken announcements over the opening and ending music', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
  const sound = new SoundEffects()
  await sound.preload()
  const context = AudioContextMock.latest
  sound.play('start')
  sound.play('go')
  sound.play('victory')
  sound.play('game-over')
  expect(context.recordingDurations).toEqual([0.86, 1.75, 2.05])
})

it('plays a louder recorded shot without the old chime when the bullet hits', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
  const sound = new SoundEffects()
  await sound.preload()
  const context = AudioContextMock.latest
  const config: GameConfig = { fallingSpeed: 0, bulletSpeed: 1200, startingLives: 3, baseScore: 100 }
  const engine = new GameEngine([{ id: '1', word: 'ab', meaning: 'thử' }], config)
  engine.onSound = event => sound.play(event)
  engine.begin()
  for (let i = 0; i < 74; i++) engine.update(0.05)
  context.recordingDurations.length = 0
  engine.shoot('a')
  for (let i = 0; i < 9; i++) engine.update(0.05)

  expect(context.recordingDurations).toHaveLength(1)
  expect(context.oscillatorCount).toBe(0)
  expect(context.gains.at(-1)?.gain.peak).toBeGreaterThanOrEqual(0.75)
})
