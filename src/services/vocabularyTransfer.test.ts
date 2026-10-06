// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { backupStorage } from './backupStorage'
import { importCsvIntoSet, importSetJson, exportSetJson } from './vocabularyTransfer'
import { gameHistoryStorage } from './gameHistoryStorage'
import { learningStatsStorage, statsId } from './learningStatsStorage'
import { vocabularyStorage } from './vocabularyStorage'
import type { VocabularySet } from '../types/vocabulary'

const set: VocabularySet = { id: 'one', name: 'My Words', words: [{ id: 'a', word: 'apple', meaning: 'táo' }] }

beforeEach(() => localStorage.clear())

it('imports valid CSV rows while reporting duplicates and invalid rows', () => {
  const result = importCsvIntoSet('word,meaning\napple,táo\nbanana,chuối\nnot a word,sai\npear,"quả lê, xanh"\nempty,\n', set)
  expect(result.summary).toMatchObject({ imported: 2, skipped: 1, invalid: 2 })
  expect(result.set.words.map(item => item.word)).toEqual(['apple', 'banana', 'pear'])
  expect(result.set.words[2].meaning).toBe('quả lê, xanh')
  expect(set.words).toHaveLength(1)
})

it('exports a versioned set and imports it with new IDs without overwriting the original', () => {
  const imported = importSetJson(exportSetJson(set))
  expect(imported.set.id).not.toBe(set.id)
  expect(imported.set.words[0].id).not.toBe(set.words[0].id)
  expect(imported.set.words[0].word).toBe('apple')
  expect(imported.summary.imported).toBe(1)
  const partial = importSetJson(JSON.stringify({ version: 1, set: { name: 'Mixed', words: [
    { word: 'pear', meaning: 'lê' }, { word: 'pear', meaning: 'trùng' },
    { word: 'ice cream', meaning: 'kem' }, { word: 'grape', meaning: 'nho' },
  ] } }))
  expect(partial.summary).toMatchObject({ imported: 2, skipped: 1, invalid: 1 })
  expect(() => importSetJson('{"version":2,"set":{}}')).toThrow()
})

it('restores vocabulary, statistics, history and settings only after validation', () => {
  vocabularyStorage.save([set])
  learningStatsStorage.recordResults(set, [{ wordId: 'a', word: 'apple', meaning: 'táo', outcome: 'perfect', correctLetters: 5, wrongLetters: 0, score: 120 }])
  gameHistoryStorage.add({
    id: 'g', playedAt: '2026-10-06', setId: 'one', setName: 'My Words', mode: 'all', difficulty: 'normal',
    score: 120, accuracy: 100, completed: 1, missed: 0, duration: 10,
    wordResults: [{ wordId: 'a', word: 'apple', meaning: 'táo', outcome: 'perfect', correctLetters: 5, wrongLetters: 0, score: 120 }],
  })
  localStorage.setItem('word-castle:theme:v1', 'day')
  localStorage.setItem('word-castle:volume:v1', '45')
  const backup = backupStorage.export()
  vocabularyStorage.save([])
  localStorage.setItem('word-castle:theme:v1', 'night')
  expect(backupStorage.restore(backup)).toEqual([set])
  expect(vocabularyStorage.load()).toEqual([set])
  expect(learningStatsStorage.load()[statsId('one', 'a')].completed).toBe(1)
  expect(gameHistoryStorage.load()).toHaveLength(1)
  expect(localStorage.getItem('word-castle:theme:v1')).toBe('day')
  expect(localStorage.getItem('word-castle:volume:v1')).toBe('45')
  expect(localStorage.getItem('word-castle:samples:v2')).toBe('1')
  const before = localStorage.getItem('word-castle:vocabulary:v1')
  const invalid = JSON.parse(backup) as { vocabulary: unknown }
  invalid.vocabulary = [{ id: 'bad', name: 'Bad', words: [{ word: 'ice cream' }] }]
  expect(() => backupStorage.restore(JSON.stringify(invalid))).toThrow()
  expect(localStorage.getItem('word-castle:vocabulary:v1')).toBe(before)
})
