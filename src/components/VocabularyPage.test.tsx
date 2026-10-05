// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import VocabularyPage from './VocabularyPage'
import { MAX_WORDS_PER_SET, topicSets } from '../data/sampleSets'
import type { VocabularySet } from '../types/vocabulary'

afterEach(cleanup)

it('accepts the 500th word, then prevents adding more while still allowing edits', async () => {
  const user = userEvent.setup()
  const words = Array.from({ length: MAX_WORDS_PER_SET - 1 }, (_, index) => ({
    id: `word-${index}`,
    word: `word${String.fromCharCode(97 + Math.floor(index / 26), 97 + index % 26)}`,
    meaning: `nghĩa ${index}`,
  }))
  let sets: VocabularySet[] = [{ id: 'large', name: 'Large', words }]
  const onChange = vi.fn((next: VocabularySet[]) => {
    sets = next
    view.rerender(<VocabularyPage sets={sets} onChange={onChange} onBack={() => {}} onPlay={() => {}} />)
  })
  const view = render(<VocabularyPage sets={sets} onChange={onChange} onBack={() => {}} onPlay={() => {}} />)
  await user.type(screen.getByRole('textbox', { name: 'Từ tiếng Anh' }), 'finalword')
  await user.type(screen.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }), 'từ cuối')
  await user.click(screen.getByRole('button', { name: 'Thêm từ' }))
  expect(sets[0].words).toHaveLength(MAX_WORDS_PER_SET)
  expect((screen.getByRole('button', { name: 'Thêm từ' }) as HTMLButtonElement).disabled).toBe(true)
  await user.click(screen.getByRole('button', { name: `Sửa ${words[0].word}` }))
  expect((screen.getByRole('button', { name: 'Lưu sửa' }) as HTMLButtonElement).disabled).toBe(false)
})

it('filters a sample set by Vietnamese meaning', async () => {
  const user = userEvent.setup()
  const colors = topicSets.find(set => set.name === 'Colors')!
  render(<VocabularyPage sets={[colors]} onChange={() => {}} onBack={() => {}} onPlay={() => {}} />)
  await user.type(screen.getByRole('textbox', { name: 'Tìm từ trong bộ' }), 'xanh dương')
  expect(screen.getByText('blue')).toBeTruthy()
  expect(screen.queryByText('yellow')).toBeNull()
})
