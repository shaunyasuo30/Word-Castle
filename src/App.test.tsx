// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { soundEffects } from './services/soundEffects'
import { gameHistoryStorage } from './services/gameHistoryStorage'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('vocabulary flow', () => {
  it('makes a looked-up word immediately playable in a newly created set', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({ ok: true, status: 200, json: async () => url.startsWith('/api/translate')
      ? [[['xinh đẹp', 'beautiful']], null, 'en']
      : [{ word: 'beautiful', meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'Pleasing to see.' }] }] }],
    })))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Kho từ vựng' })[0])
    await user.type(screen.getByRole('textbox', { name: 'Từ cần tra' }), 'beautiful')
    await user.click(screen.getByRole('button', { name: 'Tra từ' }))
    await screen.findByRole('heading', { name: 'beautiful' })
    await screen.findByText('Pleasing to see.')
    await user.click(screen.getByRole('button', { name: 'Add to vocabulary' }))
    await user.click(screen.getByRole('radio', { name: /Create new vocabulary set/ }))
    await user.type(screen.getByRole('textbox', { name: 'Tên bộ từ mới' }), 'Dictionary Set')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: /Dictionary Set1\/500 từ/ }))
    expect(document.querySelector('.word-meaning')?.textContent).toBe('xinh đẹp')
    await user.click(screen.getByRole('button', { name: /Chơi bộ này/ }))
    expect(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' })).toBeTruthy()
  })

  it('shows saved learning totals on the Statistics page', async () => {
    gameHistoryStorage.add({
      id: 'game-1', playedAt: '2026-10-06T00:00:00.000Z', setId: 'basic-english', setName: 'Basic English',
      mode: 'all', difficulty: 'normal', score: 105, accuracy: 80, completed: 1, missed: 0, duration: 12,
      wordResults: [{ wordId: 'demo-apple', word: 'apple', meaning: 'quả táo', outcome: 'completed', correctLetters: 4, wrongLetters: 1, score: 105 }],
    })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Thống kê' }))
    expect(screen.getByText('Từ cần luyện thêm')).toBeTruthy()
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText(/Basic English/)).toBeTruthy()
  })

  it('plays the button cue across pages but not for non-button clicks', async () => {
    const user = userEvent.setup()
    const play = vi.spyOn(soundEffects, 'play').mockImplementation(() => {})
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Kho từ vựng' })[0])
    await user.click(screen.getByRole('button', { name: 'Trang chủ' }))
    await user.click(screen.getByRole('heading', { name: /Nghe từ/ }))
    expect(play).toHaveBeenCalledTimes(2)
    expect(play).toHaveBeenNthCalledWith(1, 'button')
    expect(play).toHaveBeenNthCalledWith(2, 'button')
  })

  it('switches between day and night on every page and remembers the choice', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    expect(document.documentElement.dataset.theme).toBe('night')
    await user.click(screen.getByRole('button', { name: 'Bật chế độ ban ngày' }))
    expect(document.documentElement.dataset.theme).toBe('day')
    expect(localStorage.getItem('word-castle:theme:v1')).toBe('day')
    await user.click(screen.getAllByRole('button', { name: 'Kho từ vựng' })[0])
    expect(screen.getByRole('button', { name: 'Bật chế độ ban đêm' })).toBeTruthy()
    view.unmount()
    render(<App />)
    expect(document.documentElement.dataset.theme).toBe('day')
  })

  it('creates a set, edits a word, persists it, and starts a playable session', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Kho từ vựng' })[0])
    await user.type(screen.getByPlaceholderText('Ví dụ: Animals'), 'Animals')
    await user.click(screen.getByRole('button', { name: 'Tạo bộ từ' }))
    await user.type(screen.getByRole('textbox', { name: 'Từ tiếng Anh' }), 'tiger')
    await user.type(screen.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }), 'con hổ')
    await user.click(screen.getByRole('button', { name: 'Thêm từ' }))
    expect(screen.getByText('con hổ')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Sửa tiger' }))
    await user.clear(screen.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }))
    await user.type(screen.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }), 'hổ')
    await user.click(screen.getByRole('button', { name: 'Lưu sửa' }))
    expect(screen.getByText('hổ')).toBeTruthy()
    expect(localStorage.getItem('word-castle:vocabulary:v1')).toContain('"meaning":"hổ"')

    view.unmount()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Kho từ vựng' })[0])
    await user.click(screen.getByRole('button', { name: /Animals1\/500 từ/ }))
    expect(screen.getByText('hổ')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Chơi bộ này/ }))
    expect(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Bật âm thanh & bắt đầu' }))
    expect(screen.getByText('Chuẩn bị nghe từ đầu tiên')).toBeTruthy()
  })

  it('rejects invalid spellings and keeps an empty set unplayable', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Kho từ vựng' })[0])
    await user.type(screen.getByPlaceholderText('Ví dụ: Animals'), 'Empty')
    await user.click(screen.getByRole('button', { name: 'Tạo bộ từ' }))
    expect((screen.getByRole('button', { name: /Chơi bộ này/ }) as HTMLButtonElement).disabled).toBe(true)
    await user.type(screen.getByRole('textbox', { name: 'Từ tiếng Anh' }), 'ice cream')
    await user.type(screen.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }), 'kem')
    await user.click(screen.getByRole('button', { name: 'Thêm từ' }))
    expect(screen.getByRole('alert').textContent).toContain('chỉ gồm các chữ A–Z')
  })
})
