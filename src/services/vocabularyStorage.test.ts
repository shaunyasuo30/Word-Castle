// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { initialSets, MAX_WORDS_PER_SET, topicSets } from '../data/sampleSets'
import { vocabularyStorage } from './vocabularyStorage'

beforeEach(() => localStorage.clear())

it('starts with several playable, valid topic sets', () => {
  const sets = vocabularyStorage.load()
  expect(sets.map(set => set.name)).toEqual(['Basic English', 'Animals', 'Vehicles', 'Colors', 'Food', 'Nature'])
  expect(sets).toHaveLength(initialSets.length)
  for (const set of sets) {
    expect(set.words.length).toBeGreaterThan(0)
    expect(set.words.length).toBeLessThanOrEqual(MAX_WORDS_PER_SET)
    expect(new Set(set.words.map(item => item.word)).size).toBe(set.words.length)
    expect(set.words.every(item => /^[a-z]{1,14}$/.test(item.word) && item.meaning.length > 0)).toBe(true)
  }
})

it('adds new sample sets once without replacing previously saved words', () => {
  const custom = { id: 'mine', name: 'My Words', words: [{ id: 'one', word: 'hello', meaning: 'xin chào' }] }
  localStorage.setItem('word-castle:vocabulary:v1', JSON.stringify([custom]))
  const migrated = vocabularyStorage.load()
  expect(migrated[0]).toEqual(custom)
  expect(migrated).toHaveLength(1 + topicSets.length)
  vocabularyStorage.save(migrated.filter(set => set.id !== topicSets[0].id))
  const loadedAgain = vocabularyStorage.load()
  expect(loadedAgain.some(set => set.id === topicSets[0].id)).toBe(false)
  expect(loadedAgain[0]).toEqual(custom)
})
