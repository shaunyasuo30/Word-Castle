// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GamePage from './GamePage'
import { speechService } from '../services/speechService'
import { soundEffects } from '../services/soundEffects'

let nextFrame: FrameRequestCallback | undefined
let clock = 0

function frames(count: number): void {
  act(() => {
    for (let i = 0; i < count; i++) {
      const frame = nextFrame
      nextFrame = undefined
      clock += 50
      frame?.(clock)
    }
  })
}

beforeEach(() => {
  localStorage.clear()
  clock = 0
  nextFrame = undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { nextFrame = callback; return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => { nextFrame = undefined })
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
  } })
  vi.stubGlobal('SpeechSynthesisUtterance', class {})
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('keeps the complete English word and Vietnamese meaning visible through the explosion', () => {
  const prime = vi.spyOn(speechService, 'prime').mockReturnValue(true)
  const preview = vi.spyOn(speechService, 'preview').mockReturnValue(true)
  const speak = vi.spyOn(speechService, 'speak').mockReturnValue(true)
  render(<GamePage set={{ id: 'one', name: 'One', words: [{ id: 'a', word: 'a', meaning: 'một' }] }} onHome={() => {}} />)
  expect(screen.queryByRole('group', { name: 'Chọn phong cách giọng đọc' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Nghe thử từ “hello”' }))
  expect(preview).toHaveBeenCalledTimes(1)
  const prefetch = vi.spyOn(speechService, 'prefetch').mockImplementation(() => {})
  fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' }))
  expect(prime).toHaveBeenCalledTimes(1)
  expect(prefetch).toHaveBeenCalledWith(['a'])
  frames(56)
  expect(screen.getByText('GO!')).toBeTruthy()
  frames(20)
  expect(speak).toHaveBeenCalledWith('a')
  fireEvent.click(screen.getByRole('button', { name: /US/ }))
  expect(speechService.getAccent()).toBe('en-US')
  fireEvent.click(screen.getByRole('button', { name: 'Nghe chậm' }))
  expect(speak).toHaveBeenCalledWith('a', true)
  fireEvent.keyDown(window, { key: 'a' })
  frames(8)
  expect(screen.getByText('một')).toBeTruthy()
  expect(screen.getByText('CHÍNH XÁC! TỪ VỪA NGHE LÀ')).toBeTruthy()
  frames(24)
  expect(screen.getByText('một')).toBeTruthy()
  expect(screen.getByText('PHÁ HỦY THÀNH CÔNG')).toBeTruthy()
  frames(31)
  expect(screen.getByText('VICTORY')).toBeTruthy()
})

it('prefetches only the next few pronunciations for a 500-word set', () => {
  vi.spyOn(speechService, 'prime').mockReturnValue(true)
  const prefetch = vi.spyOn(speechService, 'prefetch').mockImplementation(() => {})
  const words = Array.from({ length: 500 }, (_, index) => ({ id: String(index), word: 'apple', meaning: 'quả táo' }))
  render(<GamePage set={{ id: 'large', name: 'Large', words }} onHome={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' }))
  expect(prefetch).toHaveBeenCalledTimes(1)
  expect(prefetch.mock.calls[0][0]).toHaveLength(6)
})

it('shows the missed answer and offers speed, voice, fullscreen and cannon listening controls', () => {
  vi.spyOn(speechService, 'prime').mockReturnValue(true)
  vi.spyOn(speechService, 'speak').mockReturnValue(true)
  vi.spyOn(speechService, 'prefetch').mockImplementation(() => {})
  const requestFullscreen = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: requestFullscreen })
  const { container } = render(<GamePage set={{ id: 'wall', name: 'Wall', words: [{ id: 'apple', word: 'apple', meaning: 'quả táo' }] }} onHome={() => {}} />)
  expect(screen.getByRole('group', { name: 'Chọn giọng Anh Anh hoặc Anh Mỹ' })).toBeTruthy()
  expect(screen.getByLabelText('Chọn giọng dự phòng')).toBeTruthy()
  fireEvent.change(screen.getByRole('slider', { name: 'Tốc độ rơi' }), { target: { value: '48' } })
  expect(localStorage.getItem('word-castle:fall-speed')).toBe('48')
  const volume = screen.getByRole('slider', { name: 'Âm lượng' })
  expect(volume.previousElementSibling?.textContent).toContain('ÂM LƯỢNG')
  const effectVolume = vi.spyOn(soundEffects, 'applyVolume')
  const speechVolume = vi.spyOn(speechService, 'applyVolume')
  fireEvent.change(volume, { target: { value: '45' } })
  expect(localStorage.getItem('word-castle:volume:v1')).toBe('45')
  expect(effectVolume).toHaveBeenCalledWith(45)
  expect(speechVolume).toHaveBeenCalledWith(45)
  fireEvent.click(screen.getByRole('button', { name: 'Phóng to màn hình gameplay' }))
  expect(requestFullscreen).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' }))
  frames(76)
  expect(container.querySelector('.cannon-audio-controls')).toBeTruthy()
  frames(160)
  expect(screen.getByText('BỎ LỠ · TỪ CẦN ĐIỀN')).toBeTruthy()
  expect(screen.getByText('APPLE')).toBeTruthy()
  expect(screen.getByText('quả táo')).toBeTruthy()
  frames(30)
  expect(screen.getByText('Từ vừa bỏ lỡ:')).toBeTruthy()
  expect(screen.getByText('DEFEAT')).toBeTruthy()
})

it('supports pause and virtual keyboard input through the same game engine', () => {
  vi.spyOn(speechService, 'prime').mockReturnValue(true)
  vi.spyOn(speechService, 'speak').mockReturnValue(true)
  vi.spyOn(speechService, 'prefetch').mockImplementation(() => {})
  render(<GamePage set={{ id: 'touch', name: 'Touch', words: [{ id: 'a', word: 'a', meaning: 'một' }] }} onHome={() => {}} />)
  expect((screen.getByRole('button', { name: 'Bắn chữ A' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Hard' }))
  expect(localStorage.getItem('word-castle:difficulty:v1')).toBe('hard')
  fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' }))
  frames(76)
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  expect(screen.getByText('Đã tạm dừng')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Bắn chữ A' }) as HTMLButtonElement).disabled).toBe(true)
  frames(20)
  fireEvent.click(screen.getAllByRole('button', { name: 'Resume' }).at(-1)!)
  fireEvent.click(screen.getByRole('button', { name: 'Bắn chữ A' }))
  frames(8)
  expect(screen.getByText('CHÍNH XÁC! TỪ VỪA NGHE LÀ')).toBeTruthy()
  frames(55)
  expect(screen.getByText('✓ Perfect')).toBeTruthy()
  expect(localStorage.getItem('word-castle:game-history:v1')).toContain('"setId":"touch"')
})

it('offers a review game for words completed with mistakes', () => {
  vi.spyOn(speechService, 'prime').mockReturnValue(true)
  vi.spyOn(speechService, 'speak').mockReturnValue(true)
  vi.spyOn(speechService, 'prefetch').mockImplementation(() => {})
  render(<GamePage set={{ id: 'review', name: 'Review', words: [{ id: 'a', word: 'a', meaning: 'một' }] }} onHome={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' }))
  frames(76)
  fireEvent.keyDown(window, { key: 'x' })
  frames(8)
  fireEvent.keyDown(window, { key: 'a' })
  frames(8)
  frames(55)
  expect(screen.getByText(/Completed · 1 chữ sai/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Ôn lại từ sai' }))
  expect(screen.getByText('Ôn lại từ sai · 1 từ')).toBeTruthy()
  expect(document.querySelector('.hud-progress')?.textContent).toContain('0 / 1 từ')
})
