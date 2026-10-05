import type { GameConfig } from './types'

export const GAME_CONFIG: GameConfig = {
  fallingSpeed: 18,
  bulletSpeed: 1600,
  startingLives: 3,
  baseScore: 100,
}

export const FIELD = { width: 1000, height: 620, wallY: 525, cannonX: 500, cannonY: 525 }
export const EXPLOSION_DURATION = 1.45
export const WALL_HIT_DURATION = 1.15
export const FINAL_WALL_HIT_DURATION = 1.5
export const FALL_SPEED = { min: 8, max: 48, step: 2, default: GAME_CONFIG.fallingSpeed }
