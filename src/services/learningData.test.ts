// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { learningStatsStorage, statsId } from './learningStatsStorage'
import { gameHistoryStorage, type GameHistoryEntry } from './gameHistoryStorage'
import { selectPracticeWords } from '../game/practice'
import type { VocabularySet } from '../types/vocabulary'

const set: VocabularySet = { id: 'animals', name: 'Animals', words: [
  { id: 'cat', word: 'cat', meaning: 'mèo' },
  { id: 'dog', word: 'dog', meaning: 'chó' },
  { id: 'fox', word: 'fox', meaning: 'cáo' },
] }

beforeEach(() => localStorage.clear())

it('records per-word attempts without changing saved vocabulary and tolerates old or corrupt data', () => {
  localStorage.setItem('word-castle:vocabulary:v1', JSON.stringify([set]))
  const original = localStorage.getItem('word-castle:vocabulary:v1')
  learningStatsStorage.recordResults(set, [
    { wordId: 'cat', word: 'cat', meaning: 'mèo', outcome: 'completed', correctLetters: 3, wrongLetters: 1, score: 105 },
    { wordId: 'dog', word: 'dog', meaning: 'chó', outcome: 'missed', correctLetters: 1, wrongLetters: 2, score: 0 },
  ], '2026-10-06T00:00:00.000Z')
  learningStatsStorage.recordResults(set, [
    { wordId: 'cat', word: 'cat', meaning: 'mèo', outcome: 'perfect', correctLetters: 3, wrongLetters: 0, score: 110 },
  ])
  expect(learningStatsStorage.load()[statsId('animals', 'cat')]).toMatchObject({
    seen: 2, completed: 2, correctAttempts: 6, wrongAttempts: 1, missed: 0,
  })
  expect(learningStatsStorage.load()[statsId('animals', 'dog')].missed).toBe(1)
  expect(localStorage.getItem('word-castle:vocabulary:v1')).toBe(original)
  localStorage.setItem('word-castle:stats:v1', '{broken')
  expect(learningStatsStorage.load()).toEqual({})
})

it('selects weak words first and reviews mistakes from recent games', () => {
  learningStatsStorage.recordResults(set, [
    { wordId: 'dog', word: 'dog', meaning: 'chó', outcome: 'missed', correctLetters: 0, wrongLetters: 2, score: 0 },
  ])
  expect(selectPracticeWords(set.words, set.id, 'weak', learningStatsStorage.load(), [])[0].id).toBe('dog')
  const game: GameHistoryEntry = {
    id: 'one', playedAt: '2026-10-06', setId: set.id, setName: set.name,
    mode: 'all', difficulty: 'normal', score: 100, accuracy: 50, completed: 1, missed: 1, duration: 15,
    wordResults: [{ wordId: 'cat', word: 'cat', meaning: 'mèo', outcome: 'completed', correctLetters: 3, wrongLetters: 1, score: 100 }],
  }
  expect(selectPracticeWords(set.words, set.id, 'review', learningStatsStorage.load(), [game]).map(word => word.id)).toEqual(['cat'])
  expect(selectPracticeWords(set.words, set.id, 'all', {}, [])).toEqual(set.words)
  expect(selectPracticeWords(set.words, set.id, 'weak', {}, [])).toHaveLength(3)
})

it('keeps only the 50 most recent valid game history entries', () => {
  const game: GameHistoryEntry = {
    id: 'one', playedAt: '2026-10-06', setId: set.id, setName: set.name,
    mode: 'all', difficulty: 'normal', score: 100, accuracy: 100, completed: 1, missed: 0, duration: 15,
    wordResults: [{ wordId: 'cat', word: 'cat', meaning: 'mèo', outcome: 'perfect', correctLetters: 3, wrongLetters: 0, score: 100 }],
  }
  for (let i = 0; i < 55; i++) gameHistoryStorage.add({ ...game, id: String(i) })
  const history = gameHistoryStorage.load()
  expect(history).toHaveLength(50)
  expect(history[0].id).toBe('54')
  expect(history.at(-1)?.id).toBe('5')
  expect(gameHistoryStorage.getSummary()).toMatchObject({ totalGames: 55, totalWordsPracticed: 55, bestScore: 100 })
  localStorage.setItem('word-castle:game-history:v1', JSON.stringify({ version: 1, games: [game] }))
  expect(gameHistoryStorage.getSummary()).toMatchObject({ totalGames: 1, totalWordsPracticed: 1, bestScore: 100 })
  localStorage.setItem('word-castle:game-history:v1', JSON.stringify({ version: 1, games: [{ broken: true }] }))
  expect(gameHistoryStorage.load()).toEqual([])
})
