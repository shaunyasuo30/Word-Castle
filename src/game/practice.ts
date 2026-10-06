import type { VocabularyItem } from '../types/vocabulary'
import type { LearningStats, WordStats } from '../services/learningStatsStorage'
import { statsId } from '../services/learningStatsStorage'
import type { GameHistoryEntry, PracticeMode } from '../services/gameHistoryStorage'
import { shuffle } from '../utils/shuffle'

const PRACTICE_LIMIT = 20

export function weakness(stats: WordStats | undefined): number {
  if (!stats) return 0
  const attempts = stats.correctAttempts + stats.wrongAttempts
  const errorRate = attempts ? stats.wrongAttempts / attempts : 0
  return stats.missed * 5 + stats.wrongAttempts * 2 + errorRate * 3
}

export function selectPracticeWords(
  words: VocabularyItem[], setId: string, mode: PracticeMode,
  stats: LearningStats, history: GameHistoryEntry[],
): VocabularyItem[] {
  if (mode === 'all') return words
  const randomized = shuffle(words)
  if (mode === 'review') {
    const recentIds = new Set<string>()
    for (const game of history.filter(item => item.setId === setId).slice(0, 10)) {
      for (const result of game.wordResults) {
        if (result.outcome === 'missed' || result.wrongLetters > 0) recentIds.add(result.wordId)
      }
    }
    const review = randomized.filter(word => recentIds.has(word.id))
    if (review.length) return review.slice(0, PRACTICE_LIMIT)
  }
  return randomized.sort((a, b) =>
    weakness(stats[statsId(setId, b.id)]) - weakness(stats[statsId(setId, a.id)]),
  ).slice(0, PRACTICE_LIMIT)
}
