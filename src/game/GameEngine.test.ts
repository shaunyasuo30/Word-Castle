import { describe, expect, it } from 'vitest'
import { GameEngine } from './GameEngine'
import type { GameConfig, GameSoundEvent } from './types'

const config: GameConfig = { fallingSpeed: 0, bulletSpeed: 1200, startingLives: 3, baseScore: 100 }
const words = [{ id: '1', word: 'ab', meaning: 'thử' }]

function advance(engine: GameEngine, seconds: number): void {
  if (!engine.started) engine.begin()
  for (let i = 0; i < Math.ceil(seconds / 0.05); i++) engine.update(0.05)
}

describe('GameEngine', () => {
  it('announces GO once before the first word appears', () => {
    const engine = new GameEngine(words, config)
    const sounds: GameSoundEvent[] = []
    engine.onSound = cue => sounds.push(cue)
    advance(engine, 2.8)
    expect(engine.snapshot.countdown).toBe('GO!')
    expect(sounds.filter(cue => cue === 'go')).toHaveLength(1)
    advance(engine, 1)
    expect(engine.state).toBe('PLAYING')
  })

  it('aims the cannon and projectile at the next letter cell', () => {
    const engine = new GameEngine(words, config)
    advance(engine, 3.7)
    engine.wordX = 500
    advance(engine, 0.4)
    const first = engine.getTargetPoint()
    const firstAngle = engine.aimAngle
    expect(first.x).toBeLessThan(engine.wordX)
    expect(firstAngle).toBeLessThan(0)
    engine.shoot('a')
    advance(engine, 0.4)
    expect(engine.letterIndex).toBe(1)
    expect(engine.getTargetPoint().x - first.x).toBe(48)
    advance(engine, 0.4)
    expect(engine.aimAngle).toBeGreaterThan(firstAngle)
  })

  it('keeps rapid letters in order while one projectile is in flight', () => {
    const engine = new GameEngine(words, config)
    advance(engine, 3.7)
    expect(engine.shoot('a')).toBe(true)
    expect(engine.shoot('b')).toBe(true)
    expect(engine.correctKeys).toBe(0)
    advance(engine, 1)
    expect(engine.correctKeys).toBe(2)
    expect(engine.wrongKeys).toBe(0)
    expect(engine.state).toBe('WORD_REVEALED')
  })

  it('shows the completed spelling before exploding and moving on', () => {
    const engine = new GameEngine([{ id: 'a', word: 'a', meaning: 'một' }], config)
    advance(engine, 3.7)
    engine.shoot('a')
    advance(engine, 0.5)
    expect(engine.state).toBe('WORD_REVEALED')
    expect(engine.letterIndex).toBe(1)
    expect(engine.word?.meaning).toBe('một')
    advance(engine, 1.25)
    expect(engine.state).toBe('WORD_DESTROYED')
    expect(engine.word?.word).toBe('a')
    expect(engine.particles.length).toBeGreaterThanOrEqual(72)
    advance(engine, 1.5)
    expect(engine.state).toBe('VICTORY')
  })

  it('judges a key only after its bullet arrives, then completes the word', () => {
    const engine = new GameEngine(words, config)
    advance(engine, 3.7)
    expect(engine.state).toBe('PLAYING')
    expect(engine.shoot('x')).toBe(true)
    expect(engine.wrongKeys).toBe(0)
    advance(engine, 0.45)
    expect(engine.wrongKeys).toBe(1)
    expect(engine.letterIndex).toBe(0)
    expect(engine.shoot('a')).toBe(true)
    advance(engine, 0.45)
    expect(engine.letterIndex).toBe(1)
    expect(engine.shoot('b')).toBe(true)
    advance(engine, 0.45)
    expect(engine.state).toBe('WORD_REVEALED')
    expect(engine.score).toBe(100)
    advance(engine, 2.75)
    expect(engine.state).toBe('VICTORY')
  })

  it('charges exactly one life for a wall hit and ends after the last missed word', () => {
    const engine = new GameEngine(words, { ...config, fallingSpeed: 1000 })
    advance(engine, 3.7)
    advance(engine, 1)
    expect(engine.state).toBe('WALL_HIT')
    expect(engine.lives).toBe(2)
    expect(engine.missed).toBe(1)
    advance(engine, 0.9)
    expect(engine.state).toBe('GAME_OVER')
    expect(engine.lives).toBe(2)
    advance(engine, 2)
    expect(engine.missed).toBe(1)
  })

  it('lets a final bullet win a same-frame wall race', () => {
    const engine = new GameEngine([{ id: 'a', word: 'a', meaning: 'một' }], {
      ...config, fallingSpeed: 100, bulletSpeed: 20000,
    })
    advance(engine, 3.7)
    engine.wordY = 434
    engine.shoot('a')
    engine.update(0.05)
    expect(engine.state).toBe('WORD_REVEALED')
    expect(engine.lives).toBe(3)
    expect(engine.missed).toBe(0)
  })

  it('reaches zero lives after three separate missed words', () => {
    const three = ['cat', 'dog', 'fox'].map((word, index) => ({ id: String(index), word, meaning: word }))
    const engine = new GameEngine(three, { ...config, fallingSpeed: 1000 })
    advance(engine, 3.7)
    advance(engine, 5)
    expect(engine.lives).toBe(0)
    expect(engine.missed).toBe(3)
    expect(engine.state).toBe('GAME_OVER')
  })

  it('changes fall speed during play without changing the shared configuration', () => {
    const engine = new GameEngine(words, config)
    advance(engine, 3.7)
    const firstY = engine.wordY
    engine.setFallingSpeed(40)
    engine.update(0.05)
    expect(engine.wordY - firstY).toBeCloseTo(2)
    expect(config.fallingSpeed).toBe(0)
    engine.setFallingSpeed(500)
    expect(engine.config.fallingSpeed).toBe(48)
  })

  it('emits distinct shot, impact, wall explosion, and ending sounds', () => {
    const engine = new GameEngine(words, config)
    const sounds: GameSoundEvent[] = []
    engine.onSound = cue => sounds.push(cue)
    advance(engine, 3.7)
    engine.shoot('x')
    advance(engine, 0.6)
    expect(sounds).toContain('shoot')
    expect(sounds).toContain('wrong')
    engine.setFallingSpeed(48)
    engine.wordY = 433
    advance(engine, 0.1)
    expect(sounds).toContain('wall')
    expect(engine.snapshot.activeWord?.word).toBe('ab')
    advance(engine, 1.2)
    expect(sounds).toContain('game-over')
  })
})
