// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DictionaryLookup from './DictionaryLookup'
import { clearDictionaryCache } from '../services/dictionaryService'
import { vocabularyStorage } from '../services/vocabularyStorage'
import type { VocabularySet } from '../types/vocabulary'

const apiEntry = [{ word: 'beautiful', phonetic: '/ˈbjuː.tɪ.fəl/', meanings: [
  { partOfSpeech: 'adjective', definitions: [
    { definition: 'Pleasing the senses or mind aesthetically.', example: 'She has a beautiful voice.', synonyms: ['pretty', 'lovely'] },
    { definition: 'Of a very high standard.' },
  ] },
  { partOfSpeech: 'noun', definitions: [{ definition: 'A beautiful person.' }] },
] }]
const translation = [[['xinh đẹp', 'beautiful', null, null, 10]], null, 'en']
const successfulFetch = vi.fn((url: string) => Promise.resolve({ ok: true, status: 200, json: async () => url.startsWith('/api/translate') ? translation : apiEntry }))

function Harness({ initial }: { initial: VocabularySet[] }) {
  const [sets, setSets] = useState(initial)
  return <><DictionaryLookup sets={sets} onChange={next => { setSets(next); vocabularyStorage.save(next) }} /><span data-testid="set-count">{sets.length}</span></>
}

beforeEach(() => { localStorage.clear(); clearDictionaryCache() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('shows every meaning and adds API metadata to an existing game set without duplicates', async () => {
  const fetchMock = successfulFetch
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  render(<Harness initial={[{ id: 'ielts', name: 'IELTS', words: [] }]} />)
  await user.type(screen.getByRole('textbox', { name: 'Từ cần tra' }), '  BEAUTIFUL  ')
  await user.click(screen.getByRole('button', { name: 'Tra từ' }))
  expect(await screen.findByRole('heading', { name: 'beautiful' })).toBeTruthy()
  expect(await screen.findByText('xinh đẹp')).toBeTruthy()
  expect(screen.getByText('She has a beautiful voice.', { exact: false })).toBeTruthy()
  expect(screen.getByText('A beautiful person.')).toBeTruthy()
  expect(screen.getByText('pretty, lovely', { exact: false })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Add to vocabulary' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByRole('status').textContent).toContain('IELTS')
  const sets = vocabularyStorage.load()
  expect(sets[0].words[0]).toMatchObject({ word: 'beautiful', meaning: 'xinh đẹp', dictionary: { phonetic: '/ˈbjuː.tɪ.fəl/' } })
  await user.click(screen.getByRole('button', { name: 'Add to vocabulary' }))
  await user.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByRole('alert').textContent).toContain('đã có trong IELTS')
  expect(vocabularyStorage.load()[0].words).toHaveLength(1)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('creates a new set and allows a Vietnamese game meaning', async () => {
  vi.stubGlobal('fetch', successfulFetch)
  const user = userEvent.setup()
  render(<Harness initial={[]} />)
  await user.type(screen.getByRole('textbox', { name: 'Từ cần tra' }), 'beautiful')
  await user.click(screen.getByRole('button', { name: 'Tra từ' }))
  await screen.findByRole('heading', { name: 'beautiful' })
  await user.click(screen.getByRole('button', { name: 'Add to vocabulary' }))
  await user.type(screen.getByRole('textbox', { name: 'Tên bộ từ mới' }), 'IELTS')
  const meaning = screen.getByRole('textbox', { name: /Nghĩa hiển thị trong game/ })
  await user.clear(meaning)
  await user.type(meaning, 'đẹp')
  await user.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByTestId('set-count').textContent).toBe('1')
  expect(vocabularyStorage.load()[0]).toMatchObject({ name: 'IELTS', words: [{ word: 'beautiful', meaning: 'đẹp' }] })
})

it('does not fetch blanks and reports 404 without showing a result', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 })
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  render(<Harness initial={[]} />)
  await user.click(screen.getByRole('button', { name: 'Tra từ' }))
  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('Hãy nhập từ')
  await user.type(screen.getByRole('textbox', { name: 'Từ cần tra' }), 'unknownword')
  await user.click(screen.getByRole('button', { name: 'Tra từ' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Không tìm thấy')
  expect(screen.queryByRole('button', { name: 'Add to vocabulary' })).toBeNull()
})

it('lets the user add a translated word while dictionary details are still loading', async () => {
  const fetchMock = vi.fn((url: string) => url.startsWith('/api/translate')
    ? Promise.resolve({ ok: true, status: 200, json: async () => translation })
    : new Promise<never>(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  render(<Harness initial={[{ id: 'ielts', name: 'IELTS', words: [] }]} />)
  await user.type(screen.getByRole('textbox', { name: 'Từ cần tra' }), 'beautiful')
  await user.click(screen.getByRole('button', { name: 'Tra từ' }))
  expect(await screen.findByText('xinh đẹp')).toBeTruthy()
  const addButton = screen.getByRole('button', { name: 'Add to vocabulary' }) as HTMLButtonElement
  expect(addButton.disabled).toBe(false)
  await user.click(addButton)
  expect((screen.getByRole('textbox', { name: /Nghĩa hiển thị trong game/ }) as HTMLInputElement).value).toBe('xinh đẹp')
  await user.click(screen.getByRole('button', { name: 'Add' }))
  expect(vocabularyStorage.load()[0].words[0]).toMatchObject({ word: 'beautiful', meaning: 'xinh đẹp' })
})
