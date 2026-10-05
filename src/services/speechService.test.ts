// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dictionaryAudio } from './dictionaryAudio'
import { speechService } from './speechService'

class FakeUtterance {
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

class FakeAudio {
  static instances: FakeAudio[] = []
  static playResult: () => Promise<void> = async () => {}
  preload = ''
  playbackRate = 1
  preservesPitch = false
  volume = 1
  onerror: (() => void) | null = null
  onended: (() => void) | null = null
  play = vi.fn(() => FakeAudio.playResult())
  pause = vi.fn()
  constructor(public src: string) { FakeAudio.instances.push(this) }
}

const natural = { name: 'Microsoft Aria Online (Natural)', lang: 'en-US', voiceURI: 'aria' } as SpeechSynthesisVoice
const naturalUK = { name: 'Microsoft Sonia Online (Natural)', lang: 'en-GB', voiceURI: 'sonia' } as SpeechSynthesisVoice
const standard = { name: 'English Standard', lang: 'en-US', voiceURI: 'standard' } as SpeechSynthesisVoice
const ukRecording = { fileName: 'En-uk-apple.ogg', audioURL: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/En-uk-apple.ogg', pageURL: 'https://commons.wikimedia.org/wiki/File:En-uk-apple.ogg' }

let synth: { speaking: boolean; pending: boolean; cancel: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; getVoices: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.useFakeTimers()
  synth = { speaking: false, pending: false, cancel: vi.fn(), resume: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => [standard, natural, naturalUK]) }
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('Audio', FakeAudio)
  FakeAudio.instances = []
  FakeAudio.playResult = async () => {}
  localStorage.clear()
})

afterEach(() => { speechService.stop(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('speechService', () => {
  it('plays a recorded UK pronunciation before browser speech', async () => {
    vi.spyOn(dictionaryAudio, 'get').mockResolvedValue(ukRecording)
    expect(speechService.speak('apple')).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0].src).toContain('En-uk-apple.ogg')
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(1)
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('selects US recording and slows down replay without changing pitch', async () => {
    const lookup = vi.spyOn(dictionaryAudio, 'get').mockResolvedValue({ ...ukRecording, fileName: 'En-us-water.ogg' })
    speechService.setAccent('en-US')
    speechService.speak('water', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledWith('water', 'en-US')
    expect(FakeAudio.instances[0].playbackRate).toBe(0.78)
    expect(FakeAudio.instances[0].preservesPitch).toBe(true)
  })

  it('uses the selected natural browser voice when a recording is unavailable', async () => {
    vi.spyOn(dictionaryAudio, 'get').mockResolvedValue(null)
    speechService.speak('castle')
    await vi.advanceTimersByTimeAsync(0)
    const utterance = synth.speak.mock.calls[0][0] as FakeUtterance
    expect(utterance.text).toBe('castle')
    expect(utterance.voice?.voiceURI).toBe('sonia')
    expect(utterance.rate).toBe(0.88)
    expect(utterance.pitch).toBe(1)
  })

  it('falls back if the recording cannot play', async () => {
    vi.spyOn(dictionaryAudio, 'get').mockResolvedValue(ukRecording)
    speechService.speak('apple')
    await vi.advanceTimersByTimeAsync(0)
    FakeAudio.instances[0].onerror?.()
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })

  it('falls back if a recording stalls before starting', async () => {
    FakeAudio.playResult = () => new Promise(() => {})
    vi.spyOn(dictionaryAudio, 'get').mockResolvedValue(ukRecording)
    speechService.speak('apple')
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1800)
    expect(FakeAudio.instances[0].pause).toHaveBeenCalledTimes(1)
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })

  it('drops a late lookup after a new word starts', async () => {
    let resolveOld: (recording: typeof ukRecording | null) => void = () => {}
    vi.spyOn(dictionaryAudio, 'get').mockImplementation(word => word === 'old'
      ? new Promise(resolve => { resolveOld = resolve })
      : Promise.resolve(null))
    speechService.speak('old')
    speechService.speak('new')
    resolveOld(ukRecording)
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeAudio.instances).toHaveLength(0)
    expect((synth.speak.mock.calls[0][0] as FakeUtterance).text).toBe('new')
  })

  it('waits briefly after cancelling browser speech before falling back', async () => {
    vi.spyOn(dictionaryAudio, 'get').mockResolvedValue(null)
    synth.speaking = true
    speechService.speak('banana')
    await vi.advanceTimersByTimeAsync(0)
    expect(synth.cancel).toHaveBeenCalledTimes(1)
    expect(synth.speak).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(180)
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })
})
