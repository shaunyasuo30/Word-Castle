import type { WordResult } from '../game/types'
import type { Difficulty } from '../game/config'

export const HISTORY_KEY = 'word-castle:game-history:v1'
export type PracticeMode = 'all' | 'weak' | 'review'
export interface GameHistoryEntry {
  id: string
  playedAt: string
  setId: string
  setName: string
  mode: PracticeMode
  difficulty: Difficulty
  score: number
  accuracy: number
  completed: number
  missed: number
  duration: number
  wordResults: WordResult[]
}

export interface HistorySummary {
  totalGames: number
  totalWordsPracticed: number
  accuracySum: number
  bestScore: number
}

export function summarizeGames(games: GameHistoryEntry[]): HistorySummary {
  return {
    totalGames: games.length,
    totalWordsPracticed: games.reduce((sum, game) => sum + game.wordResults.length, 0),
    accuracySum: games.reduce((sum, game) => sum + game.accuracy, 0),
    bestScore: Math.max(0, ...games.map(game => game.score)),
  }
}

export function isHistorySummary(value: unknown): value is HistorySummary {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<HistorySummary>
  return Number.isSafeInteger(item.totalGames) && Number(item.totalGames) >= 0 &&
    Number.isSafeInteger(item.totalWordsPracticed) && Number(item.totalWordsPracticed) >= 0 &&
    typeof item.accuracySum === 'number' && Number.isFinite(item.accuracySum) && item.accuracySum >= 0 &&
    typeof item.bestScore === 'number' && Number.isFinite(item.bestScore) && item.bestScore >= 0
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isWordResult(value: unknown): value is WordResult {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<WordResult>
  return typeof item.wordId === 'string' && typeof item.word === 'string' &&
    typeof item.meaning === 'string' &&
    (item.outcome === 'perfect' || item.outcome === 'completed' || item.outcome === 'missed') &&
    validNumber(item.correctLetters) && validNumber(item.wrongLetters) && validNumber(item.score)
}

export function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<GameHistoryEntry>
  return typeof item.id === 'string' && typeof item.playedAt === 'string' &&
    typeof item.setId === 'string' && typeof item.setName === 'string' &&
    (item.mode === 'all' || item.mode === 'weak' || item.mode === 'review') &&
    (item.difficulty === 'easy' || item.difficulty === 'normal' || item.difficulty === 'hard' || item.difficulty === 'custom') &&
    validNumber(item.score) && validNumber(item.accuracy) && validNumber(item.completed) &&
    validNumber(item.missed) && validNumber(item.duration) &&
    Array.isArray(item.wordResults) && item.wordResults.every(isWordResult)
}

export const gameHistoryStorage = {
  read(): { games: GameHistoryEntry[]; summary: HistorySummary } {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return { games: [], summary: summarizeGames([]) }
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return { games: [], summary: summarizeGames([]) }
      const data = parsed as { version?: unknown; games?: unknown; summary?: unknown }
      if (data.version !== 1 || !Array.isArray(data.games)) return { games: [], summary: summarizeGames([]) }
      const games = data.games.filter(isGameHistoryEntry).slice(0, 50)
      return { games, summary: isHistorySummary(data.summary) ? data.summary : summarizeGames(games) }
    } catch { return { games: [], summary: summarizeGames([]) } }
  },

  load(): GameHistoryEntry[] { return this.read().games },

  getSummary(): HistorySummary { return this.read().summary },

  save(games: GameHistoryEntry[], summary = summarizeGames(games)): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, games: games.slice(0, 50), summary }))
  },

  add(game: GameHistoryEntry): void {
    const current = this.read()
    this.save([game, ...current.games], {
      totalGames: current.summary.totalGames + 1,
      totalWordsPracticed: current.summary.totalWordsPracticed + game.wordResults.length,
      accuracySum: current.summary.accuracySum + game.accuracy,
      bestScore: Math.max(current.summary.bestScore, game.score),
    })
  },
}
