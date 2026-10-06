import type { VocabularySet } from '../types/vocabulary'
import type { WordResult } from '../game/types'

export const STATS_KEY = 'word-castle:stats:v1'
export interface WordStats {
  setId: string
  wordId: string
  word: string
  meaning: string
  seen: number
  correctAttempts: number
  wrongAttempts: number
  missed: number
  completed: number
  lastPlayedAt: string
}
export type LearningStats = Record<string, WordStats>

export function statsId(setId: string, wordId: string): string {
  return JSON.stringify([setId, wordId])
}

function validCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

export function isWordStats(value: unknown): value is WordStats {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<WordStats>
  return typeof item.setId === 'string' && typeof item.wordId === 'string' &&
    typeof item.word === 'string' && typeof item.meaning === 'string' &&
    validCount(item.seen) && validCount(item.correctAttempts) &&
    validCount(item.wrongAttempts) && validCount(item.missed) &&
    validCount(item.completed) && typeof item.lastPlayedAt === 'string'
}

export function isLearningStats(value: unknown): value is LearningStats {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.values(value).every(isWordStats)
}

export const learningStatsStorage = {
  load(): LearningStats {
    try {
      const raw = localStorage.getItem(STATS_KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return {}
      const data = parsed as { version?: unknown; words?: unknown }
      return data.version === 1 && isLearningStats(data.words) ? data.words : {}
    } catch { return {} }
  },

  save(stats: LearningStats): void {
    localStorage.setItem(STATS_KEY, JSON.stringify({ version: 1, words: stats }))
  },

  recordResults(set: VocabularySet, results: WordResult[], playedAt = new Date().toISOString()): LearningStats {
    const stats = this.load()
    for (const result of results) {
      const id = statsId(set.id, result.wordId)
      const old = stats[id]
      stats[id] = {
        setId: set.id, wordId: result.wordId, word: result.word, meaning: result.meaning,
        seen: (old?.seen ?? 0) + 1,
        correctAttempts: (old?.correctAttempts ?? 0) + result.correctLetters,
        wrongAttempts: (old?.wrongAttempts ?? 0) + result.wrongLetters,
        missed: (old?.missed ?? 0) + (result.outcome === 'missed' ? 1 : 0),
        completed: (old?.completed ?? 0) + (result.outcome === 'missed' ? 0 : 1),
        lastPlayedAt: playedAt,
      }
    }
    this.save(stats)
    return stats
  },
}
