import type { VocabularyItem } from '../types/vocabulary'

export type GameState = 'READY' | 'PLAYING' | 'WORD_REVEALED' | 'WORD_DESTROYED' | 'WALL_HIT' | 'GAME_OVER' | 'VICTORY'
export type GameSoundEvent = 'go' | 'shoot' | 'hit' | 'wrong' | 'explode' | 'wall' | 'victory' | 'game-over'

export interface GameConfig {
  fallingSpeed: number
  bulletSpeed: number
  startingLives: number
  baseScore: number
}

export interface Bullet {
  x: number
  y: number
  character: string
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export type WordOutcome = 'perfect' | 'completed' | 'missed'

export interface WordResult {
  wordId: string
  word: string
  meaning: string
  outcome: WordOutcome
  correctLetters: number
  wrongLetters: number
  score: number
}

export interface FloatingFeedback {
  text: string
  x: number
  y: number
  color: string
  life: number
  maxLife: number
}

export interface GameSnapshot {
  state: GameState
  paused: boolean
  started: boolean
  countdown: string
  score: number
  lives: number
  destroyed: number
  missed: number
  correctKeys: number
  wrongKeys: number
  total: number
  elapsed: number
  wordNumber: number
  activeWord: VocabularyItem | null
  bufferedKeys: number
  combo: number
  bestCombo: number
  wordResults: WordResult[]
}
